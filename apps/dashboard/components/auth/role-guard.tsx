'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { FullPageSpinner } from '@/components/ui/spinner';

type Props = {
    children: ReactNode;
    ownerOnly?: boolean;
    fallback?: ReactNode;
};

export function RoleGuard({ children, ownerOnly, fallback }: Props) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const isMember = user?.role === 'webmaster' && user?.teamRole === 'member';
    const denied = ownerOnly && isMember;

    useEffect(() => {
        if (!isLoading && denied && !fallback) {
            router.push('/dashboard');
        }
    }, [isLoading, denied, fallback, router]);

    if (isLoading) return <FullPageSpinner />;
    if (denied) return <>{fallback ?? null}</>;

    return <>{children}</>;
}