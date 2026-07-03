import type { Metadata } from 'next';
import Image from 'next/image';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Giriş' };

const STEPS = [
  {
    title: 'E-postanı yaz',
    text: 'Öğretmenin sana tanımladığı e-posta adresini kullan.',
  },
  {
    title: 'Şifrenle giriş yap',
    text: 'Öğretmenin paylaştığı şifreyi gir. Unuttuysan öğretmeninle iletişime geç.',
  },
  {
    title: 'Panele ulaş',
    text: 'İlk girişte seviye tespit sınavı seni karşılar; sonrasında dersler, ödevler ve günlük kelimeler seni bekliyor.',
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; next?: string }>;
}) {
  const { durum, next } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Logo paneli: public/logo.svg dosyasini kendi logonuzla degistirin */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-brand-950 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-700/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent-600/15 blur-3xl"
        />
        <Image
          src="/logo.svg"
          alt="Britten Akademi"
          width={420}
          height={300}
          priority
          unoptimized
          className="relative w-[min(26rem,70%)]"
        />
        <p className="absolute bottom-8 left-0 right-0 text-center text-[13px] text-brand-300">
          © {new Date().getFullYear()} Britten Akademi
        </p>
      </div>

      {/* Giriş adımları + form */}
      <div className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo.svg"
              alt="Britten Akademi"
              width={280}
              height={200}
              priority
              unoptimized
              className="rounded-2xl bg-brand-950 p-4"
            />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Hesabına giriş yap
          </h1>

          <ol className="mt-6 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[13px] font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-ink-muted">
                    {s.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-card border border-hairline bg-plane/60 p-6">
            <LoginForm
              next={next}
              initialMessage={
                durum === 'pasif'
                  ? 'Hesabınız şu anda pasif. Lütfen öğretmeninizle iletişime geçin.'
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
