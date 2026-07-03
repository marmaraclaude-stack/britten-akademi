import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  Inbox,
  UserPlus,
  Users,
} from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  dayKeyIstanbul,
  formatDateShort,
  formatDateTime,
  formatTime,
  formatWeekday,
} from '@/lib/utils';
import type {
  Assignment,
  Lesson,
  Profile,
  Submission,
  TestAttempt,
  VocabProgress,
} from '@/lib/types';
import { WORDS_PER_DAY } from '@/lib/vocabulary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LevelBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Stat } from '@/components/ui/Stat';

export const metadata: Metadata = { title: 'Genel Bakış' };

const QUICK_ACTIONS = [
  {
    href: '/ogretmen/ogrenciler/yeni',
    icon: UserPlus,
    title: 'Yeni Öğrenci',
    text: 'Öğrenci hesabı oluşturun',
  },
  {
    href: '/ogretmen/takvim',
    icon: CalendarPlus,
    title: 'Ders Planla',
    text: 'Takvimde yeni ders açın',
  },
  {
    href: '/ogretmen/odevler/yeni',
    icon: ClipboardList,
    title: 'Yeni Ödev',
    text: 'Öğrenciye ödev verin',
  },
  {
    href: '/ogretmen/materyaller/yeni',
    icon: BookOpen,
    title: 'Yeni Materyal',
    text: 'İçerik hazırlayıp paylaşın',
  },
];

