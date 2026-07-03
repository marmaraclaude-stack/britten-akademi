import { redirect } from 'next/navigation';
import type { Profile } from '@/lib/types';

/**
 * Öğrenci sayfaları için seviye sınavı kapısı:
 * sınav tamamlanmadıysa tüm sayfalardan sınava yönlendirir.
 */
export function ensurePlacementDone(profile: Profile) {
  if (!profile.placement_completed) {
    redirect('/ogrenci/seviye-testi');
  }
}
