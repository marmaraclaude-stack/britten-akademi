import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role istemcisi; RLS'i BYPASS eder.
 * Yalnızca sunucu tarafında, uygulama katmanı yetki kontrolünden
 * (requireTeacher / requireUser) SONRA kullanılır.
 * Kullanım alanları: öğrenci hesabı açma/şifre sıfırlama, sınav puanlama,
 * cevap anahtarı okunması, dosya yükleme/imzalı URL üretimi.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY veya NEXT_PUBLIC_SUPABASE_URL tanımlı değil.'
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
