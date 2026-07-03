import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Material } from '@/lib/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { MaterialForm } from '@/components/materials/MaterialForm';
import { DeleteMaterialButton } from './DeleteMaterialButton';

export const metadata: Metadata = { title: 'Materyali Düzenle' };

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher();
  const supabase = await createClient();

  const [materialRes, studentsRes] = await Promise.all([
    supabase.from('materials').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .order('full_name'),
  ]);

  const material = materialRes.data as Material | null;
  if (!material) notFound();

  const students = (studentsRes.data ?? []) as { id: string; full_name: string }[];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/ogretmen/materyaller"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Tüm materyaller
      </Link>

      <PageHeader
        title={material.title}
        description="Materyali düzenleyin veya yayın durumunu değiştirin."
      />

      <Card>
        <CardHeader title="Materyal bilgileri" />
        <CardBody>
          <MaterialForm
            students={students}
            material={material}
            onSubmitAction="update"
          />
        </CardBody>
      </Card>

      <Card className="mt-6 border-status-critical/20">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Materyali sil</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Materyal kalıcı olarak silinir; öğrenciler artık göremez.
            </p>
          </div>
          <DeleteMaterialButton materialId={material.id} />
        </CardBody>
      </Card>
    </div>
  );
}
