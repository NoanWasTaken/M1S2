'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { sendMessage, sendTyping, type Message } from '@/lib/support-api';
import { clearCallAcceptIntent } from '@/lib/support-call-accept';
import {
  clearRemoteIceCandidates,
  drainRemoteIceCandidates,
  subscribeCallSignals,
  type CallSignalMessage,
} from '@/lib/support-call-bus';
import { TypingIndicator } from './typing-indicator';

type CallSignal = {
  type: 'offer' | 'answer' | 'candidate' | 'state';
  payload: unknown;
  sessionId?: string;
  callAccepted?: boolean;
  conversationId?: string;
};

type Props = {
  conversationId: string;
  messages: Message[];
  onNewMessage: (msg: Message) => void;
  typingUserId: string | null;
  onClose?: () => void;
  onBack?: () => void;
  onAccept?: () => void;
  status: string;
  canAccept?: boolean;
  onCallSignal?: (payload: CallSignal) => void;
  incomingCallSignal?: CallSignal & { senderId?: string; senderRole?: 'webmaster' | 'admin' } | null;
};

export function ConversationThread({ conversationId, messages, onNewMessage, typingUserId, onClose, onBack, onAccept, status, canAccept, onCallSignal, incomingCallSignal }: Props) {
  const t = useTranslations('support');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'>('idle');
  const [callError, setCallError] = useState<string | null>(null);
  const [showCallView, setShowCallView] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const callViewRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const mediaGenerationRef = useRef(0);
  const isMountedRef = useRef(true);
  const signalQueueRef = useRef<Promise<void>>(Promise.resolve());
  const processedOfferKeysRef = useRef<Set<string>>(new Set());
  const callStatusRef = useRef(callStatus);
  callStatusRef.current = callStatus;
  const callSessionRef = useRef<{ startedAt: number | null; ended: boolean; hasLoggedStart: boolean; isInitiator: boolean; sessionId: string | null }>({
    startedAt: null,
    ended: false,
    hasLoggedStart: false,
    isInitiator: false,
    sessionId: null,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await sendMessage(conversationId, content);
      onNewMessage(msg);
    } catch {
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (typingRef.current) clearTimeout(typingRef.current);
    sendTyping(conversationId, true);
    typingRef.current = setTimeout(() => {
      sendTyping(conversationId, false);
    }, 3000);
  };

  const isOwn = (senderId: string) => senderId === user?.id;

  const formatCallDuration = (startedAt: number | null) => {
    if (!startedAt) return '0s';
    const seconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const pushSystemMessage = async (content: string) => {
    try {
      const msg = await sendMessage(conversationId, content, 'system');
      onNewMessage(msg);
    } catch (error) {
      console.warn('Failed to persist call history message', error);
    }
  };

  const createSessionId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const beginCallSession = (initiator: boolean, sessionId?: string) => {
    if (callSessionRef.current.startedAt && !callSessionRef.current.ended) {
      return false;
    }


    pendingCandidatesRef.current = [];

    callSessionRef.current = {
      startedAt: Date.now(),
      ended: false,
      hasLoggedStart: false,
      isInitiator: initiator,
      sessionId: sessionId ?? createSessionId(),
    };

    return true;
  };

  const logCallStart = async () => {
    if (callSessionRef.current.hasLoggedStart) return;
    callSessionRef.current.hasLoggedStart = true;
    await pushSystemMessage(t('callSystemStarted'));
  };

  const stopAllLocalStreams = () => {
    [cameraStreamRef.current, localStreamRef.current, screenStreamRef.current].forEach((stream) => {
      stream?.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
    });
    cameraStreamRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
  };

  const clearVideoElements = () => {
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const detachPeerConnectionHandlers = (pc: RTCPeerConnection) => {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.onicecandidateerror = null;
  };

  const stopCall = (options?: { notifyPeer?: boolean }) => {
    mediaGenerationRef.current += 1;

    const startedAt = callSessionRef.current.startedAt;
    const hasActiveCall = Boolean(startedAt && !callSessionRef.current.ended);

    if (hasActiveCall) {
      const sessionId = callSessionRef.current.sessionId ?? createSessionId();
      callSessionRef.current.ended = true;
      callSessionRef.current.startedAt = null;
      callSessionRef.current.sessionId = sessionId;

      if (options?.notifyPeer !== false && onCallSignal) {
        onCallSignal({ type: 'state', payload: { state: 'ended' }, sessionId });
      }

      void pushSystemMessage(t('callSystemEnded', { duration: formatCallDuration(startedAt) }));
    } else {
      callSessionRef.current.ended = true;
      callSessionRef.current.startedAt = null;
    }

    callSessionRef.current.isInitiator = false;
    callSessionRef.current.hasLoggedStart = false;
    callSessionRef.current.sessionId = null;

    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        detachPeerConnectionHandlers(pc);
        pc.getSenders().forEach((sender) => {
          try {
            sender.track?.stop();
          } catch {
            // ignore
          }
        });
        pc.getReceivers().forEach((receiver) => {
          try {
            receiver.track?.stop();
          } catch {
            // ignore
          }
        });
        pc.close();
      }
    } catch {
      // ignore
    }
    peerConnectionRef.current = null;
    stopAllLocalStreams();
    [localVideoRef.current, cameraPreviewRef.current, remoteVideoRef.current].forEach((video) => {
      const stream = video?.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      }
    });
    remoteStreamRef.current = null;
    setHasRemoteStream(false);
    clearVideoElements();
    pendingCandidatesRef.current = [];
    processedOfferKeysRef.current.clear();
    clearRemoteIceCandidates(conversationId);
    setIsSharingScreen(false);
    setScreenShareError(null);
    setCallError(null);

    setCallStatus('ended');
    setShowCallView(false);
  };

  const syncLocalVideoDisplays = (sharingScreen: boolean) => {
    const primaryStream = sharingScreen ? screenStreamRef.current : cameraStreamRef.current;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = primaryStream ?? null;
    }
    if (cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = cameraStreamRef.current ?? null;
    }
  };

  const syncRemoteVideoDisplay = () => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  };

  const mediaErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    const name = 'name' in error ? String((error as DOMException).name) : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return t('callErrorPermission');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return t('callErrorNoDevice');
    }
    return error.message || fallback;
  };

  const ensureMedia = async () => {
    if (cameraStreamRef.current) {
      const live = cameraStreamRef.current.getTracks().some((track) => track.readyState === 'live');
      if (live) {
        localStreamRef.current = cameraStreamRef.current;
        syncLocalVideoDisplays(isSharingScreen);
        return cameraStreamRef.current;
      }
      stopAllLocalStreams();
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Your browser does not support camera access.');
    }

    const generation = mediaGenerationRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    if (!isMountedRef.current || generation !== mediaGenerationRef.current) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      throw new Error('Call cancelled');
    }

    cameraStreamRef.current = stream;
    localStreamRef.current = stream;
    syncLocalVideoDisplays(isSharingScreen);
    return stream;
  };

  const flushPendingCandidates = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;

    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      if (!candidate) continue;
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn('Failed to add queued ICE candidate', error);
      }
    }
  };

  const createPeerConnection = async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const stream = await ensureMedia();
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && onCallSignal) {
        const sessionId = callSessionRef.current.sessionId ?? undefined;
        onCallSignal({ type: 'candidate', payload: event.candidate.toJSON(), sessionId });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteStreamRef.current = remoteStream;
        setHasRemoteStream(true);
        syncRemoteVideoDisplay();
        setCallStatus('connected');
      } else if (event.track) {
        const stream = new MediaStream([event.track]);
        remoteStreamRef.current = stream;
        setHasRemoteStream(true);
        syncRemoteVideoDisplay();
        setCallStatus('connected');
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        stopCall({ notifyPeer: false });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const handleStartCall = async () => {
    if (!onCallSignal) return;
    if (callStatus === 'ringing' || callStatus === 'connecting' || callStatus === 'connected' || peerConnectionRef.current) {
      return;
    }

    try {
      setCallError(null);
      setCallStatus('ringing');
      setShowCallView(true);
      const sessionId = createSessionId();
      if (!beginCallSession(true, sessionId)) return;
      onCallSignal({ type: 'state', payload: { state: 'ringing' }, sessionId });
      await logCallStart();
      const pc = await createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      onCallSignal({ type: 'offer', payload: offer, sessionId });
      setCallStatus('connecting');
    } catch (error) {
      setCallStatus('ended');
      setCallError(mediaErrorMessage(error, t('callErrorStart')));
    }
  };

  const handleShareScreen = async (withAudio: boolean) => {
    if (!peerConnectionRef.current) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenShareError('Your browser does not support screen sharing.');
      return;
    }

    try {
      setScreenShareError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: withAudio });
      screenStreamRef.current = stream;
      setIsSharingScreen(true);
      syncLocalVideoDisplays(true);

      const pc = peerConnectionRef.current;
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'video' && videoTrack) {
          void sender.replaceTrack(videoTrack);
        }
        if (sender.track?.kind === 'audio' && audioTrack) {
          void sender.replaceTrack(audioTrack);
        }
      });

      const stopOnEnd = () => {
        void stopScreenShare();
      };
      stream.getVideoTracks().forEach((track) => track.addEventListener('ended', stopOnEnd));
      stream.getAudioTracks().forEach((track) => track.addEventListener('ended', stopOnEnd));
    } catch (error) {
      setScreenShareError(error instanceof Error ? error.message : t('callErrorShare'));
    }
  };

  const stopScreenShare = async () => {
    const stream = screenStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);
    syncLocalVideoDisplays(false);

    const pc = peerConnectionRef.current;
    if (!pc) return;

    let cameraStream = cameraStreamRef.current;
    const camLive = cameraStream?.getTracks().some((tr) => tr.readyState === 'live');
    if (!cameraStream || !camLive) {
      try {
        cameraStream = await ensureMedia();
      } catch {
        pc.getSenders().forEach((s) => { if (s.track?.kind === 'video') void s.replaceTrack(null); });
        return;
      }
    }

    const videoTrack = cameraStream.getVideoTracks()[0];
    const audioTrack = cameraStream.getAudioTracks()[0];
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind === 'video' && videoTrack) void sender.replaceTrack(videoTrack);
      if (sender.track?.kind === 'audio' && audioTrack) void sender.replaceTrack(audioTrack);
    });

    if (localVideoRef.current) localVideoRef.current.srcObject = cameraStream;
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = cameraStream;
  };

  const toggleFullscreen = async () => {
    const element = callViewRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      try {
        await element.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        setScreenShareError(t('callErrorFullscreenEnter'));
      }
      return;
    }

    try {
      await document.exitFullscreen();
      setIsFullscreen(false);
    } catch {
      setScreenShareError(t('callErrorFullscreenExit'));
    }
  };

  const handleIncomingSignal = async (signal: CallSignal | null | undefined) => {
    if (!signal) return;

    const sessionId = typeof signal.sessionId === 'string' ? signal.sessionId : null;
    if (signal.type !== 'offer' && sessionId && callSessionRef.current.sessionId && sessionId !== callSessionRef.current.sessionId) {
      const isEnded = signal.type === 'state'
        && signal.payload
        && typeof signal.payload === 'object'
        && 'state' in signal.payload
        && signal.payload.state === 'ended';
      if (!isEnded) return;
    }

    if (signal.type === 'state' && signal.payload && typeof signal.payload === 'object' && 'state' in signal.payload) {
      if (signal.payload.state === 'ended') {
        stopCall({ notifyPeer: false });
        return;
      }

      if (signal.payload.state === 'ringing') {
        if (!callSessionRef.current.isInitiator) return;
        if (sessionId) callSessionRef.current.sessionId = sessionId;
        setCallStatus('ringing');
        setShowCallView(true);
        return;
      }

      if (signal.payload.state === 'answered' || signal.payload.state === 'joined') {
        const inActiveSession = Boolean(callSessionRef.current.startedAt && !callSessionRef.current.ended);
        if (!inActiveSession) return;
        if (sessionId) callSessionRef.current.sessionId = sessionId;
        setCallStatus('connecting');
        setShowCallView(true);
        return;
      }
    }

    if (signal.type === 'offer' && signal.payload) {
      if (!signal.callAccepted) return;

      if (callSessionRef.current.isInitiator && callSessionRef.current.startedAt && !callSessionRef.current.ended) {
        return;
      }

      const offer = signal.payload as RTCSessionDescriptionInit;
      const offerKey = `${sessionId ?? ''}:${offer.sdp?.slice(0, 64) ?? ''}`;
      if (processedOfferKeysRef.current.has(offerKey)) return;

      try {
        if (!beginCallSession(false, sessionId ?? undefined)) {
          return;
        }

        processedOfferKeysRef.current.add(offerKey);
        setShowCallView(true);
        setCallStatus('connecting');
        setCallError(null);
        await logCallStart();

        const pc = await createPeerConnection();
        if (pc.signalingState !== 'stable' || pc.remoteDescription) {
          return;
        }

        await pc.setRemoteDescription(offer);

        const buffered = drainRemoteIceCandidates(conversationId, callSessionRef.current.sessionId);
        for (const candidate of buffered) {
          pendingCandidatesRef.current.push(candidate);
        }
        await flushPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await flushPendingCandidates(pc);
        syncLocalVideoDisplays(false);
        syncRemoteVideoDisplay();
        onCallSignal?.({ type: 'answer', payload: answer, sessionId: callSessionRef.current.sessionId ?? undefined });
        onCallSignal?.({ type: 'state', payload: { state: 'answered' }, sessionId: callSessionRef.current.sessionId ?? undefined });
        clearCallAcceptIntent();
      } catch (error) {
        processedOfferKeysRef.current.delete(offerKey);
        if (error instanceof Error && error.message === 'Call cancelled') return;
        setCallError(mediaErrorMessage(error, t('callErrorAnswer')));
      }
      return;
    }

    const pc = peerConnectionRef.current;

    if (signal.type === 'answer' && signal.payload) {
      if (!callSessionRef.current.isInitiator || !pc) return;
      if (pc.signalingState !== 'have-local-offer') return;

      try {
        await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        await flushPendingCandidates(pc);
        setCallStatus('connected');
        setShowCallView(true);
        syncLocalVideoDisplays(isSharingScreen);
        syncRemoteVideoDisplay();
      } catch (error) {
        setCallError(mediaErrorMessage(error, t('callErrorConnect')));
      }
      return;
    }

    if (signal.type === 'candidate' && signal.payload) {
      const candidateSessionId = typeof signal.sessionId === 'string' ? signal.sessionId : null;
      if (candidateSessionId && callSessionRef.current.sessionId && candidateSessionId !== callSessionRef.current.sessionId) {
        return;
      }

      try {
        if (!pc || !pc.remoteDescription) {
          pendingCandidatesRef.current.push(signal.payload as RTCIceCandidateInit);
          return;
        }
        await pc.addIceCandidate(signal.payload as RTCIceCandidateInit);
      } catch (error) {
        console.warn('Failed to add ICE candidate', error);
      }
    }
  };

  const enqueueSignal = (signal: CallSignal | CallSignalMessage | null | undefined) => {
    if (!signal) return;
    if (signal.conversationId && signal.conversationId !== conversationId) return;
    signalQueueRef.current = signalQueueRef.current
      .then(() => handleIncomingSignal(signal))
      .catch((error) => {
        console.warn('Failed to process call signal', error);
      });
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCall({ notifyPeer: false });
    };
  }, [conversationId]);

  useEffect(() => {
    enqueueSignal(incomingCallSignal);
  }, [incomingCallSignal]);

  useEffect(() => {
    const unsubscribe = subscribeCallSignals((signal) => {
      enqueueSignal(signal);
    });
    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    if (!showCallView) return;
    const id = window.requestAnimationFrame(() => {
      syncLocalVideoDisplays(isSharingScreen);
      syncRemoteVideoDisplay();
    });
    return () => window.cancelAnimationFrame(id);
  }, [showCallView, callStatus, isSharingScreen, hasRemoteStream]);

  useEffect(() => {
    const onEnded = (event: Event) => {
      const detail = (event as CustomEvent<CallSignal & { conversationId?: string }>).detail;
      if (detail?.conversationId && detail.conversationId !== conversationId) return;
      stopCall({ notifyPeer: false });
    };
    window.addEventListener('support:call-ended', onEnded);
    return () => window.removeEventListener('support:call-ended', onEnded);
  }, [conversationId]);

  const waitingLabel = user?.role === 'admin'
    ? t('callWaitingForOwner')
    : t('callWaitingForAdmin');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary lg:hidden"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {tCommon('back')}
            </button>
          )}
          <span className="text-sm font-semibold text-text-primary">
            {t(status)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canAccept && status === 'waiting' && onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#05070d] transition-opacity hover:opacity-90"
            >
              {t('accept')}
            </button>
          )}
          <button
            type="button"
            onClick={callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? () => stopCall() : () => void handleStartCall()}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            {callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? t('callEnd') : t('callVideo')}
          </button>
          {status !== 'closed' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              {t('close')}
            </button>
          )}
        </div>
      </div>

      {showCallView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div ref={callViewRef} className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {callStatus === 'connected' ? t('callActive') : callStatus === 'ringing' ? t('callRinging') : callStatus === 'connecting' ? t('callConnecting') : t('callEnded')}
                </p>
                <p className="text-xs text-text-secondary">
                  {callError ?? t('callBackgroundHint')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  {isFullscreen ? t('callExitFullscreen') : t('callFullscreen')}
                </button>
                <button
                  type="button"
                  onClick={() => stopCall()}
                  className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  {callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? t('callEnd') : t('close')}
                </button>
              </div>
            </div>

            <div className="flex-1 p-4">
              {isSharingScreen ? (
                <div className="flex h-full flex-col gap-4">
                  <div className="relative flex-1 overflow-hidden rounded-xl bg-black">
                    <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">{t('callSharedScreen')}</div>
                    {isSharingScreen && (
                      <div className="absolute bottom-4 right-4 h-28 w-20 overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl sm:h-36 sm:w-24">
                        <video ref={cameraPreviewRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                        <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white">{t('callCamera')}</div>
                      </div>
                    )}
                  </div>
                  <div className="relative min-h-[180px] overflow-hidden rounded-xl border border-border-subtle bg-bg-card">
                    <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    {!hasRemoteStream && (
                      <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-secondary">
                        {waitingLabel}
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">{t('callGuest')}</div>
                  </div>
                </div>
              ) : (
                <div className="grid h-full gap-4 lg:grid-cols-2">
                  <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl bg-black">
                    <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">{t('callYou')}</div>
                  </div>
                  <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-bg-card">
                    <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    {!hasRemoteStream && (
                      <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-secondary">
                        {waitingLabel}
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">{t('callGuest')}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border-subtle px-4 py-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {user?.role !== 'admin' && (
                  <>
                    {isSharingScreen ? (
                      <button
                        type="button"
                        onClick={() => void stopScreenShare()}
                        className="rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                      >
                        {t('callStopSharing')}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleShareScreen(false)}
                          className="rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                        >
                          {t('callShareScreen')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleShareScreen(true)}
                          className="rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                        >
                          {t('callShareScreenAudio')}
                        </button>
                      </>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? () => stopCall() : () => void handleStartCall()}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-[#05070d] transition-opacity hover:opacity-90"
                >
                  {callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? t('callEnd') : t('callStart')}
                </button>
              </div>
              {screenShareError ? (
                <p className="mt-2 text-right text-xs text-red-500">{screenShareError}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">{t('noMessages')}</p>
        )}

        {messages.map((msg) => {
          const mine = isOwn(msg.senderId);
          return (
            <div
              key={msg._id}
              className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-3.5 py-2 ${msg.type === 'system'
                  ? 'mx-auto w-full max-w-xs bg-bg-sidebar text-center text-xs text-text-tertiary'
                  : mine
                    ? 'bg-accent text-[#05070d]'
                    : 'bg-bg-card text-text-primary'
                  }`}
              >
                {msg.type !== 'system' && (
                  <p className="mb-0.5 text-[11px] font-medium opacity-70">
                    {msg.senderRole === 'admin'
                      ? t('senderSupport')
                      : user?.role === 'admin'
                        ? t('senderClient')
                        : t('senderYou')}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-[#05070d]/60' : 'text-text-tertiary'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        <TypingIndicator visible={typingUserId !== null} />
        <div ref={endRef} />
      </div>

      <div className="border-t border-border-subtle px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('typeHere')}
            rows={2}
            className="min-h-[40px] flex-1 resize-none rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg bg-accent text-[#05070d] transition-opacity disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-7-7m7 7l-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}