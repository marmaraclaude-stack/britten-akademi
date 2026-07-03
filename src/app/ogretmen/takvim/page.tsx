import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Lesson } from '@/lib/types';
import { MonthCalendar, type CalendarLesson } from '@/components/calendar/MonthCalendar';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Takvim' };

interface StudentRow {
  id: string;
  full_name: string;
  color: string | null;
}
interface PackageRow {
  id: string;
  student_id: string;
  name: string;
}

export default async function TeacherCalendarPage() {
  await requireTeacher();
  const supabase = await createClient();

  const [lessonsRes, studentsRes, packagesRes] = await Promise.all([
    supabase.from('lessons').select('*').order('starts_at'),
    supabase
      .from('profiles')
      .select('id, full_name, color')
      .eq('role', 'student')
      .order('full_name'),
    supabase.from('packages').select('id, student_id, name'),
  ]);

  const lessons = (lessonsRes.data ?? []) as Lesson[];
  const students = (studentsRes.data ?? []) as StudentRow[];
  const packages = (packagesRes.data ?? []) as PackageRow[];

  const byId = new Map(students.map((s) => [s.id, s]));
  const calendarLessons: CalendarLesson[] = lessons.map((l) => ({
    ...l,
    student_name: byId.get(l.student_id)?.full_name,
    student_color: byId.get(l.student_id)?.color ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Takvim"
        description="Tüm dersleriniz tek takvimde; güne tıklayarak yeni ders planlayın."
      />
      <MonthCalendar
        lessons={calendarLessons}
        canEdit
        students={students}
        packages={packages}
      />
    </div>
  );
}
