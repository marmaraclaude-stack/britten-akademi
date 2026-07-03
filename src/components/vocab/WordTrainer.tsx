'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Lightbulb,
  PartyPopper,
  Quote,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react';
import { saveVocabProgress } from '@/lib/actions/vocab';
import { cn } from '@/lib/utils';
import type { CefrLevel } from '@/lib/types';
import type { VocabWord } from '@/lib/vocabulary';
import { Button } from '@/components/ui/Button';

type Mode = 'cards' | 'quiz' | 'done';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

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
  level,
}: {
  words: VocabWord[];
  distractors: string[];
  initialLearned: string[];
  alreadyCompleted: boolean;
  initialQuiz: { correct: number; total: number } | null;
  streak: number;
  level: CefrLevel;
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
      const others = shuffle(pool.filter((d) => d !== w.tr)).slice(0, 3);
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
      <div className="rounded-card border border-emerald-200 bg-surface shadow-card">
        <div className="rounded-t-card bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-6 text-center text-white sm:px-8">
          <PartyPopper className="mx-auto h-10 w-10" aria-hidden />
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Bugünün 10 kelimesi tamam!
          </h2>
          <p className="mt-1 text-sm text-emerald-50">
            {quiz ? (
              <>
                Quiz sonucun <strong>{quiz.correct}/{quiz.total}</strong> doğru ·{' '}
              </>
            ) : null}
            Çalışma serin <strong>{streak} gün</strong>. Yarın yeni 10 kelime seni
            bekliyor.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-ink">
              Bugün öğrendiklerin
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMode('cards');
                setIndex(0);
                setFlipped(false);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Kartları Tekrar Gör
            </Button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
            {words.map((w) => (
              <div
                key={w.word}
                className="rounded-lg border border-hairline bg-plane/50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{w.word}</p>
                  <button
                    type="button"
                    onClick={() => speak(w.word)}
                    aria-label={`${w.word} kelimesini seslendir`}
                    className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="text-[13px] font-medium text-brand-700">{w.tr}</p>
                <p className="mt-1.5 text-[12px] leading-5 text-ink-muted">
                  {w.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Quiz modu ----
  if (mode === 'quiz') {
    const q = questions[quizIndex];
    const answered = picked !== null;
    return (
      <div className="rounded-card border border-hairline bg-surface shadow-card">
        {/* Quiz başlığı */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-card bg-gradient-to-r from-accent-700 to-accent-600 px-6 py-4 text-white">
          <p className="text-[15px] font-semibold">Mini Quiz</p>
          <p className="text-[13px] text-accent-100">
            Soru {quizIndex + 1} / {questions.length} · {correctCount} doğru
          </p>
        </div>
        <div className="h-1.5 bg-plane">
          <div
            className="h-full bg-accent-600 transition-all"
            style={{ width: `${(quizIndex / questions.length) * 100}%` }}
          />
        </div>

        <div className="grid gap-0 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          {/* Kelime */}
          <div className="flex flex-col items-center justify-center rounded-card bg-brand-950 p-8 text-center text-white">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brand-300">
              Bu kelimenin anlamı hangisi?
            </p>
            <p className="mt-3 break-words text-4xl font-semibold tracking-tight">
              {q.word.word}
            </p>
            <p className="mt-2 rounded-full bg-white/10 px-3 py-1 text-[12px] text-brand-100">
              {q.word.type}
            </p>
            <button
              type="button"
              onClick={() => speak(q.word.word)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/20"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              Dinle
            </button>
          </div>

          {/* Seçenekler */}
          <div className="mt-6 lg:mt-0">
            <div className="space-y-2.5">
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
                      'flex w-full items-center gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition-colors',
                      answered && isCorrect
                        ? 'border-emerald-400 bg-emerald-50 font-medium text-emerald-900'
                        : answered && isPicked
                          ? 'border-accent-400 bg-accent-50 text-accent-900'
                          : answered
                            ? 'border-hairline bg-plane/50 text-ink-muted'
                            : 'border-hairline bg-white text-ink hover:border-brand-400 hover:bg-brand-50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                        answered && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : answered && isPicked
                            ? 'bg-accent-600 text-white'
                            : 'bg-plane text-ink-secondary'
                      )}
                    >
                      {OPTION_LETTERS[i]}
                    </span>
                    <span className="min-w-0 flex-1">{opt}</span>
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
                <span className="font-medium text-ink">{q.word.word}:</span>{' '}
                {q.word.tr}
                <span className="mx-1.5 text-ink-muted">·</span>
                <em>{q.word.en}</em>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <Button
                size="lg"
                disabled={!answered}
                onClick={() => {
                  if (quizIndex + 1 < questions.length) {
                    setQuizIndex((i) => i + 1);
                    setPicked(null);
                  } else {
                    const result = {
                      correct: correctCount,
                      total: questions.length,
                    };
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
      </div>
    );
  }

  // ---- Kart modu ----
  const word = words[index];
  const isLearned = learned.has(word.word);
  const allSeen = learned.size >= words.length;

  return (
    <div className="rounded-card border border-hairline bg-surface shadow-card">
      {/* İlerleme başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-6 py-4">
        <p className="text-[15px] font-semibold text-ink">
          Kelime Kartları
          <span className="ml-2 text-[13px] font-normal text-ink-muted">
            {index + 1} / {words.length}
          </span>
        </p>
        <div className="flex flex-1 items-center justify-end gap-1.5">
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
                'h-2 w-full max-w-8 rounded-full transition-colors',
                learned.has(w.word)
                  ? 'bg-emerald-500'
                  : i === index
                    ? 'bg-brand-600'
                    : 'bg-plane hover:bg-brand-200'
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-0 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
        {/* Kelime yüzü */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-card bg-brand-950 p-8 text-center text-white lg:min-h-[340px]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-600/30 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-accent-600/20 blur-2xl"
          />
          <div className="relative">
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-brand-100">
                {level}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-brand-100">
                {word.type}
              </span>
              {isLearned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[12px] font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Öğrenildi
                </span>
              ) : null}
            </div>
            <p className="mt-6 break-words text-5xl font-semibold tracking-tight">
              {word.word}
            </p>
            <button
              type="button"
              onClick={() => speak(word.word)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              Dinle
            </button>
          </div>
        </div>

        {/* Anlam yüzü */}
        <div className="mt-6 flex flex-col lg:mt-0">
          {flipped ? (
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-2xl font-semibold tracking-tight text-brand-700">
                {word.tr}
              </p>
              <div className="rounded-card border border-hairline bg-plane/60 p-5">
                <p className="flex items-start gap-2.5 text-[15px] font-medium leading-7 text-ink">
                  <Quote
                    className="mt-1 h-4 w-4 shrink-0 rotate-180 text-brand-400"
                    aria-hidden
                  />
                  {word.en}
                </p>
                <p className="mt-2 pl-6 text-sm leading-6 text-ink-muted">
                  {word.trExample}
                </p>
              </div>
              {word.tip ? (
                <div className="flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 p-4">
                  <Lightbulb
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  <p className="text-[13px] leading-6 text-amber-900">{word.tip}</p>
                </div>
              ) : null}
              {!isLearned ? (
                <Button
                  size="lg"
                  className="mt-auto w-full"
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
                  Öğrendim, Sıradaki
                </Button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="flex flex-1 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-brand-200 p-10 text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50 lg:min-h-[340px]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <Eye className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-medium">
                Anlamını görmek için dokun
              </span>
              <span className="text-[12px] text-ink-muted">
                Önce kelimeyi sesli okumayı dene
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Alt aksiyonlar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-6 py-4">
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

        <Button
          variant={allSeen ? 'accent' : 'secondary'}
          onClick={() => setMode('quiz')}
        >
          {allSeen
            ? 'Mini Quize Başla'
            : `Mini Quize Geç (${learned.size}/${words.length})`}
        </Button>

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
  );
}
