import type { Metadata } from 'next';
import Image from 'next/image';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Giriş' };

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
          height={280}
          priority
          unoptimized
          className="relative w-[min(26rem,70%)]"
        />
        <p className="absolute bottom-8 left-0 right-0 text-center text-[13px] text-brand-300">
          © {new Date().getFullYear()} Britten Akademi
        </p>
      </div>

      {/* Giriş formu */}
      <div className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex justify-center lg:hidden">
            <Image
              src="/logo.svg"
              alt="Britten Akademi"
              width={280}
              height={187}
              priority
              unoptimized
              className="rounded-2xl bg-brand-950 p-4"
            />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Hesabına giriş yap
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Giriş bilgilerin öğretmenin tarafından oluşturulur. Şifreni
            unuttuysan öğretmeninle iletişime geç.
          </p>

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
