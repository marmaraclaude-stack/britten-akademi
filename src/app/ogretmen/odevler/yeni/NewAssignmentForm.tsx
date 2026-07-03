'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAssignment } from '@/lib/actions/assignments';
import { SKILL_LABELS } from '@/lib/utils';
import type { Skill } from '@/lib/types';
import { FieldGroup, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function NewAssignmentForm({
  students,
}: {
  students: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const submit = async (formData: FormData) => {
    setError(null);
    const res = await createAssignment(formData);
    if (res.ok) {
      router.push('/ogretmen/odevler');
      router.refresh();
    } else {
      setError(res.message ?? 'Ödev oluşturulamadı.');
    }
  };

  if (students.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Ödev vermek için önce aktif bir öğrenci hesabı oluşturun.
      </p>
    );
  }

  return (
    <form action={submit} className="space-y-4">
      <FieldGroup>
        <Label htmlFor="na-student">Öğrenci</Label>
        <Select id="na-student" name="student_id" required defaultValue={students[0].id}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="na-title">Başlık</Label>
        <Input
          id="na-title"
          name="title"
          placeholder="Present Perfect alıştırmaları"
          required
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="na-desc" hint="(öğrenci görür)">
          Açıklama
        </Label>
        <Textarea
          id="na-desc"
          name="description"
          rows={4}
          placeholder="Ödevin kapsamı, beklentiler, kaynaklar…"
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="na-skill">Beceri</Label>
        <Select id="na-skill" name="skill" defaultValue="general">
          {(Object.keys(SKILL_LABELS) as Skill[]).map((s) => (
            <option key={s} value={s}>
              {SKILL_LABELS[s]}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label htmlFor="na-date" hint="(isteğe bağlı)">
            Son teslim tarihi
          </Label>
          <Input id="na-date" name="due_date" type="date" />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="na-time">Saat</Label>
          <Input id="na-time" name="due_time" type="time" defaultValue="23:59" />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label htmlFor="na-file" hint="(isteğe bağlı, en fazla 20 MB)">
          Ek dosya
        </Label>
        <input
          id="na-file"
          name="file"
          type="file"
          className="block w-full text-sm text-ink-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-navy-800 hover:file:bg-navy-200"
        />
      </FieldGroup>

      {error ? <FormMessage ok={false} message={error} /> : null}

      <SubmitButton className="w-full">Ödevi Ver</SubmitButton>
    </form>
  );
}
