'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { STUDENT_COLORS } from '@/lib/utils';
import type { ActionResult, CefrLevel } from '@/lib/types';

const CEFR_VALUES: CefrLevel[] = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function validPassword(pw: string): string | null {
  if (pw.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
  return null;
}

/** Öğretmen: yeni öğrenci hesabı açar (e-posta + geçici şifre). */
export async function createStudent(formData: FormData): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!fullName) return { ok: false, message: 'Ad soyad zorunludur.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, message: 'Geçerli bir e-posta adresi girin.' };
  const pwError = validPassword(password);
  if (pwError) return { ok: false, message: pwError };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'student', full_name: fullName },
  });

  if (error) {
    const msg = error.message.includes('already been registered')
      ? 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.'
      : `Hesap oluşturulamadı: ${error.message}`;
    return { ok: false, message: msg };
  }

  if (phone && data.user) {
    await admin.from('profiles').update({ phone }).eq('id', data.user.id);
  }

  revalidatePath('/ogretmen', 'layout');
  return { ok: true, message: `${fullName} için hesap oluşturuldu.` };
}

/** Öğretmen: öğrencinin şifresini elle sıfırlar. */
export async function resetStudentPassword(
  studentId: string,
  newPassword: string
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const pwError = validPassword(newPassword);
  if (pwError) return { ok: false, message: pwError };

  const admin = createAdminClient();

  // Hedefin gerçekten öğrenci olduğunu doğrula (öğretmen hesabını korur)
  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', studentId)
    .single();
  if (!target || target.role !== 'student')
    return { ok: false, message: 'Öğrenci bulunamadı.' };

  const { error } = await admin.auth.admin.updateUserById(studentId, {
    password: newPassword,
  });
  if (error) return { ok: false, message: `Şifre güncellenemedi: ${error.message}` };

  return { ok: true, message: 'Şifre güncellendi. Yeni şifreyi öğrencinizle paylaşın.' };
}

/** Öğretmen: öğrenci girişini aç/kapat. */
export async function setStudentActive(
  studentId: string,
  active: boolean
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', studentId)
    .single();
  if (!target || target.role !== 'student')
    return { ok: false, message: 'Öğrenci bulunamadı.' };

  const { error: banError } = await admin.auth.admin.updateUserById(studentId, {
    ban_duration: active ? 'none' : '87600h', // ~10 yıl
  });
  if (banError)
    return { ok: false, message: `İşlem başarısız: ${banError.message}` };

  await admin.from('profiles').update({ is_active: active }).eq('id', studentId);

  revalidatePath('/ogretmen', 'layout');
  return {
    ok: true,
    message: active ? 'Öğrenci girişi yeniden açıldı.' : 'Öğrenci girişi askıya alındı.',
  };
}

/** Öğretmen: öğrenci bilgilerini günceller (ad, telefon, seviye). */
export async function updateStudent(
  studentId: string,
  formData: FormData
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const cefr = String(formData.get('cefr_level') ?? '').trim();
  const color = String(formData.get('color') ?? '').trim();

  if (!fullName) return { ok: false, message: 'Ad soyad zorunludur.' };
  if (cefr && !CEFR_VALUES.includes(cefr as CefrLevel))
    return { ok: false, message: 'Geçersiz seviye.' };
  if (color && !STUDENT_COLORS.some((c) => c.value === color))
    return { ok: false, message: 'Geçersiz renk.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone || null,
      cefr_level: cefr ? (cefr as CefrLevel) : null,
      color: color || null,
    })
    .eq('id', studentId)
    .eq('role', 'student');

  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };

  // Auth metadata'daki adı da eşitle
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(studentId, {
    user_metadata: { full_name: fullName },
  });

  revalidatePath('/ogretmen', 'layout');
  return { ok: true, message: 'Öğrenci bilgileri güncellendi.' };
}

/**
 * Öğretmen: öğrenciyi KALICI olarak siler.
 * Auth kullanıcısı silinir; profil ve tüm bağlı veriler (dersler, ödevler,
 * teslimler, mesajlar, sınav denemeleri, kelime ilerlemesi) cascade ile gider.
 */
export async function deleteStudent(studentId: string): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', studentId)
    .single();
  if (!target || target.role !== 'student')
    return { ok: false, message: 'Öğrenci bulunamadı.' };

  const { error } = await admin.auth.admin.deleteUser(studentId);
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };

  revalidatePath('/ogretmen', 'layout');
  return {
    ok: true,
    message: `${target.full_name} ve tüm verileri kalıcı olarak silindi.`,
  };
}

/** Öğretmen: seviye sınavını sıfırlar (öğrenci yeniden girer). */
export async function resetPlacement(studentId: string): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ placement_completed: false })
    .eq('id', studentId)
    .eq('role', 'student');

  if (error) return { ok: false, message: `İşlem başarısız: ${error.message}` };

  revalidatePath('/ogretmen', 'layout');
  return {
    ok: true,
    message: 'Seviye sınavı sıfırlandı. Öğrenci bir sonraki girişinde sınava yönlendirilecek.',
  };
}

/** Öğretmen: öğrenciyle ilgili özel not ekler. */
export async function addStudentNote(
  studentId: string,
  body: string
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };
  const text = body.trim();
  if (!text) return { ok: false, message: 'Not boş olamaz.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('student_notes')
    .insert({ student_id: studentId, body: text });

  if (error) return { ok: false, message: `Not eklenemedi: ${error.message}` };
  revalidatePath('/ogretmen', 'layout');
  return { ok: true };
}

export async function deleteStudentNote(noteId: string): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const supabase = await createClient();
  const { error } = await supabase.from('student_notes').delete().eq('id', noteId);
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };
  revalidatePath('/ogretmen', 'layout');
  return { ok: true };
}
