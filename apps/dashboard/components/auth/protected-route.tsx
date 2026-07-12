'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { FullPageSpinner } from '@/components/ui/spinner';
import { userAgent } from 'next/server';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role === 'admin') {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
