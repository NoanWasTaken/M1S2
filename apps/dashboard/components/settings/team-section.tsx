'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import {
    fetchMembers,
    fetchInvitations,
    inviteMember,
    revokeInvitation,
    removeMember,
    type TeamMember,
    type TeamInvitation,
} from '@/lib/team-api';

export function TeamSection({ currentUserId }: { currentUserId?: string }) {
    const t = useTranslations('team');
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const load = useCallback(async () => {
        const [m, i] = await Promise.all([
            fetchMembers().catch(() => []),
            fetchInvitations().catch(() => []),
        ]);
        setMembers(m);
        setInvitations(i);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleInvite = async () => {
        const value = email.trim();
        if (!value) return;
        setBusy(true);
        setError(null);
        try {
            await inviteMember(value);
            setEmail('');
            setSent(true);
            setTimeout(() => setSent(false), 2500);
            await load();
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response: { data: { message?: string } } }).response?.data?.message
                    : null;
            setError(message || t('inviteFailed'));
        } finally {
            setBusy(false);
        }
    };

    const handleRevoke = async (id: string) => {
        setBusy(true);
        try {
            await revokeInvitation(id);
            await load();
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (id: string) => {
        setBusy(true);
        try {
            await removeMember(id);
            await load();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card className="flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-text-primary">{t('title')}</h2>

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        className="flex-1 rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleInvite}
                        disabled={busy}
                        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#05070d] transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {t('invite')}
                    </button>
                </div>
                {error && <span className="text-xs text-danger">{error}</span>}
                {sent && <span className="text-xs text-success">{t('inviteSent')}</span>}
                <span className="text-xs text-text-tertiary">{t('inviteHint')}</span>
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-text-secondary">{t('members')}</span>
                <div className="flex flex-col gap-1">
                    {members.map((m) => (
                        <div
                            key={m._id}
                            className="flex items-center justify-between rounded-md bg-bg-card px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-text-primary">{m.email}</span>
                                <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                                    {m.teamRole === 'owner' ? t('owner') : t('member')}
                                </span>
                                {m.status === 'pending' && (
                                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                                        {t('awaitingConfirmation')}
                                    </span>
                                )}
                            </div>

                            {m.teamRole !== 'owner' && m._id !== currentUserId && (
                                <button
                                    type="button"
                                    onClick={() => handleRemove(m._id)}
                                    disabled={busy}
                                    className="text-xs text-danger hover:underline disabled:opacity-50"
                                >
                                    {t('remove')}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {invitations.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wider text-text-secondary">
                        {t('pendingInvitations')}
                    </span>
                    <div className="flex flex-col gap-1">
                        {invitations.map((inv) => (
                            <div
                                key={inv._id}
                                className="flex items-center justify-between rounded-md border border-dashed border-border-subtle px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-text-secondary">{inv.email}</span>
                                    <span className="text-[10px] text-text-tertiary">
                                        {t('expiresOn', { date: new Date(inv.expiresAt).toLocaleDateString() })}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRevoke(inv._id)}
                                    disabled={busy}
                                    className="text-xs text-danger hover:underline disabled:opacity-50"
                                >
                                    {t('revoke')}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}