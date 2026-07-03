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

  // Soru bankası henüz yüklenmemişse öğrenciyi çökmeye değil bilgiye götür
  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-hairline bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-ink">
          Sınav henüz hazırlanıyor
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Seviye tespit sınavının soruları henüz sisteme yüklenmemiş. Lütfen
          öğretmenine haber ver; sorular yüklendiğinde bu sayfadan sınava
          başlayabileceksin.
        </p>
      </div>
    );
  }

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
