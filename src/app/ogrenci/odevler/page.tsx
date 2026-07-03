import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Hourglass,
} from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import {
  cn,
  formatDateShort,
  formatDateTime,
  relativeDays,
  truncate,
} from '@/lib/utils';
import type { AssignmentWithSubmission, Submission } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Ödevlerim' };

function submissionOf(a: AssignmentWithSubmission): Submission | null {
  return a.submissions?.[0] ?? null;
}

function GroupHeading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
      {title}
      <span className="rounded-full bg-plane px-2 py-0.5 text-[12px] font-medium text-ink-secondary">
        {count}
      </span>
    </h2>
  );
}

function AssignmentList({
  items,
  meta,
}: {
  items: AssignmentWithSubmission[];
  meta: (a: AssignmentWithSubmission) => ReactNode;
}) {
  return (
    <Card>
      <ul className="divide-y divide-hairline">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              href={`/ogrenci/odevler/${a.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-plane/70"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                <div className="mt-1">{meta(a)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <SkillBadge skill={a.skill} />
                <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function StudentAssignmentsPage() {
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const supabase = await createClient();
  const { data } = await supabase
    .from('assignments')
    .select('*, submissions(*)')
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false });

  const assignments = (data ?? []) as AssignmentWithSubmission[];
  const now = Date.now();

  const todo = assignments
    .filter((a) => !submissionOf(a))
    .sort((a, b) => {
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return a.due_at.localeCompare(b.due_at);
    });
  const submitted = assignments
    .filter((a) => {
      const s = submissionOf(a);
      return s !== null && s.graded_at === null;
    })
    .sort((a, b) =>
      (submissionOf(b)?.submitted_at ?? '').localeCompare(
        submissionOf(a)?.submitted_at ?? ''
      )
    );
  const graded = assignments
    .filter((a) => submissionOf(a)?.graded_at)
    .sort((a, b) =>
      (submissionOf(b)?.graded_at ?? '').localeCompare(
        submissionOf(a)?.graded_at ?? ''
      )
    );

  return (
    <div>
      <PageHeader
        title="Ödevlerim"
        description="Öğretmeninin verdiği ödevler — teslim et, notunu ve geri bildirimini gör"
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Henüz ödevin yok"
          description="Öğretmenin sana ödev verdiğinde burada görünecek. O zamana kadar materyallerine göz atabilirsin."
        />
      ) : (
        <div className="space-y-8">
          {/* Yapılacaklar */}
          <section>
            <GroupHeading title="Yapılacaklar" count={todo.length} />
            {todo.length > 0 ? (
              <AssignmentList
                items={todo}
                meta={(a) => {
                  const overdue = a.due_at
                    ? new Date(a.due_at).getTime() < now
                    : false;
                  return (
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-[13px]',
                          overdue ? 'text-status-critical' : 'text-ink-muted'
                        )}
                      >
                        {a.due_at
                          ? `Teslim: ${formatDateTime(a.due_at)} · ${relativeDays(a.due_at)}`
                          : 'Teslim tarihi belirtilmedi'}
                      </span>
                      {overdue ? <Badge tone="red">Gecikti</Badge> : null}
                    </span>
                  );
                }}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Bekleyen ödevin yok — hepsini teslim ettin, harikasın!
              </div>
            )}
          </section>

          {/* Teslim edildi */}
          {submitted.length > 0 ? (
            <section>
              <GroupHeading title="Teslim edildi" count={submitted.length} />
              <AssignmentList
                items={submitted}
                meta={(a) => {
                  const s = submissionOf(a);
                  return (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] text-ink-muted">
                        {s
                          ? `Teslim edildi: ${formatDateShort(s.submitted_at)}`
                          : ''}
                      </span>
                      <Badge tone="amber">
                        <Hourglass className="h-3 w-3" aria-hidden />
                        Değerlendiriliyor
                      </Badge>
                    </span>
                  );
                }}
              />
            </section>
          ) : null}

          {/* Notlandı */}
          {graded.length > 0 ? (
            <section>
              <GroupHeading title="Notlandı" count={graded.length} />
              <AssignmentList
                items={graded}
                meta={(a) => {
                  const s = submissionOf(a);
                  return (
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone="green">{s?.grade ?? 0}/100</Badge>
                      {s?.feedback ? (
                        <span className="text-[13px] text-ink-muted">
                          {truncate(s.feedback, 90)}
                        </span>
                      ) : null}
                    </span>
                  );
                }}
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
