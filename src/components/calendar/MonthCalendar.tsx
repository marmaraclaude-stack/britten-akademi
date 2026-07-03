'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Trash2,
} from 'lucide-react';
import {
  createLesson,
  deleteLesson,
  setLessonStatus,
  updateLesson,
} from '@/lib/actions/lessons';
import {
  cn,
  dayKeyIstanbul,
  formatDate,
  formatTime,
  LESSON_STATUS_LABELS,
} from '@/lib/utils';
import type { Lesson, LessonStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { FormMessage } from '@/components/ui/FormMessage';
import { LessonStatusBadge } from '@/components/ui/DomainBadges';
import { Modal } from '@/components/ui/Modal';

export type CalendarLesson = Lesson & { student_name?: string };

interface StudentOption {
  id: string;
  full_name: string;
}
interface PackageOption {
  id: string;
  student_id: string;
  name: string;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO zamanı İstanbul'a göre tarih+saat form değerlerine çevirir. */
function isoToFormParts(iso: string) {
  const d = new Date(iso);
  const date = dayKeyIstanbul(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return { date, time };
}

function statusDot(status: LessonStatus) {
  return {
    scheduled: 'bg-[#2a78d6]',
    completed: 'bg-status-good',
    cancelled: 'bg-ink-muted',
    no_show: 'bg-status-critical',
  }[status];
}

// ---------------------------------------------------------------
// Ders oluşturma / düzenleme formu (yalnızca öğretmen)
// ---------------------------------------------------------------
function LessonForm({
  students,
  packages,
  defaults,
  lesson,
  onDone,
}: {
  students: StudentOption[];
  packages: PackageOption[];
  defaults: { date: string };
  lesson?: CalendarLesson;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const editParts = lesson ? isoToFormParts(lesson.starts_at) : null;
  const [studentId, setStudentId] = useState(lesson?.student_id ?? students[0]?.id ?? '');

  const durationDefault = lesson
    ? Math.round(
        (new Date(lesson.ends_at).getTime() - new Date(lesson.starts_at).getTime()) / 60000
      )
    : 60;

  const studentPackages = packages.filter((p) => p.student_id === studentId);

  const submit = (formData: FormData) => {
    startTransition(async () => {
      setMessage(null);
      const res = lesson
        ? await updateLesson(lesson.id, formData)
        : await createLesson(formData);
      if (res.ok) {
        router.refresh();
        onDone();
      } else {
        setMessage({ ok: false, text: res.message ?? 'İşlem başarısız.' });
      }
    });
  };

  return (
    <form action={submit} className="space-y-4">
      <FieldGroup>
        <Label htmlFor="lf-student">Öğrenci</Label>
        <Select
          id="lf-student"
          name="student_id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="lf-title">Ders başlığı</Label>
        <Input
          id="lf-title"
          name="title"
          defaultValue={lesson?.title ?? 'İngilizce Dersi'}
          placeholder="İngilizce Dersi"
        />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FieldGroup>
          <Label htmlFor="lf-date">Tarih</Label>
          <Input
            id="lf-date"
            name="date"
            type="date"
            defaultValue={editParts?.date ?? defaults.date}
            required
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="lf-time">Saat</Label>
          <Input
            id="lf-time"
            name="start_time"
            type="time"
            defaultValue={editParts?.time ?? '19:00'}
            required
          />
        </FieldGroup>
        <FieldGroup className="col-span-2 sm:col-span-1">
          <Label htmlFor="lf-duration">Süre (dk)</Label>
          <Select id="lf-duration" name="duration" defaultValue={String(durationDefault)}>
            {[40, 50, 60, 90, 120].map((d) => (
              <option key={d} value={d}>
                {d} dakika
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="lf-url" hint="(çevrim içi ders için)">
            Ders bağlantısı
          </Label>
          <Input
            id="lf-url"
            name="meeting_url"
            type="url"
            placeholder="https://meet.google.com/…"
            defaultValue={lesson?.meeting_url ?? ''}
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="lf-location" hint="(yüz yüze ders için)">
            Konum
          </Label>
          <Input
            id="lf-location"
            name="location"
            placeholder="Kadıköy ofis…"
            defaultValue={lesson?.location ?? ''}
          />
        </FieldGroup>
      </div>

      {studentPackages.length > 0 ? (
        <FieldGroup>
          <Label htmlFor="lf-package" hint="(dersi pakete say)">
            Ders paketi
          </Label>
          <Select
            id="lf-package"
            name="package_id"
            defaultValue={lesson?.package_id ?? ''}
          >
            <option value="">Pakete sayılmasın</option>
            {studentPackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
      ) : null}

      <FieldGroup>
        <Label htmlFor="lf-desc" hint="(öğrenci görür)">
          Ders planı / açıklama
        </Label>
        <Textarea
          id="lf-desc"
          name="description"
          rows={2}
          placeholder="Bu derste işlenecek konular…"
          defaultValue={lesson?.description ?? ''}
        />
      </FieldGroup>

      {!lesson ? (
        <FieldGroup>
          <Label htmlFor="lf-repeat">Tekrar</Label>
          <Select id="lf-repeat" name="repeat_weeks" defaultValue="1">
            <option value="1">Tek ders</option>
            <option value="4">4 hafta (haftalık)</option>
            <option value="8">8 hafta (haftalık)</option>
            <option value="12">12 hafta (haftalık)</option>
          </Select>
        </FieldGroup>
      ) : null}

      {message ? <FormMessage ok={message.ok} message={message.text} /> : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onDone}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending || students.length === 0}>
          {lesson ? 'Kaydet' : 'Dersi Planla'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Ders detayı
// ---------------------------------------------------------------
function LessonDetail({
  lesson,
  canEdit,
  onEdit,
  onClose,
}: {
  lesson: CalendarLesson;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState(lesson.summary ?? '');
  const [error, setError] = useState<string | null>(null);

  const changeStatus = (status: LessonStatus) => {
    startTransition(async () => {
      setError(null);
      const res = await setLessonStatus(lesson.id, status, summary);
      if (res.ok) {
        router.refresh();
        onClose();
      } else setError(res.message ?? 'İşlem başarısız.');
    });
  };

  const remove = () => {
    if (!window.confirm('Bu ders silinsin mi? Bu işlem geri alınamaz.')) return;
    startTransition(async () => {
      const res = await deleteLesson(lesson.id);
      if (res.ok) {
        router.refresh();
        onClose();
      } else setError(res.message ?? 'Silinemedi.');
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <LessonStatusBadge status={lesson.status} />
        {lesson.student_name ? (
          <span className="text-sm font-medium text-ink">{lesson.student_name}</span>
        ) : null}
      </div>

      <div className="rounded-lg bg-plane px-4 py-3 text-sm text-ink-secondary">
        <p className="font-medium text-ink">{formatDate(lesson.starts_at)}</p>
        <p className="mt-0.5">
          {formatTime(lesson.starts_at)} – {formatTime(lesson.ends_at)}
        </p>
      </div>

      {lesson.description ? (
        <div>
          <p className="text-[13px] font-medium text-ink">Ders planı</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
            {lesson.description}
          </p>
        </div>
      ) : null}

      {lesson.summary && !canEdit ? (
        <div>
          <p className="text-[13px] font-medium text-ink">Ders özeti</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
            {lesson.summary}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {lesson.meeting_url ? (
          <a
            href={lesson.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-800 px-3 py-2 text-[13px] font-medium text-white hover:bg-brand-900"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Derse Katıl
          </a>
        ) : null}
        {lesson.location ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-2 text-[13px] text-ink-secondary">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {lesson.location}
          </span>
        ) : null}
      </div>

      {canEdit ? (
        <div className="space-y-3 border-t border-hairline pt-4">
          <FieldGroup>
            <Label htmlFor="ld-summary" hint="(öğrenci görür)">
              Ders özeti / işlenenler
            </Label>
            <Textarea
              id="ld-summary"
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Bugün present perfect işledik…"
            />
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => changeStatus('completed')}
            >
              Tamamlandı
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => changeStatus('scheduled')}
            >
              Planlandı
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => changeStatus('cancelled')}
            >
              İptal Edildi
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => changeStatus('no_show')}
            >
              Gelmedi
            </Button>
          </div>
          {error ? <FormMessage ok={false} message={error} /> : null}
          <div className="flex items-center justify-between pt-1">
            <Button size="sm" variant="danger" disabled={pending} onClick={remove}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Dersi Sil
            </Button>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              Düzenle
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------
// Ana takvim
// ---------------------------------------------------------------
export function MonthCalendar({
  lessons,
  canEdit,
  students = [],
  packages = [],
}: {
  lessons: CalendarLesson[];
  canEdit: boolean;
  students?: StudentOption[];
  packages?: PackageOption[];
}) {
  const todayKey = dayKeyIstanbul(new Date());
  const [ty, tm] = todayKey.split('-').map(Number);
  const [view, setView] = useState({ year: ty, month: tm }); // month: 1-12
  const [selected, setSelected] = useState<CalendarLesson | null>(null);
  const [editing, setEditing] = useState<CalendarLesson | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarLesson[]>();
    for (const l of lessons) {
      const key = dayKeyIstanbul(l.starts_at);
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    }
    return map;
  }, [lessons]);

  // Pazartesi başlangıçlı 6 haftalık ızgara
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7; // Pzt=0
    const start = new Date(view.year, view.month - 1, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return {
        key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        day: d.getDate(),
        inMonth: d.getMonth() === view.month - 1,
      };
    });
  }, [view]);

  const nav = (delta: number) => {
    setView((v) => {
      const m = v.month + delta;
      if (m < 1) return { year: v.year - 1, month: 12 };
      if (m > 12) return { year: v.year + 1, month: 1 };
      return { ...v, month: m };
    });
  };

  return (
    <div>
      {/* Başlık + gezinme */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => nav(-1)}
            aria-label="Önceki ay"
            className="rounded-lg p-2 text-ink-secondary hover:bg-brand-100/60"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <h2 className="min-w-[160px] text-center text-[15px] font-semibold text-ink">
            {MONTHS[view.month - 1]} {view.year}
          </h2>
          <button
            type="button"
            onClick={() => nav(1)}
            aria-label="Sonraki ay"
            className="rounded-lg p-2 text-ink-secondary hover:bg-brand-100/60"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView({ year: ty, month: tm })}
          >
            Bugün
          </Button>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={() => setCreateDate(todayKey)}>
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Yeni Ders
          </Button>
        ) : null}
      </div>

      {/* Izgara */}
      <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-card">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-hairline">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-[12px] font-medium uppercase tracking-wide text-ink-muted"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const dayLessons = byDay.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;
              return (
                <div
                  key={cell.key}
                  className={cn(
                    'min-h-[96px] border-hairline p-1.5',
                    i % 7 !== 6 && 'border-r',
                    i < 35 && 'border-b',
                    !cell.inMonth && 'bg-plane/60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[12px]',
                        isToday
                          ? 'bg-brand-800 font-semibold text-white'
                          : cell.inMonth
                            ? 'text-ink-secondary'
                            : 'text-ink-muted/60'
                      )}
                    >
                      {cell.day}
                    </span>
                    {canEdit && cell.inMonth ? (
                      <button
                        type="button"
                        onClick={() => setCreateDate(cell.key)}
                        aria-label={`${cell.key} tarihine ders ekle`}
                        className="rounded p-0.5 text-ink-muted/0 transition-colors hover:bg-brand-100 hover:text-brand-700 [div:hover>div>&]:text-ink-muted"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayLessons.slice(0, 3).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelected(l)}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11.5px] font-medium transition-colors',
                          l.status === 'cancelled'
                            ? 'bg-plane text-ink-muted line-through'
                            : 'bg-brand-100/80 text-brand-900 hover:bg-brand-200'
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDot(l.status))}
                        />
                        <span className="truncate">
                          {formatTime(l.starts_at)}
                          {l.student_name ? ` · ${l.student_name.split(' ')[0]}` : ''}
                        </span>
                      </button>
                    ))}
                    {dayLessons.length > 3 ? (
                      <p className="px-1.5 text-[11px] text-ink-muted">
                        +{dayLessons.length - 3} ders daha
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Durum lejantı */}
      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-ink-secondary">
        {(Object.keys(LESSON_STATUS_LABELS) as LessonStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('h-2 w-2 rounded-full', statusDot(s))} />
            {LESSON_STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      {/* Detay */}
      <Modal
        open={Boolean(selected) && !editing}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Ders'}
      >
        {selected ? (
          <LessonDetail
            lesson={selected}
            canEdit={canEdit}
            onEdit={() => setEditing(selected)}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </Modal>

      {/* Oluştur / düzenle */}
      {canEdit ? (
        <Modal
          open={Boolean(createDate) || Boolean(editing)}
          onClose={() => {
            setCreateDate(null);
            setEditing(null);
            setSelected(null);
          }}
          title={editing ? 'Dersi Düzenle' : 'Yeni Ders Planla'}
        >
          {students.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Ders planlamak için önce bir öğrenci ekleyin.
            </p>
          ) : (
            <LessonForm
              students={students}
              packages={packages}
              defaults={{ date: createDate ?? todayKey }}
              lesson={editing ?? undefined}
              onDone={() => {
                setCreateDate(null);
                setEditing(null);
                setSelected(null);
              }}
            />
          )}
        </Modal>
      ) : null}
    </div>
  );
}
