import { cn } from '@/lib/utils';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink">
      {children}
      {hint ? <span className="ml-1.5 font-normal text-ink-muted">{hint}</span> : null}
    </label>
  );
}

const baseField =
  'w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink placeholder:text-ink-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:bg-plane disabled:text-ink-muted';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseField, 'h-10', className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(baseField, 'h-10', className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseField, 'py-2.5 leading-6', className)} {...props} />;
}

export function FieldGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('space-y-1', className)}>{children}</div>;
}
