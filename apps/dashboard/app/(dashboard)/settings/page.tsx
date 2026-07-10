'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';

type Me = {
    _id: string;
    email: string;
    role: string;
    companyId: string;
    status: string;
    teamRole: string;
    createdAt: string;
};

type Company = {
    _id: string;
    name: string;
    baseUrl: string;
    kbisFileRef: string;
    validationStatus: 'pending' | 'validated' | 'rejected';
    contact: { name: string; email: string; phone?: string };
    createdAt: string;
};

type App = {
    _id: string;
    name: string;
    appId: string;
    appSecretPrefix: string | null;
    appSecretGeneratedAt: string | null;
    allowedOrigins: string[];
    createdAt: string;
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function CopyButton({ value }: { value: string }) {
    const t = useTranslations('settings');
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
            {copied ? t('copied') : t('copy')}
        </button>
    );
}

function ValidationBadge({ status }: { status: Company['validationStatus'] }) {
    const t = useTranslations('settings');
    const map = {
        validated: { key: 'statusValidated', cls: 'bg-success/10 text-success' },
        pending: { key: 'statusPending', cls: 'bg-warning/10 text-warning' },
        rejected: { key: 'statusRejected', cls: 'bg-danger/10 text-danger' },
    } as const;
    const s = map[status] ?? map.pending;
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{t(s.key)}</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-text-secondary">{label}</span>
            <span className="text-sm text-text-primary">{value}</span>
        </div>
    );
}

// ---- Account ----
function AccountCard({ me }: { me: Me }) {
    const t = useTranslations('settings');
    return (
        <Card className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-text-primary">{t('accountTitle')}</h2>
            <div className="grid grid-cols-2 gap-4">
                <Field label={t('email')} value={me.email} />
                <Field label={t('role')} value={me.role === 'webmaster' ? t('roleWebmaster') : me.role} />
                <Field label={t('teamRole')} value={me.teamRole === 'owner' ? t('teamOwner') : t('teamMember')} />
                <Field label={t('accountStatus')} value={me.status === 'active' ? t('accountActive') : me.status} />
                <Field label={t('memberSince')} value={formatDate(me.createdAt)} />
            </div>
        </Card>
    );
}

