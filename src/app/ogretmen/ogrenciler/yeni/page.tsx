import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { NewStudentForm } from './NewStudentForm';

export const metadata: Metadata = { title: 'Yeni Öğrenci' };

export default async function NewStudentPage() {
  await requireTeacher();

  return (
    <div>
      <PageHeader
        title="Yeni Öğrenci"
        description="Öğrenciniz için bir hesap oluşturun; giriş bilgilerini kendisine iletin."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Hesap bilgileri"
            description="Öğrenci ilk girişinde seviye tespit sınavına yönlendirilir."
          />
          <CardBody>
            <NewStudentForm />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sonraki adımlar" />
          <CardBody>
            <ol className="list-decimal space-y-2.5 pl-5 text-[13px] leading-6 text-ink-secondary">
              <li>Geçici şifreyi öğrencinizle güvenli bir kanaldan paylaşın.</li>
              <li>
                Öğrenci ilk girişinde 100 soruluk seviye tespit sınavına
                yönlendirilir; sınav bitmeden panele erişemez.
              </li>
              <li>
                Sonuç anında panelinize düşer; ders programını ve günlük
                ödevlerini seviyesine göre planlayabilirsiniz.
              </li>
              <li>
                Günlük kelime havuzu, öğrencinin sınavla belirlenen seviyesine
                göre otomatik seçilir.
              </li>
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
