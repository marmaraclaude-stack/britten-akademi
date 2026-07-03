import type { ReactNode } from 'react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppShell, type NavItem } from '@/components/layout/Sidebar';
import { UserFooter } from '@/components/layout/UserFooter';

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireTeacher();

  const supabase = await createClient();
  const { count: unread } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', profile.id)
    .is('read_at', null);

  const items: NavItem[] = [
    { href: '/ogretmen', label: 'Genel Bakış', icon: 'dashboard' },
    { href: '/ogretmen/ogrenciler', label: 'Öğrenciler', icon: 'students' },
    { href: '/ogretmen/takvim', label: 'Takvim', icon: 'calendar' },
    { href: '/ogretmen/odevler', label: 'Ödevler', icon: 'homework' },
    { href: '/ogretmen/materyaller', label: 'Materyaller', icon: 'materials' },
    {
      href: '/ogretmen/mesajlar',
      label: 'Mesajlar',
      icon: 'messages',
      badge: unread ?? 0,
    },
    { href: '/ogretmen/profil', label: 'Profilim', icon: 'profile' },
  ];

  return (
    <AppShell items={items} footer={<UserFooter profile={profile} />}>
      {children}
    </AppShell>
  );
}
