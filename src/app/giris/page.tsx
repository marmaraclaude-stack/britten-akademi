import type { Metadata } from 'next';
import { GraduationCap, CalendarCheck, BookOpenCheck } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Giriş' };

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Seviye tespit sınavı',
    text: '100 soruluk sınavla İngilizce seviyeni CEFR ölçeğinde belirle.',
  },
  {
    icon: CalendarCheck,
    title: 'Ortak ders takvimi',
    text: 'Derslerini planla, öğretmeninle aynı takvimi paylaş.',
  },
  {
    icon: BookOpenCheck,
    title: 'Ödev ve materyaller',
    text: 'Sana özel hazırlanan içerik ve ödevlere tek yerden ulaş.',
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const { durum } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Marka paneli */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-navy-800/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl"
        />
        <Brand onDark size="lg" />
        <div className="relative">
          <h1 className="max-w-md text-3xl font-semibold leading-snug tracking-tight text-white">
            İngilizce yolculuğun,
            <br />
            <span className="text-gold-300">sana özel bir planla.</span>
          </h1>
          <ul className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-800">
                  <f.icon className="h-5 w-5 text-gold-300" aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-medium text-white">{f.title}</p>
                  <p className="mt-0.5 max-w-sm text-sm leading-6 text-navy-300">
                    {f.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[13px] text-navy-400">
          © {new Date().getFullYear()} Britten Akademi
        </p>
      </div>

      {/* Giriş formu */}
      <div className="flex items-center justify-center bg-plane px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Hesabına giriş yap
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Giriş bilgilerin öğretmenin tarafından oluşturulur. Şifreni
            unuttuysan öğretmeninle iletişime geç.
          </p>
          <LoginForm
            initialMessage={
              durum === 'pasif'
                ? 'Hesabınız şu anda pasif. Lütfen öğretmeninizle iletişime geçin.'
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
