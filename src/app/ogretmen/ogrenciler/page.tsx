import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, UserPlus, Users } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LevelBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Öğrenciler' };

export default async function StudentsPage() {
  await requireTeacher();
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('full_name');

  const students = (data ?? []) as Profile[];

  return (
    <div>
      <PageHeader
        title="Öğrenciler"
        description={`Toplam ${students.length} öğrenci`}
        action={
          <Link
            href="/ogretmen/ogrenciler/yeni"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-900"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Yeni Öğrenci
          </Link>
        }
      />

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Henüz öğrenciniz yok"
          description="İlk öğrenci hesabını oluşturarak başlayın. Giriş bilgilerini öğrencinizle paylaştığınızda seviye sınavına başlayabilir."
          action={
            <Link
              href="/ogretmen/ogrenciler/yeni"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-900"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Yeni Öğrenci
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-hairline">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/ogretmen/ogrenciler/${s.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-plane"
                >
                  <Avatar name={s.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{s.full_name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-muted">{s.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <LevelBadge level={s.cefr_level} />
                    {s.placement_completed ? (
                      <Badge tone="green">Sınav tamamlandı</Badge>
                    ) : (
                      <Badge tone="amber">Sınav bekleniyor</Badge>
                    )}
                    {!s.is_active ? <Badge tone="red">Pasif</Badge> : null}
                  </div>
                  <span className="hidden text-[13px] text-ink-muted sm:block">
                    Kayıt: {formatDate(s.created_at)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
