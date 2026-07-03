'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { uploadFile } from '@/lib/storage';
import type { ActionResult, Skill } from '@/lib/types';

const SKILL_VALUES: Skill[] = [
  'grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking', 'general',
];

/** Öğretmen: ödev oluşturur (isteğe bağlı ekli dosya ile). */
export async function createAssignment(formData: FormData): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const studentId = String(formData.get('student_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const skill = String(formData.get('skill') ?? 'general') as Skill;
  const dueDate = String(formData.get('due_date') ?? ''); // YYYY-MM-DD
  const dueTime = String(formData.get('due_time') ?? '23:59');
  const file = formData.get('file');

  if (!studentId) return { ok: false, message: 'Öğrenci seçin.' };
  if (!title) return { ok: false, message: 'Ödev başlığı zorunludur.' };
  if (!SKILL_VALUES.includes(skill)) return { ok: false, message: 'Geçersiz beceri.' };

  let dueAt: string | null = null;
  if (dueDate) {
    const d = new Date(`${dueDate}T${/^\d{2}:\d{2}$/.test(dueTime) ? dueTime : '23:59'}:00+03:00`);
    if (Number.isNaN(d.getTime()))
      return { ok: false, message: 'Geçerli bir teslim tarihi girin.' };
    dueAt = d.toISOString();
  }

  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadFile(`odevler/${studentId}`, file);
    if ('error' in uploaded) return { ok: false, message: uploaded.error };
    attachmentPath = uploaded.path;
    attachmentName = uploaded.name;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('assignments').insert({
    student_id: studentId,
    title,
    description: description || null,
    skill,
    due_at: dueAt,
    attachment_path: attachmentPath,
    attachment_name: attachmentName,
  });

  if (error) return { ok: false, message: `Ödev oluşturulamadı: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ödev verildi.' };
}

/** Öğretmen: ödevi siler. */
export async function deleteAssignment(assignmentId: string): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const supabase = await createClient();
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ödev silindi.' };
}

/** Öğrenci: ödev teslim eder (metin + isteğe bağlı dosya). */
export async function submitAssignment(formData: FormData): Promise<ActionResult> {
  const student = await actionProfile('student');
  if (!student) return { ok: false, message: 'Oturumunuz bulunamadı.' };

  const assignmentId = String(formData.get('assignment_id') ?? '');
  const content = String(formData.get('content') ?? '').trim();
  const file = formData.get('file');

  if (!assignmentId) return { ok: false, message: 'Ödev bulunamadı.' };
  if (!content && !(file instanceof File && file.size > 0))
    return { ok: false, message: 'Bir açıklama yazın veya dosya ekleyin.' };

  const supabase = await createClient();

  // Ödevin bu öğrenciye ait olduğunu doğrula
  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, student_id')
    .eq('id', assignmentId)
    .single();
  if (!assignment || assignment.student_id !== student.id)
    return { ok: false, message: 'Ödev bulunamadı.' };

  // Notlanmış teslim değiştirilemez
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, graded_at, attachment_path')
    .eq('assignment_id', assignmentId)
    .maybeSingle();
  if (existing?.graded_at)
    return { ok: false, message: 'Bu ödev notlandı; yeniden teslim edilemez.' };

  let attachmentPath: string | null = existing?.attachment_path ?? null;
  let attachmentName: string | null = null;
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadFile(`teslimler/${assignmentId}`, file);
    if ('error' in uploaded) return { ok: false, message: uploaded.error };
    attachmentPath = uploaded.path;
    attachmentName = uploaded.name;
  }

  if (existing) {
    const update: Record<string, unknown> = {
      content: content || null,
      submitted_at: new Date().toISOString(),
    };
    if (attachmentName) {
      update.attachment_path = attachmentPath;
      update.attachment_name = attachmentName;
    }
    const { error } = await supabase
      .from('submissions')
      .update(update)
      .eq('id', existing.id);
    if (error) return { ok: false, message: `Teslim güncellenemedi: ${error.message}` };
  } else {
    const { error } = await supabase.from('submissions').insert({
      assignment_id: assignmentId,
      student_id: student.id,
      content: content || null,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
    });
    if (error) return { ok: false, message: `Teslim edilemedi: ${error.message}` };
  }

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ödevin teslim edildi. Öğretmenin inceleyecek.' };
}

/** Öğretmen: teslimi notlar ve geri bildirim yazar. */
export async function gradeSubmission(
  submissionId: string,
  formData: FormData
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const grade = Number(formData.get('grade'));
  const feedback = String(formData.get('feedback') ?? '').trim();

  if (!Number.isInteger(grade) || grade < 0 || grade > 100)
    return { ok: false, message: 'Not 0-100 arasında tam sayı olmalıdır.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('submissions')
    .update({
      grade,
      feedback: feedback || null,
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) return { ok: false, message: `Notlanamadı: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ödev notlandı.' };
}
