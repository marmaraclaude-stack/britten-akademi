import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatTone = 'brand' | 'accent' | 'green' | 'amber' | 'gray';

const chipTones: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  gray: 'bg-plane text-ink-muted',
};

/** İstatistik kutusu; dataviz "stat tile" düzeni */
export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'brand',
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-hairline bg-surface p-5 shadow-card',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              chipTones[tone]
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-1 text-[13px] text-ink-secondary">{sub}</p> : null}
    </div>
  );
}
