import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlarmClock,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Code2,
  Hourglass,
  Sun,
  Trophy,
} from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import {
  cn,
  formatDateShort,
  formatDateTime,
  formatTime,
  relativeDays,
  submissionOf,
  truncate,
} from '@/lib/utils';
import type { AssignmentWithSubmission } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Ödevlerim' };

function KindBadge({ kind }: { kind: 'text' | 'html' }) {
  if (kind !== 'html') return null;
  return (
    <Badge tone="brand">
      <Code2 className="h-3 w-3" aria-hidden />
      İnteraktif
    </Badge>
  );
}

function GroupHeading({
  title,
  count,
  tone = 'gray',
}: {
  title: string;
  count: number;
  tone?: 'gray' | 'accent' | 'brand';
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
      {title}
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[12px] font-medium',
          tone === 'accent'
            ? 'bg-accent-100 text-accent-800'
            : tone === 'brand'
              ? 'bg-brand-100 text-brand-800'
              : 'bg-plane text-ink-secondary'
        )}
      >
        {count}
      </span>
    </h2>
  );
}

function SummaryTile({
  icon: Icon,
  value,
  label,
  toneClass,
}: {
  icon: typeof Sun;
  value: ReactNode;
  label: string;
  toneClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          toneClass
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-xl font-semibold tabular-nums text-ink">{value}</p>
        <p className="text-[12px] text-ink-muted">{label}</p>
      </div>
    </div>
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
                <KindBadge kind={a.kind} />
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

  const byDue = (a: AssignmentWithSubmission, b: AssignmentWithSubmission) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return a.due_at.localeCompare(b.due_at);
  };

  const open = assignments.filter((a) => !submissionOf(a)).sort(byDue);
  const overdue = open.filter(
    (a) => a.due_at && new Date(a.due_at).getTime() < now
  );
  const dueToday = open.filter(
    (a) =>
      a.due_at &&
      relativeDays(a.due_at) === 'bugün' &&
      new Date(a.due_at).getTime() >= now
  );
  const upcoming = open.filter(
    (a) => !dueToday.includes(a) && !overdue.includes(a)
  );

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

  const grades = graded
    .map((a) => submissionOf(a)?.grade)
    .filter((g): g is number => g !== null && g !== undefined);
  const avgGrade =
    grades.length > 0
      ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length)
      : null;

  return (
    <div>
      <PageHeader
        title="Ödevlerim"
        description="Günün ödevlerini teslim et; notlarını ve geri bildirimlerini takip et."
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Henüz ödevin yok"
          description="Öğretmenin sana ödev verdiğinde burada görünecek. O zamana kadar günlük kelimelerine ve materyallerine göz atabilirsin."
        />
      ) : (
        <div className="space-y-8">
          {/* Özet şeridi */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              icon={Sun}
              value={dueToday.length}
              label="Bugün teslim"
              toneClass="bg-brand-50 text-brand-700"
            />
            <SummaryTile
              icon={AlarmClock}
              value={overdue.length}
              label="Geciken"
              toneClass="bg-accent-50 text-accent-700"
            />
            <SummaryTile
              icon={Hourglass}
              value={submitted.length}
              label="Değerlendirmede"
              toneClass="bg-amber-50 text-amber-700"
            />
            <SummaryTile
              icon={Trophy}
              value={avgGrade ?? '-'}
              label="Ortalama not"
              toneClass="bg-emerald-50 text-emerald-700"
            />
          </div>

          {/* Bugünün ödevleri */}
          {dueToday.length > 0 ? (
            <section>
              <GroupHeading
                title="Bugün teslim"
                count={dueToday.length}
                tone="brand"
              />
              <div className="grid gap-3 lg:grid-cols-2">
                {dueToday.map((a) => (
                  <Link
                    key={a.id}
                    href={`/ogrenci/odevler/${a.id}`}
                    className="group rounded-card border border-brand-200 bg-gradient-to-br from-brand-50 to-surface p-5 shadow-card transition-shadow hover:shadow-raised"
                  >
                    <div className="flex items-center gap-2">
                      <KindBadge kind={a.kind} />
                      <SkillBadge skill={a.skill} />
                    </div>
                    <p className="mt-3 text-[15px] font-semibold text-ink">
                      {a.title}
                    </p>
                    {a.description ? (
                      <p className="mt-1 text-[13px] leading-5 text-ink-secondary">
                        {truncate(a.description, 110)}
                      </p>
                    ) : null}
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700">
                      Bugün {a.due_at ? formatTime(a.due_at) : ''} itibarıyla teslim edilmeli
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* Gecikenler */}
          {overdue.length > 0 ? (
            <section>
              <GroupHeading title="Geciken" count={overdue.length} tone="accent" />
              <AssignmentList
                items={overdue}
                meta={(a) => (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-accent-700">
                      Teslim tarihi {formatDateTime(a.due_at!)} idi (
                      {relativeDays(a.due_at!)})
                    </span>
                    <Badge tone="red">Gecikti</Badge>
                  </span>
                )}
              />
              <p className="mt-2 text-[13px] text-ink-muted">
                Geciken ödevini yine de teslim edebilirsin; öğretmenin durumu görür.
              </p>
            </section>
          ) : null}

          {/* Yaklaşanlar */}
          <section>
            <GroupHeading title="Yaklaşan" count={upcoming.length} />
            {upcoming.length > 0 ? (
              <AssignmentList
                items={upcoming}
                meta={(a) => (
                  <span className="text-[13px] text-ink-muted">
                    {a.due_at
                      ? `Teslim: ${formatDateTime(a.due_at)} (${relativeDays(a.due_at)})`
                      : 'Teslim tarihi belirtilmedi'}
                  </span>
                )}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Bekleyen başka ödevin yok; hepsini teslim ettin, harikasın!
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
                        {s ? `Teslim edildi: ${formatDateShort(s.submitted_at)}` : ''}
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
