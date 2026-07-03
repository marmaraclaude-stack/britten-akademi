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
          onDark ? 'bg-white text-brand-800' : 'bg-brand-800 text-white'
        )}
      >
        BA
      </span>
      <span
        className={cn(
          'font-semibold tracking-tight',
          size === 'lg' ? 'text-lg' : 'text-[15px]',
          onDark ? 'text-white' : 'text-ink'
        )}
      >
        Britten Akademi
      </span>
    </span>
  );
}
