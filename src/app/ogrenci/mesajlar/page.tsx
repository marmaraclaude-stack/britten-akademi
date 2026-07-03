import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import type { Message, Profile } from '@/lib/types';
import { MessageThread } from '@/components/messages/MessageThread';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Mesajlar' };

export default async function StudentMessagesPage() {
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const supabase = await createClient();
  // Öğrencinin ihtiyacı yalnızca ad ve kimlik; iletişim kolonları çekilmez
  const { data: teacherData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'teacher')
    .limit(1)
    .maybeSingle();

  const teacher = (teacherData ?? null) as Pick<Profile, 'id' | 'full_name'> | null;

  if (!teacher) {
    return (
      <div>
        <PageHeader
          title="Mesajlar"
          description="Öğretmeninle doğrudan iletişim"
        />
        <EmptyState
          icon={MessageSquare}
          title="Öğretmen bulunamadı"
          description="Şu anda mesaj gönderebileceğin bir öğretmen hesabı yok. Lütfen daha sonra tekrar dene."
        />
      </div>
    );
  }

  const { data: messagesData } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${profile.id},recipient_id.eq.${teacher.id}),and(sender_id.eq.${teacher.id},recipient_id.eq.${profile.id})`
    )
    .order('created_at', { ascending: true });

  const messages = (messagesData ?? []) as Message[];

  return (
    <div>
      <PageHeader title="Mesajlar" description="Öğretmeninle doğrudan iletişim" />

      <Card>
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <Avatar name={teacher.full_name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-ink">{teacher.full_name}</p>
            <p className="text-[12px] text-ink-muted">Öğretmenin</p>
          </div>
        </div>
        <MessageThread
          meId={profile.id}
          otherId={teacher.id}
          otherName={teacher.full_name}
          messages={messages}
        />
      </Card>
    </div>
  );
}
