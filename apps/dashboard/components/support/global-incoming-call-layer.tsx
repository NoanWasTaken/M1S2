'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { sendCallSignal } from '@/lib/support-api';
import { useConversationStream, type SupportCallSignalEvent } from '@/lib/use-conversation-stream';
import { IncomingCallPopup } from '@/components/support/incoming-call-popup';

export function GlobalIncomingCallLayer() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [pendingCalls, setPendingCalls] = useState<Record<string, SupportCallSignalEvent>>({});

    const pendingCall = useMemo(() => Object.values(pendingCalls)[0] ?? null, [pendingCalls]);

    const handleCallSignal = (payload: SupportCallSignalEvent) => {
        const isRinging = payload.type === 'state'
            && typeof payload.payload === 'object'
            && payload.payload !== null
            && 'state' in payload.payload
            && payload.payload.state === 'ringing';
        const isIncomingCall = payload.type === 'offer' || isRinging;

        const isEnded = payload.type === 'state'
            && typeof payload.payload === 'object'
            && payload.payload !== null
            && 'state' in payload.payload
            && payload.payload.state === 'ended';

        if (isEnded) {
            setPendingCalls((prev) => {
                const next = { ...prev };
                delete next[payload.conversationId];
                return next;
            });
            return;
        }

        if (!user?.id) return;
        if (payload.senderId === user.id) return;

        if (isIncomingCall) {
            setPendingCalls((prev) => ({ ...prev, [payload.conversationId]: payload }));
        }
    };

    useConversationStream({ onCallSignal: handleCallSignal });

    const answer = () => {
        if (!pendingCall) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set('conversation', pendingCall.conversationId);
        const targetPath = pathname.startsWith('/admin') ? '/admin/support' : '/support';

        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('support:pending-call', JSON.stringify(pendingCall));
        }

        void sendCallSignal(pendingCall.conversationId, 'state', { state: 'answered' });
        router.push(`${targetPath}?${params.toString()}`);
        setPendingCalls((prev) => {
            const next = { ...prev };
            delete next[pendingCall.conversationId];
            return next;
        });
        if (user?.id && pendingCall.senderId === user.id) {
            return;
        }
    };

    const decline = () => {
        if (!pendingCall) return;
        void sendCallSignal(pendingCall.conversationId, 'state', { state: 'ended' });
        setPendingCalls((prev) => {
            const next = { ...prev };
            delete next[pendingCall.conversationId];
            return next;
        });
    };

    return (
        <IncomingCallPopup
            open={Boolean(pendingCall)}
            call={pendingCall}
            onAnswer={answer}
            onDecline={decline}
        />
    );
}
