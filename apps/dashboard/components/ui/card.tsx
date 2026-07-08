import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border-subtle bg-bg-card p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
