import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-navy-800 text-white hover:bg-navy-900 focus-visible:outline-navy-800 disabled:bg-navy-300',
  secondary:
    'bg-white text-navy-800 border border-navy-200 hover:bg-navy-50 focus-visible:outline-navy-800',
  ghost: 'text-navy-700 hover:bg-navy-100/60 focus-visible:outline-navy-800',
  danger:
    'bg-white text-status-critical border border-status-critical/30 hover:bg-red-50 focus-visible:outline-status-critical',
  gold: 'bg-gold-500 text-navy-950 hover:bg-gold-400 focus-visible:outline-gold-600 disabled:bg-gold-200',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-11 px-5 text-[15px] rounded-xl gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
