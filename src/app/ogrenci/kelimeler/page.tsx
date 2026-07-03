import type { Metadata } from 'next';
import {
  BookMarked,
  CalendarDays,
  CheckCircle2,
  Circle,
  Flame,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import { CEFR_LABELS, cn, dayKeyIstanbul, formatDate } from '@/lib/utils';
import { computeStreak, dailyWords, WORDS_PER_DAY } from '@/lib/vocabulary';
import type { VocabProgress } from '@/lib/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { WordTrainer } from '@/components/vocab/WordTrainer';

export const metadata: Metadata = { title: 'Günlük Kelimeler' };

const DAY_LETTERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function lastNDayKeys(todayKey: string, n: number): string[] {
  const [y, m, d] = todayKey.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: n }, (_, i) => {
    const dt = new Date(base - (n - 1 - i) * 86400000);
    return dt.toISOString().slice(0, 10);
  });
}

export default async function DailyWordsPage() {
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const todayKey = dayKeyIstanbul(new Date());
  const { level, words, distractors } = dailyWords(profile.cefr_level, todayKey);

  const supabase = await createClient();
  const { data } = await supabase
    .from('vocab_progress')
    .select('*')
    .eq('student_id', profile.id)
    .order('day', { ascending: false })
    .limit(90);

  const rows = (data ?? []) as VocabProgress[];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const today = byDay.get(todayKey) ?? null;
  const completed = Boolean(today?.completed_at);
  const learnedToday = new Set(today?.learned_words ?? []);

  const completedRows = rows.filter((r) => r.completed_at);
  const streak = computeStreak(
    completedRows.map((r) => r.day),
    todayKey
  );
  const totalLearned = rows.reduce((sum, r) => sum + r.learned_words.length, 0);
  const quizRows = rows.filter((r) => r.quiz_total && r.quiz_total > 0);
  const quizAvg =
    quizRows.length > 0
      ? Math.round(
          (quizRows.reduce(
            (s, r) => s + (r.quiz_correct ?? 0) / (r.quiz_total ?? 1),
            0
          ) /
            quizRows.length) *
            100
        )
      : null;

  const weekKeys = lastNDayKeys(todayKey, 7);

  return (
    <div>
      {/* Kahraman şerit */}
      <div className="relative overflow-hidden rounded-card border border-brand-200 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-6 text-white shadow-raised sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-accent-600/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-brand-100">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {formatDate(new Date())}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Günlük Kelimeler
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-brand-100">
              {completed
                ? `Bugünün ${WORDS_PER_DAY} kelimesini tamamladın. Dilersen tekrar edebilir, yarın yeni kelimelerle devam edebilirsin.`
                : `${level} (${CEFR_LABELS[level]}) seviyesine özel bugünün ${WORDS_PER_DAY} kelimesi hazır. Kartları çevir, öğren, mini quizle pekiştir.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur">
              <p className="flex items-center justify-center gap-1.5 text-3xl font-semibold tabular-nums">
                <Flame
                  className={cn(
                    'h-6 w-6',
                    streak > 0 ? 'text-accent-400' : 'text-brand-300'
                  )}
                  aria-hidden
                />
                {streak}
              </p>
              <p className="mt-0.5 text-[12px] text-brand-200">günlük seri</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur">
              <p className="text-3xl font-semibold tabular-nums">
                {completed ? WORDS_PER_DAY : learnedToday.size}
                <span className="text-lg font-normal text-brand-200">
                  /{WORDS_PER_DAY}
                </span>
              </p>
              <p className="mt-0.5 text-[12px] text-brand-200">bugün öğrenilen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Eğitmen */}
        <WordTrainer
          words={words}
          distractors={distractors}
          initialLearned={today?.learned_words ?? []}
          alreadyCompleted={completed}
          initialQuiz={
            today?.quiz_total
              ? { correct: today.quiz_correct ?? 0, total: today.quiz_total }
              : null
          }
          streak={streak}
          level={level}
        />

        {/* Sağ panel */}
        <div className="space-y-6">
          {/* Bugünün listesi */}
          <Card>
            <CardHeader
              title="Bugünün kelimeleri"
              description={`${level} havuzundan ${WORDS_PER_DAY} kelime`}
            />
            <ul className="divide-y divide-hairline">
              {words.map((w, i) => {
                const learned = completed || learnedToday.has(w.word);
                return (
                  <li
                    key={w.word}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    {learned ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-500"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="h-4 w-4 shrink-0 text-hairline"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        learned ? 'font-medium text-ink' : 'text-ink-secondary'
                      )}
                    >
                      {w.word}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {w.type}
                    </span>
                    <span className="text-[12px] tabular-nums text-ink-muted">
                      {i + 1}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Son 7 gün */}
          <Card>
            <CardHeader title="Son 7 gün" description="Tamamlanan günler" />
            <CardBody>
              <div className="flex items-center justify-between gap-1">
                {weekKeys.map((key) => {
                  const row = byDay.get(key);
                  const done = Boolean(row?.completed_at);
                  const isToday = key === todayKey;
                  const [y, m, d] = key.split('-').map(Number);
                  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
                  return (
                    <div key={key} className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold',
                          done
                            ? 'bg-emerald-500 text-white'
                            : isToday
                              ? 'border-2 border-dashed border-brand-400 text-brand-600'
                              : 'bg-plane text-ink-muted'
                        )}
                      >
                        {done ? '✓' : d}
                      </span>
                      <span
                        className={cn(
                          'text-[11px]',
                          isToday ? 'font-semibold text-brand-700' : 'text-ink-muted'
                        )}
                      >
                        {DAY_LETTERS[dow]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Toplam istatistikler */}
          <Card>
            <CardHeader title="İstatistiklerin" />
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <BookMarked className="h-4 w-4" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] text-ink-muted">Toplam öğrenilen kelime</p>
                </div>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {totalLearned}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] text-ink-muted">Tamamlanan gün</p>
                </div>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {completedRows.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
                  <Target className="h-4 w-4" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] text-ink-muted">Quiz başarı ortalaması</p>
                </div>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {quizAvg !== null ? `%${quizAvg}` : '-'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <Trophy className="h-4 w-4" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] text-ink-muted">En uzun seri hedefi</p>
                </div>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {streak}/7
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
