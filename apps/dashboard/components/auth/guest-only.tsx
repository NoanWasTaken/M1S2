'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { FullPageSpinner } from '@/components/ui/spinner';

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(user?.role === 'admin' ? '/admin/companies' : '/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return null;

  return <>{children}</>;
}
