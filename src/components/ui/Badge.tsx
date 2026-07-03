import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type BadgeTone =
  | 'brand'
  | 'accent'
  | 'green'
  | 'red'
  | 'gray'
  | 'blue'
  | 'amber';

const tones: Record<BadgeTone, string> = {
  brand: 'bg-brand-100 text-brand-800 border-brand-200',
  accent: 'bg-accent-100 text-accent-800 border-accent-200',
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  gray: 'bg-plane text-ink-secondary border-hairline',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
};

export function Badge({
  tone = 'gray',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
