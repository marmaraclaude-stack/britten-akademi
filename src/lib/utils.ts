import type { CefrLevel, LessonStatus, MaterialKind, Skill, TestSection } from './types';

/** Basit sınıf birleştirici */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const TZ = 'Europe/Istanbul';

export function formatDate(iso: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...opts,
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function formatDateShort(iso: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function formatTime(iso: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function formatDateTime(iso: string | Date) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function formatWeekday(iso: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, weekday: 'long' }).format(
    typeof iso === 'string' ? new Date(iso) : iso
  );
}

/** İstanbul saat dilimine göre YYYY-MM-DD anahtarı (takvim gruplama için) */
export function dayKeyIstanbul(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function relativeDays(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'bugün';
  if (diffDays === 1) return 'yarın';
  if (diffDays === -1) return 'dün';
  if (diffDays > 0) return `${diffDays} gün sonra`;
  return `${Math.abs(diffDays)} gün önce`;
}

// ---- Etiketler (Türkçe) ----

export const SKILL_LABELS: Record<Skill, string> = {
  grammar: 'Dil Bilgisi',
  vocabulary: 'Kelime Bilgisi',
  reading: 'Okuma',
  writing: 'Yazma',
  listening: 'Dinleme',
  speaking: 'Konuşma',
  general: 'Genel',
};

export const SECTION_LABELS: Record<TestSection, string> = {
  grammar: 'Dil Bilgisi',
  vocabulary: 'Kelime Bilgisi',
  usage: 'Günlük İngilizce',
  reading: 'Okuma',
};

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  no_show: 'Gelmedi',
};

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  html: 'İnteraktif İçerik',
  link: 'Bağlantı',
  file: 'Dosya',
  text: 'Not',
};

export const CEFR_LABELS: Record<CefrLevel, string> = {
  PreA1: 'Başlangıç Öncesi',
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Orta Üstü',
  C1: 'İleri',
  C2: 'Ustalık',
};

export const CEFR_DESCRIPTIONS: Record<CefrLevel, string> = {
  PreA1: 'İngilizceye yeni başlıyor; alfabe, sayılar ve temel kelimelerle başlanmalı.',
  A1: 'Kendini basit cümlelerle tanıtabilir, günlük temel ifadeleri anlayabilir.',
  A2: 'Günlük rutin konularda kısa ve basit iletişim kurabilir.',
  B1: 'Seyahat, iş ve okul ortamındaki tanıdık konularda kendini ifade edebilir.',
  B2: 'Akıcı ve doğal iletişim kurabilir, karmaşık metinlerin ana fikrini anlar.',
  C1: 'Dili akademik ve profesyonel amaçlarla esnek ve etkili kullanır.',
  C2: 'Ana diline yakın bir hâkimiyetle her tür metni anlar ve üretir.',
};

/** Öğrenci adının baş harfleri (avatar için) */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');
}

export function truncate(text: string, max = 120) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
