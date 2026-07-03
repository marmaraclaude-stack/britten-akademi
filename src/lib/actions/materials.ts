'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { uploadFile } from '@/lib/storage';
import type { ActionResult, MaterialKind, Skill } from '@/lib/types';

const SKILL_VALUES: Skill[] = [
  'grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking', 'general',
];
const KIND_VALUES: MaterialKind[] = ['html', 'link', 'file', 'text'];

interface ParsedMaterial {
  student_id: string | null;
  title: string;
  description: string | null;
  skill: Skill;
  kind: MaterialKind;
  html_content: string | null;
  body: string | null;
  url: string | null;
  is_published: boolean;
}

function parseMaterialForm(formData: FormData): ParsedMaterial | { error: string } {
  const studentId = String(formData.get('student_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const skill = String(formData.get('skill') ?? 'general') as Skill;
  const kind = String(formData.get('kind') ?? 'html') as MaterialKind;
  const htmlContent = String(formData.get('html_content') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const isPublished = formData.get('is_published') !== 'false';

  if (!title) return { error: 'Başlık zorunludur.' };
  if (!SKILL_VALUES.includes(skill)) return { error: 'Geçersiz beceri.' };
  if (!KIND_VALUES.includes(kind)) return { error: 'Geçersiz içerik türü.' };
  if (kind === 'html' && !htmlContent.trim())
    return { error: 'HTML içerik boş olamaz.' };
  if (kind === 'text' && !body) return { error: 'Not içeriği boş olamaz.' };
  if (kind === 'link') {
    if (!/^https?:\/\//i.test(url))
      return { error: 'Bağlantı http(s):// ile başlamalıdır.' };
  }

  return {
    student_id: studentId || null,
    title,
    description: description || null,
    skill,
    kind,
    html_content: kind === 'html' ? htmlContent : null,
    body: kind === 'text' ? body : null,
    url: kind === 'link' ? url : null,
    is_published: isPublished,
  };
}

/** Öğretmen: materyal oluşturur (HTML içerik, bağlantı, dosya veya not). */
export async function createMaterial(formData: FormData): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const parsed = parseMaterialForm(formData);
  if ('error' in parsed) return { ok: false, message: parsed.error };

  let filePath: string | null = null;
  let fileName: string | null = null;
  const file = formData.get('file');
  if (parsed.kind === 'file') {
    if (!(file instanceof File) || file.size === 0)
      return { ok: false, message: 'Bir dosya seçin.' };
    const uploaded = await uploadFile('materyaller', file);
    if ('error' in uploaded) return { ok: false, message: uploaded.error };
    filePath = uploaded.path;
    fileName = uploaded.name;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('materials').insert({
    ...parsed,
    file_path: filePath,
    file_name: fileName,
  });

  if (error) return { ok: false, message: `Materyal oluşturulamadı: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Materyal yayımlandı.' };
}

/** Öğretmen: materyali günceller. */
export async function updateMaterial(
  materialId: string,
  formData: FormData
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const parsed = parseMaterialForm(formData);
  if ('error' in parsed) return { ok: false, message: parsed.error };

  const supabase = await createClient();

  const update: Record<string, unknown> = { ...parsed };
  const file = formData.get('file');
  if (parsed.kind === 'file' && file instanceof File && file.size > 0) {
    const uploaded = await uploadFile('materyaller', file);
    if ('error' in uploaded) return { ok: false, message: uploaded.error };
    update.file_path = uploaded.path;
    update.file_name = uploaded.name;
  }

  const { error } = await supabase
    .from('materials')
    .update(update)
    .eq('id', materialId);

  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Materyal güncellendi.' };
}

export async function deleteMaterial(materialId: string): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const supabase = await createClient();
  const { error } = await supabase.from('materials').delete().eq('id', materialId);
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Materyal silindi.' };
}
