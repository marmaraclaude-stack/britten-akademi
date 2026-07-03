import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, Inbox } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, relativeDays, submissionOf } from '@/lib/utils';
import type { AssignmentWithSubmission, Profile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { HtmlViewer } from '@/components/materials/HtmlViewer';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { DeleteAssignmentButton } from './DeleteAssignmentButton';
import { GradeForm } from './GradeForm';

export const metadata: Metadata = { title: 'Ödev Detayı' };

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher();
  const supabase = await createClient();

  const { data } = await supabase
    .from('assignments')
    .select('*, submissions(*)')
    .eq('id', id)
    .maybeSingle();

  const assignment = data as AssignmentWithSubmission | null;
  if (!assignment) notFound();

  const submission = submissionOf(assignment);

  const { data: studentData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', assignment.student_id)
    .maybeSingle();
  const student = studentData as Profile | null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/ogretmen/odevler"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Tüm ödevler
      </Link>

      <PageHeader
        title={assignment.title}
        description={
          student
            ? `${student.full_name} için verilen ödev`
            : 'Ödev detayı'
        }
      />

      {/* Ödev bilgileri */}
      <Card>
        <CardHeader
          title="Ödev bilgileri"
          action={
            !submission ? (
              <Badge tone="amber">Teslim bekleniyor</Badge>
            ) : submission.graded_at === null ? (
              <Badge tone="blue">Notlanacak</Badge>
            ) : (
              <Badge tone="green">{submission.grade}/100</Badge>
            )
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {student ? (
              <Link
                href={`/ogretmen/ogrenciler/${student.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-ink hover:underline"
              >
                <Avatar name={student.full_name} size="sm" />
                {student.full_name}
              </Link>
            ) : null}
            <SkillBadge skill={assignment.skill} />
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary">
              <CalendarClock className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
              {assignment.due_at
                ? `Son teslim: ${formatDateTime(assignment.due_at)} (${relativeDays(assignment.due_at)})`
                : 'Teslim tarihi belirlenmedi'}
            </span>
          </div>

          {assignment.description ? (
            <p className="whitespace-pre-wrap rounded-lg bg-plane px-4 py-3 text-sm leading-6 text-ink-secondary">
              {assignment.description}
            </p>
          ) : null}

          {assignment.kind === 'html' && assignment.html_content ? (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                HTML ödev önizlemesi
              </p>
              <HtmlViewer
                html={assignment.html_content}
                studentName={student?.full_name ?? 'Öğrenci'}
                level={student?.cefr_level ?? null}
                title={assignment.title}
              />
            </div>
          ) : null}

          {assignment.attachment_path && assignment.attachment_name ? (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                Ödev eki
              </p>
              <DownloadButton
                path={assignment.attachment_path}
                name={assignment.attachment_name}
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Teslim */}
      <Card className="mt-6">
        <CardHeader
          title="Öğrencinin teslimi"
          description={
            submission ? `Teslim: ${formatDateTime(submission.submitted_at)}` : undefined
          }
        />
        <CardBody>
          {!submission ? (
            <EmptyState
              icon={Inbox}
              title="Öğrenci henüz teslim etmedi"
              description="Teslim geldiğinde içeriği burada görüp notlayabilirsiniz."
            />
          ) : (
            <div className="space-y-5">
              {submission.content ? (
                <p className="whitespace-pre-wrap rounded-lg border border-hairline bg-plane/60 px-4 py-3 text-sm leading-6 text-ink">
                  {submission.content}
                </p>
              ) : (
                <p className="text-[13px] text-ink-muted">
                  Öğrenci yazılı açıklama eklemedi.
                </p>
              )}

              {submission.attachment_path && submission.attachment_name ? (
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                    Teslim eki
                  </p>
                  <DownloadButton
                    path={submission.attachment_path}
                    name={submission.attachment_name}
                  />
                </div>
              ) : null}

              <div className="border-t border-hairline pt-5">
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                  {submission.graded_at ? 'Notu güncelle' : 'Notla'}
                </p>
                <GradeForm
                  submissionId={submission.id}
                  grade={submission.grade}
                  feedback={submission.feedback}
                  graded={submission.graded_at !== null}
                />
                {submission.graded_at ? (
                  <p className="mt-3 text-[12px] text-ink-muted">
                    Son notlama: {formatDateTime(submission.graded_at)}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Tehlikeli bölge */}
      <Card className="mt-6 border-status-critical/20">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Ödevi sil</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Ödev ve varsa teslimi kalıcı olarak silinir.
            </p>
          </div>
          <DeleteAssignmentButton assignmentId={assignment.id} />
        </CardBody>
      </Card>
    </div>
  );
}
