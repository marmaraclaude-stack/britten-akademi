'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Ear,
  Keyboard,
  Lightbulb,
  Link2,
  ListChecks,
  PartyPopper,
  PenLine,
  RotateCcw,
  Shuffle,
  Volume2,
  X,
} from 'lucide-react';
import { saveVocabProgress } from '@/lib/actions/vocab';
import { cn } from '@/lib/utils';
import type { CefrLevel } from '@/lib/types';
import type { VocabWord } from '@/lib/vocabulary';
import { Button } from '@/components/ui/Button';

type Mode = 'cards' | 'exercises' | 'match' | 'done';
type ExerciseType = 'meaning' | 'reverse' | 'gap' | 'listening';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const EXERCISE_META: Record<
  ExerciseType,
  { label: string; prompt: string; icon: typeof Ear }
> = {
  meaning: {
    label: 'Anlam',
    prompt: 'Bu kelimenin anlamı hangisi?',
    icon: ListChecks,
  },
  reverse: {
    label: 'Çeviri',
    prompt: 'Bu anlamı karşılayan kelime hangisi?',
    icon: PenLine,
  },
  gap: {
    label: 'Boşluk',
    prompt: 'Cümledeki boşluğa hangi kelime gelmeli?',
    icon: Link2,
  },
  listening: {
    label: 'Dinleme',
    prompt: 'Duyduğun kelime hangisi?',
    icon: Ear,
  },
};

