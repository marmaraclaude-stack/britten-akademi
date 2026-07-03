'use server';

import { actionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getSignedUrl } from '@/lib/storage';
import type { ActionResult } from '@/lib/types';

/**
 * Dosya için imzalı indirme URL'si üretir.
 * Yetki: öğretmen her dosyayı indirebilir; öğrenci yalnızca RLS ile
 * görebildiği bir kayda (ödev eki, kendi teslimi, kendine açık materyal)
 * bağlı dosyaları indirebilir.
 */
export async function getDownloadUrl(
  path: string
): Promise<ActionResult<{ url: string }>> {
  const me = await actionProfile();
  if (!me) return { ok: false, message: 'Oturumunuz bulunamadı.' };
  if (!path || path.includes('..'))
    return { ok: false, message: 'Geçersiz dosya yolu.' };

  let allowed = me.role === 'teacher';

  if (!allowed) {
    // Kullanıcı istemcisiyle sorgula — RLS görünürlüğü otomatik uygular
    const supabase = await createClient();
    const [a, s, m] = await Promise.all([
      supabase.from('assignments').select('id').eq('attachment_path', path).limit(1),
      supabase.from('submissions').select('id').eq('attachment_path', path).limit(1),
      supabase.from('materials').select('id').eq('file_path', path).limit(1),
    ]);
    allowed = Boolean(a.data?.length || s.data?.length || m.data?.length);
  }

  if (!allowed) return { ok: false, message: 'Bu dosyaya erişim yetkiniz yok.' };

  const url = await getSignedUrl(path);
  if (!url) return { ok: false, message: 'İndirme bağlantısı oluşturulamadı.' };
  return { ok: true, data: { url } };
}
