'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { sendCallSignal, sendMessage, sendTyping, type Message } from '@/lib/support-api';
import { TypingIndicator } from './typing-indicator';

type CallSignal = {
  type: 'offer' | 'answer' | 'candidate' | 'state';
  payload: unknown;
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

  const stopCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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

  const createPeerConnection = async () => {
    const stream = await ensureMedia();
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && onCallSignal) {
        onCallSignal({ type: 'candidate', payload: event.candidate.toJSON() });
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

    peerConnectionRef.current = pc;
    return pc;
  };

  const handleStartCall = async () => {
    if (!onCallSignal) return;
    try {
      setCallError(null);
      setCallStatus('ringing');
      setShowCallView(true);
      const pc = await createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      onCallSignal({ type: 'offer', payload: offer });
      await sendCallSignal(conversationId, 'offer', offer);
      setCallStatus('connecting');
    } catch (error) {
      setCallStatus('ended');
      setCallError(error instanceof Error ? error.message : 'Unable to start the call.');
    }
  };

  const handleIncomingSignal = async (signal: CallSignal | null | undefined) => {
    if (!signal) return;

    setShowCallView(true);

    if (signal.type === 'state' && signal.payload && typeof signal.payload === 'object' && 'state' in signal.payload) {
      if (signal.payload.state === 'ringing') {
        setCallStatus('ringing');
      }
      return;
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
      try {
        const offer = signal.payload as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        onCallSignal?.({ type: 'answer', payload: answer });
        await sendCallSignal(conversationId, 'answer', answer);
        setCallStatus('connecting');
      } catch (error) {
        setCallError(error instanceof Error ? error.message : 'Unable to answer the call.');
      }
      return;
    }

    if (signal.type === 'answer' && signal.payload) {
      try {
        await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        setCallStatus('connected');
      } catch (error) {
        setCallError(error instanceof Error ? error.message : 'Unable to connect the call.');
      }
      return;
    }

    if (signal.type === 'candidate' && signal.payload) {
      try {
        await pc.addIceCandidate(signal.payload as RTCIceCandidateInit);
      } catch (error) {
        console.error('Failed to add ICE candidate', error);
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
            onClick={callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? stopCall : handleStartCall}
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
                onClick={stopCall}
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
                  onClick={callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting' ? stopCall : handleStartCall}
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