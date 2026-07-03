'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Undo2 } from 'lucide-react';
import { setPackagePaid } from '@/lib/actions/packages';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input, Label } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { Modal } from '@/components/ui/Modal';

/** Paket satirindaki odeme aksiyonlari: odendi isaretle (tarihli) / geri al. */
export function PaymentControls({
  packageId,
  packageName,
  studentName,
  paid,
}: {
  packageId: string;
  packageName: string;
  studentName: string;
  paid: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
  );
  const [error, setError] = useState<string | null>(null);

  const run = (nextPaid: boolean, paidDate?: string) => {
    startTransition(async () => {
      setError(null);
      const res = await setPackagePaid(packageId, nextPaid, paidDate);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.message ?? 'İşlem başarısız.');
      }
    });
  };

  if (paid) {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (
            window.confirm(
              `${studentName} · ${packageName} için ödeme kaydı geri alınsın mı?`
            )
          ) {
            run(false);
          }
        }}
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        Geri Al
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" disabled={pending} onClick={() => setOpen(true)}>
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        Ödendi İşaretle
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ödemeyi kaydet"
        description={`${studentName} · ${packageName}`}
      >
        <div className="space-y-4">
          <FieldGroup>
            <Label htmlFor={`pay-date-${packageId}`}>Ödeme tarihi</Label>
            <Input
              id={`pay-date-${packageId}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FieldGroup>
          {error ? <FormMessage ok={false} message={error} /> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button disabled={pending || !date} onClick={() => run(true, date)}>
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Ödemeyi Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
