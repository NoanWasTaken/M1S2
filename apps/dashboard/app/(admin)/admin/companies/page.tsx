'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    fetchCompanies,
    fetchPendingCount,
    validateCompany,
    rejectCompany,
    deleteCompany,
    viewCompanyKbis,
    type AdminCompany,
    type ValidationStatus,
} from '@/lib/admin-api';
import { useAdminStream } from '@/lib/use-admin-stream';
import { Card } from '@/components/ui/card';

type Filter = 'all' | ValidationStatus;

function StatusBadge({ status }: { status: ValidationStatus }) {
    const t = useTranslations('admin');
    const map = {
        validated: { key: 'statusValidated', cls: 'bg-success/10 text-success' },
        pending: { key: 'statusPending', cls: 'bg-warning/10 text-warning' },
        rejected: { key: 'statusRejected', cls: 'bg-danger/10 text-danger' },
    } as const;
    const s = map[status] ?? map.pending;
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{t(s.key)}</span>;
}

export default function AdminCompaniesPage() {
    const t = useTranslations('admin');
    const [companies, setCompanies] = useState<AdminCompany[]>([]);
    const [filter, setFilter] = useState<Filter>('pending');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await fetchCompanies();
            setCompanies(data);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        fetchPendingCount().then(setPending).catch(() => { });
    }, [load]);

    const { pending, setPending } = useAdminStream({
        onPendingCompany: () => load(),
    });

    const act = async (id: string, action: 'validate' | 'reject') => {
        setBusyId(id);
        try {
            if (action === 'validate') await validateCompany(id);
            else await rejectCompany(id);
            await load();
        } catch {
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteCompany = async (id: string) => {
        if (!confirm(t('deleteCompanyConfirm'))) return;
        setBusyId(id);
        try {
            await deleteCompany(id);
            await load();
        } catch {
        } finally {
            setBusyId(null);
        }
    };

    const visible = filter === 'all' ? companies : companies.filter((c) => c.validationStatus === filter);
    const filters: Filter[] = ['pending', 'validated', 'rejected', 'all'];

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-text-primary">{t('companiesTitle')}</h1>
                {pending !== null && pending > 0 && (
                    <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                        {pending} {t('toValidate')}
                    </span>
                )}
            </div>

            <div className="flex gap-1">
                {filters.map((f) => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f
                                ? 'bg-bg-active text-accent'
                                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                            }`}
                    >
                        {t(`filter_${f}`)}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-sm text-text-secondary">{t('loading')}</p>
            ) : visible.length === 0 ? (
                <Card><p className="text-sm text-text-secondary">{t('noCompany')}</p></Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {visible.map((c) => (
                        <Card key={c._id} className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-text-primary">{c.name}</span>
                                        <StatusBadge status={c.validationStatus} />
                                    </div>
                                    <a
                                        href={c.baseUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-accent hover:underline"
                                    >
                                        {c.baseUrl}
                                    </a>
                                </div>

                                <div className="flex shrink-0 gap-2">
                                    {c.validationStatus === 'pending' ? (
                                        <>
                                            <button
                                                type="button"
                                                disabled={busyId === c._id}
                                                onClick={() => act(c._id, 'validate')}
                                                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#05070d] transition-opacity hover:opacity-90 disabled:opacity-50"
                                            >
                                                {t('validate')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busyId === c._id}
                                                onClick={() => act(c._id, 'reject')}
                                                className="rounded-md border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                                            >
                                                {t('reject')}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={busyId === c._id}
                                            onClick={() => handleDeleteCompany(c._id)}
                                            className="rounded-md border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                                        >
                                            {t('delete')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-border-subtle pt-3">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase tracking-wider text-text-secondary">{t('contact')}</span>
                                    <span className="text-xs text-text-primary">{c.contact.name}</span>
                                    <span className="font-mono text-[11px] text-text-secondary">{c.contact.email}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase tracking-wider text-text-secondary">{t('kbis')}</span>
                                    <button
                                        type="button"
                                        onClick={() => viewCompanyKbis(c._id)}
                                        className="w-fit text-left text-xs font-medium text-accent hover:underline"
                                    >
                                        {t('viewKbis')}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase tracking-wider text-text-secondary">{t('requestedOn')}</span>
                                    <span className="text-xs text-text-primary">
                                        {new Date(c.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}