'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type PageEnterProps = {
  children: ReactNode;
  className?: string;
};

export function PageEnter({ children, className = '' }: PageEnterProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={`page-enter flex min-h-0 flex-1 flex-col ${className}`}>
      {children}
    </div>
  );
}
