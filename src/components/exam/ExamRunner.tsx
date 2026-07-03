'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Loader2,
  TimerIcon,
} from 'lucide-react';
import { saveAttemptAnswers, submitAttempt } from '@/lib/actions/placement';
import { cn, SECTION_LABELS } from '@/lib/utils';
import type { PublicTestQuestion, TestPassage, TestSection } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const SECTION_ORDER: TestSection[] = ['grammar', 'vocabulary', 'usage', 'reading'];
const LETTERS = ['A', 'B', 'C', 'D'];

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExamRunner({
  attemptId,
  startedAt,
  questions,
  passages,
  initialAnswers,
}: {
  attemptId: string;
  startedAt: string;
  questions: PublicTestQuestion[];
  passages: TestPassage[];
  initialAnswers: Record<string, number>;
}) {
  const router = useRouter();
  const storageKey = `ba-exam-${attemptId}`;

  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [elapsed, setElapsed] = useState(0);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const dirtyRef = useRef(false);

  // localStorage yedeğini birleştir (sunucu kaydı esastır, yerel tamamlar)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const local = JSON.parse(raw) as Record<string, number>;
        setAnswers((prev) => ({ ...local, ...prev }));
      }
    } catch {
      /* yerel yedek okunamadıysa sorun değil */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geçen süre
  useEffect(() => {
    const startMs = new Date(startedAt).getTime();
    const t = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000))),
      1000
    );
    return () => clearInterval(t);
  }, [startedAt]);

  const persist = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveState('saving');
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(answersRef.current));
    } catch {
      /* depolama dolu olabilir */
    }
    const res = await saveAttemptAnswers(attemptId, answersRef.current);
    setSaveState(res.ok ? 'saved' : 'idle');
  }, [attemptId, storageKey]);

  // Periyodik otokayıt
  useEffect(() => {
    const t = setInterval(persist, 25000);
    return () => clearInterval(t);
  }, [persist]);

  const sections = useMemo(() => {
    return SECTION_ORDER.map((key) => ({
      key,
      questions: questions.filter((q) => q.section === key),
    })).filter((s) => s.questions.length > 0);
  }, [questions]);

  const current = sections[sectionIdx] ?? sections[0];
  const answeredCount = Object.keys(answers).length;
  const total = questions.length;

  // Savunma: soru bankası boşsa çökme yerine bilgi göster
  if (!current || total === 0) {
    return (
      <p className="mx-auto max-w-lg rounded-card border border-hairline bg-surface p-6 text-center text-sm text-ink-secondary">
        Sınav soruları yüklenemedi. Lütfen sayfayı yenile veya öğretmenine haber
        ver.
      </p>
    );
  }

  const choose = (qid: number, idx: number) => {
    setAnswers((prev) => ({ ...prev, [String(qid)]: idx }));
    dirtyRef.current = true;
    setSaveState('idle');
  };

  const goSection = (idx: number) => {
    persist();
    setSectionIdx(idx);
    window.scrollTo({ top: 0 });
  };

  const finish = () => {
    startSubmit(async () => {
      setSubmitError(null);
      const duration = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const res = await submitAttempt(attemptId, answersRef.current, duration);
      if (res.ok) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          /* yoksay */
        }
        router.push('/ogrenci/seviye-testi/sonuc');
        router.refresh();
      } else {
        setSubmitError(res.message ?? 'Sınav gönderilemedi. Lütfen tekrar deneyin.');
        setConfirmOpen(false);
      }
    });
  };

  // Numaralandırma soru id'siyle aynı (1..100)
  const renderQuestion = (q: PublicTestQuestion) => {
    const chosen = answers[String(q.id)];
    return (
      <fieldset
        key={q.id}
        id={`soru-${q.id}`}
        className="rounded-card border border-hairline bg-surface p-4 shadow-card"
      >
        <legend className="sr-only">{`Soru ${q.id}`}</legend>
        <p className="text-sm font-medium leading-6 text-ink">
          <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-100 px-1 text-[12px] font-semibold text-brand-800">
            {q.id}
          </span>
          <span className="whitespace-pre-wrap">{q.question}</span>
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            const active = chosen === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(q.id, i)}
                aria-pressed={active}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm leading-5 transition-colors',
                  active
                    ? 'border-brand-700 bg-brand-800 text-white'
                    : 'border-hairline bg-white text-ink hover:border-brand-300 hover:bg-brand-50'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    active ? 'bg-accent-400 text-brand-950' : 'bg-brand-100 text-brand-700'
                  )}
                >
                  {LETTERS[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  };

  const sectionContent = () => {
    if (current.key !== 'reading') {
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          {current.questions.map(renderQuestion)}
        </div>
      );
    }
    // Okuma: pasaj + soruları
    return (
      <div className="space-y-8">
        {passages.map((p) => {
          const pqs = current.questions.filter((q) => q.passage_ref === p.ref);
          if (pqs.length === 0) return null;
          return (
            <div
              key={p.ref}
              className="grid items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-6"
            >
              <article className="rounded-card border border-brand-200 bg-brand-50/60 p-5 xl:sticky xl:top-32">
                <p className="text-[13px] font-semibold text-brand-600">
                  Okuma Parçası
                </p>
                <h3 className="mt-1 text-[15px] font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">
                  {p.body}
                </p>
              </article>
              <div className="mt-4 space-y-4 xl:mt-0">{pqs.map(renderQuestion)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const isLast = sectionIdx === sections.length - 1;

  return (
    <div>
      {/* Üst bilgi çubuğu; mobilde uygulama başlığının (≈61px) altına oturur */}
      <div className="sticky top-[61px] z-20 -mx-4 mb-6 border-b border-hairline bg-plane/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums text-ink-secondary">
              <TimerIcon className="h-4 w-4 text-ink-muted" aria-hidden />
              {formatElapsed(elapsed)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted"
              aria-live="polite"
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Kaydediliyor…
                </>
              ) : saveState === 'saved' ? (
                <>
                  <CloudUpload className="h-3.5 w-3.5 text-status-goodtext" aria-hidden />
                  Kaydedildi
                </>
              ) : null}
            </span>
          </div>
          <p className="text-[13px] font-medium tabular-nums text-ink">
            {answeredCount}/{total} yanıtlandı
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-brand-700 transition-[width]"
            style={{ width: `${total > 0 ? (answeredCount / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="w-full">
        {/* Bölüm sekmeleri */}
        <div className="mb-5 flex flex-wrap gap-2">
          {sections.map((s, i) => {
            const done = s.questions.every((q) => answers[String(q.id)] !== undefined);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => goSection(i)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  i === sectionIdx
                    ? 'border-brand-800 bg-brand-800 text-white'
                    : 'border-hairline bg-white text-ink-secondary hover:border-brand-300'
                )}
              >
                {done ? (
                  <CheckCircle2
                    className={cn(
                      'h-3.5 w-3.5',
                      i === sectionIdx ? 'text-accent-300' : 'text-status-goodtext'
                    )}
                    aria-hidden
                  />
                ) : null}
                {SECTION_LABELS[s.key]}
                <span className="opacity-70">({s.questions.length})</span>
              </button>
            );
          })}
        </div>

        {sectionContent()}

        {/* Alt gezinme */}
        <div className="mt-8 flex items-center justify-between border-t border-hairline pt-5">
          <Button
            variant="secondary"
            disabled={sectionIdx === 0}
            onClick={() => goSection(sectionIdx - 1)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Önceki Bölüm
          </Button>
          {isLast ? (
            <Button variant="accent" size="lg" onClick={() => { persist(); setConfirmOpen(true); }}>
              Sınavı Bitir
            </Button>
          ) : (
            <Button onClick={() => goSection(sectionIdx + 1)}>
              Sonraki Bölüm
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
        {submitError ? (
          <p className="mt-3 text-sm text-status-critical" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      {/* Bitirme onayı */}
      <Modal
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        title="Sınavı bitirmek üzeresin"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-ink-secondary">
            {total - answeredCount > 0 ? (
              <>
                <strong className="text-ink">{total - answeredCount} soru</strong> boş
                görünüyor. Boş sorular yanlış sayılmaz ama puan da getirmez. Yine de
                bitirmek istiyor musun?
              </>
            ) : (
              'Tüm soruları yanıtladın. Sınavı gönderdiğinde sonucun hemen hesaplanacak.'
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setConfirmOpen(false)}
            >
              Sınava Dön
            </Button>
            <Button variant="accent" disabled={submitting} onClick={finish}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Gönderiliyor…
                </>
              ) : (
                'Bitir ve Gönder'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
