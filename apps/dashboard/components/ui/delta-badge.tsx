type DeltaBadgeProps = {
  value: number;
  isInverse?: boolean;
};

export function DeltaBadge({ value, isInverse = false }: DeltaBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-text-tertiary/10 px-1.5 py-0.5 text-xs font-medium text-text-tertiary">
        0%
      </span>
    );
  }

  const effectivePositive = isInverse ? isNegative : isPositive;

  const colorClass = effectivePositive
    ? 'bg-success/10 text-success'
    : 'bg-danger/10 text-danger';

  const arrow = isPositive ? '\u2197' : '\u2198';
  const formatted = `${isPositive ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-mono font-medium ${colorClass}`}
    >
      {arrow}
      {formatted}
    </span>
  );
}
