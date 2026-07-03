'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

/** Mesaj gönderir (öğrenci -> öğretmen, öğretmen -> öğrenci). */
export async function sendMessage(
  recipientId: string,
  body: string
): Promise<ActionResult> {
  const me = await actionProfile();
  if (!me) return { ok: false, message: 'Oturumunuz bulunamadı.' };

  const text = body.trim();
  if (!text) return { ok: false, message: 'Mesaj boş olamaz.' };
  if (text.length > 4000) return { ok: false, message: 'Mesaj çok uzun (en fazla 4000 karakter).' };

  const supabase = await createClient();
  const { error } = await supabase.from('messages').insert({
    sender_id: me.id,
    recipient_id: recipientId,
    body: text,
  });

  if (error) return { ok: false, message: `Mesaj gönderilemedi: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Karşı taraftan gelen okunmamış mesajları okundu işaretler. */
export async function markThreadRead(otherId: string): Promise<ActionResult> {
  const me = await actionProfile();
  if (!me) return { ok: false, message: 'Oturumunuz bulunamadı.' };

  const supabase = await createClient();
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', me.id)
    .eq('sender_id', otherId)
    .is('read_at', null);

  return { ok: true };
}
