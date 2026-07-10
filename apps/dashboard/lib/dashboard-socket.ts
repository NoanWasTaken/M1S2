'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/api-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type DashboardUpdate = {
    accountId: string;
    activeVisitors: number;
    computedAt: string;
};

type UseDashboardSocketOptions = {
    // Called on every dashboard:update
    onUpdate?: (payload: DashboardUpdate) => void;
};

type UseDashboardSocketResult = {
    connected: boolean;
    activeVisitors: number | null;
};

export function useDashboardSocket(
    options: UseDashboardSocketOptions = {},
): UseDashboardSocketResult {
    const [connected, setConnected] = useState(false);
    const [activeVisitors, setActiveVisitors] = useState<number | null>(null);

    // Keep the latest onUpdate without re-opening the socket
    const onUpdateRef = useRef<UseDashboardSocketOptions['onUpdate']>(undefined);

    useEffect(() => {
        onUpdateRef.current = options.onUpdate;
    }, [options.onUpdate]);

    const token = getAccessToken();

    useEffect(() => {
        if (!token) return;

        const socket: Socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', () => setConnected(false));

        socket.on('dashboard:update', (payload: DashboardUpdate) => {
            setActiveVisitors(payload.activeVisitors);
            onUpdateRef.current?.(payload);
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    return { connected, activeVisitors };
}