import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PasswordForm, ProfileInfoForm } from './ProfileForms';

export const metadata: Metadata = { title: 'Profilim' };

export default async function TeacherProfilePage() {
  const profile = await requireTeacher();

  return (
    <div>
      <PageHeader
        title="Profilim"
        description="Hesap bilgilerinizi ve şifrenizi buradan yönetin."
      />

      {/* Kimlik kartı */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-5">
          <Avatar name={profile.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">
                {profile.full_name}
              </h2>
              <Badge tone="brand">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                Öğretmen
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-ink-secondary">{profile.email}</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Hesap açılışı: {formatDate(profile.created_at)}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
      {/* Kişisel bilgiler */}
      <Card>
        <CardHeader
          title="Kişisel bilgiler"
          description="Adınız panelde ve öğrenci tarafında görünür."
        />
        <CardBody>
          <ProfileInfoForm
            fullName={profile.full_name}
            phone={profile.phone}
            email={profile.email}
          />
        </CardBody>
      </Card>

      {/* Şifre */}
      <Card>
        <CardHeader
          title="Şifre değiştir"
          description="Güçlü bir şifre seçin; değişiklik hemen geçerli olur."
        />
        <CardBody>
          <PasswordForm />
        </CardBody>
      </Card>
      </div>
    </div>
  );
}
