'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { markThreadRead, sendMessage } from '@/lib/actions/messages';
import { cn, formatDateTime } from '@/lib/utils';
import type { Message } from '@/lib/types';

/** İki kişi arasındaki mesaj dizisi + gönderme kutusu. */
export function MessageThread({
  meId,
  otherId,
  otherName,
  messages,
}: {
  meId: string;
  otherId: string;
  otherName: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Yeni mesajları periyodik çek
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [router]);

  // Gelen okunmamışları okundu yap; konuşma açıkken gelenler dâhil
  // (son okunmamış gelen mesajın id'si değiştikçe yeniden tetiklenir)
  const lastIncomingUnreadId =
    [...messages].reverse().find((m) => m.sender_id === otherId && !m.read_at)?.id ??
    null;
  useEffect(() => {
    if (lastIncomingUnreadId) markThreadRead(otherId);
  }, [lastIncomingUnreadId, otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const submit = () => {
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      setError(null);
      const res = await sendMessage(otherId, text);
      if (res.ok) {
        setBody('');
        router.refresh();
      } else {
        setError(res.message ?? 'Mesaj gönderilemedi.');
      }
    });
  };

  return (
    <div className="flex h-[65vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="pt-16 text-center text-sm text-ink-muted">
            Henüz mesaj yok. İlk mesajı göndererek sohbeti başlat.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-card',
                    mine
                      ? 'rounded-br-md bg-brand-800 text-white'
                      : 'rounded-bl-md border border-hairline bg-white text-ink'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      'mt-1 text-[11px]',
                      mine ? 'text-brand-300' : 'text-ink-muted'
                    )}
                  >
                    {formatDateTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-hairline p-3">
        {error ? <p className="mb-2 text-xs text-status-critical">{error}</p> : null}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            aria-label={`${otherName} adlı kişiye mesaj`}
            placeholder={`${otherName} adlı kişiye mesaj yaz…`}
            className="w-full resize-none rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            aria-label="Gönder"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white transition-colors hover:bg-brand-900 disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-ink-muted">
          Enter: gönder · Shift+Enter: yeni satır
        </p>
      </div>
    </div>
  );
}
