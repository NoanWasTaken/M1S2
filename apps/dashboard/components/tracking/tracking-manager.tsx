'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

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

    const [loadingState, setLoadingState] = useState('Chargement...');
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
                setLoadingState('Chargement des applications...');

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
                        setLoadingState('Aucune entreprise disponible');
                        return;
                    }

                    const appRes = await api.get('/api/v1/applications', { params: { companyId } });
                    if (cancelled) return;

                    const nextApplications = appRes.data.applications as Application[];
                    setApplications(nextApplications);
                    const appId = nextApplications[0]?._id || '';
                    setSelectedApplicationId(appId);
                    setLoadingState(appId ? '' : 'Aucune application disponible');
                    return;
                }

                const { data } = await api.get('/api/v1/applications');
                if (cancelled) return;

                const nextApplications = data.applications as Application[];
                setApplications(nextApplications);
                setSelectedApplicationId(nextApplications[0]?._id || '');
                setLoadingState(nextApplications[0]?._id ? '' : 'Aucune application disponible');
            } catch {
                if (cancelled) return;
                setError('Impossible de charger les applications.');
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
                setError('Impossible de charger les tags et funnels.');
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
        return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Chargement de la session...</div>;
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
                <p className="text-sm">Vous devez être connecté pour gérer les tracking tags et funnels.</p>
                <Link href="/login" className="mt-4 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
                    Aller à la connexion
                </Link>
            </div>
        );
    }

    const selectedTags = selectedFunnelTagIds
        .map((tagId) => tags.find((tag) => tag.tagId === tagId))
        .filter(Boolean) as TrackingTag[];

    return (
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-10 lg:px-12">
            <header className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className={`text-xs uppercase tracking-[0.3em] ${mode === 'tags' ? 'text-cyan-200/80' : 'text-emerald-200/80'}`}>
                            {mode === 'tags' ? 'Tracking tags' : 'Conversion funnels'}
                        </p>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {mode === 'tags'
                                ? 'Des balises simples, stables et traçables.'
                                : 'Un tunnel est une séquence ordonnée de tags.'}
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
                            {mode === 'tags'
                                ? 'Créer des tags avec un ID autogénéré, les modifier uniquement sur le commentaire et conserver un historique via soft delete.'
                                : 'Composer des funnels en choisissant des tags existants dans un ordre précis, puis suivre les conversions et les abandons.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-white/70">
                        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                            {user.role === 'admin' ? 'Mode admin' : 'Mode webmaster'}
                        </span>
                        {selectedApplication ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                App active: {selectedApplication.name}
                            </span>
                        ) : null}
                    </div>
                </div>
            </header>

            {error ? (
                <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <article className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/45">Contexte</p>

                    {user.role === 'admin' ? (
                        <label className="mt-5 block space-y-2 text-sm">
                            <span className="text-white/65">Entreprise</span>
                            <select
                                value={selectedCompanyId}
                                onChange={(event) => setSelectedCompanyId(event.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
                            >
                                {companies.map((company) => (
                                    <option key={company._id} value={company._id} className="bg-slate-950">
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <label className="mt-5 block space-y-2 text-sm">
                        <span className="text-white/65">Application</span>
                        <select
                            value={selectedApplicationId}
                            onChange={(event) => setSelectedApplicationId(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
                        >
                            {applications.map((application) => (
                                <option key={application._id} value={application._id} className="bg-slate-950">
                                    {application.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {loadingState ? <p className="mt-4 text-sm text-white/45">{loadingState}</p> : null}

                    {mode === 'tags' ? (
                        <div className="mt-8 space-y-4">
                            <p className="text-sm uppercase tracking-[0.2em] text-white/45">Créer un tag</p>
                            <label className="block space-y-2 text-sm">
                                <span className="text-white/65">Commentaire</span>
                                <input
                                    value={tagComment}
                                    onChange={(event) => setTagComment(event.target.value)}
                                    placeholder="Ex: CTA pricing, hero click, trial started"
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/60"
                                />
                            </label>
                            <button
                                onClick={createTag}
                                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                            >
                                Générer le tag
                            </button>
                        </div>
                    ) : (
                        <div className="mt-8 space-y-4">
                            <p className="text-sm uppercase tracking-[0.2em] text-white/45">Composer un funnel</p>
                            <label className="block space-y-2 text-sm">
                                <span className="text-white/65">Commentaire</span>
                                <input
                                    value={funnelComment}
                                    onChange={(event) => setFunnelComment(event.target.value)}
                                    placeholder="Ex: conversion checkout V1"
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/60"
                                />
                            </label>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-sm font-medium text-white">Étapes sélectionnées</p>
                                {selectedTags.length === 0 ? (
                                    <p className="mt-2 text-sm text-white/45">Ajoute des tags depuis la liste de droite.</p>
                                ) : (
                                    <div className="mt-3 space-y-3">
                                        {selectedTags.map((tag, index) => (
                                            <div key={tag.tagId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-semibold text-emerald-200">{index + 1}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm text-white">{tag.comment}</p>
                                                    <p className="font-mono text-[11px] text-white/45">{tag.tagId}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => moveSelectedTag(index, -1)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">↑</button>
                                                    <button onClick={() => moveSelectedTag(index, 1)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">↓</button>
                                                    <button onClick={() => removeSelectedTag(tag.tagId)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={createFunnel}
                                className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                            >
                                Enregistrer le funnel
                            </button>
                        </div>
                    )}

                    <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50/90">
                        {mode === 'tags'
                            ? 'Après création, l’ID du tag reste figé et seule la note peut être modifiée.'
                            : 'Après création, la liste ordonnée des tags reste figée et seule la note peut être modifiée.'}
                    </div>
                </article>

                <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                    {mode === 'tags' ? (
                        <>
                            <p className="text-sm uppercase tracking-[0.2em] text-white/45">Tags existants</p>
                            <div className="mt-5 space-y-3">
                                {tags.length === 0 ? (
                                    <p className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-6 text-sm text-white/45">
                                        Aucun tag trouvé pour cette application.
                                    </p>
                                ) : (
                                    tags.map((tag) => (
                                        <div key={tag.tagId} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-mono text-xs text-cyan-200">{tag.tagId}</p>
                                                    <p className="mt-1 text-xs text-white/45">ID métier autogénéré</p>
                                                </div>
                                                <button
                                                    onClick={() => deleteTag(tag.tagId)}
                                                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                                                >
                                                    Soft delete
                                                </button>
                                            </div>
                                            <div className="mt-4 flex gap-3">
                                                <input
                                                    value={tagDrafts[tag.tagId] ?? ''}
                                                    onChange={(event) =>
                                                        setTagDrafts((current) => ({ ...current, [tag.tagId]: event.target.value }))
                                                    }
                                                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                                                />
                                                <button
                                                    onClick={() => saveTagComment(tag.tagId)}
                                                    className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                                                >
                                                    Sauver
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm uppercase tracking-[0.2em] text-white/45">Funnels existants</p>
                            <div className="mt-5 space-y-3">
                                {funnels.length === 0 ? (
                                    <p className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-6 text-sm text-white/45">
                                        Aucun funnel trouvé pour cette application.
                                    </p>
                                ) : (
                                    funnels.map((funnel) => (
                                        <div key={funnel.funnelId} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-mono text-xs text-emerald-200">{funnel.funnelId}</p>
                                                    <p className="mt-1 text-xs text-white/45">{funnel.steps.length} étapes</p>
                                                </div>
                                                <button
                                                    onClick={() => deleteFunnel(funnel.funnelId)}
                                                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                                                >
                                                    Soft delete
                                                </button>
                                            </div>
                                            <div className="mt-4 flex gap-3">
                                                <input
                                                    value={funnelDrafts[funnel.funnelId] ?? ''}
                                                    onChange={(event) =>
                                                        setFunnelDrafts((current) => ({ ...current, [funnel.funnelId]: event.target.value }))
                                                    }
                                                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                                                />
                                                <button
                                                    onClick={() => saveFunnelComment(funnel.funnelId)}
                                                    className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
                                                >
                                                    Sauver
                                                </button>
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {funnel.steps
                                                    .slice()
                                                    .sort((a, b) => a.position - b.position)
                                                    .map((step) => (
                                                        <span
                                                            key={`${funnel.funnelId}-${step.position}`}
                                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                                                        >
                                                            {step.position}. {step.tagId}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                                <p className="text-sm font-medium text-white">Tags disponibles à ajouter</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {availableTagIds.map((tagId) => (
                                        <button
                                            key={tagId}
                                            onClick={() => addTagToFunnel(tagId)}
                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                                        >
                                            + {tagId}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </article>
            </section>
        </div>
    );
}