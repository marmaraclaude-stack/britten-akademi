'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { createStudent } from '@/lib/actions/students';
import { FieldGroup, Input, Label } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { ActionResult } from '@/lib/types';

export function NewStudentForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => createStudent(formData),
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-5">
      <FieldGroup>
        <Label htmlFor="ns-name">Ad soyad</Label>
        <Input id="ns-name" name="full_name" placeholder="Ayşe Yılmaz" required />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="ns-email">E-posta</Label>
        <Input
          id="ns-email"
          name="email"
          type="email"
          placeholder="ornek@eposta.com"
          autoComplete="off"
          required
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="ns-phone" hint="(isteğe bağlı)">
          Telefon
        </Label>
        <Input id="ns-phone" name="phone" type="tel" placeholder="0555 123 45 67" />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="ns-password" hint="(en az 8 karakter)">
          Geçici şifre
        </Label>
        <Input
          id="ns-password"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
        <p className="text-[12px] leading-5 text-ink-muted">
          Geçici şifreyi öğrencinizle güvenli bir kanaldan paylaşın.
        </p>
      </FieldGroup>

      <FormMessage ok={state.ok} message={state.message} />

      {state.ok ? (
        <Link
          href="/ogretmen/ogrenciler"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline"
        >
          Öğrenci listesine dön
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}

      <SubmitButton className="w-full">Hesabı Oluştur</SubmitButton>
    </form>
  );
}
