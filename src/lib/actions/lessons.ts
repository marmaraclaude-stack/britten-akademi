'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult, LessonStatus } from '@/lib/types';

const STATUS_VALUES: LessonStatus[] = ['scheduled', 'completed', 'cancelled', 'no_show'];

interface LessonInput {
  student_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  meeting_url: string | null;
  location: string | null;
  package_id: string | null;
}

function parseLessonForm(formData: FormData): LessonInput | { error: string } {
  const studentId = String(formData.get('student_id') ?? '');
  const title = String(formData.get('title') ?? '').trim() || 'İngilizce Dersi';
  const description = String(formData.get('description') ?? '').trim();
  const date = String(formData.get('date') ?? ''); // YYYY-MM-DD
  const startTime = String(formData.get('start_time') ?? ''); // HH:mm
  const duration = Number(formData.get('duration') ?? 60); // dakika
  const meetingUrl = String(formData.get('meeting_url') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const packageId = String(formData.get('package_id') ?? '').trim();

  if (!studentId) return { error: 'Öğrenci seçin.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Geçerli bir tarih seçin.' };
  if (!/^\d{2}:\d{2}$/.test(startTime)) return { error: 'Geçerli bir saat seçin.' };
  if (!Number.isFinite(duration) || duration < 15 || duration > 480)
    return { error: 'Ders süresi 15 dk ile 8 saat arasında olmalıdır.' };
  if (meetingUrl && !/^https?:\/\//i.test(meetingUrl))
    return { error: 'Ders bağlantısı http(s):// ile başlamalıdır.' };

  // Tarih/saat Türkiye saatiyle girilir (UTC+3, DST yok)
  const starts = new Date(`${date}T${startTime}:00+03:00`);
  if (Number.isNaN(starts.getTime())) return { error: 'Tarih/saat çözümlenemedi.' };
  const ends = new Date(starts.getTime() + duration * 60 * 1000);

  return {
    student_id: studentId,
    title,
    description: description || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    meeting_url: meetingUrl || null,
    location: location || null,
    package_id: packageId || null,
  };
}

/** Öğretmen: ders oluşturur; istenirse haftalık tekrar eder. */
export async function createLesson(formData: FormData): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const parsed = parseLessonForm(formData);
  if ('error' in parsed) return { ok: false, message: parsed.error };

  const repeatWeeks = Math.min(
    Math.max(Number(formData.get('repeat_weeks') ?? 1), 1),
    16
  );

  const rows = Array.from({ length: repeatWeeks }, (_, i) => {
    const offset = i * 7 * 24 * 60 * 60 * 1000;
    return {
      ...parsed,
      starts_at: new Date(new Date(parsed.starts_at).getTime() + offset).toISOString(),
      ends_at: new Date(new Date(parsed.ends_at).getTime() + offset).toISOString(),
    };
  });

  const supabase = await createClient();
  const { error } = await supabase.from('lessons').insert(rows);
  if (error) return { ok: false, message: `Ders oluşturulamadı: ${error.message}` };

  revalidatePath('/', 'layout');
  return {
    ok: true,
    message: repeatWeeks > 1 ? `${repeatWeeks} haftalık ders planlandı.` : 'Ders planlandı.',
  };
}

/** Öğretmen: ders bilgilerini günceller. */
export async function updateLesson(
  lessonId: string,
  formData: FormData
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const parsed = parseLessonForm(formData);
  if ('error' in parsed) return { ok: false, message: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('lessons')
    .update(parsed)
    .eq('id', lessonId);
  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ders güncellendi.' };
}

/** Öğretmen: ders durumunu ve özetini işler. */
export async function setLessonStatus(
  lessonId: string,
  status: LessonStatus,
  summary?: string
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };
  if (!STATUS_VALUES.includes(status))
    return { ok: false, message: 'Geçersiz durum.' };

  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (summary !== undefined) update.summary = summary.trim() || null;

  const { error } = await supabase.from('lessons').update(update).eq('id', lessonId);
  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ders durumu güncellendi.' };
}

/** Öğretmen: dersi siler. */
export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const supabase = await createClient();
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ders silindi.' };
}
