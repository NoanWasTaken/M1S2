'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { fetchUsers, impersonate, deleteUser, permanentlyDeleteUser, activateUser, rejectUser, type AdminUser } from '@/lib/admin-api';
import { Card } from '@/components/ui/card';

function roleLabel(u: AdminUser, t: (k: string) => string): string {
    if (u.role === 'admin') return t('roleAdmin');
    return u.teamRole === 'member' ? t('roleMember') : t('roleOwner');
}

export default function AdminUsersPage() {
    const t = useTranslations('admin');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { refreshUser } = useAuth();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setUsers(await fetchUsers());
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleActivate = async (u: AdminUser) => {
        setBusyId(u._id);
        try {
            await activateUser(u._id);
            await load();
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (u: AdminUser) => {
        if (!confirm(t('rejectUserConfirm'))) return;
        setBusyId(u._id);
        try {
            await rejectUser(u._id);
            await load();
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (u: AdminUser) => {
        if (!confirm(t('deleteUserConfirm'))) return;
        setBusyId(u._id);
        try {
            await deleteUser(u._id);
            await load();
        } finally {
            setBusyId(null);
        }
    };

    const handlePermanentDelete = async (u: AdminUser) => {
        if (!confirm(t('permanentDeleteUserConfirm'))) return;
        setBusyId(u._id);
        try {
            await permanentlyDeleteUser(u._id);
            await load();
        } finally {
            setBusyId(null);
        }
    };

    const handleImpersonate = async (u: AdminUser) => {
        setBusyId(u._id);
        try {
            await impersonate(u._id);
            await refreshUser();
            router.push('/dashboard');
        } catch {
            setBusyId(null);
        }
    };

    const visible = users.filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return u.email.toLowerCase().includes(q) || (u.companyName ?? '').toLowerCase().includes(q);
    });

    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-xl font-semibold text-text-primary">{t('usersTitle')}</h1>

            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full max-w-sm rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />

            {loading ? (
                <p className="text-sm text-text-secondary">{t('loading')}</p>
            ) : (
                <Card className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead>
                            <tr className="text-xs uppercase tracking-wider text-text-secondary">
                                <th className="pb-2 text-left font-medium">{t('email')}</th>
                                <th className="pb-2 text-left font-medium">{t('role')}</th>
                                <th className="pb-2 text-left font-medium">{t('company')}</th>
                                <th className="pb-2 text-left font-medium">{t('status')}</th>
                                <th className="pb-2 text-right font-medium">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((u) => (
                                <tr key={u._id} className="border-t border-border-subtle">
                                    <td className="py-3 font-mono text-xs text-text-primary">{u.email}</td>
                                    <td className="py-3 text-text-secondary">{roleLabel(u, t)}</td>
                                    <td className="py-3 text-text-secondary">{u.companyName ?? tCommon('notAvailable')}</td>
                                    <td className="py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${u.status === 'active'
                                                    ? 'bg-success/10 text-success'
                                                    : u.status === 'pending'
                                                        ? 'bg-warning/10 text-warning'
                                                        : 'bg-danger/10 text-danger'
                                                }`}
                                        >
                                            {t(`userStatus_${u.status}`)}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {u.status === 'pending' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={busyId === u._id}
                                                        onClick={() => handleActivate(u)}
                                                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-[#05070d] transition-opacity hover:opacity-90 disabled:opacity-50"
                                                    >
                                                        {t('accept')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={busyId === u._id}
                                                        onClick={() => handleReject(u)}
                                                        className="rounded-md border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                                                    >
                                                        {t('reject')}
                                                    </button>
                                                </>
                                            )}
                                            {u.status === 'suspended' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={busyId === u._id}
                                                        onClick={() => handleActivate(u)}
                                                        className="rounded-md border border-success/40 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                                                    >
                                                        {t('reactivate')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={busyId === u._id}
                                                        onClick={() => handlePermanentDelete(u)}
                                                        className="rounded-md border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                                                    >
                                                        {t('permanentDelete')}
                                                    </button>
                                                </>
                                            )}
                                            {u.status === 'active' && (
                                                <button
                                                    type="button"
                                                    disabled={busyId === u._id}
                                                    onClick={() => handleDelete(u)}
                                                    className="rounded-md border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                                                >
                                                    {t('suspend')}
                                                </button>
                                            )}
                                            {u.role === 'webmaster' && (
                                                <button
                                                    type="button"
                                                    disabled={busyId === u._id}
                                                    onClick={() => handleImpersonate(u)}
                                                    className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                                                >
                                                    {t('impersonate')}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}