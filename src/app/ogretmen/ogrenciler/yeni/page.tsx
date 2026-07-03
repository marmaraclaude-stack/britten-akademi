import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { NewStudentForm } from './NewStudentForm';

export const metadata: Metadata = { title: 'Yeni Öğrenci' };

export default async function NewStudentPage() {
  await requireTeacher();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Yeni Öğrenci"
        description="Öğrenciniz için bir hesap oluşturun; giriş bilgilerini kendisine iletin."
      />
      <Card>
        <CardHeader
          title="Hesap bilgileri"
          description="Öğrenci ilk girişinde seviye tespit sınavına yönlendirilir."
        />
        <CardBody>
          <NewStudentForm />
        </CardBody>
      </Card>
    </div>
  );
}
