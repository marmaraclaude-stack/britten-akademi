'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

/** Öğretmen: kendi ad-soyad ve telefon bilgisini günceller. */
export async function updateTeacherProfile(
  formData: FormData
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();

  if (fullName.length < 3)
    return { ok: false, message: 'Ad soyad en az 3 karakter olmalıdır.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone: phone || null })
    .eq('id', teacher.id);
  if (error)
    return { ok: false, message: `Profil güncellenemedi: ${error.message}` };

  // Auth metadata'sini de esitle (yeni oturumlar dogru adla acilsin)
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(teacher.id, {
    user_metadata: { full_name: fullName, role: 'teacher' },
  });

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Profiliniz güncellendi.' };
}

/** Öğretmen: kendi şifresini değiştirir. */
export async function changeTeacherPassword(
  formData: FormData
): Promise<ActionResult> {
  const teacher = await actionProfile('teacher');
  if (!teacher) return { ok: false, message: 'Bu işlem için yetkiniz yok.' };

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');

  if (password.length < 8)
    return { ok: false, message: 'Şifre en az 8 karakter olmalıdır.' };
  if (password !== confirm)
    return { ok: false, message: 'Şifreler birbiriyle eşleşmiyor.' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(teacher.id, {
    password,
  });
  if (error)
    return { ok: false, message: `Şifre değiştirilemedi: ${error.message}` };

  return { ok: true, message: 'Şifreniz değiştirildi.' };
}