// ---- Company ----
function CompanyCard({ company }: { company: Company }) {
    const t = useTranslations('settings');
    return (
        <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">{t('companyTitle')}</h2>
                <ValidationBadge status={company.validationStatus} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label={t('companyName')} value={company.name} />
                <Field
                    label={t('website')}
                    value={
                        <a href={company.baseUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            {company.baseUrl}
                        </a>
                    }
                />
                <Field label={t('contact')} value={`${company.contact.name} · ${company.contact.email}`} />
                {company.contact.phone && <Field label={t('phone')} value={company.contact.phone} />}
                <Field label={t('kbis')} value={<span className="font-mono text-xs">{company.kbisFileRef}</span>} />
                <Field label={t('createdOn')} value={formatDate(company.createdAt)} />
            </div>
        </Card>
    );
}

// ---- One application row ----
function ApplicationRow({ app, onChanged }: { app: App; onChanged: () => void }) {
    const t = useTranslations('settings');
    const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [origins, setOrigins] = useState<string[]>(app.allowedOrigins ?? []);
    const [newOrigin, setNewOrigin] = useState('');
    const [savedOrigins, setSavedOrigins] = useState(false);

    async function generateSecret() {
        setBusy(true);
        try {
            const res = await api.post(`/api/v1/applications/${app._id}/secret`);
            setRevealedSecret(res.data.secret);
            onChanged();
        } finally {
            setBusy(false);
        }
    }

    async function revokeSecret() {
        setBusy(true);
        try {
            await api.delete(`/api/v1/applications/${app._id}/secret`);
            setRevealedSecret(null);
            onChanged();
        } finally {
            setBusy(false);
        }
    }

    async function saveOrigins(next: string[]) {
        setBusy(true);
        try {
            await api.put(`/api/v1/applications/${app._id}/origins`, { allowedOrigins: next });
            setOrigins(next);
            setSavedOrigins(true);
            setTimeout(() => setSavedOrigins(false), 1500);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex flex-col gap-4 rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{app.name}</span>
                <span className="text-xs text-text-tertiary">{t('createdOn')} {formatDate(app.createdAt)}</span>
            </div>

            {/* APP_ID */}
            <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-text-secondary">APP_ID</span>
                <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-bg-card px-2 py-1.5 font-mono text-xs text-text-primary">
                        {app.appId}
                    </code>
                    <CopyButton value={app.appId} />
                </div>
            </div>

            {/* APP_SECRET */}
            <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-text-secondary">APP_SECRET</span>
                {revealedSecret ? (
                    <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/10 p-2">
                        <p className="text-xs text-warning">{t('secretOnce')}</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 truncate rounded bg-bg-card px-2 py-1.5 font-mono text-xs text-text-primary">
                                {revealedSecret}
                            </code>
                            <CopyButton value={revealedSecret} />
                        </div>
                    </div>
                ) : app.appSecretPrefix ? (
                    <div className="flex items-center justify-between">
                        <code className="rounded-md bg-bg-card px-2 py-1.5 font-mono text-xs text-text-secondary">
                            {app.appSecretPrefix}••••••••••••••••
                        </code>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={generateSecret}
                                disabled={busy}
                                className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                            >
                                {t('regenerate')}
                            </button>
                            <button
                                type="button"
                                onClick={revokeSecret}
                                disabled={busy}
                                className="rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                            >
                                {t('revoke')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-text-tertiary">{t('noSecret')}</span>
                        <button
                            type="button"
                            onClick={generateSecret}
                            disabled={busy}
                            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-[#05070d] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {t('generateSecret')}
                        </button>
                    </div>
                )}
            </div>

            {/* CORS origins */}
            <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-text-secondary">{t('allowedOrigins')}</span>
                {origins.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {origins.map((o) => (
                            <div key={o} className="flex items-center justify-between rounded-md bg-bg-card px-2 py-1.5">
                                <code className="font-mono text-xs text-text-primary">{o}</code>
                                <button
                                    type="button"
                                    onClick={() => saveOrigins(origins.filter((x) => x !== o))}
                                    disabled={busy}
                                    className="text-xs text-danger hover:underline disabled:opacity-50"
                                >
                                    {t('remove')}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="text-xs text-text-tertiary">{t('noOrigin')}</span>
                )}
                <div className="flex items-center gap-2">
                    <input
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        placeholder="https://monsite.fr"
                        className="flex-1 rounded-md border border-border-subtle bg-bg-card px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const trimmed = newOrigin.trim();
                            if (!trimmed || origins.includes(trimmed)) return;
                            saveOrigins([...origins, trimmed]);
                            setNewOrigin('');
                        }}
                        disabled={busy}
                        className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                    >
                        {t('add')}
                    </button>
                </div>
                {savedOrigins && <span className="text-xs text-success">{t('originsSaved')}</span>}
            </div>
        </div>
    );
}

// ---- Applications section ----
function ApplicationsSection({ apps, onChanged }: { apps: App[]; onChanged: () => void }) {
    const t = useTranslations('settings');
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    async function createApp() {
        const name = newName.trim();
        if (!name) return;
        setCreating(true);
        try {
            await api.post('/api/v1/applications', { name });
            setNewName('');
            onChanged();
        } finally {
            setCreating(false);
        }
    }

    return (
        <Card className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-text-primary">{t('applicationsTitle')}</h2>

            <div className="flex items-center gap-2">
                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('newAppPlaceholder')}
                    className="flex-1 rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
                <button
                    type="button"
                    onClick={createApp}
                    disabled={creating}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#05070d] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {t('create')}
                </button>
            </div>

            {apps.length === 0 ? (
                <p className="text-sm text-text-secondary">{t('noApp')}</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {apps.map((app) => (
                        <ApplicationRow key={app._id} app={app} onChanged={onChanged} />
                    ))}
                </div>
            )}
        </Card>
    );
}

export default function SettingsPage() {
    const t = useTranslations('settings');
    const tCommon = useTranslations('common');
    const [me, setMe] = useState<Me | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);

    const loadApps = () =>
        api.get('/api/v1/applications').then((r) => setApps(r.data.applications)).catch(() => { });

    useEffect(() => {
        Promise.all([
            api.get('/api/v1/auth/me').then((r) => setMe(r.data.user)).catch(() => { }),
            api.get('/api/v1/company').then((r) => setCompany(r.data.company)).catch(() => { }),
            loadApps(),
        ]).finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-xl font-semibold text-text-primary">{t('title')}</h1>

            {loading ? (
                <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
            ) : (
                <>
                    {me && <AccountCard me={me} />}
                    {company && <CompanyCard company={company} />}
                    <ApplicationsSection apps={apps} onChanged={loadApps} />
                </>
            )}
        </div>
    );
}