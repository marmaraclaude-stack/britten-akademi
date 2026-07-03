'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { updateStudent } from '@/lib/actions/students';
import { CEFR_LABELS, cn, STUDENT_COLORS } from '@/lib/utils';
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
    color: string | null;
  };
}) {
  const router = useRouter();
  const [color, setColor] = useState(student.color ?? '');
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

      <FieldGroup>
        <Label hint="(takvimde bu öğrencinin dersleri bu renkle görünür)">
          Takvim rengi
        </Label>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap items-center gap-2">
          {STUDENT_COLORS.map((c) => {
            const active = color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                title={c.label}
                aria-pressed={active}
                onClick={() => setColor(active ? '' : c.value)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-transform',
                  active
                    ? 'scale-110 ring-2 ring-ink ring-offset-2'
                    : 'hover:scale-110'
                )}
                style={{ backgroundColor: c.value }}
              >
                {active ? (
                  <Check className="h-4 w-4 text-white" aria-hidden />
                ) : null}
              </button>
            );
          })}
          {color ? (
            <button
              type="button"
              onClick={() => setColor('')}
              className="text-[12px] font-medium text-ink-muted hover:text-ink"
            >
              Rengi kaldır
            </button>
          ) : (
            <span className="text-[12px] text-ink-muted">Renk seçilmedi</span>
          )}
        </div>
      </FieldGroup>

      <FormMessage ok={state.ok} message={state.message} />

      <SubmitButton size="sm">Kaydet</SubmitButton>
    </form>
  );
}
