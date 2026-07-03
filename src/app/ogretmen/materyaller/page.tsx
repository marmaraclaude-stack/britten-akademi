import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ChevronRight, Plus } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, MATERIAL_KIND_LABELS } from '@/lib/utils';
import type { Material, Profile } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Materyaller' };

export default async function MaterialsPage() {
  await requireTeacher();
  const supabase = await createClient();

  const [materialsRes, studentsRes] = await Promise.all([
    supabase.from('materials').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name').eq('role', 'student'),
  ]);

  const materials = (materialsRes.data ?? []) as Material[];
  const students = (studentsRes.data ?? []) as Pick<Profile, 'id' | 'full_name'>[];
  const nameById = new Map(students.map((s) => [s.id, s.full_name]));

  const newButton = (
    <Link
      href="/ogretmen/materyaller/yeni"
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-900"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Yeni Materyal
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Materyaller"
        description="Öğrencilerinizle paylaştığınız içerikler — interaktif sayfalar, bağlantılar, dosyalar ve notlar."
        action={newButton}
      />

      {materials.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Henüz materyal eklemediniz"
          description="İlk materyalinizi oluşturun; ister tüm öğrencilere, ister tek bir öğrenciye özel yayımlayın."
          action={newButton}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-hairline">
            {materials.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/ogretmen/materyaller/${m.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-plane"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      {m.student_id
                        ? (nameById.get(m.student_id) ?? 'Öğrenci')
                        : 'Tüm öğrenciler'}
                      {' · '}
                      {formatDate(m.created_at)}
                    </p>
                  </div>
                  <Badge tone={m.kind === 'html' ? 'gold' : 'gray'}>
                    {MATERIAL_KIND_LABELS[m.kind]}
                  </Badge>
                  <SkillBadge skill={m.skill} />
                  {!m.is_published ? <Badge tone="gray">Taslak</Badge> : null}
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
