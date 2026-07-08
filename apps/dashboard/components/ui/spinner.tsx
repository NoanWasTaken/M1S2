type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-[var(--border-subtle)] border-t-[var(--accent)] ${sizes[size]}`}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
      <Spinner size="lg" />
    </div>
  );
}
