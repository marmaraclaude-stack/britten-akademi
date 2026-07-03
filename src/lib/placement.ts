import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PublicTestQuestion, TestPassage, TestQuestion } from '@/lib/types';

/**
 * Sınav sorularını CEVAP ANAHTARI OLMADAN getirir.
 * test_questions tablosuna istemci erişimi RLS ile tamamen kapalıdır;
 * bu fonksiyon yalnızca sunucuda çalışır ve hassas kolonları hiç seçmez.
 */
export async function getExamQuestions(): Promise<{
  questions: PublicTestQuestion[];
  passages: TestPassage[];
}> {
  const admin = createAdminClient();

  const [{ data: questions, error: qErr }, { data: passages, error: pErr }] =
    await Promise.all([
      admin
        .from('test_questions')
        .select('id, section, level, passage_ref, question, options')
        .order('id'),
      admin.from('test_passages').select('*').order('ref'),
    ]);

  if (qErr || pErr) {
    throw new Error(`Sınav soruları yüklenemedi: ${qErr?.message ?? pErr?.message}`);
  }

  return {
    questions: (questions ?? []) as PublicTestQuestion[],
    passages: (passages ?? []) as TestPassage[],
  };
}

/** Cevap anahtarı DAHİL tüm soruları getirir — yalnızca puanlama ve öğretmen analizi için. */
export async function getExamQuestionsWithAnswers(): Promise<TestQuestion[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('test_questions').select('*').order('id');
  if (error) throw new Error(`Sınav soruları yüklenemedi: ${error.message}`);
  return (data ?? []) as TestQuestion[];
}
