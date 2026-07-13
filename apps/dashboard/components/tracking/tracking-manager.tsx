'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { Card } from '@/components/ui/card';

type Company = {
    _id: string;
    name: string;
};

type Application = {
    _id: string;
    appId: string;
    name: string;
    companyId: string;
};

type TrackingTag = {
    _id: string;
    tagId: string;
    comment: string;
    deletedAt?: string | null;
};

type TrackingFunnel = {
    _id: string;
    funnelId: string;
    comment: string;
    steps: Array<{ tagId: string; position: number }>;
    deletedAt?: string | null;
};

type Props = {
    mode: 'tags' | 'funnels';
};

export function TrackingManager({ mode }: Props) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();
    const t = useTranslations('tracking');
    const tCommon = useTranslations('common');
    const tNav = useTranslations('nav');

    const [companies, setCompanies] = useState<Company[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedApplicationId, setSelectedApplicationId] = useState('');
    const [tags, setTags] = useState<TrackingTag[]>([]);
    const [funnels, setFunnels] = useState<TrackingFunnel[]>([]);
    const [availableTagIds, setAvailableTagIds] = useState<string[]>([]);

    const [tagComment, setTagComment] = useState('');
    const [funnelComment, setFunnelComment] = useState('');
    const [selectedFunnelTagIds, setSelectedFunnelTagIds] = useState<string[]>([]);
    const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
    const [funnelDrafts, setFunnelDrafts] = useState<Record<string, string>>({});

    const [loadingState, setLoadingState] = useState('');
    const [error, setError] = useState<string | null>(null);

    const selectedApplication = useMemo(
        () => applications.find((application) => application._id === selectedApplicationId) ?? null,
        [applications, selectedApplicationId],
    );

    useEffect(() => {
        const currentUser = user;

        if (isLoading || !isAuthenticated || currentUser == null) {
            return;
        }

        const authenticatedUser = currentUser;

        let cancelled = false;

        async function loadApplications() {
            try {
                setError(null);
                setLoadingState(t('loadingApplications'));

                if (authenticatedUser.role === 'admin') {
                    const { data } = await api.get('/api/v1/admin/companies');
                    if (cancelled) return;

                    const nextCompanies = data.companies as Company[];
                    setCompanies(nextCompanies);

                    const companyId = selectedCompanyId || nextCompanies[0]?._id || '';
                    setSelectedCompanyId(companyId);

                    if (!companyId) {
                        setApplications([]);
                        setSelectedApplicationId('');
                        setLoadingState(t('noCompany'));
                        return;
                    }

                    const appRes = await api.get('/api/v1/applications', { params: { companyId } });
                    if (cancelled) return;

                    const nextApplications = appRes.data.applications as Application[];
                    setApplications(nextApplications);
                    const appId = nextApplications[0]?._id || '';
                    setSelectedApplicationId(appId);
                    setLoadingState(appId ? '' : t('noApplication'));
                    return;
                }

                const { data } = await api.get('/api/v1/applications');
                if (cancelled) return;

                const nextApplications = data.applications as Application[];
                setApplications(nextApplications);
                setSelectedApplicationId(nextApplications[0]?._id || '');
                setLoadingState(nextApplications[0]?._id ? '' : t('noApplication'));
            } catch {
                if (cancelled) return;
                setError(t('errorLoadingApplications'));
                setLoadingState('');
            }
        }

        loadApplications();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, isLoading, selectedCompanyId, user]);

    useEffect(() => {
        if (!selectedApplicationId) {
            setTags([]);
            setFunnels([]);
            setAvailableTagIds([]);
            setSelectedFunnelTagIds([]);
            return;
        }

        let cancelled = false;

        async function loadTrackingData() {
            try {
                setError(null);

                const [tagsRes, funnelsRes] = await Promise.all([
                    api.get(`/api/v1/tracking/applications/${selectedApplicationId}/tags`),
                    api.get(`/api/v1/tracking/applications/${selectedApplicationId}/funnels`),
                ]);

                if (cancelled) return;

                const nextTags = (tagsRes.data.tags as TrackingTag[]) ?? [];
                const nextFunnels = (funnelsRes.data.funnels as TrackingFunnel[]) ?? [];
                setTags(nextTags);
                setFunnels(nextFunnels);
                setAvailableTagIds(nextTags.map((tag) => tag.tagId));
                setSelectedFunnelTagIds((current) => current.filter((tagId) => nextTags.some((tag) => tag.tagId === tagId)));

                const nextTagDrafts: Record<string, string> = {};
                for (const tag of nextTags) {
                    nextTagDrafts[tag.tagId] = tag.comment;
                }
                setTagDrafts(nextTagDrafts);

                const nextFunnelDrafts: Record<string, string> = {};
                for (const funnel of nextFunnels) {
                    nextFunnelDrafts[funnel.funnelId] = funnel.comment;
                }
                setFunnelDrafts(nextFunnelDrafts);
            } catch {
                if (cancelled) return;
                setError(t('errorLoadingTracking'));
            }
        }

        loadTrackingData();

        return () => {
            cancelled = true;
        };
    }, [selectedApplicationId]);

    async function refreshTrackingData() {
        if (!selectedApplicationId) return;

        const [tagsRes, funnelsRes] = await Promise.all([
            api.get(`/api/v1/tracking/applications/${selectedApplicationId}/tags`),
            api.get(`/api/v1/tracking/applications/${selectedApplicationId}/funnels`),
        ]);

        const nextTags = tagsRes.data.tags as TrackingTag[];
        const nextFunnels = funnelsRes.data.funnels as TrackingFunnel[];
        setTags(nextTags);
        setFunnels(nextFunnels);
        setAvailableTagIds(nextTags.map((tag) => tag.tagId));

        const nextTagDrafts: Record<string, string> = {};
        for (const tag of nextTags) {
            nextTagDrafts[tag.tagId] = tag.comment;
        }
        setTagDrafts(nextTagDrafts);

        const nextFunnelDrafts: Record<string, string> = {};
        for (const funnel of nextFunnels) {
            nextFunnelDrafts[funnel.funnelId] = funnel.comment;
        }
        setFunnelDrafts(nextFunnelDrafts);
    }

    async function createTag() {
        if (!selectedApplicationId || !tagComment.trim()) return;

        await api.post(`/api/v1/tracking/applications/${selectedApplicationId}/tags`, {
            comment: tagComment.trim(),
        });
        setTagComment('');
        await refreshTrackingData();
    }

    async function saveTagComment(tagId: string) {
        const comment = tagDrafts[tagId]?.trim();
        if (!comment) return;

        await api.patch(`/api/v1/tracking/tags/${tagId}/comment`, { comment });
        await refreshTrackingData();
    }

    async function deleteTag(tagId: string) {
        await api.delete(`/api/v1/tracking/tags/${tagId}`);
        await refreshTrackingData();
    }

    function addTagToFunnel(tagId: string) {
        setSelectedFunnelTagIds((current) => (current.includes(tagId) ? current : [...current, tagId]));
    }

    function moveSelectedTag(index: number, direction: -1 | 1) {
        setSelectedFunnelTagIds((current) => {
            const next = [...current];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= next.length) {
                return current;
            }
            [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            return next;
        });
    }

    function removeSelectedTag(tagId: string) {
        setSelectedFunnelTagIds((current) => current.filter((currentTagId) => currentTagId !== tagId));
    }

    async function createFunnel() {
        if (!selectedApplicationId || !funnelComment.trim() || selectedFunnelTagIds.length === 0) {
            return;
        }

        await api.post(`/api/v1/tracking/applications/${selectedApplicationId}/funnels`, {
            comment: funnelComment.trim(),
            tagIds: selectedFunnelTagIds,
        });
        setFunnelComment('');
        setSelectedFunnelTagIds([]);
        await refreshTrackingData();
    }

    async function saveFunnelComment(funnelId: string) {
        const comment = funnelDrafts[funnelId]?.trim();
        if (!comment) return;

        await api.patch(`/api/v1/tracking/funnels/${funnelId}/comment`, { comment });
        await refreshTrackingData();
    }

    async function deleteFunnel(funnelId: string) {
        await api.delete(`/api/v1/tracking/funnels/${funnelId}`);
        await refreshTrackingData();
    }

    if (isLoading) {
        return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">{t('loadingSession')}</div>;
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
                <p className="text-sm">{t('notAuthenticated')}</p>
                <Link href="/login" className="mt-4 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
                    {t('goToLogin')}
                </Link>
            </div>
        );
    }

    const selectedTags = selectedFunnelTagIds
        .map((tagId) => tags.find((tag) => tag.tagId === tagId))
        .filter(Boolean) as TrackingTag[];

    function getTagComment(tagId: string) {
        return tags.find((tag) => tag.tagId === tagId)?.comment ?? tagId;
    }

    const primaryCount = mode === 'tags' ? tags.length : funnels.length;
    const secondaryCount = mode === 'tags' ? funnels.length : tags.length;
    const tertiaryCount = mode === 'tags' ? availableTagIds.length : selectedTags.length;

    const navItems = [
        { href: '/tags', label: tNav('tags') },
        { href: '/funnels', label: tNav('funnels') },
    ];

    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-subtle bg-bg-card/70 p-1.5">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive
                                ? 'bg-accent text-[#05070d]'
                                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            <div className="flex items-center justify-between border-b border-border-subtle bg-[var(--bg-page)] px-6 py-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-text-primary">
                        {mode === 'tags' ? t('tagsTitle') : t('funnelsTitle')}
                    </h1>
                    <span className="text-xl text-text-tertiary">/</span>
                    <span className="text-sm text-text-secondary">
                        {t('appActive')}: {selectedApplication?.name ?? tCommon('notAvailable')}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-card/50 px-3 py-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                        </span>
                        <span className="font-mono text-sm font-bold text-accent">{primaryCount}</span>
                        <span className="text-xs text-text-secondary">
                            {mode === 'tags' ? t('existingTags') : t('existingFunnels')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-card/50 px-3 py-1.5">
                        <span className="font-mono text-sm font-bold text-accent-secondary">{secondaryCount}</span>
                        <span className="text-xs text-text-secondary">
                            {mode === 'tags' ? t('existingFunnels') : t('existingTags')}
                        </span>
                    </div>
                </div>
            </div>

            {error ? (
                <Card className="border-danger/20 bg-danger/10 text-danger">
                    {error}
                </Card>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card>
                    <div className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                        {mode === 'tags' ? t('existingTags') : t('existingFunnels')}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold text-text-primary">{primaryCount}</span>
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">
                        {mode === 'tags' ? t('tagIdAuto') : t('funnelSteps', { count: primaryCount })}
                    </p>
                </Card>

                <Card>
                    <div className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                        {mode === 'tags' ? t('existingFunnels') : t('existingTags')}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold text-text-primary">{secondaryCount}</span>
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">
                        {mode === 'tags' ? t('funnelSteps', { count: funnels.length }) : t('tagIdAuto')}
                    </p>
                </Card>

                <Card>
                    <div className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                        {mode === 'tags' ? t('availableTags') : t('selectedSteps')}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold text-text-primary">{tertiaryCount}</span>
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">
                        {mode === 'tags' ? t('context') : t('addTagsHint')}
                    </p>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card className="space-y-5">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">{t('context')}</p>
                        {loadingState ? <p className="mt-3 text-sm text-text-secondary">{loadingState}</p> : null}
                    </div>

                    {user.role === 'admin' ? (
                        <label className="block space-y-2 text-sm">
                            <span className="text-text-secondary">{t('company')}</span>
                            <select
                                value={selectedCompanyId}
                                onChange={(event) => setSelectedCompanyId(event.target.value)}
                                className="w-full rounded-xl border border-border-subtle bg-bg-card px-4 py-3 text-text-primary outline-none"
                            >
                                {companies.map((company) => (
                                    <option key={company._id} value={company._id} className="bg-slate-950">
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <label className="block space-y-2 text-sm">
                        <span className="text-text-secondary">{t('application')}</span>
                        <select
                            value={selectedApplicationId}
                            onChange={(event) => setSelectedApplicationId(event.target.value)}
                            className="w-full rounded-xl border border-border-subtle bg-bg-card px-4 py-3 text-text-primary outline-none"
                        >
                            {applications.map((application) => (
                                <option key={application._id} value={application._id} className="bg-slate-950">
                                    {application.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {mode === 'tags' ? (
                        <div className="space-y-4">
                            <div className="text-xs font-medium uppercase tracking-widest text-text-secondary">{t('createTag')}</div>
                            <label className="block space-y-2 text-sm">
                                <span className="text-text-secondary">{t('comment')}</span>
                                <input
                                    value={tagComment}
                                    onChange={(event) => setTagComment(event.target.value)}
                                    placeholder={t('tagPlaceholder')}
                                    className="w-full rounded-xl border border-border-subtle bg-bg-card px-4 py-3 text-text-primary outline-none placeholder:text-text-secondary"
                                />
                            </label>
                            <button
                                onClick={createTag}
                                className="rounded-lg border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-[#05070d]"
                            >
                                {t('generateTag')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-xs font-medium uppercase tracking-widest text-text-secondary">{t('createFunnel')}</div>
                            <label className="block space-y-2 text-sm">
                                <span className="text-text-secondary">{t('comment')}</span>
                                <input
                                    value={funnelComment}
                                    onChange={(event) => setFunnelComment(event.target.value)}
                                    placeholder={t('funnelPlaceholder')}
                                    className="w-full rounded-xl border border-border-subtle bg-bg-card px-4 py-3 text-text-primary outline-none placeholder:text-text-secondary"
                                />
                            </label>
                            <Card className="space-y-3">
                                <p className="text-sm font-semibold text-text-primary">{t('selectedSteps')}</p>
                                {selectedTags.length === 0 ? (
                                    <p className="text-sm text-text-secondary">{t('addTagsHint')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedTags.map((tag, index) => (
                                            <div key={tag.tagId} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-card px-3 py-2">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                                                    {index + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm text-text-primary">{tag.comment}</p>
                                                    <p className="text-[11px] text-text-secondary">{t('selectedSteps')}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button type="button" aria-label={tCommon('moveUp')} onClick={() => moveSelectedTag(index, -1)} className="rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary">↑</button>
                                                    <button type="button" aria-label={tCommon('moveDown')} onClick={() => moveSelectedTag(index, 1)} className="rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary">↓</button>
                                                    <button type="button" aria-label={tCommon('removeItem')} onClick={() => removeSelectedTag(tag.tagId)} className="rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                            <button
                                onClick={createFunnel}
                                className="rounded-lg border border-accent-secondary bg-accent-secondary px-4 py-2.5 text-sm font-medium text-[#05070d]"
                            >
                                {t('saveFunnel')}
                            </button>
                        </div>
                    )}

                    <Card className="border-amber-400/20 bg-amber-400/10 text-amber-50">
                        {mode === 'tags' ? t('noticeTag') : t('noticeFunnel')}
                    </Card>
                </Card>

                <div className="space-y-6">
                    <Card className="space-y-4">
                        <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                            {mode === 'tags' ? t('existingTags') : t('existingFunnels')}
                        </p>

                        {mode === 'tags' ? (
                            <div className="space-y-3">
                                {tags.length === 0 ? (
                                    <p className="rounded-xl border border-border-subtle bg-bg-card p-4 text-sm text-text-secondary">
                                        {t('noTags')}
                                    </p>
                                ) : (
                                    tags.map((tag) => (
                                        <Card key={tag.tagId} className="space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-text-primary">{tag.comment}</p>
                                                    <p className="mt-1 text-xs text-text-secondary font-mono">{tag.tagId}</p>
                                                </div>
                                                <button
                                                    onClick={() => deleteTag(tag.tagId)}
                                                    className="rounded-lg border border-border-subtle px-3 py-1 text-xs text-text-secondary"
                                                >
                                                    {t('softDelete')}
                                                </button>
                                            </div>
                                            <div className="flex gap-3">
                                                <input
                                                    value={tagDrafts[tag.tagId] ?? ''}
                                                    onChange={(event) =>
                                                        setTagDrafts((current) => ({ ...current, [tag.tagId]: event.target.value }))
                                                    }
                                                    className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none"
                                                />
                                                <button
                                                    onClick={() => saveTagComment(tag.tagId)}
                                                    className="rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-medium text-[#05070d]"
                                                >
                                                    {t('save')}
                                                </button>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {funnels.length === 0 ? (
                                    <p className="rounded-xl border border-border-subtle bg-bg-card p-4 text-sm text-text-secondary">
                                        {t('noFunnels')}
                                    </p>
                                ) : (
                                    funnels.map((funnel) => (
                                        <Card key={funnel.funnelId} className="space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-text-primary">{funnel.comment}</p>
                                                    <p className="mt-1 text-xs text-text-secondary font-mono">{funnel.funnelId}</p>
                                                    <p className="mt-1 text-xs text-text-secondary">{t('funnelSteps', { count: funnel.steps.length })}</p>
                                                </div>
                                                <button
                                                    onClick={() => deleteFunnel(funnel.funnelId)}
                                                    className="rounded-lg border border-border-subtle px-3 py-1 text-xs text-text-secondary"
                                                >
                                                    {t('softDelete')}
                                                </button>
                                            </div>
                                            <div className="flex gap-3">
                                                <input
                                                    value={funnelDrafts[funnel.funnelId] ?? ''}
                                                    onChange={(event) =>
                                                        setFunnelDrafts((current) => ({ ...current, [funnel.funnelId]: event.target.value }))
                                                    }
                                                    className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none"
                                                />
                                                <button
                                                    onClick={() => saveFunnelComment(funnel.funnelId)}
                                                    className="rounded-lg border border-accent-secondary bg-accent-secondary px-4 py-2 text-sm font-medium text-[#05070d]"
                                                >
                                                    {t('save')}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {funnel.steps
                                                    .slice()
                                                    .sort((a, b) => a.position - b.position)
                                                    .map((step) => (
                                                        <span
                                                            key={`${funnel.funnelId}-${step.position}`}
                                                            className="rounded-full border border-border-subtle bg-bg-card px-3 py-1 text-xs text-text-secondary"
                                                        >
                                                            {step.position}. {getTagComment(step.tagId)}
                                                        </span>
                                                    ))}
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </Card>

                    {mode === 'funnels' ? (
                        <Card className="space-y-3">
                            <p className="text-sm font-semibold text-text-primary">{t('availableTags')}</p>
                            <div className="flex flex-wrap gap-2">
                                {availableTagIds.map((tagId) => (
                                    <button
                                        key={tagId}
                                        onClick={() => addTagToFunnel(tagId)}
                                        className="rounded-full border border-border-subtle bg-bg-card px-3 py-1 text-xs text-text-secondary"
                                    >
                                        + {getTagComment(tagId)}
                                    </button>
                                ))}
                            </div>
                        </Card>
                    ) : null}
                </div>
            </div>
        </div>
    );
}