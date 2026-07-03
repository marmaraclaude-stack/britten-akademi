import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const BUCKET = 'dosyalar';
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

/** Dosya adını güvenli hâle getirir (Türkçe karakterleri sadeleştirir). */
export function sanitizeFileName(name: string) {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
    ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
  };
  return name
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => map[ch] ?? ch)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(-120);
}

/**
 * Dosyayı özel kovaya yükler; depolama yolunu döndürür.
 * Çağıran taraf yetki kontrolünü YAPMIŞ olmalıdır.
 */
export async function uploadFile(
  prefix: string,
  file: File
): Promise<{ path: string; name: string } | { error: string }> {
  if (file.size === 0) return { error: 'Dosya boş görünüyor.' };
  if (file.size > MAX_FILE_BYTES) return { error: 'Dosya 20 MB sınırını aşıyor.' };

  const admin = createAdminClient();
  const safeName = sanitizeFileName(file.name || 'dosya');
  const path = `${prefix}/${crypto.randomUUID()}/${safeName}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });

  if (error) return { error: `Dosya yüklenemedi: ${error.message}` };
  return { path, name: file.name || safeName };
}

/** İndirme için kısa ömürlü imzalı URL üretir (60 dk). */
export async function getSignedUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60, { download: true });
  if (error) return null;
  return data.signedUrl;
}

export async function removeFile(path: string) {
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}
