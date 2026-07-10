'use client';

type Props = {
  count: number;
};

export function SupportBadge({ count }: Props) {
  if (count === 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
