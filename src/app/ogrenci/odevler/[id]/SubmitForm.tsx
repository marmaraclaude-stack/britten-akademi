'use client';

import { useActionState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { submitAssignment } from '@/lib/actions/assignments';
import type { ActionResult } from '@/lib/types';
import { FieldGroup, Input, Label, Textarea } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

/** Ödev teslim / teslim güncelleme formu (dosya yüklemeli). */
export function SubmitForm({
  assignmentId,
  existing,
}: {
  assignmentId: string;
  existing: { content: string | null; attachmentName: string | null } | null;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => submitAssignment(formData),
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignment_id" value={assignmentId} />

      <FieldGroup>
        <Label htmlFor="sf-content">Cevabın</Label>
        <Textarea
          id="sf-content"
          name="content"
          rows={8}
          placeholder="Cevabını buraya yaz…"
          defaultValue={existing?.content ?? ''}
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="sf-file" hint="(isteğe bağlı)">
          Dosya ekle
        </Label>
        <Input
          id="sf-file"
          name="file"
          type="file"
          className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-navy-800"
        />
        {existing?.attachmentName ? (
          <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Paperclip className="h-3 w-3" aria-hidden />
            Mevcut ek: {existing.attachmentName} — yeni bir dosya seçersen
            değiştirilir.
          </p>
        ) : null}
      </FieldGroup>

      <FormMessage ok={state.ok} message={state.message} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {existing ? (
          <p className="text-[12px] text-ink-muted">
            Öğretmenin notlandırana kadar teslimini güncelleyebilirsin.
          </p>
        ) : (
          <span aria-hidden />
        )}
        <SubmitButton>
          <Send className="h-4 w-4" aria-hidden />
          {existing ? 'Teslimi Güncelle' : 'Ödevi Teslim Et'}
        </SubmitButton>
      </div>
    </form>
  );
}
