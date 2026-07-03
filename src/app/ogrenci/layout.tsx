import type { ReactNode } from 'react';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppShell, type NavItem } from '@/components/layout/Sidebar';
import { UserFooter } from '@/components/layout/UserFooter';

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireStudent();
  // Seviye sınavı kapısı sayfalarda uygulanır (layout'ta redirect döngüsü
  // yaratmamak için); ana sayfa ve alt sayfalar placement_completed kontrolü yapar.

  const supabase = await createClient();
  const { count: unread } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', profile.id)
    .is('read_at', null);

  const items: NavItem[] = profile.placement_completed
    ? [
        { href: '/ogrenci', label: 'Panelim', icon: 'dashboard' },
        { href: '/ogrenci/takvim', label: 'Takvim', icon: 'calendar' },
        { href: '/ogrenci/odevler', label: 'Ödevlerim', icon: 'homework' },
        { href: '/ogrenci/kelimeler', label: 'Günlük Kelimeler', icon: 'words' },
        { href: '/ogrenci/materyaller', label: 'Materyaller', icon: 'materials' },
        { href: '/ogrenci/ilerleme', label: 'İlerlemem', icon: 'progress' },
        {
          href: '/ogrenci/mesajlar',
          label: 'Mesajlar',
          icon: 'messages',
          badge: unread ?? 0,
        },
      ]
    : [{ href: '/ogrenci/seviye-testi', label: 'Seviye Sınavı', icon: 'exam' }];

  return (
    <AppShell items={items} footer={<UserFooter profile={profile} />}>
      {children}
    </AppShell>
  );
}
