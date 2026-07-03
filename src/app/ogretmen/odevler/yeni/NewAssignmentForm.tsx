'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Eye, FileText } from 'lucide-react';
import { createAssignment } from '@/lib/actions/assignments';
import { cn, SKILL_LABELS } from '@/lib/utils';
import type { AssignmentKind, Skill } from '@/lib/types';
import { FieldGroup, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

const KIND_OPTIONS: Array<{
  value: AssignmentKind;
  label: string;
  hint: string;
  icon: typeof FileText;
}> = [
  {
    value: 'text',
    label: 'Klasik Ödev',
    hint: 'Açıklama + isteğe bağlı dosya; öğrenci yazarak veya dosyayla teslim eder',
    icon: FileText,
  },
  {
    value: 'html',
    label: 'HTML Ödev',
    hint: 'Kendi hazırladığınız interaktif HTML sayfası ödevin içinde açılır',
    icon: Code2,
  },
];

const HTML_PLACEHOLDER = `<h1>Başlık</h1>
<p>Merhaba {{ogrenci_adi}}! Bu ödevde ...</p>`;

/**
 * Yeni odev formu. kind=html secildiginde kod editoru + canli onizleme
 * yan yana acilir; {{ogrenci_adi}} ve {{seviye}} degiskenleri desteklenir.
 */
export function NewAssignmentForm({
  students,
}: {
  students: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<AssignmentKind>('text');
  const [html, setHtml] = useState('');
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
    <form action={submit} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />

      {/* Tür seçimi */}
      <div className="grid gap-3 sm:grid-cols-2">
        {KIND_OPTIONS.map((opt) => {
          const active = kind === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setKind(opt.value)}
              aria-pressed={active}
              className={cn(
                'flex items-start gap-3 rounded-card border p-4 text-left transition-colors',
                active
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-hairline bg-white hover:border-brand-300'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  active ? 'bg-brand-700 text-white' : 'bg-plane text-ink-muted'
                )}
              >
                <opt.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-5 text-ink-muted">
                  {opt.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="na-student">Öğrenci</Label>
          <Select
            id="na-student"
            name="student_id"
            required
            defaultValue={students[0].id}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </Select>
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
      </div>

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
          rows={3}
          placeholder="Ödevin kapsamı, beklentiler, kaynaklar..."
        />
      </FieldGroup>

      {kind === 'html' ? (
        <FieldGroup>
          <Label
            htmlFor="na-html"
            hint="({{ogrenci_adi}} ve {{seviye}} otomatik doldurulur)"
          >
            HTML içerik
          </Label>
          <div className="grid gap-3 xl:grid-cols-2">
            <Textarea
              id="na-html"
              name="html_content"
              rows={18}
              required
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder={HTML_PLACEHOLDER}
              className="font-mono text-[13px] leading-5"
              spellCheck={false}
            />
            <div className="hidden overflow-hidden rounded-lg border border-hairline xl:block">
              <p className="flex items-center gap-1.5 border-b border-hairline bg-plane px-3 py-1.5 text-[12px] font-medium text-ink-secondary">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Canlı önizleme
              </p>
              <iframe
                title="HTML önizleme"
                sandbox="allow-scripts"
                srcDoc={html
                  .replace(/\{\{\s*(ogrenci_adi|student_name)\s*\}\}/gi, 'Öğrenci')
                  .replace(/\{\{\s*(seviye|level)\s*\}\}/gi, 'B1')}
                className="h-[380px] w-full bg-white"
              />
            </div>
          </div>
        </FieldGroup>
      ) : null}

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
          className="block w-full text-sm text-ink-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-brand-800 hover:file:bg-brand-200"
        />
      </FieldGroup>

      {error ? <FormMessage ok={false} message={error} /> : null}

      <SubmitButton className="w-full">Ödevi Ver</SubmitButton>
    </form>
  );
}
