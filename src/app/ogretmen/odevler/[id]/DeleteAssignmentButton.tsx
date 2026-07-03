'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteAssignment } from '@/lib/actions/assignments';
import { Button } from '@/components/ui/Button';

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
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
              'Bu ödev silinsin mi? Varsa öğrencinin teslimi de silinir. Bu işlem geri alınamaz.'
            )
          ) {
            return;
          }
          startTransition(async () => {
            setError(null);
            const res = await deleteAssignment(assignmentId);
            if (res.ok) {
              router.push('/ogretmen/odevler');
              router.refresh();
            } else {
              setError(res.message ?? 'Silinemedi.');
            }
          });
        }}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Ödevi Sil
      </Button>
      {error ? <p className="text-xs text-status-critical">{error}</p> : null}
    </div>
  );
}
