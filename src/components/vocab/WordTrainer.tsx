'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { saveVocabProgress } from '@/lib/actions/vocab';
import { cn } from '@/lib/utils';
import type { VocabWord } from '@/lib/vocabulary';
import { Button } from '@/components/ui/Button';

type Mode = 'cards' | 'quiz' | 'done';

interface QuizQuestion {
  word: VocabWord;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch {
    // ses destegi yoksa sessizce gec
  }
}

/**
 * Gunluk 10 kelime calisma deneyimi:
 * 1) Kart modu: kelimeyi gor, cevir, anlami + ornegi ogren, "Ogrendim" isaretle
 * 2) Quiz modu: her kelime icin 4 secenekli anlam sorusu
 * 3) Bitis: skor + seri; ilerleme sunucuya kaydedilir
 */
export function WordTrainer({
  words,
  distractors,
  initialLearned,
  alreadyCompleted,
  initialQuiz,
  streak,
}: {
  words: VocabWord[];
  distractors: string[];
  initialLearned: string[];
  alreadyCompleted: boolean;
  initialQuiz: { correct: number; total: number } | null;
  streak: number;
}) {
  const [mode, setMode] = useState<Mode>(alreadyCompleted ? 'done' : 'cards');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learned, setLearned] = useState<Set<string>>(new Set(initialLearned));
  const [quizIndex, setQuizIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finalQuiz, setFinalQuiz] = useState(initialQuiz);
  const [, startTransition] = useTransition();

  const questions: QuizQuestion[] = useMemo(() => {
    const pool = [...distractors];
    return shuffle(words).map((w) => {
      const others = shuffle(
        pool.filter((d) => d !== w.tr)
      ).slice(0, 3);
      const options = shuffle([w.tr, ...others]);
      return { word: w, options, correctIndex: options.indexOf(w.tr) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (extra?: {
    quizCorrect?: number;
    quizTotal?: number;
    completed?: boolean;
    learnedOverride?: Set<string>;
  }) => {
    const learnedList = [...(extra?.learnedOverride ?? learned)];
    startTransition(() => {
      void saveVocabProgress({
        learnedWords: learnedList,
        quizCorrect: extra?.quizCorrect,
        quizTotal: extra?.quizTotal,
        completed: extra?.completed,
      });
    });
  };

  // ---- Bitis ekrani ----
  if (mode === 'done') {
    const quiz = finalQuiz;
    return (
      <div className="rounded-card border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-8 text-center shadow-card">
        <PartyPopper className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold text-ink">
          Bugünün 10 kelimesi tamam!
        </h2>
        {quiz ? (
          <p className="mt-2 text-sm text-ink-secondary">
            Quiz sonucun: <strong>{quiz.correct}/{quiz.total}</strong> doğru.
          </p>
        ) : null}
        <p className="mt-1 text-sm text-ink-secondary">
          Çalışma serin: <strong>{streak} gün</strong>. Yarın yeni 10 kelime seni
          bekliyor.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setMode('cards');
              setIndex(0);
              setFlipped(false);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Kelimeleri Tekrar Gör
          </Button>
        </div>

        <div className="mt-8 grid gap-2 text-left sm:grid-cols-2">
          {words.map((w) => (
            <div
              key={w.word}
              className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{w.word}</p>
                <p className="truncate text-[13px] text-ink-secondary">{w.tr}</p>
              </div>
              <button
                type="button"
                onClick={() => speak(w.word)}
                aria-label={`${w.word} kelimesini seslendir`}
                className="rounded-lg p-2 text-brand-600 hover:bg-brand-50"
              >
                <Volume2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Quiz modu ----
  if (mode === 'quiz') {
    const q = questions[quizIndex];
    const answered = picked !== null;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between text-[13px] text-ink-muted">
          <span className="font-medium text-ink">Mini Quiz</span>
          <span>
            Soru {quizIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-plane">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${(quizIndex / questions.length) * 100}%` }}
          />
        </div>

        <div className="rounded-card border border-hairline bg-surface p-6 shadow-card">
          <p className="text-[13px] font-medium text-ink-muted">
            Bu kelimenin anlamı hangisi?
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-semibold tracking-tight text-ink">
              {q.word.word}
            </p>
            <button
              type="button"
              onClick={() => speak(q.word.word)}
              aria-label="Seslendir"
              className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isPicked = picked === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPicked(i);
                    if (isCorrect) setCorrectCount((c) => c + 1);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                    answered && isCorrect
                      ? 'border-emerald-400 bg-emerald-50 font-medium text-emerald-900'
                      : answered && isPicked
                        ? 'border-accent-400 bg-accent-50 text-accent-900'
                        : answered
                          ? 'border-hairline bg-plane/50 text-ink-muted'
                          : 'border-hairline bg-white text-ink hover:border-brand-400 hover:bg-brand-50'
                  )}
                >
                  {opt}
                  {answered && isCorrect ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : answered && isPicked ? (
                    <X className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>

          {answered ? (
            <div className="mt-4 rounded-lg bg-plane px-4 py-3 text-[13px] leading-6 text-ink-secondary">
              <span className="font-medium text-ink">{q.word.word}:</span> {q.word.tr}
              <span className="mx-1.5 text-ink-muted">·</span>
              <em>{q.word.en}</em>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <Button
              disabled={!answered}
              onClick={() => {
                if (quizIndex + 1 < questions.length) {
                  setQuizIndex((i) => i + 1);
                  setPicked(null);
                } else {
                  const result = { correct: correctCount, total: questions.length };
                  setFinalQuiz(result);
                  setMode('done');
                  persist({
                    quizCorrect: result.correct,
                    quizTotal: result.total,
                    completed: true,
                  });
                }
              }}
            >
              {quizIndex + 1 < questions.length ? 'Sonraki Soru' : 'Quizi Bitir'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Kart modu ----
  const word = words[index];
  const isLearned = learned.has(word.word);
  const allSeen = learned.size >= words.length;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Ilerleme */}
      <div className="mb-4 flex items-center justify-between text-[13px] text-ink-muted">
        <span>
          Kelime {index + 1} / {words.length}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {learned.size} / {words.length} öğrenildi
        </span>
      </div>
      <div className="mb-5 flex gap-1.5">
        {words.map((w, i) => (
          <button
            key={w.word}
            type="button"
            aria-label={`${i + 1}. kelimeye git`}
            onClick={() => {
              setIndex(i);
              setFlipped(false);
            }}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors',
              learned.has(w.word)
                ? 'bg-emerald-500'
                : i === index
                  ? 'bg-brand-600'
                  : 'bg-plane hover:bg-brand-200'
            )}
          />
        ))}
      </div>

      {/* Kart */}
      <div className="rounded-card border border-hairline bg-surface p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">
            {word.type}
          </span>
          {isLearned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Öğrenildi
            </span>
          ) : null}
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <p className="text-4xl font-semibold tracking-tight text-ink">
              {word.word}
            </p>
            <button
              type="button"
              onClick={() => speak(word.word)}
              aria-label="Seslendir"
              className="rounded-lg p-2 text-brand-600 hover:bg-brand-50"
            >
              <Volume2 className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {flipped ? (
            <div className="mt-6 space-y-4 text-left">
              <p className="text-center text-xl font-medium text-brand-700">
                {word.tr}
              </p>
              <div className="rounded-lg bg-plane px-4 py-3">
                <p className="text-sm font-medium leading-6 text-ink">{word.en}</p>
                <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                  {word.trExample}
                </p>
              </div>
              {word.tip ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  <p className="text-[13px] leading-5 text-amber-900">{word.tip}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="mt-6 w-full rounded-lg border-2 border-dashed border-brand-200 px-4 py-8 text-sm font-medium text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              Anlamını görmek için dokun
            </button>
          )}
        </div>

        {/* Kart aksiyonlari */}
        <div className="mt-8 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => {
              setIndex((i) => i - 1);
              setFlipped(false);
            }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Önceki
          </Button>

          {flipped && !isLearned ? (
            <Button
              onClick={() => {
                const next = new Set(learned);
                next.add(word.word);
                setLearned(next);
                persist({ learnedOverride: next });
                if (index + 1 < words.length) {
                  setIndex(index + 1);
                  setFlipped(false);
                }
              }}
            >
              <Check className="h-4 w-4" aria-hidden />
              Öğrendim
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            disabled={index + 1 >= words.length}
            onClick={() => {
              setIndex((i) => i + 1);
              setFlipped(false);
            }}
          >
            Sonraki
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Quiz gecisi */}
      <div className="mt-5 flex flex-col items-center gap-2">
        <Button
          variant={allSeen ? 'accent' : 'secondary'}
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => setMode('quiz')}
        >
          {allSeen
            ? 'Mini Quize Başla'
            : `Mini Quize Geç (${learned.size}/${words.length} öğrenildi)`}
        </Button>
        {!allSeen ? (
          <p className="text-[12px] text-ink-muted">
            İstersen tüm kelimeleri işaretlemeden de quize geçebilirsin.
          </p>
        ) : null}
      </div>
    </div>
  );
}
