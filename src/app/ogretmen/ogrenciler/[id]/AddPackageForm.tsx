'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { createPackage, deletePackage } from '@/lib/actions/packages';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input, Label } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';

/** Öğrenci detayında yeni ders paketi tanımlama formu. */
export function AddPackageForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (formData: FormData) => {
    startTransition(async () => {
      setMessage(null);
      const res = await createPackage(formData);
      if (res.ok) {
        setMessage({ ok: true, text: res.message ?? 'Paket tanımlandı.' });
        formRef.current?.reset();
        router.refresh();
      } else {
        setMessage({ ok: false, text: res.message ?? 'Paket oluşturulamadı.' });
      }
    });
  };

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      <input type="hidden" name="student_id" value={studentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="pk-name">Paket adı</Label>
          <Input id="pk-name" name="name" placeholder="10 Ders Paketi" required />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="pk-total">Ders sayısı</Label>
          <Input
            id="pk-total"
            name="total_lessons"
            type="number"
            min={1}
            max={200}
            placeholder="10"
            required
          />
        </FieldGroup>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="pk-price" hint="(isteğe bağlı, TL)">
            Ücret
          </Label>
          <Input id="pk-price" name="price" inputMode="decimal" placeholder="7500" />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="pk-notes" hint="(isteğe bağlı)">
            Notlar
          </Label>
          <Input id="pk-notes" name="notes" placeholder="Ödeme alındı…" />
        </FieldGroup>
      </div>

      {message ? <FormMessage ok={message.ok} message={message.text} /> : null}

      <Button type="submit" size="sm" disabled={pending}>
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Paketi Tanımla
      </Button>
    </form>
  );
}

/** Paket satırındaki silme düğmesi. */
export function DeletePackageButton({
  packageId,
  packageName,
}: {
  packageId: string;
  packageName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${packageName} paketini sil`}
      onClick={() => {
        if (
          window.confirm(
            `"${packageName}" paketi silinsin mi? Pakete bağlı dersler silinmez, yalnızca paket kaydı kaldırılır.`
          )
        ) {
          startTransition(async () => {
            const res = await deletePackage(packageId);
            if (res.ok) router.refresh();
            else window.alert(res.message ?? 'Paket silinemedi.');
          });
        }
      }}
      className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-status-critical disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
