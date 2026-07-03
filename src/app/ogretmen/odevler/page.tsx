import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cn, formatDateTime, submissionOf } from '@/lib/utils';
import type { AssignmentWithSubmission, Profile } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Ödevler' };

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
        return (
          <li key={a.id}>
            <Link
              href={`/ogretmen/odevler/${a.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-plane"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-secondary">
                  {nameById.get(a.student_id) ?? 'Öğrenci'}
                  {submission ? (
                    <span className="text-ink-muted">
                      {' '}
                      · Teslim: {formatDateTime(submission.submitted_at)}
                    </span>
                  ) : null}
                </p>
              </div>
              <SkillBadge skill={a.skill} />
              {a.due_at ? (
                <span
                  className={cn(
                    'text-[13px]',
                    overdue ? 'font-medium text-status-critical' : 'text-ink-muted'
                  )}
                >
                  Son teslim: {formatDateTime(a.due_at)}
                  {overdue ? ' · gecikti' : ''}
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
    supabase.from('profiles').select('id, full_name').eq('role', 'student'),
  ]);

  const assignments = (assignmentsRes.data ?? []) as AssignmentWithSubmission[];
  const students = (studentsRes.data ?? []) as Pick<Profile, 'id' | 'full_name'>[];
  const nameById = new Map(students.map((s) => [s.id, s.full_name]));

  const waiting = assignments.filter((a) => !submissionOf(a));
  const toGrade = assignments.filter((a) => {
    const s = submissionOf(a);
    return s && s.graded_at === null;
  });
  const done = assignments.filter((a) => {
    const s = submissionOf(a);
    return s && s.graded_at !== null;
  });

  const newButton = (
    <Link
      href="/ogretmen/odevler/yeni"
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-900"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Yeni Ödev
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Ödevler"
        description="Verilen ödevleri teslim ve not durumuna göre takip edin."
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
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Teslim bekleniyor"
              description={`${waiting.length} ödev — öğrenci henüz göndermedi`}
            />
            {waiting.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-muted">
                Teslimi beklenen ödev yok.
              </p>
            ) : (
              <AssignmentRows assignments={waiting} nameById={nameById} />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Notlanacak"
              description={`${toGrade.length} teslim incelemenizi bekliyor`}
            />
            {toGrade.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-muted">
                Notlanmayı bekleyen teslim yok.
              </p>
            ) : (
              <AssignmentRows assignments={toGrade} nameById={nameById} />
            )}
          </Card>

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
              <AssignmentRows assignments={done} nameById={nameById} />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
