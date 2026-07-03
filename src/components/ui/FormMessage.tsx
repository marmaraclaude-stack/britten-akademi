import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Server action sonucunu form altında gösterir. */
export function FormMessage({
  ok,
  message,
  className,
}: {
  ok?: boolean;
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] leading-5',
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-red-200 bg-red-50 text-red-900',
        className
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      {message}
    </p>
  );
}
