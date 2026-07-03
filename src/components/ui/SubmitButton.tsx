'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from './Button';

/** Form gönderimi sırasında kendini kilitleyen buton. */
export function SubmitButton({
  children,
  disabled,
  ...props
}: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
