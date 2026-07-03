'use server';

import { revalidatePath } from 'next/cache';
import { actionProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { gradeAttempt } from '@/lib/cefr';
import { getExamQuestionsWithAnswers } from '@/lib/placement';
import type { ActionResult, CefrLevel, TestAttempt } from '@/lib/types';

/** Öğrenci: yarım kalan denemeyi getirir veya yeni deneme başlatır. */
export async function startOrResumeAttempt(): Promise<
  ActionResult<{
    attemptId: string;
    answers: Record<string, number>;
    startedAt: string;
  }>
> {
  const student = await actionProfile('student');
  if (!student) return { ok: false, message: 'Oturumunuz bulunamadı.' };
  if (student.placement_completed)
    return { ok: false, message: 'Seviye sınavını zaten tamamladınız.' };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('test_attempts')
    .select('id, answers, started_at')
    .eq('student_id', student.id)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      data: {
        attemptId: existing.id,
        answers: (existing.answers ?? {}) as Record<string, number>,
        startedAt: existing.started_at,
      },
    };
  }

  const { data: created, error } = await supabase
    .from('test_attempts')
    .insert({ student_id: student.id })
    .select('id, started_at')
    .single();

  if (error || !created)
    return { ok: false, message: `Sınav başlatılamadı: ${error?.message}` };

  return {
    ok: true,
    data: { attemptId: created.id, answers: {}, startedAt: created.started_at },
  };
}

/** Öğrenci: cevapları ara kayıt eder (otokayıt). */
export async function saveAttemptAnswers(
  attemptId: string,
  answers: Record<string, number>
): Promise<ActionResult> {
  const student = await actionProfile('student');
  if (!student) return { ok: false, message: 'Oturumunuz bulunamadı.' };

  // Yalnızca geçerli {soru_id: 0-3} çiftlerini al
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(answers)) {
    const id = Number(k);
    if (Number.isInteger(id) && id >= 1 && id <= 200 && Number.isInteger(v) && v >= 0 && v <= 3) {
      clean[String(id)] = v;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('test_attempts')
    .update({ answers: clean })
    .eq('id', attemptId)
    .eq('student_id', student.id)
    .is('completed_at', null);

  if (error) return { ok: false, message: 'Cevaplar kaydedilemedi.' };
  return { ok: true };
}

export interface PlacementResult {
  score: number;
  cefr: CefrLevel;
  answered: number;
}

/** Öğrenci: sınavı bitirir — puanlama sunucuda, service-role ile yapılır. */
export async function submitAttempt(
  attemptId: string,
  answers: Record<string, number>,
  durationSeconds: number
): Promise<ActionResult<PlacementResult>> {
  const student = await actionProfile('student');
  if (!student) return { ok: false, message: 'Oturumunuz bulunamadı.' };

  const supabase = await createClient();

  // Deneme bu öğrenciye ait ve hâlâ açık mı?
  const { data: attempt } = await supabase
    .from('test_attempts')
    .select('id, student_id, completed_at, started_at')
    .eq('id', attemptId)
    .eq('student_id', student.id)
    .single();

  if (!attempt) return { ok: false, message: 'Sınav oturumu bulunamadı.' };
  if (attempt.completed_at)
    return { ok: false, message: 'Bu sınav zaten tamamlanmış.' };

  const questions = await getExamQuestionsWithAnswers();
  if (questions.length === 0)
    return { ok: false, message: 'Sınav soruları yüklenemedi. Lütfen öğretmeninize haber verin.' };

  // Cevapları temizle ve puanla
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(answers)) {
    const id = Number(k);
    if (Number.isInteger(id) && Number.isInteger(v) && v >= 0 && v <= 3) {
      clean[String(id)] = v;
    }
  }

  const graded = gradeAttempt(questions, clean);
  const duration =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.min(Math.round(durationSeconds), 24 * 60 * 60)
      : null;

  const admin = createAdminClient();
  const { error: attemptErr } = await admin
    .from('test_attempts')
    .update({
      answers: clean,
      completed_at: new Date().toISOString(),
      score: graded.score,
      cefr_result: graded.cefr,
      breakdown: graded.breakdown,
      duration_seconds: duration,
    })
    .eq('id', attemptId);

  if (attemptErr)
    return { ok: false, message: `Sonuç kaydedilemedi: ${attemptErr.message}` };

  const { error: profileErr } = await admin
    .from('profiles')
    .update({ placement_completed: true, cefr_level: graded.cefr })
    .eq('id', student.id);

  if (profileErr)
    return { ok: false, message: `Profil güncellenemedi: ${profileErr.message}` };

  revalidatePath('/', 'layout');
  return {
    ok: true,
    data: { score: graded.score, cefr: graded.cefr, answered: graded.answered },
  };
}
