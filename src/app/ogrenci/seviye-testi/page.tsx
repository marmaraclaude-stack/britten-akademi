import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireStudent } from '@/lib/auth';
import { getExamQuestions } from '@/lib/placement';
import { createClient } from '@/lib/supabase/server';
import { ExamGate } from '@/components/exam/ExamGate';

export const metadata: Metadata = { title: 'Seviye Tespit Sınavı' };

export default async function PlacementTestPage() {
  const profile = await requireStudent();
  if (profile.placement_completed) redirect('/ogrenci/seviye-testi/sonuc');

  const [{ questions, passages }, supabase] = await Promise.all([
    getExamQuestions(),
    createClient(),
  ]);

  const { data: openAttempt } = await supabase
    .from('test_attempts')
    .select('id')
    .eq('student_id', profile.id)
    .is('completed_at', null)
    .limit(1)
    .maybeSingle();

  return (
    <ExamGate
      studentName={profile.full_name}
      hasOpenAttempt={Boolean(openAttempt)}
      questions={questions}
      passages={passages}
    />
  );
}
