import type { Metadata } from 'next';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, FileText, Link2, MonitorPlay, StickyNote } from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import {
  cn,
  formatDateShort,
  MATERIAL_KIND_LABELS,
  SKILL_LABELS,
  truncate,
} from '@/lib/utils';
import type { Material, MaterialKind, Skill } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Materyaller' };

const KIND_ICONS: Record<MaterialKind, LucideIcon> = {
  html: MonitorPlay,
  link: Link2,
  file: FileText,
  text: StickyNote,
};

const SKILL_KEYS = Object.keys(SKILL_LABELS) as Skill[];

function chipClass(active: boolean) {
  return cn(
    'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
    active
      ? 'border-brand-800 bg-brand-800 text-white'
      : 'border-hairline bg-white text-ink-secondary hover:bg-brand-50 hover:text-brand-800'
  );
}

export default async function StudentMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ beceri?: string }>;
}) {
  const { beceri } = await searchParams;
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const activeSkill: Skill | null =
    beceri && SKILL_KEYS.includes(beceri as Skill) ? (beceri as Skill) : null;

  const supabase = await createClient();
  let query = supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false });
  if (activeSkill) query = query.eq('skill', activeSkill);

  const { data } = await query;
  const materials = (data ?? []) as Material[];

  return (
    <div>
      <PageHeader
        title="Materyaller"
        description="Öğretmeninin senin için hazırladığı içerikler; alıştırmalar, notlar ve kaynaklar"
      />

      {/* Beceri filtreleri */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/ogrenci/materyaller" className={chipClass(activeSkill === null)}>
          Tümü
        </Link>
        {SKILL_KEYS.map((s) => (
          <Link
            key={s}
            href={`/ogrenci/materyaller?beceri=${s}`}
            className={chipClass(activeSkill === s)}
          >
            {SKILL_LABELS[s]}
          </Link>
        ))}
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            activeSkill
              ? `${SKILL_LABELS[activeSkill]} materyali yok`
              : 'Henüz materyal yok'
          }
          description={
            activeSkill
              ? 'Bu beceri için henüz içerik eklenmemiş. Diğer becerilere göz atabilir veya filtreyi kaldırabilirsin.'
              : 'Öğretmenin sana özel içerik hazırladığında burada listelenecek.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map((m) => {
            const Icon = KIND_ICONS[m.kind];
            return (
              <Link
                key={m.id}
                href={`/ogrenci/materyaller/${m.id}`}
                className="group flex flex-col rounded-card border border-hairline bg-surface p-5 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon className="h-5 w-5 text-brand-600" aria-hidden />
                  </span>
                  <span className="text-[12px] text-ink-muted">
                    {formatDateShort(m.created_at)}
                  </span>
                </div>
                <p className="mt-3 text-[15px] font-semibold leading-6 text-ink group-hover:text-brand-900">
                  {m.title}
                </p>
                {m.description ? (
                  <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                    {truncate(m.description, 110)}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                  <SkillBadge skill={m.skill} />
                  <Badge tone="gray">{MATERIAL_KIND_LABELS[m.kind]}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
