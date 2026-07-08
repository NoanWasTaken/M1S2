import { LanguageSelector } from '@/components/ui/language-selector';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[var(--bg-page)] p-4">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
