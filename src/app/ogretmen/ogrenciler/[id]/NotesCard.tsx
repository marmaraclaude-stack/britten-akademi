'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StickyNote, Trash2 } from 'lucide-react';
import { addStudentNote, deleteStudentNote } from '@/lib/actions/students';
import { formatDateTime } from '@/lib/utils';
import type { StudentNote } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';

/** Öğretmene özel notlar — öğrenci bu notları hiçbir zaman görmez. */
export function NotesCard({
  studentId,
  notes,
}: {
  studentId: string;
  notes: StudentNote[];
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      setError(null);
      const res = await addStudentNote(studentId, text);
      if (res.ok) {
        setBody('');
        router.refresh();
      } else {
        setError(res.message ?? 'Not eklenemedi.');
      }
    });
  };

  const remove = (noteId: string) => {
    if (!window.confirm('Bu not silinsin mi?')) return;
    startTransition(async () => {
      const res = await deleteStudentNote(noteId);
      if (res.ok) router.refresh();
      else setError(res.message ?? 'Not silinemedi.');
    });
  };

  return (
    <Card>
      <CardHeader
        title="Özel notlar"
        description="Yalnızca siz görürsünüz; öğrenciye gösterilmez."
      />
      <CardBody className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Ders gözlemleri, ödeme hatırlatmaları, hedefler…"
            aria-label="Yeni not"
          />
          {error ? <p className="text-xs text-status-critical">{error}</p> : null}
          <Button size="sm" disabled={pending || !body.trim()} onClick={add}>
            Not Ekle
          </Button>
        </div>

        {notes.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-plane px-4 py-3 text-[13px] text-ink-secondary">
            <StickyNote className="h-4 w-4 shrink-0 text-navy-400" aria-hidden />
            Henüz not eklemediniz.
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-hairline bg-plane/60 px-4 py-3"
              >
                <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{n.body}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[12px] text-ink-muted">
                    {formatDateTime(n.created_at)}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label="Notu sil"
                    onClick={() => remove(n.id)}
                    className="rounded-lg p-1 text-ink-muted transition-colors hover:bg-red-50 hover:text-status-critical disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
