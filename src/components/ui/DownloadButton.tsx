'use client';

import { useState, useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getDownloadUrl } from '@/lib/actions/files';

/** İmzalı URL üretip dosyayı yeni sekmede indirir. */
export function DownloadButton({
  path,
  name,
}: {
  path: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await getDownloadUrl(path);
            if (res.ok && res.data) {
              // window.open kullanıcı jestinden kopuk çağrıldığında Safari
              // engeller; imzalı URL indirme (attachment) başlığı taşıdığı
              // için aynı sekmede gezinmek sayfayı değiştirmez.
              window.location.href = res.data.url;
            } else {
              setError(res.message ?? 'İndirilemedi.');
            }
          })
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden />
        )}
        <span className="max-w-[220px] truncate">{name}</span>
      </button>
      {error ? <span className="text-xs text-status-critical">{error}</span> : null}
    </span>
  );
}
