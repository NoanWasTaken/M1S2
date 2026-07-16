'use client';

import { useAuth } from '@/providers/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { FullPageSpinner } from '@/components/ui/spinner';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role === 'admin' && !pathname.startsWith('/admin')) {
      router.push('/admin/companies');
    }
  }, [isAuthenticated, isLoading, user, router, pathname]);

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
