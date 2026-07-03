'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteMaterial } from '@/lib/actions/materials';
import { Button } from '@/components/ui/Button';

export function DeleteMaterialButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              'Bu materyal silinsin mi? Öğrenciler artık erişemez. Bu işlem geri alınamaz.'
            )
          ) {
            return;
          }
          startTransition(async () => {
            setError(null);
            const res = await deleteMaterial(materialId);
            if (res.ok) {
              router.push('/ogretmen/materyaller');
              router.refresh();
            } else {
              setError(res.message ?? 'Silinemedi.');
            }
          });
        }}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Materyali Sil
      </Button>
      {error ? <p className="text-xs text-status-critical">{error}</p> : null}
    </div>
  );
}