/** İstanbul'a göre içinde bulunulan haftanın (Pzt 00:00 – Pzt 00:00) sınırları */
function currentWeekRange() {
  const todayKey = dayKeyIstanbul(new Date());
  const [y, m, d] = todayKey.split('-').map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Pzt = 0
  const mondayKey = new Date(Date.UTC(y, m - 1, d - dow)).toISOString().slice(0, 10);
  const start = new Date(`${mondayKey}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function TeacherDashboardPage() {
  const profile = await requireTeacher();
  const supabase = await createClient();

  const week = currentWeekRange();
  const nowIso = new Date().toISOString();

  const todayKey = dayKeyIstanbul(new Date());
  const [
    studentsRes,
    weekRes,
    upcomingRes,
    pendingSubsRes,
    attemptsRes,
    unreadRes,
    vocabRes,
  ] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .gte('starts_at', week.start)
        .lt('starts_at', week.end),
      supabase
        .from('lessons')
        .select('*')
        .eq('status', 'scheduled')
        .gte('starts_at', nowIso)
        .order('starts_at')
        .limit(5),
      supabase
        .from('submissions')
        .select('*')
        .is('graded_at', null)
        .order('submitted_at'),
      supabase
        .from('test_attempts')
        .select('*')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .is('read_at', null),
      supabase.from('vocab_progress').select('*').eq('day', todayKey),
    ]);

  const students = (studentsRes.data ?? []) as Profile[];
  const studentById = new Map(students.map((s) => [s.id, s]));
  const upcoming = (upcomingRes.data ?? []) as Lesson[];
  const pendingSubs = (pendingSubsRes.data ?? []) as Submission[];
  const attempts = (attemptsRes.data ?? []) as TestAttempt[];

  // Notlanacak teslimlerin ödev başlıkları
  let assignmentById = new Map<string, Assignment>();
  if (pendingSubs.length > 0) {
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .in('id', pendingSubs.map((s) => s.assignment_id));
    assignmentById = new Map(((data ?? []) as Assignment[]).map((a) => [a.id, a]));
  }

  const activeStudents = students.filter((s) => s.is_active);
  const waitingPlacement = activeStudents.filter((s) => !s.placement_completed);

  const vocabToday = (vocabRes.data ?? []) as VocabProgress[];
  const vocabByStudent = new Map(vocabToday.map((v) => [v.student_id, v]));
  const vocabStudents = activeStudents.filter((s) => s.placement_completed);
  const vocabDoneCount = vocabStudents.filter(
    (s) => vocabByStudent.get(s.id)?.completed_at
  ).length;

  return (
    <div>
      <PageHeader
        title="Genel Bakış"
        description={`Hoş geldiniz, ${profile.full_name}. İşte bugünün özeti.`}
      />

      {/* İstatistikler */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Aktif öğrenci"
          value={activeStudents.length}
          sub={
            students.length !== activeStudents.length
              ? `${students.length - activeStudents.length} pasif hesap`
              : 'Tüm hesaplar aktif'
          }
          icon={Users}
          tone="brand"
        />
        <Stat
          label="Bu hafta planlanan ders"
          value={weekRes.count ?? 0}
          sub="Pazartesi-Pazar arası"
          icon={CalendarDays}
          tone="green"
        />
        <Stat
          label="Notlanmayı bekleyen teslim"
          value={pendingSubs.length}
          sub={pendingSubs.length > 0 ? 'İnceleme bekliyor' : 'Hepsi notlandı'}
          icon={ClipboardCheck}
          tone="accent"
        />
        <Stat
          label="Okunmamış mesaj"
          value={unreadRes.count ?? 0}
          sub={
            (unreadRes.count ?? 0) > 0 ? (
              <Link href="/ogretmen/mesajlar" className="text-brand-700 hover:underline">
                Mesajlara git →
              </Link>
            ) : (
              'Gelen kutunuz temiz'
            )
          }
          icon={Inbox}
          tone="amber"
        />
      </div>

      {/* Hızlı işlemler */}
      <p className="mb-3 mt-8 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
        Hızlı işlemler
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-800 group-hover:text-white">
              <a.icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{a.title}</span>
              <span className="block text-[12px] text-ink-muted">{a.text}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        {/* Yaklaşan dersler */}
        <Card>
          <CardHeader
            title="Yaklaşan dersler"
            description="Planlanmış ilk 5 ders"
            action={
              <Link
                href="/ogretmen/takvim"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline"
              >
                Takvime git
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={CalendarDays}
                title="Planlanmış ders yok"
                description="Takvimden yeni bir ders planlayarak haftanızı düzenleyebilirsiniz."
              />
            </CardBody>
          ) : (
            <ul className="divide-y divide-hairline">
              {upcoming.map((l) => {
                const student = studentById.get(l.student_id);
                return (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={student?.full_name ?? '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {student?.full_name ?? 'Öğrenci'}
                        <span className="ml-2 font-normal text-ink-muted">{l.title}</span>
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-secondary">
                        {formatWeekday(l.starts_at)}, {formatDateShort(l.starts_at)} ·{' '}
                        {formatTime(l.starts_at)}–{formatTime(l.ends_at)}
                      </p>
                    </div>
                    {l.meeting_url ? (
                      <a
                        href={l.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Ders bağlantısını aç"
                        className="rounded-lg p-2 text-brand-600 transition-colors hover:bg-brand-100"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Notlanacak teslimler */}
        <Card>
          <CardHeader
            title="Notlanacak teslimler"
            description="Öğrencilerin gönderdiği, henüz notlanmamış ödevler"
            action={
              <Link
                href="/ogretmen/odevler"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline"
              >
                Tüm ödevler
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {pendingSubs.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={ClipboardCheck}
                title="Bekleyen teslim yok"
                description="Öğrencileriniz ödev teslim ettiğinde burada görünecek."
              />
            </CardBody>
          ) : (
            <ul className="divide-y divide-hairline">
              {pendingSubs.map((s) => {
                const student = studentById.get(s.student_id);
                const assignment = assignmentById.get(s.assignment_id);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/ogretmen/odevler/${s.assignment_id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-plane"
                    >
                      <Avatar name={student?.full_name ?? '?'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {assignment?.title ?? 'Ödev'}
                        </p>
                        <p className="mt-0.5 text-[13px] text-ink-secondary">
                          {student?.full_name ?? 'Öğrenci'} · Teslim:{' '}
                          {formatDateTime(s.submitted_at)}
                        </p>
                      </div>
                      <Badge tone="blue">Notlanacak</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Günlük kelime çalışması */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Günlük kelime çalışması"
            description={`Bugün ${vocabDoneCount}/${vocabStudents.length} öğrenci günün ${WORDS_PER_DAY} kelimesini tamamladı`}
          />
          <CardBody>
            {vocabStudents.length === 0 ? (
              <p className="rounded-lg bg-plane px-4 py-3 text-[13px] text-ink-secondary">
                Seviye sınavını tamamlamış aktif öğrenciniz olduğunda günlük
                kelime takibi burada görünür.
              </p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {vocabStudents.map((s) => {
                  const v = vocabByStudent.get(s.id);
                  const done = Boolean(v?.completed_at);
                  const learned = v?.learned_words.length ?? 0;
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/ogretmen/ogrenciler/${s.id}`}
                        className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2 transition-colors hover:bg-plane"
                      >
                        <Avatar name={s.full_name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {s.full_name}
                          </span>
                          <span className="block text-[12px] text-ink-muted">
                            {done
                              ? v?.quiz_total
                                ? `Quiz ${v.quiz_correct}/${v.quiz_total}`
                                : 'Tamamlandı'
                              : learned > 0
                                ? `${learned}/${WORDS_PER_DAY} kelime`
                                : 'Başlamadı'}
                          </span>
                        </span>
                        {done ? (
                          <Badge tone="green">
                            <Sparkles className="h-3 w-3" aria-hidden />
                            Tamam
                          </Badge>
                        ) : learned > 0 ? (
                          <Badge tone="brand">Devam ediyor</Badge>
                        ) : (
                          <Badge tone="gray">Bekliyor</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Seviye sınavı */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Seviye sınavı"
            description="Bekleyen öğrenciler ve son tamamlanan sınavlar"
          />
          <CardBody className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                Sınavı bekleyenler
              </p>
              {waitingPlacement.length === 0 ? (
                <p className="rounded-lg bg-plane px-4 py-3 text-[13px] text-ink-secondary">
                  Tüm aktif öğrencileriniz seviye sınavını tamamladı.
                </p>
              ) : (
                <ul className="space-y-2">
                  {waitingPlacement.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/ogretmen/ogrenciler/${s.id}`}
                        className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2 transition-colors hover:bg-plane"
                      >
                        <Avatar name={s.full_name} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                          {s.full_name}
                        </span>
                        <Badge tone="amber">Sınav bekleniyor</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                Son tamamlanan sınavlar
              </p>
              {attempts.length === 0 ? (
                <p className="rounded-lg bg-plane px-4 py-3 text-[13px] text-ink-secondary">
                  Henüz tamamlanan sınav yok.
                </p>
              ) : (
                <ul className="space-y-2">
                  {attempts.map((a) => {
                    const student = studentById.get(a.student_id);
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/ogretmen/ogrenciler/${a.student_id}`}
                          className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2 transition-colors hover:bg-plane"
                        >
                          <GraduationCap
                            className="h-4 w-4 shrink-0 text-brand-400"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                            {student?.full_name ?? 'Öğrenci'}
                          </span>
                          <span className="text-[13px] tabular-nums text-ink-secondary">
                            {a.score}/100
                          </span>
                          <LevelBadge level={a.cefr_result} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
