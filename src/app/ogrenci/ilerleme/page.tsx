import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CalendarX,
  Clock,
  TrendingUp,
  UserX,
} from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import { CEFR_DESCRIPTIONS, SKILL_LABELS, submissionOf } from '@/lib/utils';
import type {
  AssignmentWithSubmission,
  Lesson,
  Package,
  Skill,
  TestAttempt,
} from '@/lib/types';
import { BarBreakdown } from '@/components/charts/BarBreakdown';
import { TrendLine } from '@/components/charts/TrendLine';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LevelBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Stat } from '@/components/ui/Stat';

export const metadata: Metadata = { title: 'İlerlemem' };

export default async function StudentProgressPage() {
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const supabase = await createClient();
  const [attemptRes, assignmentsRes, lessonsRes, packagesRes] = await Promise.all([
    supabase
      .from('test_attempts')
      .select('*')
      .eq('student_id', profile.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('assignments')
      .select('*, submissions(*)')
      .eq('student_id', profile.id),
    supabase.from('lessons').select('*').eq('student_id', profile.id),
    supabase
      .from('packages')
      .select('*')
      .eq('student_id', profile.id)
      .order('starts_on', { ascending: false }),
  ]);

  const attempt = (attemptRes.data ?? null) as TestAttempt | null;
  const assignments = (assignmentsRes.data ?? []) as AssignmentWithSubmission[];
  const lessons = (lessonsRes.data ?? []) as Lesson[];
  const packages = (packagesRes.data ?? []) as Package[];

  // Notlanan teslimler (beceri bilgisiyle)
  const graded = assignments
    .flatMap((a) => {
      const s = submissionOf(a);
      return s && s.grade !== null && s.graded_at !== null
        ? [{ skill: a.skill, grade: s.grade, gradedAt: s.graded_at }]
        : [];
    })
    .sort((x, y) => x.gradedAt.localeCompare(y.gradedAt));

  const trendPoints = graded.map((g) => ({ date: g.gradedAt, value: g.grade }));

  const skillRows = (Object.keys(SKILL_LABELS) as Skill[])
    .map((skill) => {
      const list = graded.filter((g) => g.skill === skill);
      if (list.length === 0) return null;
      const avg = Math.round(
        list.reduce((sum, g) => sum + g.grade, 0) / list.length
      );
      return { label: SKILL_LABELS[skill], correct: avg, total: 100 };
    })
    .filter((r): r is { label: string; correct: number; total: number } => r !== null);

  // Ders istatistikleri
  const completedLessons = lessons.filter((l) => l.status === 'completed');
  const cancelledCount = lessons.filter((l) => l.status === 'cancelled').length;
  const noShowCount = lessons.filter((l) => l.status === 'no_show').length;
  const totalHours =
    completedLessons.reduce(
      (sum, l) =>
        sum + (new Date(l.ends_at).getTime() - new Date(l.starts_at).getTime()),
      0
    ) / 3_600_000;
  const hoursLabel = new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 1,
  }).format(totalHours);

  return (
    <div>
      <PageHeader
        title="İlerlemem"
        description="Seviyen, ödev notların ve ders geçmişinle gelişimini takip et"
      />

      <div className="space-y-6">
        {/* Seviye */}
        <Card>
          <CardHeader
            title="Seviyen"
            description="CEFR ölçeğine göre mevcut İngilizce seviyen"
            action={
              attempt ? (
                <Link
                  href="/ogrenci/seviye-testi/sonuc"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline"
                >
                  Sınav sonucun
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : undefined
            }
          />
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <LevelBadge level={profile.cefr_level} />
              {attempt && attempt.score !== null ? (
                <span className="text-[13px] tabular-nums text-ink-muted">
                  Seviye sınavı: {attempt.score}/100 doğru
                </span>
              ) : null}
            </div>
            {profile.cefr_level ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">
                {CEFR_DESCRIPTIONS[profile.cefr_level]}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Seviyen henüz belirlenmedi. Seviye tespit sınavını tamamladığında
                burada görünecek.
              </p>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Not gelişimi */}
          <Card>
            <CardHeader
              title="Ödev notların"
              description="Notlanan ödevlerinin zaman içindeki gelişimi"
            />
            <CardBody>
              {trendPoints.length >= 1 ? (
                <TrendLine
                  points={trendPoints}
                  ariaLabel="Notlanan ödevlerin zaman içindeki puan gelişimi (0-100)"
                />
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="Henüz notlanan ödevin yok"
                  description="Öğretmenin ödevlerini notladıkça gelişim çizgin burada oluşacak."
                />
              )}
            </CardBody>
          </Card>

          {/* Beceri ortalamaları */}
          <Card>
            <CardHeader
              title="Beceri bazında ortalama"
              description="Notlanan ödevlerine göre beceri ortalamaların (100 üzerinden)"
            />
            <CardBody>
              {skillRows.length > 0 ? (
                <BarBreakdown rows={skillRows} />
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Henüz veri yok"
                  description="Ödevlerin notlandıkça hangi beceride ne durumda olduğunu burada göreceksin."
                />
              )}
            </CardBody>
          </Card>
        </div>

        {/* Ders istatistikleri */}
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-ink">
            Ders istatistikleri
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Tamamlanan ders"
              value={completedLessons.length}
              icon={CalendarCheck}
            />
            <Stat label="İptal edilen" value={cancelledCount} icon={CalendarX} />
            <Stat label="Katılmadığın" value={noShowCount} icon={UserX} />
            <Stat
              label="Toplam ders saati"
              value={hoursLabel}
              sub="Tamamlanan derslerin toplam süresi"
              icon={Clock}
            />
          </div>
        </section>

        {/* Paketler */}
        {packages.length > 0 ? (
          <Card>
            <CardHeader
              title="Paketlerim"
              description="Ders paketlerinde kullanım durumun"
            />
            <CardBody>
              <div className="space-y-5">
                {packages.map((p) => {
                  const used = completedLessons.filter(
                    (l) => l.package_id === p.id
                  ).length;
                  const remaining = Math.max(0, p.total_lessons - used);
                  const pct =
                    p.total_lessons > 0
                      ? Math.min(100, Math.round((used / p.total_lessons) * 100))
                      : 0;
                  return (
                    <div key={p.id}>
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-ink">{p.name}</span>
                        <span className="text-[13px] tabular-nums text-ink-secondary">
                          {used}/{p.total_lessons} ders kullanıldı
                          <span className="ml-1.5 text-ink-muted">
                            · {remaining} ders kaldı
                          </span>
                        </span>
                      </div>
                      <div
                        className="h-2 w-full rounded-full bg-brand-100/70"
                        role="img"
                        aria-label={`${p.name}: ${p.total_lessons} dersin ${used} tanesi kullanıldı`}
                      >
                        <div
                          className="h-2 rounded-full bg-[#2a78d6]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
