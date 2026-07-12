'use client';

import { useEffect, useRef, useState } from 'react';

const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/realtime/stream`;

export type PendingCompanyEvent = {
    companyId: string;
    companyName: string;
    webmasterEmail: string;
    createdAt: string;
};

type Options = {
    onPendingCompany?: (payload: PendingCompanyEvent) => void;
};

export function useAdminStream(options: Options = {}) {
    const [pending, setPending] = useState<number | null>(null);
    const cbRef = useRef<Options['onPendingCompany']>(undefined);

    useEffect(() => {
        cbRef.current = options.onPendingCompany;
    }, [options.onPendingCompany]);

    useEffect(() => {
        const es = new EventSource(SSE_URL, { withCredentials: true });

        es.addEventListener('company:pending', (e) => {
            const payload = JSON.parse((e as MessageEvent).data) as PendingCompanyEvent;
            setPending((p) => (p ?? 0) + 1);
            cbRef.current?.(payload);
        });

        es.addEventListener('company:pending-count', (e) => {
            const { pending: count } = JSON.parse((e as MessageEvent).data) as { pending: number };
            setPending(count);
        });

        return () => es.close();
    }, []);

    return { pending, setPending };
}