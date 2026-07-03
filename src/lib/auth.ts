import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

/** Oturum + profil bilgisini tek seferde getirir. */
export async function getSessionProfile(): Promise<{
  userId: string | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { userId: user.id, profile: (profile as Profile) ?? null };
}

/** Sayfa/layout koruması: öğretmen değilse yönlendirir. */
export async function requireTeacher(): Promise<Profile> {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/giris');
  if (profile.role !== 'teacher') redirect('/ogrenci');
  return profile;
}

/** Sayfa/layout koruması: öğrenci değilse yönlendirir. */
export async function requireStudent(): Promise<Profile> {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/giris');
  if (profile.role !== 'student') redirect('/ogretmen');
  if (!profile.is_active) redirect('/giris?durum=pasif');
  return profile;
}

/** Server action içi yetki kontrolü (redirect yerine null döner). */
export async function actionProfile(
  role?: 'teacher' | 'student'
): Promise<Profile | null> {
  const { profile } = await getSessionProfile();
  if (!profile) return null;
  if (role && profile.role !== role) return null;
  if (profile.role === 'student' && !profile.is_active) return null;
  return profile;
}