interface Exercise {
  type: ExerciseType;
  word: VocabWord;
  options: string[];
  correctIndex: number;
  /** gap tipi icin bosluklu cumle */
  gapped?: string;
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

/** Ornek cumlede kelimeyi (varsa cekimli halini) bosluga cevirir. */
function makeGap(word: VocabWord): string | null {
  const sentence = word.en;
  const lower = sentence.toLocaleLowerCase('en-GB');
  const target = word.word.toLocaleLowerCase('en-GB');
  let at = lower.indexOf(target);
  let len = target.length;
  if (at === -1) {
    // cekimli hal: kok + harfler (works, working, decided...)
    const root = target.slice(0, Math.max(3, target.length - 2));
    at = lower.indexOf(root);
    if (at === -1) return null;
    len = root.length;
    while (at + len < sentence.length && /[a-z]/i.test(sentence[at + len])) len++;
  }
  return `${sentence.slice(0, at)}______${sentence.slice(at + len)}`;
}

function buildExercises(
  words: VocabWord[],
  trDistractors: string[],
  enDistractors: string[]
): Exercise[] {
  const types: ExerciseType[] = ['meaning', 'reverse', 'gap', 'listening'];
  return shuffle(words).map((w, i) => {
    let type = types[i % types.length];
    let gapped: string | null = null;
    if (type === 'gap') {
      gapped = makeGap(w);
      if (!gapped) type = 'meaning';
    }
    const useTr = type === 'meaning';
    const correct = useTr ? w.tr : w.word;
    const pool = useTr
      ? trDistractors.filter((d) => d !== w.tr)
      : [
          ...words.map((x) => x.word).filter((x) => x !== w.word),
          ...enDistractors.filter((d) => d !== w.word),
        ];
    const options = shuffle([correct, ...shuffle([...new Set(pool)]).slice(0, 3)]);
    return {
      type,
      word: w,
      options,
      correctIndex: options.indexOf(correct),
      gapped: gapped ?? undefined,
    };
  });
}

/** Eslestirme icin 5 cift sec */
function buildMatchPairs(words: VocabWord[]) {
  const chosen = shuffle(words).slice(0, 5);
  return {
    left: shuffle(chosen.map((w) => w.word)),
    right: shuffle(chosen.map((w) => w.tr)),
    pairs: new Map(chosen.map((w) => [w.word, w.tr])),
  };
}

/**
 * Gunluk 10 kelime calisma deneyimi (3 asama):
 * 1) Kartlar: 3D cevirmeli kelime kartlari, klavye kisayollari
 * 2) Alistirmalar: anlam secme, ceviri, bosluk doldurma, dinleme
 * 3) Eslestirme: 5 kelime-anlam cifti
 */
export function WordTrainer({
  words,
  distractors,
  enDistractors,
  initialLearned,
  alreadyCompleted,
  initialQuiz,
  streak,
  level,
}: {
  words: VocabWord[];
  distractors: string[];
  enDistractors: string[];
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
  const [finalQuiz, setFinalQuiz] = useState(initialQuiz);
  const [, startTransition] = useTransition();

  // Alistirma durumu
  const exercises = useMemo(
    () => buildExercises(words, distractors, enDistractors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [exIndex, setExIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  // Eslestirme durumu
  const match = useMemo(buildMatchPairs.bind(null, words), [words]);
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [matchMistakes, setMatchMistakes] = useState(0);

  const cardRegion = useRef<HTMLDivElement>(null);

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

  const markLearned = (w: VocabWord) => {
    const next = new Set(learned);
    next.add(w.word);
    setLearned(next);
    persist({ learnedOverride: next });
    if (index + 1 < words.length) {
      setIndex(index + 1);
      setFlipped(false);
    }
  };

  // Klavye kisayollari (kart modu)
  useEffect(() => {
    if (mode !== 'cards') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight' && index + 1 < words.length) {
        setIndex((i) => i + 1);
        setFlipped(false);
      } else if (e.key === 'ArrowLeft' && index > 0) {
        setIndex((i) => i - 1);
        setFlipped(false);
      } else if (e.key === 'Enter' && flipped) {
        markLearned(words[index]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, index, flipped, learned, words]);

  const finishSession = (exerciseCorrect: number) => {
    const result = { correct: exerciseCorrect, total: exercises.length };
    setFinalQuiz(result);
    setMode('done');
    persist({
      quizCorrect: result.correct,
      quizTotal: result.total,
      completed: true,
    });
  };

  // ---------------- Bitis ----------------
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
                Alıştırma sonucun <strong>{quiz.correct}/{quiz.total}</strong>{' '}
                doğru ·{' '}
              </>
            ) : null}
            Çalışma serin <strong>{streak} gün</strong>. Yarın yeni 10 kelime
            seni bekliyor.
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

  // ---------------- Eslestirme ----------------
  if (mode === 'match') {
    const allDone = matched.size === match.pairs.size;
    return (
      <div className="rounded-card border border-hairline bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-card bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4 text-white">
          <p className="inline-flex items-center gap-2 text-[15px] font-semibold">
            <Shuffle className="h-4 w-4" aria-hidden />
            Eşleştirme
          </p>
          <p className="text-[13px] text-brand-100">
            {matched.size} / {match.pairs.size} eşleşti
            {matchMistakes > 0 ? ` · ${matchMistakes} hata` : ''}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="mb-5 text-center text-sm text-ink-secondary">
            Kelimeyi anlamıyla eşleştir: önce soldan bir kelime, sonra sağdan
            anlamını seç.
          </p>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-6">
            <div className="space-y-2.5">
              {match.left.map((w) => {
                const done = matched.has(w);
                const active = leftSel === w;
                return (
                  <button
                    key={w}
                    type="button"
                    disabled={done}
                    onClick={() => {
                      setLeftSel(active ? null : w);
                      if (!active) speak(w);
                    }}
                    className={cn(
                      'w-full rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all',
                      done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-400'
                        : active
                          ? 'scale-[1.02] border-brand-600 bg-brand-50 text-brand-800 shadow-card'
                          : 'border-hairline bg-white text-ink hover:border-brand-300'
                    )}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2.5">
              {match.right.map((tr) => {
                const owner = [...match.pairs.entries()].find(
                  ([, v]) => v === tr
                )?.[0];
                const done = owner ? matched.has(owner) : false;
                const isWrong = wrongFlash === tr;
                return (
                  <button
                    key={tr}
                    type="button"
                    disabled={done || !leftSel}
                    onClick={() => {
                      if (!leftSel) return;
                      if (match.pairs.get(leftSel) === tr) {
                        const next = new Set(matched);
                        next.add(leftSel);
                        setMatched(next);
                        setLeftSel(null);
                      } else {
                        setMatchMistakes((m) => m + 1);
                        setWrongFlash(tr);
                        setTimeout(() => setWrongFlash(null), 500);
                      }
                    }}
                    className={cn(
                      'w-full rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition-all',
                      done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-400'
                        : isWrong
                          ? 'border-accent-500 bg-accent-50 text-accent-700'
                          : leftSel
                            ? 'border-hairline bg-white text-ink hover:border-brand-300'
                            : 'border-hairline bg-plane/50 text-ink-muted'
                    )}
                  >
                    {tr}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              variant={allDone ? 'accent' : 'secondary'}
              disabled={!allDone}
              onClick={() => finishSession(correctCount)}
            >
              {allDone ? 'Günü Tamamla' : 'Tüm çiftleri eşleştir'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Alistirmalar ----------------
  if (mode === 'exercises') {
    const ex = exercises[exIndex];
    const meta = EXERCISE_META[ex.type];
    const answered = picked !== null;
    return (
      <div className="rounded-card border border-hairline bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-card bg-gradient-to-r from-accent-700 to-accent-600 px-6 py-4 text-white">
          <p className="inline-flex items-center gap-2 text-[15px] font-semibold">
            <meta.icon className="h-4 w-4" aria-hidden />
            Alıştırma · {meta.label}
          </p>
          <p className="text-[13px] text-accent-100">
            {exIndex + 1} / {exercises.length} · {correctCount} doğru
          </p>
        </div>
        <div className="h-1.5 bg-plane">
          <div
            className="h-full bg-accent-600 transition-all"
            style={{ width: `${(exIndex / exercises.length) * 100}%` }}
          />
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          {/* Soru yüzü */}
          <div className="flex flex-col items-center justify-center rounded-card bg-brand-950 p-8 text-center text-white">
            <p className="text-[13px] font-medium text-brand-200">{meta.prompt}</p>

            {ex.type === 'meaning' ? (
              <>
                <p className="mt-4 break-words text-4xl font-semibold tracking-tight">
                  {ex.word.word}
                </p>
                <p className="mt-2 rounded-full bg-white/10 px-3 py-1 text-[12px] text-brand-100">
                  {ex.word.type}
                </p>
              </>
            ) : null}

            {ex.type === 'reverse' ? (
              <p className="mt-4 break-words text-3xl font-semibold tracking-tight">
                {ex.word.tr}
              </p>
            ) : null}

            {ex.type === 'gap' ? (
              <p className="mt-4 text-lg font-medium leading-8">
                {ex.gapped}
              </p>
            ) : null}

            {ex.type === 'listening' ? (
              <button
                type="button"
                onClick={() => speak(ex.word.word)}
                className="mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                aria-label="Kelimeyi dinle"
              >
                <Volume2 className="h-9 w-9" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => speak(ex.type === 'gap' ? ex.word.en : ex.word.word)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/20"
              >
                <Volume2 className="h-4 w-4" aria-hidden />
                Dinle
              </button>
            )}
          </div>

          {/* Seçenekler */}
          <div className="flex flex-col">
            <div className="space-y-2.5">
              {ex.options.map((opt, i) => {
                const isCorrect = i === ex.correctIndex;
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
                      <Check
                        className="h-4 w-4 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                    ) : answered && isPicked ? (
                      <X className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {answered ? (
              <div className="mt-4 rounded-lg bg-plane px-4 py-3 text-[13px] leading-6 text-ink-secondary">
                <span className="font-medium text-ink">{ex.word.word}:</span>{' '}
                {ex.word.tr}
                <span className="mx-1.5 text-ink-muted">·</span>
                <em>{ex.word.en}</em>
              </div>
            ) : null}

            <div className="mt-auto flex justify-end pt-5">
              <Button
                size="lg"
                disabled={!answered}
                onClick={() => {
                  if (exIndex + 1 < exercises.length) {
                    setExIndex((i) => i + 1);
                    setPicked(null);
                  } else {
                    setMode('match');
                  }
                }}
              >
                {exIndex + 1 < exercises.length
                  ? 'Sonraki'
                  : 'Eşleştirmeye Geç'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Kartlar ----------------
  const word = words[index];
  const isLearned = learned.has(word.word);
  const allSeen = learned.size >= words.length;

  return (
    <div ref={cardRegion} className="rounded-card border border-hairline bg-surface shadow-card">
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

      <div className="p-6 sm:p-8">
        {/* 3D çevirmeli kart */}
        <div className="mx-auto max-w-2xl [perspective:1400px]">
          <div
            className={cn(
              'relative min-h-[380px] w-full transition-transform duration-500 [transform-style:preserve-3d]',
              flipped && '[transform:rotateY(180deg)]'
            )}
          >
            {/* Ön yüz */}
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-brand-950 text-white [backface-visibility:hidden]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-600/30 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-accent-600/20 blur-2xl"
              />
              <div className="relative flex items-center justify-between px-5 pt-5">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-brand-100">
                  {level} · {word.type}
                </span>
                {isLearned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[12px] font-medium text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Öğrenildi
                  </span>
                ) : (
                  <span className="text-[12px] text-brand-300">
                    {index + 1}/{words.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="relative flex flex-1 flex-col items-center justify-center gap-4 px-6"
              >
                <span className="break-words text-5xl font-semibold tracking-tight sm:text-6xl">
                  {word.word}
                </span>
                <span className="text-[13px] text-brand-300">
                  Karta dokun ve anlamını gör
                </span>
              </button>
              <div className="relative flex items-center justify-center pb-5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(word.word);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  <Volume2 className="h-4 w-4" aria-hidden />
                  Dinle
                </button>
              </div>
            </div>

            {/* Arka yüz */}
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border-2 border-brand-200 bg-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="flex items-center justify-between border-b border-hairline bg-brand-50/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-ink">
                    {word.word}
                  </span>
                  <button
                    type="button"
                    onClick={() => speak(word.word)}
                    aria-label="Seslendir"
                    className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-100"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setFlipped(false)}
                  className="text-[12px] font-medium text-ink-muted hover:text-ink"
                >
                  Kartı çevir
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <p className="text-2xl font-semibold tracking-tight text-brand-700">
                  {word.tr}
                </p>
                <div className="rounded-xl bg-plane/70 p-4">
                  <p className="text-[15px] font-medium leading-7 text-ink">
                    {word.en}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {word.trExample}
                  </p>
                </div>
                {word.tip ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                    <Lightbulb
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                      aria-hidden
                    />
                    <p className="text-[13px] leading-6 text-amber-900">
                      {word.tip}
                    </p>
                  </div>
                ) : null}
              </div>
              {!isLearned ? (
                <div className="border-t border-hairline p-4">
                  <Button size="lg" className="w-full" onClick={() => markLearned(word)}>
                    <Check className="h-4 w-4" aria-hidden />
                    Öğrendim, Sıradaki
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Klavye ipucu */}
        <p className="mt-4 hidden items-center justify-center gap-1.5 text-[12px] text-ink-muted lg:flex">
          <Keyboard className="h-3.5 w-3.5" aria-hidden />
          Boşluk: çevir · Enter: öğrendim · Ok tuşları: gezin
        </p>
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
          onClick={() => setMode('exercises')}
        >
          {allSeen
            ? 'Alıştırmalara Başla'
            : `Alıştırmalara Geç (${learned.size}/${words.length})`}
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
