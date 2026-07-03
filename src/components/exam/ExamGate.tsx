'use client';

import { useState, useTransition } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MessageSquare,
  SpellCheck,
} from 'lucide-react';
import { startOrResumeAttempt } from '@/lib/actions/placement';
import type { PublicTestQuestion, TestPassage } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ExamRunner } from './ExamRunner';

const SECTIONS_INFO = [
  { icon: SpellCheck, label: 'Dil Bilgisi', count: 36 },
  { icon: BookOpen, label: 'Kelime Bilgisi', count: 28 },
  { icon: MessageSquare, label: 'Günlük İngilizce', count: 16 },
  { icon: GraduationCap, label: 'Okuma', count: 20 },
];

/**
 * Sınav giriş ekranı: kuralları gösterir, "Başla" ile denemeyi
 * başlatır/sürdürür ve ExamRunner'a geçer.
 */
export function ExamGate({
  studentName,
  hasOpenAttempt,
  questions,
  passages,
}: {
  studentName: string;
  hasOpenAttempt: boolean;
  questions: PublicTestQuestion[];
  passages: TestPassage[];
}) {
  const [session, setSession] = useState<{
    attemptId: string;
    answers: Record<string, number>;
    startedAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (session) {
    return (
      <ExamRunner
        attemptId={session.attemptId}
        startedAt={session.startedAt}
        questions={questions}
        passages={passages}
        initialAnswers={session.answers}
      />
    );
  }

  const begin = () => {
    startTransition(async () => {
      setError(null);
      const res = await startOrResumeAttempt();
      if (res.ok && res.data) {
        setSession(res.data);
      } else {
        setError(res.message ?? 'Sınav başlatılamadı.');
      }
    });
  };

  const firstName = studentName.split(' ')[0];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-card border border-hairline bg-surface p-8 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900">
          <GraduationCap className="h-6 w-6 text-gold-300" aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
          Hoş geldin {firstName}, seviyeni birlikte belirleyelim
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Derslerine başlamadan önce İngilizce seviyeni ölçen 100 soruluk bir
          sınav seni bekliyor. Sonuç, öğretmenin ders programını tamamen sana
          göre hazırlaması için kullanılacak — not verilmiyor, geçme/kalma yok.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTIONS_INFO.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-hairline bg-plane px-3 py-3 text-center"
            >
              <s.icon className="mx-auto h-5 w-5 text-navy-500" aria-hidden />
              <p className="mt-1.5 text-[13px] font-medium text-ink">{s.label}</p>
              <p className="text-[12px] text-ink-muted">{s.count} soru</p>
            </div>
          ))}
        </div>

        <ul className="mt-6 space-y-2.5 text-sm leading-6 text-ink-secondary">
          <li className="flex gap-2.5">
            <Clock className="mt-1 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
            Süre sınırı yok; ortalama 60–80 dakika sürer. Cevapların otomatik
            kaydedilir — ara verip kaldığın yerden devam edebilirsin.
          </li>
          <li className="flex gap-2.5">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
            Sorular kolaydan zora doğru ilerler. Bilmediğin soruları boş
            bırakabilirsin; tahmin etmek zorunda değilsin — amaç gerçek seviyeni
            görmek.
          </li>
          <li className="flex gap-2.5">
            <BookOpen className="mt-1 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
            Lütfen sözlük, çeviri veya yapay zekâ desteği kullanma; sonuç yalnızca
            senin bilgini yansıtmalı.
          </li>
        </ul>

        {error ? (
          <p className="mt-4 text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8">
          <Button size="lg" variant="gold" disabled={pending} onClick={begin}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Hazırlanıyor…
              </>
            ) : hasOpenAttempt ? (
              'Kaldığım Yerden Devam Et'
            ) : (
              'Sınava Başla'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
