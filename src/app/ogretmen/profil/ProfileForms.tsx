'use client';

import { useActionState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import {
  changeTeacherPassword,
  updateTeacherProfile,
} from '@/lib/actions/profile';
import type { ActionResult } from '@/lib/types';
import { FieldGroup, Input, Label } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function ProfileInfoForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string | null;
  email: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => updateTeacherProfile(formData),
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup>
        <Label htmlFor="pf-name">Ad Soyad</Label>
        <Input id="pf-name" name="full_name" defaultValue={fullName} required />
      </FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="pf-phone" hint="(isteğe bağlı)">
            Telefon
          </Label>
          <Input
            id="pf-phone"
            name="phone"
            type="tel"
            defaultValue={phone ?? ''}
            placeholder="05xx xxx xx xx"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="pf-email" hint="(değiştirilemez)">
            E-posta
          </Label>
          <Input id="pf-email" type="email" value={email} disabled readOnly />
        </FieldGroup>
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <SubmitButton>
        <Save className="h-4 w-4" aria-hidden />
        Kaydet
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => changeTeacherPassword(formData),
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="pw-new" hint="(en az 8 karakter)">
            Yeni şifre
          </Label>
          <Input
            id="pw-new"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="pw-confirm">Yeni şifre (tekrar)</Label>
          <Input
            id="pw-confirm"
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </FieldGroup>
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <SubmitButton variant="secondary">
        <KeyRound className="h-4 w-4" aria-hidden />
        Şifreyi Değiştir
      </SubmitButton>
    </form>
  );
}
