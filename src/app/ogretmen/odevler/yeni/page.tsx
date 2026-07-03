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
    <div>
      <PageHeader
        title="Yeni Ödev"
        description="Öğrencinize ödev verin; teslim edildiğinde bildirim listenizde görünür."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Ödev bilgileri" />
          <CardBody>
            <NewAssignmentForm students={students} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Günlük ödev ipuçları" />
            <CardBody>
              <ul className="space-y-3 text-[13px] leading-6 text-ink-secondary">
                <li>
                  <strong className="text-ink">Tüm aktif öğrenciler</strong>{' '}
                  seçeneğiyle aynı ödevi tek seferde herkese verebilirsiniz.
                </li>
                <li>
                  Teslim tarihi varsayılan olarak <strong className="text-ink">bugün 23:59</strong>;
                  günlük ödev akışı için idealdir.
                </li>
                <li>
                  Ödevler sayfasındaki <strong className="text-ink">Bugünün ödev kapsamı</strong>{' '}
                  tablosu hangi öğrencide hangi becerinin eksik olduğunu gösterir.
                </li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="HTML ödev değişkenleri" />
            <CardBody>
              <ul className="space-y-2 text-[13px] leading-6 text-ink-secondary">
                <li>
                  <code className="rounded bg-plane px-1.5 py-0.5 text-[12px] text-brand-700">{'{{ogrenci_adi}}'}</code>{' '}
                  öğrencinin adıyla değiştirilir.
                </li>
                <li>
                  <code className="rounded bg-plane px-1.5 py-0.5 text-[12px] text-brand-700">{'{{seviye}}'}</code>{' '}
                  öğrencinin CEFR seviyesiyle değiştirilir.
                </li>
                <li>
                  İçerik güvenli bir sandbox içinde çalışır; script kullanabilir,
                  ancak sayfa dışına erişemez.
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
