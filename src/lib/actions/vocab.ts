'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { dayKeyIstanbul } from '@/lib/utils';
import { dailyWords, WORDS_PER_DAY } from '@/lib/vocabulary';
import type { ActionResult } from '@/lib/types';

/**
 * Ogrenci: gunun kelime ilerlemesini kaydeder (ogrenilen kelimeler,
 * quiz sonucu, tamamlanma). Gun ve kelime listesi sunucuda dogrulanir;
 * yalnizca BUGUNUN kaydi yazilabilir.
 */
export async function saveVocabProgress(payload: {
  learnedWords: string[];
  quizCorrect?: number;
  quizTotal?: number;
  completed?: boolean;
}): Promise<ActionResult> {
  const student = await actionProfile('student');
  if (!student) return { ok: false, message: 'Oturumunuz bulunamadı.' };

  const day = dayKeyIstanbul(new Date());
  const { level, words } = dailyWords(student.cefr_level, day);
  const validWords = new Set(words.map((w) => w.word));

  const learned = Array.isArray(payload.learnedWords)
    ? [...new Set(payload.learnedWords.filter((w) => validWords.has(String(w))))]
    : [];

  let quizCorrect: number | null = null;
  let quizTotal: number | null = null;
  if (payload.quizTotal !== undefined) {
    quizTotal = Math.min(WORDS_PER_DAY, Math.max(0, Math.floor(Number(payload.quizTotal) || 0)));
    quizCorrect = Math.min(
      quizTotal,
      Math.max(0, Math.floor(Number(payload.quizCorrect) || 0))
    );
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('vocab_progress')
    .select('id, learned_words, quiz_correct, quiz_total, completed_at')
    .eq('student_id', student.id)
    .eq('day', day)
    .maybeSingle();

  const mergedLearned = [
    ...new Set([...(existing?.learned_words ?? []), ...learned]),
  ].filter((w) => validWords.has(w));

  const row = {
    student_id: student.id,
    day,
    level,
    learned_words: mergedLearned,
    quiz_correct: quizCorrect ?? existing?.quiz_correct ?? null,
    quiz_total: quizTotal ?? existing?.quiz_total ?? null,
    completed_at:
      existing?.completed_at ??
      (payload.completed ? new Date().toISOString() : null),
  };

  const { error } = existing
    ? await supabase.from('vocab_progress').update(row).eq('id', existing.id)
    : await supabase.from('vocab_progress').insert(row);

  if (error)
    return { ok: false, message: `İlerleme kaydedilemedi: ${error.message}` };

  revalidatePath('/ogrenci', 'layout');
  return { ok: true };
}
