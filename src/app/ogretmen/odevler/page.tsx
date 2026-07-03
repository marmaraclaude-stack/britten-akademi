import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlarmClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Plus,
  Sun,
} from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  cn,
  dayKeyIstanbul,
  formatDateTime,
  relativeDays,
  SKILL_LABELS,
  submissionOf,
} from '@/lib/utils';
import type { Skill } from '@/lib/types';
import type { AssignmentWithSubmission, Profile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Ödevler' };

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

function AssignmentRows({
  assignments,
  nameById,
}: {
  assignments: AssignmentWithSubmission[];
  nameById: Map<string, string>;
}) {
  const now = Date.now();
  return (
    <ul className="divide-y divide-hairline">
      {assignments.map((a) => {
        const submission = submissionOf(a);
        const overdue =
          !submission && a.due_at !== null && new Date(a.due_at).getTime() < now;
        const studentName = nameById.get(a.student_id) ?? 'Öğrenci';
        return (
          <li key={a.id}>
            <Link
              href={`/ogretmen/odevler/${a.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-plane"
            >
              <Avatar name={studentName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-secondary">
                  {studentName}
                  {submission ? (
                    <span className="text-ink-muted">
                      {' '}
                      · Teslim: {formatDateTime(submission.submitted_at)}
                    </span>
                  ) : null}
                </p>
              </div>
              {a.kind === 'html' ? (
                <Badge tone="brand">
                  <Code2 className="h-3 w-3" aria-hidden />
                  HTML
                </Badge>
              ) : null}
              <SkillBadge skill={a.skill} />
              {a.due_at ? (
                <span
                  className={cn(
                    'text-[13px]',
                    overdue ? 'font-medium text-status-critical' : 'text-ink-muted'
                  )}
                >
                  Son teslim: {formatDateTime(a.due_at)}
                  {overdue ? ' · gecikti' : ` · ${relativeDays(a.due_at)}`}
                </span>
              ) : (
                <span className="text-[13px] text-ink-muted">Teslim tarihi yok</span>
              )}
              {submission?.graded_at ? (
                <Badge tone="green">{submission.grade}/100</Badge>
              ) : null}
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function AssignmentsPage() {
  await requireTeacher();
  const supabase = await createClient();

  const [assignmentsRes, studentsRes] = await Promise.all([
    supabase
      .from('assignments')
      .select('*, submissions(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, is_active')
      .eq('role', 'student')
      .order('full_name'),
  ]);

  const assignments = (assignmentsRes.data ?? []) as AssignmentWithSubmission[];
  const students = (studentsRes.data ?? []) as Pick<
    Profile,
    'id' | 'full_name' | 'is_active'
  >[];
  const nameById = new Map(students.map((s) => [s.id, s.full_name]));
  const now = Date.now();

  const byDue = (a: AssignmentWithSubmission, b: AssignmentWithSubmission) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return a.due_at.localeCompare(b.due_at);
  };

  const waiting = assignments.filter((a) => !submissionOf(a)).sort(byDue);
  const waitingOverdue = waiting.filter(
    (a) => a.due_at && new Date(a.due_at).getTime() < now
  );
  const waitingToday = waiting.filter(
    (a) =>
      a.due_at &&
      relativeDays(a.due_at) === 'bugün' &&
      new Date(a.due_at).getTime() >= now
  );
  const waitingRest = waiting.filter(
    (a) => !waitingOverdue.includes(a) && !waitingToday.includes(a)
  );

  const toGrade = assignments
    .filter((a) => {
      const s = submissionOf(a);
      return s && s.graded_at === null;
    })
    .sort((a, b) =>
      (submissionOf(a)?.submitted_at ?? '').localeCompare(
        submissionOf(b)?.submitted_at ?? ''
      )
    );
  const done = assignments.filter((a) => {
    const s = submissionOf(a);
    return s && s.graded_at !== null;
  });

  // Bugunun odev kapsami: aktif ogrenci x beceri matrisi (teslimi bugune olanlar)
  const todayKey = dayKeyIstanbul(new Date());
  const activeStudents = students.filter((st) => st.is_active);
  const SKILLS = Object.keys(SKILL_LABELS) as Skill[];
  const todayBy = new Map<string, Set<Skill>>();
  for (const a of assignments) {
    if (a.due_at && dayKeyIstanbul(a.due_at) === todayKey) {
      const set = todayBy.get(a.student_id) ?? new Set<Skill>();
      set.add(a.skill);
      todayBy.set(a.student_id, set);
    }
  }

  const newButton = (
    <Link
      href="/ogretmen/odevler/yeni"
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Yeni Ödev
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Ödevler"
        description="Günlük ödev akışınız: teslimler, notlama ve yaklaşan teslim tarihleri."
        action={newButton}
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Henüz ödev vermediniz"
          description="İlk ödevi oluşturun; öğrenciniz teslim ettiğinde burada notlanmayı bekleyen ödevler arasında görünecek."
          action={newButton}
        />
      ) : (
        <div className="space-y-8">
          {/* Bugünün ödev kapsamı */}
          {activeStudents.length > 0 ? (
            <Card>
              <CardHeader
                title="Bugünün ödev kapsamı"
                description="Her öğrenci için bugün teslim tarihli ödevlerin beceri dağılımı; eksik becerilere tıklayıp ödev verin."
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-hairline bg-plane/60 text-left">
                      <th className="px-5 py-2.5 text-[13px] font-semibold text-ink-secondary">
                        Öğrenci
                      </th>
                      {SKILLS.map((sk) => (
                        <th
                          key={sk}
                          className="px-2 py-2.5 text-center text-[13px] font-semibold text-ink-secondary"
                        >
                          {SKILL_LABELS[sk]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {activeStudents.map((st) => {
                      const set = todayBy.get(st.id) ?? new Set<Skill>();
                      return (
                        <tr key={st.id} className="hover:bg-plane/50">
                          <td className="px-5 py-2.5">
                            <Link
                              href={`/ogretmen/ogrenciler/${st.id}`}
                              className="flex items-center gap-2.5 font-medium text-ink hover:underline"
                            >
                              <Avatar name={st.full_name} size="sm" />
                              <span className="truncate">{st.full_name}</span>
                            </Link>
                          </td>
                          {SKILLS.map((sk) => (
                            <td key={sk} className="px-2 py-2.5 text-center">
                              {set.has(sk) ? (
                                <span
                                  title={`${SKILL_LABELS[sk]}: bugün ödev var`}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[12px] font-bold text-white"
                                >
                                  ✓
                                </span>
                              ) : (
                                <Link
                                  href="/ogretmen/odevler/yeni"
                                  title={`${SKILL_LABELS[sk]}: bugün ödev yok, ödev ver`}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-hairline text-[13px] text-ink-muted transition-colors hover:border-brand-400 hover:text-brand-600"
                                >
                                  +
                                </Link>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {/* Özet şeridi */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              icon={ClipboardCheck}
              value={toGrade.length}
              label="Notlanacak teslim"
              toneClass="bg-accent-50 text-accent-700"
            />
            <SummaryTile
              icon={Sun}
              value={waitingToday.length}
              label="Bugün teslim tarihi"
              toneClass="bg-brand-50 text-brand-700"
            />
            <SummaryTile
              icon={AlarmClock}
              value={waitingOverdue.length}
              label="Geciken"
              toneClass="bg-amber-50 text-amber-700"
            />
            <SummaryTile
              icon={CheckCircle2}
              value={done.length}
              label="Tamamlanan"
              toneClass="bg-emerald-50 text-emerald-700"
            />
          </div>

          {/* Notlanacaklar: en acil is */}
          <Card className={toGrade.length > 0 ? 'border-accent-200' : undefined}>
            <CardHeader
              title="Notlanacak"
              description={
                toGrade.length > 0
                  ? `${toGrade.length} teslim incelemenizi bekliyor`
                  : 'Notlanmayı bekleyen teslim yok'
              }
              action={
                toGrade.length > 0 ? (
                  <Badge tone="accent">{toGrade.length}</Badge>
                ) : undefined
              }
            />
            {toGrade.length > 0 ? (
              <AssignmentRows assignments={toGrade} nameById={nameById} />
            ) : (
              <p className="px-5 py-4 text-[13px] text-ink-muted">
                Yeni teslimler geldiğinde burada listelenir.
              </p>
            )}
          </Card>

          {/* Teslim bekleniyor */}
          <Card>
            <CardHeader
              title="Teslim bekleniyor"
              description={`${waiting.length} ödev öğrencide`}
            />
            {waiting.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-muted">
                Teslimi beklenen ödev yok.
              </p>
            ) : (
              <div>
                {waitingOverdue.length > 0 ? (
                  <>
                    <p className="border-b border-hairline bg-accent-50/60 px-5 py-2 text-[13px] font-semibold text-accent-800">
                      Gecikenler
                    </p>
                    <AssignmentRows
                      assignments={waitingOverdue}
                      nameById={nameById}
                    />
                  </>
                ) : null}
                {waitingToday.length > 0 ? (
                  <>
                    <p className="border-b border-t border-hairline bg-brand-50/60 px-5 py-2 text-[13px] font-semibold text-brand-800">
                      Bugün
                    </p>
                    <AssignmentRows assignments={waitingToday} nameById={nameById} />
                  </>
                ) : null}
                {waitingRest.length > 0 ? (
                  <>
                    <p className="border-b border-t border-hairline bg-plane px-5 py-2 text-[13px] font-semibold text-ink-secondary">
                      Daha sonra
                    </p>
                    <AssignmentRows assignments={waitingRest} nameById={nameById} />
                  </>
                ) : null}
              </div>
            )}
          </Card>

          {/* Tamamlananlar */}
          <Card>
            <CardHeader
              title="Tamamlandı"
              description={`${done.length} ödev notlandı`}
            />
            {done.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-muted">
                Henüz notlanan ödev yok.
              </p>
            ) : (
              <AssignmentRows assignments={done.slice(0, 15)} nameById={nameById} />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
