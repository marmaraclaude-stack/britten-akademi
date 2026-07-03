import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Award,
  ClipboardList,
  Clock,
  GraduationCap,
  Mail,
  Package as PackageIcon,
  Phone,
} from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getExamQuestionsWithAnswers } from '@/lib/placement';
import {
  cn,
  formatDate,
  formatDateTime,
  SECTION_LABELS,
  submissionOf,
} from '@/lib/utils';
import type {
  AssignmentWithSubmission,
  AttemptBreakdown,
  Lesson,
  Package,
  Profile,
  StudentNote,
  TestAttempt,
  TestQuestion,
  TestSection,
} from '@/lib/types';
import { BarBreakdown } from '@/components/charts/BarBreakdown';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LevelBadge, SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { AccountControls } from './AccountControls';
import { AddPackageForm, DeletePackageButton } from './AddPackageForm';
import { EditStudentForm } from './EditStudentForm';
import { NotesCard } from './NotesCard';

export const metadata: Metadata = { title: 'Öğrenci Detayı' };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher();
  const supabase = await createClient();

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'student')
    .maybeSingle();

  const student = profileData as Profile | null;
  if (!student) notFound();

  const [attemptsRes, packagesRes, lessonsRes, assignmentsRes, notesRes] =
    await Promise.all([
      supabase
        .from('test_attempts')
        .select('*')
        .eq('student_id', id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false }),
      supabase
        .from('packages')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('lessons')
        .select('*')
        .eq('student_id', id)
        .order('starts_at', { ascending: false }),
      supabase
        .from('assignments')
        .select('*, submissions(*)')
        .eq('student_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false }),
    ]);

  const attempts = (attemptsRes.data ?? []) as TestAttempt[];
  const packages = (packagesRes.data ?? []) as Package[];
  const lessons = (lessonsRes.data ?? []) as Lesson[];
  const assignments = (assignmentsRes.data ?? []) as AssignmentWithSubmission[];
  const notes = (notesRes.data ?? []) as StudentNote[];

  const attempt = attempts[0] ?? null;

  // Cevap anahtarı yalnızca sunucuda açılır; öğretmen analizi için güvenli.
  let questions: TestQuestion[] = [];
  if (attempt) {
    questions = await getExamQuestionsWithAnswers();
  }
  const answers = (attempt?.answers ?? {}) as Record<string, number>;
  const wrongQuestions = attempt
    ? questions.filter((q) => answers[String(q.id)] !== q.answer_index)
    : [];

  const breakdown = (attempt?.breakdown ?? null) as AttemptBreakdown | null;
  const sectionRows = breakdown
    ? (Object.keys(SECTION_LABELS) as TestSection[])
        .filter((s) => breakdown.sections[s]?.total > 0)
        .map((s) => ({
          label: SECTION_LABELS[s],
          correct: breakdown.sections[s].correct,
          total: breakdown.sections[s].total,
        }))
    : [];
  const levelRows = breakdown
    ? Object.entries(breakdown.levels)
        .filter(([, v]) => v.total > 0)
        .map(([lvl, v]) => ({
          label: `${lvl} soruları`,
          correct: v.correct,
          total: v.total,
        }))
    : [];
  const minutes = attempt?.duration_seconds
    ? Math.max(1, Math.round(attempt.duration_seconds / 60))
    : null;

  const completedLessons = lessons.filter((l) => l.status === 'completed').length;
  const recentAssignments = assignments.slice(0, 5);

  return (
    <div>
      <PageHeader
        title={student.full_name}
        description="Öğrenci profili, sınav sonucu, paketler ve ödevler"
      />

      {/* Başlık kartı */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-5">
          <Avatar name={student.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{student.full_name}</h2>
              <LevelBadge level={student.cefr_level} />
              {student.placement_completed ? (
                <Badge tone="green">Sınav tamamlandı</Badge>
              ) : (
                <Badge tone="amber">Sınav bekleniyor</Badge>
              )}
              {!student.is_active ? <Badge tone="red">Pasif</Badge> : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                {student.email}
              </span>
              {student.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                  {student.phone}
                </span>
              ) : null}
              <span className="text-ink-muted">
                Hesap açılışı: {formatDate(student.created_at)}
              </span>
              <span className="text-ink-muted">
                Tamamlanan ders: {completedLessons}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {/* Sol sütun */}
        <div className="space-y-6 lg:col-span-2">
          {/* Seviye sınavı sonucu */}
          <Card>
            <CardHeader
              title="Seviye sınavı sonucu"
              description={
                attempt
                  ? `Tamamlanma: ${formatDateTime(attempt.completed_at!)}`
                  : undefined
              }
            />
            <CardBody>
              {!attempt ? (
                <EmptyState
                  icon={GraduationCap}
                  title="Sınav bekleniyor"
                  description="Öğrenci ilk girişinde 100 soruluk seviye tespit sınavına yönlendirilir. Sonuç burada görünecek."
                />
              ) : (
                <div className="space-y-6">
                  {/* Puan kahramanı */}
                  <div className="flex flex-wrap items-center gap-5 rounded-xl bg-gradient-to-br from-brand-900 to-brand-800 p-5 text-white">
                    <div className="rounded-xl bg-white/10 px-5 py-3 text-center">
                      <p className="text-3xl font-semibold tabular-nums">
                        {attempt.score}
                      </p>
                      <p className="text-[12px] text-brand-200">/ 100 doğru</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <LevelBadge level={attempt.cefr_result} />
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-brand-200">
                        <span className="inline-flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5" aria-hidden />
                          {formatDateTime(attempt.completed_at!)}
                        </span>
                        {minutes ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            toplam {minutes} dk (ilk başlangıçtan)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Dökümler */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {sectionRows.length > 0 ? (
                      <div>
                        <p className="mb-3 text-[13px] font-semibold text-ink-secondary">
                          Bölümlere göre
                        </p>
                        <BarBreakdown rows={sectionRows} />
                      </div>
                    ) : null}
                    {levelRows.length > 0 ? (
                      <div>
                        <p className="mb-3 text-[13px] font-semibold text-ink-secondary">
                          Zorluk seviyesine göre
                        </p>
                        <BarBreakdown rows={levelRows} />
                      </div>
                    ) : null}
                  </div>

                  {/* Yanlışlar */}
                  <details className="rounded-lg border border-hairline">
                    <summary className="cursor-pointer select-none rounded-lg px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-plane">
                      Yanlış yapılan sorular ({wrongQuestions.length})
                    </summary>
                    {wrongQuestions.length === 0 ? (
                      <p className="border-t border-hairline px-4 py-4 text-sm text-ink-secondary">
                        Tüm sorular doğru cevaplanmış. Tebrikler!
                      </p>
                    ) : (
                      <ul className="max-h-[520px] space-y-4 overflow-y-auto border-t border-hairline px-4 py-4">
                        {wrongQuestions.map((q) => {
                          const given = answers[String(q.id)];
                          return (
                            <li
                              key={q.id}
                              className="rounded-lg border border-hairline bg-plane/50 p-4"
                            >
                              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                <span className="text-[12px] font-semibold tabular-nums text-ink-muted">
                                  Soru {q.id}
                                </span>
                                <Badge tone="gray">{SECTION_LABELS[q.section]}</Badge>
                                <Badge tone="brand">{q.level}</Badge>
                              </div>
                              <p className="text-sm font-medium leading-6 text-ink">
                                {q.question}
                              </p>
                              <div className="mt-2 space-y-1 text-[13px] leading-5">
                                <p className="text-status-critical">
                                  Öğrencinin cevabı:{' '}
                                  {given !== undefined && q.options[given] !== undefined
                                    ? q.options[given]
                                    : 'Boş'}
                                </p>
                                <p className="text-emerald-700">
                                  Doğru cevap: {q.options[q.answer_index]}
                                </p>
                                {q.explanation ? (
                                  <p className="text-ink-muted">{q.explanation}</p>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </details>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Ders paketleri */}
          <Card>
            <CardHeader
              title="Ders paketleri"
              description="Kalan ders, tamamlanan derslere göre hesaplanır"
            />
            <CardBody className="space-y-5">
              {packages.length === 0 ? (
                <EmptyState
                  icon={PackageIcon}
                  title="Tanımlı paket yok"
                  description="Aşağıdaki formla öğrenciye bir ders paketi tanımlayın; dersleri pakete sayarak kalan hakkı takip edin."
                />
              ) : (
                <ul className="space-y-3">
                  {packages.map((p) => {
                    const used = lessons.filter(
                      (l) => l.package_id === p.id && l.status === 'completed'
                    ).length;
                    const remaining = Math.max(0, p.total_lessons - used);
                    const pct = Math.min(
                      100,
                      Math.round((used / Math.max(1, p.total_lessons)) * 100)
                    );
                    return (
                      <li
                        key={p.id}
                        className="rounded-lg border border-hairline p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-ink">{p.name}</p>
                            <p className="mt-0.5 text-[12px] text-ink-muted">
                              Başlangıç: {formatDate(p.starts_on)}
                              {p.price !== null
                                ? ` · ${p.price.toLocaleString('tr-TR')} ${p.currency}`
                                : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={remaining > 0 ? 'brand' : 'gray'}>
                              {remaining} ders kaldı
                            </Badge>
                            <DeletePackageButton packageId={p.id} packageName={p.name} />
                          </div>
                        </div>
                        <div
                          className="mt-3 h-2 w-full rounded-full bg-brand-100/70"
                          role="img"
                          aria-label={`${p.name}: ${p.total_lessons} dersten ${used} tanesi tamamlandı`}
                        >
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              remaining > 0 ? 'bg-[#2a78d6]' : 'bg-status-good'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[12px] tabular-nums text-ink-secondary">
                          {used}/{p.total_lessons} ders tamamlandı
                        </p>
                        {p.notes ? (
                          <p className="mt-1 text-[12px] text-ink-muted">{p.notes}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-t border-hairline pt-4">
                <p className="mb-3 text-[13px] font-semibold text-ink-secondary">
                  Yeni paket tanımla
                </p>
                <AddPackageForm studentId={student.id} />
              </div>
            </CardBody>
          </Card>

          {/* Son ödevler */}
          <Card>
            <CardHeader
              title="Son ödevler"
              description="Öğrenciye verilen son 5 ödev"
              action={
                <Link
                  href="/ogretmen/odevler"
                  className="text-[13px] font-medium text-brand-700 hover:underline"
                >
                  Tüm ödevler →
                </Link>
              }
            />
            {recentAssignments.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon={ClipboardList}
                  title="Henüz ödev verilmedi"
                  description="Bu öğrenciye ödev verdiğinizde teslim ve not durumunu buradan izleyebilirsiniz."
                  action={
                    <Link
                      href="/ogretmen/odevler/yeni"
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-800 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
                    >
                      Yeni Ödev
                    </Link>
                  }
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-hairline">
                {recentAssignments.map((a) => {
                  const submission = submissionOf(a);
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/ogretmen/odevler/${a.id}`}
                        className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-plane"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {a.title}
                          </p>
                          <p className="mt-0.5 text-[12px] text-ink-muted">
                            {a.due_at
                              ? `Son teslim: ${formatDateTime(a.due_at)}`
                              : 'Teslim tarihi yok'}
                          </p>
                        </div>
                        <SkillBadge skill={a.skill} />
                        {!submission ? (
                          <Badge tone="amber">Teslim bekleniyor</Badge>
                        ) : submission.graded_at === null ? (
                          <Badge tone="blue">Notlanacak</Badge>
                        ) : (
                          <Badge tone="green">{submission.grade}/100</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Sağ sütun */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Hesap yönetimi"
              description="Şifre, giriş durumu ve sınav sıfırlama"
            />
            <CardBody>
              <AccountControls
                studentId={student.id}
                fullName={student.full_name}
                isActive={student.is_active}
                placementCompleted={student.placement_completed}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Bilgileri düzenle" />
            <CardBody>
              <EditStudentForm
                student={{
                  id: student.id,
                  full_name: student.full_name,
                  phone: student.phone,
                  cefr_level: student.cefr_level,
                }}
              />
            </CardBody>
          </Card>

          <NotesCard studentId={student.id} notes={notes} />
        </div>
      </div>
    </div>
  );
}
