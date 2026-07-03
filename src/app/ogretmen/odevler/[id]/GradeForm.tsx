'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { gradeSubmission } from '@/lib/actions/assignments';
import type { ActionResult } from '@/lib/types';
import { FieldGroup, Input, Label, Textarea } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function GradeForm({
  submissionId,
  grade,
  feedback,
  graded,
}: {
  submissionId: string;
  grade: number | null;
  feedback: string | null;
  graded: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const res = await gradeSubmission(submissionId, formData);
      if (res.ok) router.refresh();
      return res;
    },
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <FieldGroup>
          <Label htmlFor="gf-grade">Not (0–100)</Label>
          <Input
            id="gf-grade"
            name="grade"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={grade ?? ''}
            required
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="gf-feedback" hint="(öğrenci görür)">
            Geri bildirim
          </Label>
          <Textarea
            id="gf-feedback"
            name="feedback"
            rows={3}
            defaultValue={feedback ?? ''}
            placeholder="Güçlü yönler, geliştirilecek noktalar…"
          />
        </FieldGroup>
      </div>

      <FormMessage ok={state.ok} message={state.message} />

      <SubmitButton size="sm">{graded ? 'Notu Güncelle' : 'Notla ve Gönder'}</SubmitButton>
    </form>
  );
}
