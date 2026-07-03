'use client';

import { useActionState } from 'react';
import { signIn } from '@/lib/actions/auth';
import { FieldGroup, Input, Label } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { ActionResult } from '@/lib/types';

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => signIn(formData),
    { ok: false, message: initialMessage }
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <FieldGroup>
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ornek@eposta.com"
          required
        />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </FieldGroup>
      <FormMessage ok={false} message={state.message} />
      <SubmitButton className="w-full" size="lg">
        Giriş Yap
      </SubmitButton>
    </form>
  );
}
