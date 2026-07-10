'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export type Application = {
    _id: string;
    name: string;
    appId: string;
    appSecretPrefix: string | null;
    allowedOrigins: string[];
    createdAt: string;
};

type ApplicationContextValue = {
    applications: Application[];
    selectedAppId: string | null; // the appId (app_xxx)
    selectedApp: Application | null;
    setSelectedAppId: (appId: string | null) => void;
    refresh: () => Promise<void>;
    loading: boolean;
};

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

const STORAGE_KEY = 'selectedAppId';

function readStored(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedAppId, setSelectedAppIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const setSelectedAppId = useCallback((appId: string | null) => {
        setSelectedAppIdState(appId);
        try {
            if (appId) localStorage.setItem(STORAGE_KEY, appId);
            else localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
    }, []);

    const refresh = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/applications');
            const apps: Application[] = res.data.applications ?? [];
            setApplications(apps);

            setSelectedAppIdState((current) => {
                if (current && apps.some((a) => a.appId === current)) return current;
                const stored = readStored();
                if (stored && apps.some((a) => a.appId === stored)) return stored;
                return apps[0]?.appId ?? null;
            });
        } catch {
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const selectedApp = applications.find((a) => a.appId === selectedAppId) ?? null;

    return (
        <ApplicationContext.Provider
            value={{ applications, selectedAppId, selectedApp, setSelectedAppId, refresh, loading }}
        >
            {children}
        </ApplicationContext.Provider>
    );
}

export function useApplications(): ApplicationContextValue {
    const ctx = useContext(ApplicationContext);
    if (!ctx) throw new Error('useApplications must be used within an ApplicationProvider');
    return ctx;
}