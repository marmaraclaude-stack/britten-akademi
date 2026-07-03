import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Award, Clock, ListChecks } from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  CEFR_DESCRIPTIONS,
  CEFR_LABELS,
  formatDateTime,
  SECTION_LABELS,
} from '@/lib/utils';
import type { AttemptBreakdown, TestAttempt, TestSection } from '@/lib/types';
import { BarBreakdown } from '@/components/charts/BarBreakdown';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LevelBadge } from '@/components/ui/DomainBadges';
import { PageHeader } from '@/components/ui/PageHeader';
import { Stat } from '@/components/ui/Stat';

export const metadata: Metadata = { title: 'Sınav Sonucum' };

export default async function PlacementResultPage() {
  const profile = await requireStudent();

  const supabase = await createClient();
  const { data } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('student_id', profile.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const attempt = data as TestAttempt | null;
  if (!attempt) redirect('/ogrenci/seviye-testi');

  const breakdown = attempt.breakdown as AttemptBreakdown | null;
  const level = attempt.cefr_result ?? 'PreA1';
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

  const minutes = attempt.duration_seconds
    ? Math.max(1, Math.round(attempt.duration_seconds / 60))
    : null;

  return (
    <div>
      <PageHeader
        title="Seviye Tespit Sınavı Sonucun"
        description={`Tamamlanma: ${formatDateTime(attempt.completed_at!)}`}
      />

      {/* Sonuç kahramanı */}
      <div className="rounded-card border border-navy-200 bg-gradient-to-br from-navy-900 to-navy-800 p-8 text-white shadow-raised">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-navy-200">İngilizce seviyen</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight">
              {level === 'PreA1' ? 'Pre-A1' : level}
              <span className="ml-3 text-2xl font-normal text-gold-300">
                {CEFR_LABELS[level]}
              </span>
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-navy-100">
              {CEFR_DESCRIPTIONS[level]}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur">
            <p className="text-4xl font-semibold tabular-nums">{attempt.score}</p>
            <p className="mt-0.5 text-[13px] text-navy-200">/ 100 doğru</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Toplam doğru"
          value={`${attempt.score}/100`}
          icon={ListChecks}
        />
        <Stat
          label="Toplam süre"
          value={minutes ? `${minutes} dk` : '—'}
          sub="İlk başlangıçtan bitirmeye kadar"
          icon={Clock}
        />
        <Stat
          label="Belirlenen seviye"
          value={<LevelBadge level={level} />}
          icon={Award}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {sectionRows.length > 0 ? (
          <Card>
            <CardHeader
              title="Bölümlere göre sonuç"
              description="Hangi becerin daha güçlü?"
            />
            <CardBody>
              <BarBreakdown rows={sectionRows} />
            </CardBody>
          </Card>
        ) : null}
        {levelRows.length > 0 ? (
          <Card>
            <CardHeader
              title="Zorluk seviyesine göre sonuç"
              description="Seviye ilerledikçe sorular zorlaşır"
            />
            <CardBody>
              <BarBreakdown rows={levelRows} />
            </CardBody>
          </Card>
        ) : null}
      </div>

      <div className="mt-8 rounded-card border border-gold-200 bg-gold-50 p-6">
        <p className="text-sm leading-6 text-gold-900">
          <strong>Sırada ne var?</strong> Öğretmenin sonucunu inceleyip ders
          programını ve materyallerini seviyene göre hazırlayacak. Ders
          takvimini panelinden takip edebilirsin.
        </p>
        <Link
          href="/ogrenci"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-900"
        >
          Panelime Git
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
