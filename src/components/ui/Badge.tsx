import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type BadgeTone =
  | 'navy'
  | 'gold'
  | 'green'
  | 'red'
  | 'gray'
  | 'blue'
  | 'amber';

const tones: Record<BadgeTone, string> = {
  navy: 'bg-navy-100 text-navy-800 border-navy-200',
  gold: 'bg-gold-100 text-gold-800 border-gold-200',
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
