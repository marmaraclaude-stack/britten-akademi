import { Check, ChevronDown, Lightbulb, X } from 'lucide-react';
import { cn, SECTION_LABELS } from '@/lib/utils';
import type { TestQuestion, TestSection } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const SECTION_ORDER: TestSection[] = ['grammar', 'vocabulary', 'usage', 'reading'];

function QuestionCard({
  question,
  order,
  given,
}: {
  question: TestQuestion;
  order: number;
  given: number | undefined;
}) {
  const blank = given === undefined || given === null;
  return (
    <li className="rounded-card border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-ink">
          <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-plane px-1.5 text-[12px] font-semibold text-ink-secondary">
            {order}
          </span>
          {question.question}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="gray">{question.level}</Badge>
          {blank ? <Badge tone="amber">Boş bırakıldı</Badge> : null}
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.answer_index;
          const isGiven = !blank && i === given;
          return (
            <li
              key={i}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm leading-6',
                isCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : isGiven
                    ? 'border-accent-300 bg-accent-50 text-accent-900'
                    : 'border-transparent bg-plane/60 text-ink-secondary'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  isCorrect
                    ? 'bg-emerald-600 text-white'
                    : isGiven
                      ? 'bg-accent-600 text-white'
                      : 'bg-white text-ink-muted ring-1 ring-hairline'
                )}
              >
                {OPTION_LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1">{opt}</span>
              {isCorrect ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Doğru cevap
                </span>
              ) : isGiven ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent-700">
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Senin cevabın
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {question.explanation ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          <p className="text-[13px] leading-6 text-brand-900">{question.explanation}</p>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Yanlis yapilan ve bos birakilan sorularin bolum bolum incelemesi.
 * Sunucuda render edilir; yalnizca tamamlanmis denemenin yanlislari gosterilir.
 */
export function MistakeReview({
  questions,
  answers,
}: {
  questions: TestQuestion[];
  answers: Record<string, number>;
}) {
  const orderById = new Map(questions.map((q, i) => [q.id, i + 1]));
  const wrong = questions.filter((q) => answers[String(q.id)] !== q.answer_index);

  if (wrong.length === 0) {
    return (
      <div className="rounded-card border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
        Tüm soruları doğru cevaplandı; incelenecek yanlış yok.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {SECTION_ORDER.map((section) => {
        const items = wrong.filter((q) => q.section === section);
        if (items.length === 0) return null;
        return (
          <details
            key={section}
            className="group rounded-card border border-hairline bg-surface shadow-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2.5">
                <span className="text-[15px] font-semibold text-ink">
                  {SECTION_LABELS[section]}
                </span>
                <Badge tone="accent">{items.length} yanlış</Badge>
              </span>
              <ChevronDown
                className="h-4 w-4 text-ink-muted transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <ul className="space-y-3 border-t border-hairline bg-plane/40 p-4">
              {items.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  order={orderById.get(q.id) ?? q.id}
                  given={answers[String(q.id)]}
                />
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
