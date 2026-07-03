import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { NewAssignmentForm } from './NewAssignmentForm';

export const metadata: Metadata = { title: 'Yeni Ödev' };

export default async function NewAssignmentPage() {
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
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Yeni Ödev"
        description="Öğrencinize ödev verin; teslim edildiğinde bildirim listenizde görünür."
      />
      <Card>
        <CardHeader title="Ödev bilgileri" />
        <CardBody>
          <NewAssignmentForm students={students} />
        </CardBody>
      </Card>
    </div>
  );
}
