'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { sendMessage, sendTyping, type Message } from '@/lib/support-api';
import { TypingIndicator } from './typing-indicator';

type CallSignal = {
  type: 'offer' | 'answer' | 'candidate' | 'state';
  payload: unknown;
  sessionId?: string;
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
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
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
    await pushSystemMessage('Video call started');
  };

  const stopCall = (options?: { notifyPeer?: boolean }) => {
    const startedAt = callSessionRef.current.startedAt;
    const hasActiveCall = Boolean(startedAt && !callSessionRef.current.ended);

    if (!hasActiveCall && callSessionRef.current.ended) {
      setCallStatus('ended');
      setShowCallView(false);
      return;
    }

    if (hasActiveCall) {
      const sessionId = callSessionRef.current.sessionId ?? createSessionId();
      callSessionRef.current.ended = true;
      callSessionRef.current.startedAt = null;
      callSessionRef.current.sessionId = sessionId;

      if (options?.notifyPeer !== false && onCallSignal) {
        onCallSignal({ type: 'state', payload: { state: 'ended' }, sessionId });
      }

      void pushSystemMessage(`Call ended. Duration: ${formatCallDuration(startedAt)}`);
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingCandidatesRef.current = [];

    setCallStatus('ended');
    setShowCallView(false);
  };

  const ensureMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Your browser does not support camera access.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
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
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
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
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus('connected');
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setCallStatus('ended');
      }
    };

    pc.onicecandidateerror = () => {
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
      setCallError(error instanceof Error ? error.message : 'Unable to start the call.');
    }
  };

  const handleIncomingSignal = async (signal: CallSignal | null | undefined) => {
    if (!signal) return;

    const sessionId = typeof signal.sessionId === 'string' ? signal.sessionId : null;
    if (sessionId && callSessionRef.current.sessionId && sessionId !== callSessionRef.current.sessionId) {
      return;
    }

    setShowCallView(true);

    if (signal.type === 'state' && signal.payload && typeof signal.payload === 'object' && 'state' in signal.payload) {
      if (signal.payload.state === 'ringing') {
        if (sessionId) {
          callSessionRef.current.sessionId = sessionId;
        }
        setCallStatus('ringing');
        setShowCallView(true);
        return;
      }

      if (signal.payload.state === 'answered' || signal.payload.state === 'joined') {
        if (sessionId) {
          callSessionRef.current.sessionId = sessionId;
        }
        setCallStatus('connecting');
        setShowCallView(true);
        return;
      }

      if (signal.payload.state === 'ended') {
        stopCall({ notifyPeer: false });
        return;
      }
    }

    if (!peerConnectionRef.current) {
      try {
        await createPeerConnection();
      } catch (error) {
        setCallError(error instanceof Error ? error.message : 'Unable to access media.');
        return;
      }
    }

    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (signal.type === 'offer' && signal.payload) {
      const sessionId = typeof signal.sessionId === 'string' ? signal.sessionId : null;
      if (callSessionRef.current.isInitiator && callSessionRef.current.startedAt && !callSessionRef.current.ended) {
        return;
      }

      try {
        if (!beginCallSession(false, sessionId ?? undefined)) {
          return;
        }

        setCallStatus('connecting');
        await logCallStart();
        const offer = signal.payload as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(offer);
        await flushPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        onCallSignal?.({ type: 'answer', payload: answer, sessionId: callSessionRef.current.sessionId ?? undefined });
        onCallSignal?.({ type: 'state', payload: { state: 'answered' }, sessionId: callSessionRef.current.sessionId ?? undefined });
      } catch (error) {
        setCallError(error instanceof Error ? error.message : 'Unable to answer the call.');
      }
      return;
    }

    if (signal.type === 'answer' && signal.payload) {
      try {
        await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        await flushPendingCandidates(pc);
        setCallStatus('connected');
      } catch (error) {
        setCallError(error instanceof Error ? error.message : 'Unable to connect the call.');
      }
      return;
    }

    if (signal.type === 'candidate' && signal.payload) {
      const sessionId = typeof signal.sessionId === 'string' ? signal.sessionId : null;
      if (sessionId && callSessionRef.current.sessionId && sessionId !== callSessionRef.current.sessionId) {
        return;
      }

      try {
        if (!pc.remoteDescription) {
          pendingCandidatesRef.current.push(signal.payload as RTCIceCandidateInit);
          return;
        }
        await pc.addIceCandidate(signal.payload as RTCIceCandidateInit);
      } catch (error) {
        console.warn('Failed to add ICE candidate', error);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCall();
    };
  }, []);

  useEffect(() => {
    void handleIncomingSignal(incomingCallSignal);
  }, [incomingCallSignal]);

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
            {callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? 'End call' : 'Video call'}
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
          <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {callStatus === 'connected' ? 'Video call active' : callStatus === 'ringing' ? 'Incoming / starting call' : callStatus === 'connecting' ? 'Connecting...' : 'Call ended'}
                </p>
                <p className="text-xs text-text-secondary">
                  {callError ?? 'The conversation stays in the background while the call is open.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => stopCall()}
                className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                {callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? 'End call' : 'Close'}
              </button>
            </div>

            <div className="flex-1 p-4">
              <div className="grid h-full gap-4 lg:grid-cols-2">
                <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl bg-black">
                  <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">You</div>
                </div>
                <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-bg-card">
                  <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                  {!remoteStreamRef.current && (
                    <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-secondary">
                      Waiting for the other participant to join the call.
                    </div>
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">Guest</div>
                </div>
              </div>
            </div>

            <div className="border-t border-border-subtle px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? () => stopCall() : () => void handleStartCall()}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-[#05070d] transition-opacity hover:opacity-90"
                >
                  {callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? 'End call' : 'Start call'}
                </button>
              </div>
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