import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** İstatistik kutusu — dataviz "stat tile" düzeni */
export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
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
        {Icon ? <Icon className="h-4 w-4 text-navy-400" aria-hidden /> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-1 text-[13px] text-ink-secondary">{sub}</p> : null}
    </div>
  );
}
