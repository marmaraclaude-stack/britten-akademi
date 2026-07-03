import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-plane px-6 text-center">
      <Brand />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-100">
        <Compass className="h-7 w-7 text-navy-600" aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Sayfa bulunamadı
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
          Aradığın sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-900"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
