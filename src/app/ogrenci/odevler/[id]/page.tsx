import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, CheckCircle2 } from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import { cn, formatDateTime, relativeDays, submissionOf } from '@/lib/utils';
import type { AssignmentWithSubmission } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { SubmitForm } from './SubmitForm';

export const metadata: Metadata = { title: 'Ödev' };

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const supabase = await createClient();
  const { data } = await supabase
    .from('assignments')
    .select('*, submissions(*)')
    .eq('id', id)
    .maybeSingle();

  const assignment = data as AssignmentWithSubmission | null;
  if (!assignment || assignment.student_id !== profile.id) notFound();

  const submission = submissionOf(assignment);
  const isGraded = Boolean(submission?.graded_at);
  const overdue = assignment.due_at
    ? new Date(assignment.due_at).getTime() < Date.now() && !submission
    : false;

  return (
    <div>
      <Link
        href="/ogrenci/odevler"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-700 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Ödevlerime dön
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {assignment.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SkillBadge skill={assignment.skill} />
          {assignment.due_at ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[13px]',
                overdue ? 'text-status-critical' : 'text-ink-muted'
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Teslim: {formatDateTime(assignment.due_at)} ·{' '}
              {relativeDays(assignment.due_at)}
            </span>
          ) : null}
          {overdue ? <Badge tone="red">Gecikti</Badge> : null}
        </div>
      </div>

      <div className="space-y-6">
        {/* Ödev açıklaması */}
        <Card>
          <CardHeader title="Ödev" description="Öğretmeninin senden istedikleri" />
          <CardBody>
            {assignment.description ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-ink-secondary">
                {assignment.description}
              </p>
            ) : (
              <p className="text-sm text-ink-muted">
                Ek bir açıklama yok — başlık ve varsa ekli dosya üzerinden ilerle.
              </p>
            )}
            {assignment.attachment_path ? (
              <div className="mt-4 border-t border-hairline pt-4">
                <p className="mb-2 text-[13px] font-medium text-ink">Ekli dosya</p>
                <DownloadButton
                  path={assignment.attachment_path}
                  name={assignment.attachment_name ?? 'Ek dosya'}
                />
              </div>
            ) : null}
          </CardBody>
        </Card>

        {isGraded && submission ? (
          <>
            {/* Not ve geri bildirim */}
            <Card className="border-emerald-200">
              <CardHeader
                title="Sonucun"
                description={
                  submission.graded_at
                    ? `Notlandı: ${formatDateTime(submission.graded_at)}`
                    : undefined
                }
                action={
                  <Badge tone="green">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Notlandı
                  </Badge>
                }
              />
              <CardBody>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="rounded-2xl bg-emerald-50 px-6 py-4 text-center">
                    <p className="text-4xl font-semibold tabular-nums text-emerald-800">
                      {submission.grade}
                    </p>
                    <p className="mt-0.5 text-[13px] text-emerald-700">/ 100</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    {submission.feedback ? (
                      <>
                        <p className="text-[13px] font-medium text-ink">
                          Öğretmeninin geri bildirimi
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">
                          {submission.feedback}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        Öğretmenin bu ödev için yazılı geri bildirim bırakmadı.
                      </p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Teslim edilen içerik (salt okunur) */}
            <Card>
              <CardHeader
                title="Teslimin"
                description={`Teslim tarihi: ${formatDateTime(submission.submitted_at)}`}
              />
              <CardBody>
                {submission.content ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-plane px-4 py-3 text-sm leading-7 text-ink-secondary">
                    {submission.content}
                  </p>
                ) : (
                  <p className="text-sm text-ink-muted">Yazılı cevap eklenmedi.</p>
                )}
                {submission.attachment_path ? (
                  <div className="mt-4">
                    <DownloadButton
                      path={submission.attachment_path}
                      name={submission.attachment_name ?? 'Teslim dosyası'}
                    />
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader
              title={submission ? 'Teslimini güncelle' : 'Ödevini teslim et'}
              description={
                submission
                  ? `Son teslim: ${formatDateTime(submission.submitted_at)}`
                  : 'Cevabını yaz veya dosya ekleyerek gönder'
              }
              action={
                submission ? <Badge tone="amber">Değerlendiriliyor</Badge> : undefined
              }
            />
            <CardBody>
              <SubmitForm
                assignmentId={assignment.id}
                existing={
                  submission
                    ? {
                        content: submission.content,
                        attachmentName: submission.attachment_name,
                      }
                    : null
                }
              />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
