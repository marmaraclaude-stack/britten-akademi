import { VOCABULARY, type VocabWord } from '@/content/vocabulary';
import type { CefrLevel } from './types';

export type { VocabWord };

/**
 * Gunluk kelime secimi: ogrencinin seviyesine gore havuzdan her gun
 * deterministik 10 kelime. Ayni gun + ayni seviye her zaman ayni seti verir;
 * havuz seviyeye ozel sabit bir siralamayla karistirilir ve gun indeksine
 * gore 10'luk pencere kaydirilir. Boylece havuz tukenmeden tekrar olmaz.
 */

export const WORDS_PER_DAY = 10;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** YYYY-MM-DD gun anahtarindan epoch gun indeksi */
function dayIndexOf(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export interface DailyVocab {
  level: CefrLevel;
  words: VocabWord[];
  /** Quiz celdiricileri: gunun kelimeleri disindaki Turkce anlamlar */
  distractors: string[];
  /** Ingilizce celdiriciler: gunun kelimeleri disindaki kelimeler */
  enDistractors: string[];
}

export function dailyWords(
  level: CefrLevel | null,
  dayKey: string
): DailyVocab {
  const effLevel: CefrLevel =
    level && VOCABULARY[level]?.length >= WORDS_PER_DAY ? level : 'A1';
  const pool = VOCABULARY[effLevel];
  const shuffled = seededShuffle(pool, hashString(`britten-${effLevel}`));

  const dayIndex = dayIndexOf(dayKey);
  const start = ((dayIndex * WORDS_PER_DAY) % shuffled.length + shuffled.length) % shuffled.length;
  const words: VocabWord[] = [];
  for (let i = 0; i < Math.min(WORDS_PER_DAY, shuffled.length); i++) {
    words.push(shuffled[(start + i) % shuffled.length]);
  }

  const todaySet = new Set(words.map((w) => w.word));
  const rest = shuffled.filter((w) => !todaySet.has(w.word));
  const mixed = seededShuffle(rest, hashString(`celdirici-${dayKey}-${effLevel}`));
  const distractors = mixed.slice(0, 15).map((w) => w.tr);
  const enDistractors = mixed.slice(0, 15).map((w) => w.word);

  return { level: effLevel, words, distractors, enDistractors };
}

/**
 * Tamamlanan gunlerden calisilan seri (streak) hesabi.
 * `completedDays`: YYYY-MM-DD listesi; `todayKey` bugunun anahtari.
 * Bugun tamamlanmadiysa dun biten seri de sayilir (seri hala kirilmamistir).
 */
export function computeStreak(completedDays: string[], todayKey: string): number {
  const days = new Set(completedDays);
  const today = dayIndexOf(todayKey);
  let start = days.has(dayKeyFromIndex(today)) ? today : today - 1;
  let streak = 0;
  while (days.has(dayKeyFromIndex(start - streak))) streak += 1;
  return streak;
}

function dayKeyFromIndex(index: number): string {
  const d = new Date(index * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
