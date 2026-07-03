import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare, UserPlus } from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cn, formatDateShort, truncate } from '@/lib/utils';
import type { Message, Profile } from '@/lib/types';
import { MessageThread } from '@/components/messages/MessageThread';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { LevelBadge } from '@/components/ui/DomainBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Mesajlar' };

export default async function TeacherMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ ogrenci?: string }>;
}) {
  const { ogrenci } = await searchParams;
  const profile = await requireTeacher();
  const supabase = await createClient();

  const [studentsRes, messagesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
    supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .order('created_at'),
  ]);

  const students = (studentsRes.data ?? []) as Profile[];
  const messages = (messagesRes.data ?? []) as Message[];

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="Mesajlar" />
        <EmptyState
          icon={MessageSquare}
          title="Mesajlaşacak öğrenci yok"
          description="Bir öğrenci hesabı oluşturduğunuzda buradan doğrudan mesajlaşabilirsiniz."
          action={
            <Link
              href="/ogretmen/ogrenciler/yeni"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-900"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Yeni Öğrenci
            </Link>
          }
        />
      </div>
    );
  }

  // Öğrenci başına konuşma özeti
  const threads = students.map((s) => {
    const thread = messages.filter(
      (m) => m.sender_id === s.id || m.recipient_id === s.id
    );
    const unread = thread.filter(
      (m) => m.sender_id === s.id && m.read_at === null
    ).length;
    const last = thread[thread.length - 1] ?? null;
    return { student: s, thread, unread, last };
  });

  // Seçim her zaman URL'den okunur; parametre yoksa varsayılanı hesaplayıp
  // URL'yi kanonikleştiririz. Böylece her sunucu yenilemesinde (20 sn'lik
  // mesaj yoklaması dâhil) açık konuşma sabit kalır ve taslak yanlış
  // öğrenciye gitmez.
  const validParam = students.some((s) => s.id === ogrenci) ? ogrenci : undefined;
  if (!validParam) {
    const defaultId =
      threads.find((t) => t.unread > 0)?.student.id ?? students[0].id;
    redirect(`/ogretmen/mesajlar?ogrenci=${defaultId}`);
  }
  const selectedId = validParam;

  const selected = threads.find((t) => t.student.id === selectedId)!;

  return (
    <div>
      <PageHeader
        title="Mesajlar"
        description="Öğrencilerinizle birebir yazışın; okunmamış mesajlar solda işaretlenir."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        {/* Öğrenci listesi */}
        <Card className="overflow-hidden">
          <ul className="max-h-[70vh] divide-y divide-hairline overflow-y-auto">
            {threads.map(({ student, unread, last }) => {
              const active = student.id === selectedId;
              return (
                <li key={student.id}>
                  <Link
                    href={`/ogretmen/mesajlar?ogrenci=${student.id}`}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      active ? 'bg-navy-50' : 'hover:bg-plane'
                    )}
                  >
                    <Avatar name={student.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-sm text-ink',
                            unread > 0 ? 'font-semibold' : 'font-medium'
                          )}
                        >
                          {student.full_name}
                        </p>
                        {last ? (
                          <span className="shrink-0 text-[11px] text-ink-muted">
                            {formatDateShort(last.created_at)}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 truncate text-[12px]',
                          unread > 0 ? 'text-ink-secondary' : 'text-ink-muted'
                        )}
                      >
                        {last
                          ? `${last.sender_id === profile.id ? 'Siz: ' : ''}${truncate(last.body, 60)}`
                          : 'Henüz mesaj yok'}
                      </p>
                    </div>
                    {unread > 0 ? (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-navy-800 px-1.5 text-[11px] font-semibold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Konuşma */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3">
            <Avatar name={selected.student.full_name} size="sm" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {selected.student.full_name}
            </p>
            <LevelBadge level={selected.student.cefr_level} />
          </div>
          <MessageThread
            key={selected.student.id}
            meId={profile.id}
            otherId={selected.student.id}
            otherName={selected.student.full_name}
            messages={selected.thread}
          />
        </Card>
      </div>
    </div>
  );
}
