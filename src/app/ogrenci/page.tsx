import type { Metadata } from 'next';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarX,
  ClipboardList,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  MonitorPlay,
  StickyNote,
  Ticket,
  Trophy,
} from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import {
  cn,
  formatDate,
  formatDateShort,
  formatTime,
  formatWeekday,
  relativeDays,
  truncate,
} from '@/lib/utils';
import type {
  AssignmentWithSubmission,
  Lesson,
  Material,
  MaterialKind,
  Package,
} from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LevelBadge, SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { Stat } from '@/components/ui/Stat';

export const metadata: Metadata = { title: 'Panelim' };

const KIND_ICONS: Record<MaterialKind, LucideIcon> = {
  html: MonitorPlay,
  link: Link2,
  file: FileText,
  text: StickyNote,
};

export default async function StudentDashboardPage() {
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const supabase = await createClient();
  const [lessonsRes, assignmentsRes, packagesRes, materialsRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('*')
      .eq('student_id', profile.id)
      .order('starts_at', { ascending: true }),
    supabase
      .from('assignments')
      .select('*, submissions(*)')
      .eq('student_id', profile.id),
    supabase.from('packages').select('*').eq('student_id', profile.id),
    supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const lessons = (lessonsRes.data ?? []) as Lesson[];
  const assignments = (assignmentsRes.data ?? []) as AssignmentWithSubmission[];
  const packages = (packagesRes.data ?? []) as Package[];
  const materials = (materialsRes.data ?? []) as Material[];

  const now = Date.now();
  const completedLessons = lessons.filter((l) => l.status === 'completed');
  const nextLesson =
    lessons.find(
      (l) => l.status === 'scheduled' && new Date(l.ends_at).getTime() > now
    ) ?? null;

  const openAssignments = assignments
    .filter((a) => (a.submissions ?? []).length === 0)
    .sort((a, b) => {
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return a.due_at.localeCompare(b.due_at);
    });

  const grades = assignments
    .flatMap((a) => a.submissions ?? [])
    .filter((s) => s.grade !== null)
    .map((s) => s.grade as number);
  const avgGrade =
    grades.length > 0
      ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
      : null;

  const packageTotal = packages.reduce((sum, p) => sum + p.total_lessons, 0);
  const packageUsed = completedLessons.filter((l) => l.package_id !== null).length;
  const packageLeft = Math.max(0, packageTotal - packageUsed);

  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? profile.full_name;
  const nextRel = nextLesson ? relativeDays(nextLesson.starts_at) : null;
  const heroLine = nextLesson
    ? nextRel === 'bugün'
      ? `Bugün ${formatTime(nextLesson.starts_at)}'da dersin var — görüşmek üzere!`
      : nextRel === 'yarın'
        ? `Yarın ${formatTime(nextLesson.starts_at)}'da dersin var. Hazırlıklı gel!`
        : `Sıradaki dersin ${formatDate(nextLesson.starts_at)}, saat ${formatTime(nextLesson.starts_at)}.`
    : 'İngilizce yolculuğunda her adım değerli. Bugün de bir şeyler öğrenmeye ne dersin?';

  return (
    <div>
      {/* Karşılama kahramanı */}
      <div className="rounded-card border border-navy-200 bg-gradient-to-br from-navy-900 to-navy-800 p-8 text-white shadow-raised">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Merhaba {firstName}!
            </h1>
            <div className="mt-3">
              <LevelBadge level={profile.cefr_level} />
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-navy-100">{heroLine}</p>
          </div>
          {nextLesson && nextLesson.meeting_url ? (
            <a
              href={nextLesson.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Derse Katıl
            </a>
          ) : null}
        </div>
      </div>

      {/* İstatistikler */}
      <div
        className={cn(
          'mt-6 grid gap-4 sm:grid-cols-2',
          packages.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        )}
      >
        <Stat
          label="Tamamlanan ders"
          value={completedLessons.length}
          icon={CalendarCheck}
        />
        <Stat label="Bekleyen ödev" value={openAssignments.length} icon={ClipboardList} />
        <Stat
          label="Ortalama ödev notu"
          value={avgGrade !== null ? avgGrade : '—'}
          sub={avgGrade !== null ? '100 üzerinden' : 'Henüz notlanan ödev yok'}
          icon={Trophy}
        />
        {packages.length > 0 ? (
          <Stat
            label="Kalan ders hakkı"
            value={packageLeft}
            sub={`Toplam ${packageTotal} ders`}
            icon={Ticket}
          />
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Sıradaki ders */}
        <Card>
          <CardHeader
            title="Sıradaki dersin"
            description="Planlanan en yakın ders"
            action={
              <Link
                href="/ogrenci/takvim"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-navy-700 hover:underline"
              >
                Takvim
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <CardBody>
            {nextLesson ? (
              <div>
                <p className="text-[15px] font-semibold text-ink">{nextLesson.title}</p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {formatWeekday(nextLesson.starts_at)}, {formatDate(nextLesson.starts_at)}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-ink-secondary">
                  {formatTime(nextLesson.starts_at)} – {formatTime(nextLesson.ends_at)}
                  <span className="ml-2 text-ink-muted">
                    ({relativeDays(nextLesson.starts_at)})
                  </span>
                </p>
                {nextLesson.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                    {nextLesson.description}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {nextLesson.meeting_url ? (
                    <a
                      href={nextLesson.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-900"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Derse Katıl
                    </a>
                  ) : null}
                  {nextLesson.location ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-2 text-[13px] text-ink-secondary">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {nextLesson.location}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={CalendarX}
                title="Planlanmış ders yok"
                description="Öğretmenin yeni bir ders planladığında burada göreceksin. Ders istemek için mesaj gönderebilirsin."
              />
            )}
          </CardBody>
        </Card>

        {/* Yaklaşan ödevler */}
        <Card>
          <CardHeader
            title="Yaklaşan ödevler"
            description="Teslim etmen gereken ödevler"
            action={
              <Link
                href="/ogrenci/odevler"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-navy-700 hover:underline"
              >
                Tümü
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <CardBody className="px-2 py-2">
            {openAssignments.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {openAssignments.slice(0, 5).map((a) => {
                  const overdue = a.due_at
                    ? new Date(a.due_at).getTime() < now
                    : false;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/ogrenci/odevler/${a.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-plane"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {a.title}
                          </p>
                          <p
                            className={cn(
                              'mt-0.5 text-[13px]',
                              overdue ? 'text-status-critical' : 'text-ink-muted'
                            )}
                          >
                            {a.due_at
                              ? `Teslim: ${formatDateShort(a.due_at)} · ${relativeDays(a.due_at)}`
                              : 'Teslim tarihi yok'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {overdue ? <Badge tone="red">Gecikti</Badge> : null}
                          <SkillBadge skill={a.skill} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-3 py-1">
                <EmptyState
                  icon={ClipboardList}
                  title="Bekleyen ödevin yok"
                  description="Tüm ödevlerin teslim edilmiş durumda — harikasın! Yeni ödevler burada görünecek."
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Yeni materyaller */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="Yeni materyaller"
            description="Öğretmeninin senin için hazırladığı son içerikler"
            action={
              <Link
                href="/ogrenci/materyaller"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-navy-700 hover:underline"
              >
                Tümü
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <CardBody>
            {materials.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {materials.map((m) => {
                  const Icon = KIND_ICONS[m.kind];
                  return (
                    <Link
                      key={m.id}
                      href={`/ogrenci/materyaller/${m.id}`}
                      className="group rounded-xl border border-hairline bg-white p-4 transition-colors hover:border-navy-300 hover:bg-navy-50/40"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50">
                        <Icon className="h-[18px] w-[18px] text-navy-600" aria-hidden />
                      </span>
                      <p className="mt-3 text-sm font-medium leading-5 text-ink group-hover:text-navy-900">
                        {m.title}
                      </p>
                      {m.description ? (
                        <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                          {truncate(m.description, 80)}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <SkillBadge skill={m.skill} />
                        <span className="text-[12px] text-ink-muted">
                          {formatDateShort(m.created_at)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Henüz materyal yok"
                description="Öğretmenin sana özel içerik hazırladığında burada listelenecek."
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
