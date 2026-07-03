'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Eye, FileText, FileUp, Link2 } from 'lucide-react';
import { createMaterial, updateMaterial } from '@/lib/actions/materials';
import { cn, MATERIAL_KIND_LABELS, SKILL_LABELS } from '@/lib/utils';
import type { Material, MaterialKind, Skill } from '@/lib/types';
import { FieldGroup, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

const KIND_ICONS: Record<MaterialKind, typeof Code2> = {
  html: Code2,
  link: Link2,
  file: FileUp,
  text: FileText,
};

const KIND_HINTS: Record<MaterialKind, string> = {
  html: 'Kendi hazırladığınız interaktif HTML sayfası',
  link: 'YouTube, makale veya harici alıştırma bağlantısı',
  file: 'PDF, ses dosyası veya çalışma kâğıdı',
  text: 'Kısa açıklama, kelime listesi veya not',
};

/**
 * Materyal oluşturma/düzenleme formu; öğretmen tarafında paylaşılan tek form.
 * kind=html içeriği sandbox iframe ile canlı önizlenir.
 */
export function MaterialForm({
  students,
  material,
  onSubmitAction,
}: {
  students: { id: string; full_name: string }[];
  material?: Material;
  onSubmitAction: 'create' | 'update';
}) {
  const router = useRouter();
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? 'html');
  const [html, setHtml] = useState(material?.html_content ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async (formData: FormData) => {
    setError(null);
    const res =
      onSubmitAction === 'update' && material
        ? await updateMaterial(material.id, formData)
        : await createMaterial(formData);
    if (res.ok) {
      router.push('/ogretmen/materyaller');
      router.refresh();
    } else {
      setError(res.message ?? 'İşlem başarısız.');
    }
  };

  return (
    <form action={submit} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="mf-title">Başlık</Label>
          <Input
            id="mf-title"
            name="title"
            defaultValue={material?.title ?? ''}
            placeholder="Phrasal Verbs Çalışması"
            required
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="mf-skill">Beceri</Label>
          <Select id="mf-skill" name="skill" defaultValue={material?.skill ?? 'general'}>
            {(Object.keys(SKILL_LABELS) as Skill[]).map((s) => (
              <option key={s} value={s}>
                {SKILL_LABELS[s]}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label htmlFor="mf-desc" hint="(isteğe bağlı, öğrenci görür)">
          Açıklama
        </Label>
        <Textarea
          id="mf-desc"
          name="description"
          rows={2}
          defaultValue={material?.description ?? ''}
          placeholder="Bu materyal ne için, nasıl kullanılmalı…"
        />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="mf-student">Kime atansın?</Label>
          <Select
            id="mf-student"
            name="student_id"
            defaultValue={material?.student_id ?? ''}
          >
            <option value="">Tüm öğrenciler</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="mf-published">Durum</Label>
          <Select
            id="mf-published"
            name="is_published"
            defaultValue={material ? String(material.is_published) : 'true'}
          >
            <option value="true">Yayımda (öğrenci görebilir)</option>
            <option value="false">Taslak (yalnızca siz görürsünüz)</option>
          </Select>
        </FieldGroup>
      </div>

      {/* İçerik türü */}
      <FieldGroup>
        <Label>İçerik türü</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="İçerik türü">
          {(Object.keys(MATERIAL_KIND_LABELS) as MaterialKind[]).map((k) => {
            const Icon = KIND_ICONS[k];
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(k)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-hairline bg-white hover:border-brand-300 hover:bg-brand-50/40'
                )}
              >
                <Icon
                  className={cn('h-4 w-4', active ? 'text-brand-700' : 'text-ink-muted')}
                  aria-hidden
                />
                <span className="mt-1.5 block text-[13px] font-medium text-ink">
                  {MATERIAL_KIND_LABELS[k]}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-ink-muted">
                  {KIND_HINTS[k]}
                </span>
              </button>
            );
          })}
        </div>
      </FieldGroup>

      {/* Türe göre içerik alanı */}
      {kind === 'html' ? (
        <FieldGroup>
          <Label
            htmlFor="mf-html"
            hint="({{ogrenci_adi}} ve {{seviye}} öğrencinin adıyla ve seviyesiyle otomatik değiştirilir)"
          >
            HTML içerik
          </Label>
          <div className="grid gap-3 xl:grid-cols-2">
            <Textarea
              id="mf-html"
              name="html_content"
              rows={18}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder={'<h1>Merhaba {{ogrenci_adi}}!</h1>\n<p>Bugünkü konumuz...</p>'}
              spellCheck={false}
              className="text-[13px] leading-6"
            />
            <div className="hidden overflow-hidden rounded-lg border border-hairline xl:block">
              <p className="flex items-center gap-1.5 border-b border-hairline bg-plane px-3 py-1.5 text-[12px] font-medium text-ink-secondary">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Canlı önizleme
              </p>
              <iframe
                srcDoc={html
                  .replace(/\{\{\s*(ogrenci_adi|student_name)\s*\}\}/gi, 'Öğrenci')
                  .replace(/\{\{\s*(seviye|level)\s*\}\}/gi, 'B1')}
                title="Materyal önizlemesi"
                sandbox="allow-scripts"
                className="h-[380px] w-full bg-white"
              />
            </div>
          </div>
        </FieldGroup>
      ) : null}

      {kind === 'link' ? (
        <FieldGroup>
          <Label htmlFor="mf-url">Bağlantı</Label>
          <Input
            id="mf-url"
            name="url"
            type="url"
            defaultValue={material?.url ?? ''}
            placeholder="https://…"
            required
          />
        </FieldGroup>
      ) : null}

      {kind === 'file' ? (
        <FieldGroup>
          <Label htmlFor="mf-file" hint="(en fazla 20 MB)">
            Dosya
          </Label>
          {material?.file_name ? (
            <p className="mb-1 text-[13px] text-ink-secondary">
              Mevcut dosya: <span className="font-medium">{material.file_name}</span>;
              yeni bir dosya seçerseniz değiştirilir.
            </p>
          ) : null}
          <input
            id="mf-file"
            name="file"
            type="file"
            required={onSubmitAction === 'create' || !material?.file_path}
            className="block w-full text-sm text-ink-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-brand-800 hover:file:bg-brand-200"
          />
        </FieldGroup>
      ) : null}

      {kind === 'text' ? (
        <FieldGroup>
          <Label htmlFor="mf-body">Not içeriği</Label>
          <Textarea
            id="mf-body"
            name="body"
            rows={10}
            defaultValue={material?.body ?? ''}
            placeholder="Kelime listesi, açıklama, çalışma önerileri…"
            required
          />
        </FieldGroup>
      ) : null}

      {error ? <FormMessage ok={false} message={error} /> : null}

      <SubmitButton className="w-full">
        {onSubmitAction === 'update' ? 'Değişiklikleri Kaydet' : 'Materyali Kaydet'}
      </SubmitButton>
    </form>
  );
}
