import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { MaterialForm } from '@/components/materials/MaterialForm';

export const metadata: Metadata = { title: 'Yeni Materyal' };

export default async function NewMaterialPage() {
  await requireTeacher();
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .eq('is_active', true)
    .order('full_name');

  const students = (data ?? []) as { id: string; full_name: string }[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Yeni Materyal"
        description="İnteraktif HTML sayfası, bağlantı, dosya veya not paylaşın."
      />
      <Card>
        <CardHeader title="Materyal bilgileri" />
        <CardBody>
          <MaterialForm students={students} onSubmitAction="create" />
        </CardBody>
      </Card>
    </div>
  );
}
