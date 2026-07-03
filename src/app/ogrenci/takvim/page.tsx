import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import type { Lesson } from '@/lib/types';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Ders Takvimim' };

export default async function StudentCalendarPage() {
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const supabase = await createClient();
  const { data } = await supabase
    .from('lessons')
    .select('*')
    .eq('student_id', profile.id)
    .order('starts_at', { ascending: true });

  const lessons = (data ?? []) as Lesson[];

  return (
    <div>
      <PageHeader
        title="Ders Takvimim"
        description="Öğretmeninle ortak takviminiz — dersler, saatler ve durumları"
      />
      <MonthCalendar lessons={lessons} canEdit={false} />
    </div>
  );
}
