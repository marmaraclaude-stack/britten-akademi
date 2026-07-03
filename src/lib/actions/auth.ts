'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, message: 'E-posta ve şifre zorunludur.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg =
      error.message === 'Invalid login credentials'
        ? 'E-posta veya şifre hatalı.'
        : error.message.includes('banned')
          ? 'Hesabınız askıya alınmış. Lütfen öğretmeninizle iletişime geçin.'
          : 'Giriş yapılamadı. Lütfen tekrar deneyin.';
    return { ok: false, message: msg };
  }

  // Pasif öğrenci girişini engelle (ban'a ek uygulama katmanı kontrolü)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single();

  if (profile && profile.role === 'student' && !profile.is_active) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: 'Hesabınız şu anda pasif. Lütfen öğretmeninizle iletişime geçin.',
    };
  }

  revalidatePath('/', 'layout');

  // Derin bağlantı desteği: giriş öncesi hedeflenen sayfaya dön
  // (yalnızca site içi ve role uygun yollar kabul edilir)
  const home = profile?.role === 'teacher' ? '/ogretmen' : '/ogrenci';
  const next = String(formData.get('next') ?? '');
  const validNext =
    next.startsWith('/') && !next.startsWith('//') && next.startsWith(home);
  redirect(validNext ? next : home);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/giris');
}
