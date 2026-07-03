import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-hairline bg-surface px-6 py-12 text-center">
      {Icon ? (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50">
          <Icon className="h-5 w-5 text-brand-400" aria-hidden />
        </div>
      ) : null}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-[13px] leading-5 text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
