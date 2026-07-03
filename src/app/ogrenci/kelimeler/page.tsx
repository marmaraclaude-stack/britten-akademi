import type { Metadata } from 'next';
import { CalendarDays, Flame, Sparkles } from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import { CEFR_LABELS, dayKeyIstanbul, formatDate } from '@/lib/utils';
import { computeStreak, dailyWords } from '@/lib/vocabulary';
import type { VocabProgress } from '@/lib/types';
import { LevelBadge } from '@/components/ui/DomainBadges';
import { PageHeader } from '@/components/ui/PageHeader';
import { WordTrainer } from '@/components/vocab/WordTrainer';

export const metadata: Metadata = { title: 'Günlük Kelimeler' };

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
    .limit(60);

  const rows = (data ?? []) as VocabProgress[];
  const today = rows.find((r) => r.day === todayKey) ?? null;
  const streakBase = computeStreak(
    rows.filter((r) => r.completed_at).map((r) => r.day),
    todayKey
  );
  const completed = Boolean(today?.completed_at);

  return (
    <div>
      <PageHeader
        title="Günlük Kelimeler"
        description={`${formatDate(new Date())} · Seviyene göre bugünün 10 kelimesi`}
      />

      {/* Durum şeridi */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-surface px-5 py-4 shadow-card">
        <span className="flex items-center gap-2">
          <LevelBadge level={level} />
          <span className="text-[13px] text-ink-muted">
            {CEFR_LABELS[level]} seviyesi havuzu
          </span>
        </span>
        <span className="mx-1 hidden h-4 w-px bg-hairline sm:block" aria-hidden />
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
          <Flame
            className={
              streakBase > 0 ? 'h-4 w-4 text-accent-600' : 'h-4 w-4 text-ink-muted'
            }
            aria-hidden
          />
          {streakBase > 0 ? `${streakBase} günlük seri` : 'Serini bugün başlat'}
        </span>
        <span className="mx-1 hidden h-4 w-px bg-hairline sm:block" aria-hidden />
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary">
          <CalendarDays className="h-4 w-4 text-ink-muted" aria-hidden />
          Her gün gece yarısı yeni 10 kelime
        </span>
        {completed ? (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-medium text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Bugün tamamlandı
          </span>
        ) : null}
      </div>

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
        streak={streakBase}
      />
    </div>
  );
}
