import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PauseCircle } from 'lucide-react';
import { getSessionProfile } from '@/lib/auth';
import { signOut } from '@/lib/actions/auth';
import { Brand } from '@/components/layout/Brand';

export const metadata: Metadata = { title: 'Hesap Askıda' };

/**
 * Pasif duruma alınan öğrencinin canlı oturumu buraya düşer.
 * (Bu rota middleware korumasının dışındadır; döngü oluşmaz.)
 */
export default async function SuspendedPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/giris');
  if (profile.role === 'teacher') redirect('/ogretmen');
  if (profile.is_active) redirect('/ogrenci');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-plane px-6 text-center">
      <Brand />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
        <PauseCircle className="h-7 w-7 text-amber-600" aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Hesabın şu anda askıda
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-muted">
          Girişin öğretmenin tarafından geçici olarak durduruldu. Ayrıntı için
          lütfen öğretmeninle iletişime geç.
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-900"
        >
          Çıkış Yap
        </button>
      </form>
    </div>
  );
}
