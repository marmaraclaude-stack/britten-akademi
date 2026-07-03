'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { updateStudent } from '@/lib/actions/students';
import { CEFR_LABELS } from '@/lib/utils';
import type { ActionResult, CefrLevel } from '@/lib/types';
import { FieldGroup, Input, Label, Select } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

const CEFR_ORDER: CefrLevel[] = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function EditStudentForm({
  student,
}: {
  student: {
    id: string;
    full_name: string;
    phone: string | null;
    cefr_level: CefrLevel | null;
  };
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const res = await updateStudent(student.id, formData);
      if (res.ok) router.refresh();
      return res;
    },
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup>
        <Label htmlFor="es-name">Ad soyad</Label>
        <Input id="es-name" name="full_name" defaultValue={student.full_name} required />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="es-phone" hint="(isteğe bağlı)">
          Telefon
        </Label>
        <Input
          id="es-phone"
          name="phone"
          type="tel"
          defaultValue={student.phone ?? ''}
          placeholder="0555 123 45 67"
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="es-level" hint="(elle güncelleyebilirsiniz)">
          CEFR seviyesi
        </Label>
        <Select id="es-level" name="cefr_level" defaultValue={student.cefr_level ?? ''}>
          <option value="">Belirlenmedi</option>
          {CEFR_ORDER.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl === 'PreA1' ? 'Pre-A1' : lvl} · {CEFR_LABELS[lvl]}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FormMessage ok={state.ok} message={state.message} />

      <SubmitButton size="sm">Kaydet</SubmitButton>
    </form>
  );
}
