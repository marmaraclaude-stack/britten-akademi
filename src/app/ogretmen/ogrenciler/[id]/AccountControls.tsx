'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, RotateCcw, UserCheck, UserX } from 'lucide-react';
import {
  resetPlacement,
  resetStudentPassword,
  setStudentActive,
} from '@/lib/actions/students';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input, Label } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { Modal } from '@/components/ui/Modal';

export function AccountControls({
  studentId,
  fullName,
  isActive,
  placementCompleted,
}: {
  studentId: string;
  fullName: string;
  isActive: boolean;
  placementCompleted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) => {
    startTransition(async () => {
      setMessage(null);
      const res = await action();
      setMessage({ ok: res.ok, text: res.message ?? (res.ok ? 'İşlem tamamlandı.' : 'İşlem başarısız.') });
      if (res.ok) router.refresh();
    });
  };

  const submitPassword = () => {
    startTransition(async () => {
      setMessage(null);
      const res = await resetStudentPassword(studentId, newPassword);
      setMessage({ ok: res.ok, text: res.message ?? 'İşlem başarısız.' });
      if (res.ok) {
        setPwOpen(false);
        setNewPassword('');
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => setPwOpen(true)}>
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          Şifre Sıfırla
        </Button>

        {isActive ? (
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  `${fullName} adlı öğrencinin girişi askıya alınsın mı? Öğrenci tekrar aktifleştirilene kadar giriş yapamaz.`
                )
              ) {
                run(() => setStudentActive(studentId, false));
              }
            }}
          >
            <UserX className="h-3.5 w-3.5" aria-hidden />
            Hesabı Pasifleştir
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`${fullName} adlı öğrencinin girişi yeniden açılsın mı?`)) {
                run(() => setStudentActive(studentId, true));
              }
            }}
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden />
            Hesabı Aktifleştir
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          disabled={pending || !placementCompleted}
          onClick={() => {
            if (
              window.confirm(
                'Seviye sınavı sıfırlansın mı? Öğrenci bir sonraki girişinde sınava yeniden yönlendirilir.'
              )
            ) {
              run(() => resetPlacement(studentId));
            }
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Seviye Sınavını Sıfırla
        </Button>
      </div>

      {message ? <FormMessage ok={message.ok} message={message.text} /> : null}

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Şifre sıfırla">
        <div className="space-y-4">
          <p className="text-[13px] leading-5 text-ink-secondary">
            {fullName} için yeni bir geçici şifre belirleyin ve güvenli bir kanaldan
            kendisine iletin.
          </p>
          <FieldGroup>
            <Label htmlFor="ac-password" hint="(en az 8 karakter)">
              Yeni şifre
            </Label>
            <Input
              id="ac-password"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPwOpen(false)}>
              Vazgeç
            </Button>
            <Button disabled={pending || newPassword.length < 8} onClick={submitPassword}>
              Şifreyi Güncelle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
