'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

/** Öğretmen: öğrenciye ders paketi tanımlar. */
export async function createPackage(formData: FormData): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const studentId = String(formData.get('student_id') ?? '');
  const name = String(formData.get('name') ?? '').trim() || 'Ders Paketi';
  const totalLessons = Number(formData.get('total_lessons') ?? 0);
  const priceRaw = String(formData.get('price') ?? '').replace(',', '.').trim();
  const price = priceRaw ? Number(priceRaw) : null;
  const notes = String(formData.get('notes') ?? '').trim();

  if (!studentId) return { ok: false, message: 'Öğrenci seçin.' };
  if (!Number.isInteger(totalLessons) || totalLessons < 1 || totalLessons > 200)
    return { ok: false, message: 'Ders sayısı 1-200 arasında olmalıdır.' };
  if (price !== null && (!Number.isFinite(price) || price < 0))
    return { ok: false, message: 'Geçerli bir ücret girin.' };

  const supabase = await createClient();
  const { error } = await supabase.from('packages').insert({
    student_id: studentId,
    name,
    total_lessons: totalLessons,
    price,
    notes: notes || null,
  });

  if (error) return { ok: false, message: `Paket oluşturulamadı: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ders paketi tanımlandı.' };
}

/** Öğretmen: paketi ödendi/ödenmedi olarak işaretler. */
export async function setPackagePaid(
  packageId: string,
  paid: boolean,
  paidDate?: string
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  let paidAt: string | null = null;
  if (paid) {
    const d = paidDate ? new Date(`${paidDate}T12:00:00+03:00`) : new Date();
    if (Number.isNaN(d.getTime()))
      return { ok: false, message: 'Geçerli bir ödeme tarihi girin.' };
    paidAt = d.toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('packages')
    .update({ paid_at: paidAt })
    .eq('id', packageId);

  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };
  revalidatePath('/', 'layout');
  return {
    ok: true,
    message: paid ? 'Ödeme kaydedildi.' : 'Ödeme kaydı geri alındı.',
  };
}

export async function deletePackage(packageId: string): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const supabase = await createClient();
  const { error } = await supabase.from('packages').delete().eq('id', packageId);
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Paket silindi.' };
}
