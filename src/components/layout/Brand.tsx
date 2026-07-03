import { cn } from '@/lib/utils';

/** Britten Akademi logotipi */
export function Brand({
  onDark,
  size = 'md',
}: {
  onDark?: boolean;
  size?: 'md' | 'lg';
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center rounded-lg font-semibold',
          size === 'lg' ? 'h-11 w-11 text-lg' : 'h-9 w-9 text-base',
          onDark ? 'bg-gold-500 text-navy-950' : 'bg-navy-900 text-gold-300'
        )}
      >
        BA
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            'block font-semibold tracking-tight',
            size === 'lg' ? 'text-lg' : 'text-[15px]',
            onDark ? 'text-white' : 'text-ink'
          )}
        >
          Britten Akademi
        </span>
        <span
          className={cn(
            'block text-[11px] font-medium uppercase tracking-[0.14em]',
            onDark ? 'text-navy-300' : 'text-ink-muted'
          )}
        >
          Birebir İngilizce
        </span>
      </span>
    </span>
  );
}
