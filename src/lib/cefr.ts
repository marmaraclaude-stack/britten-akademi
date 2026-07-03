import type {
  AttemptBreakdown,
  CefrLevel,
  TestQuestion,
  TestSection,
} from './types';

/**
 * 100 soruluk seviye tespit sınavı puanlaması.
 * Ham puan (doğru sayısı, 0-100) CEFR bandına eşlenir; ayrıca bölüm ve
 * seviye bazında doğruluk dökümü üretilir (öğretmen analizi için).
 */
export const CEFR_BANDS: Array<{ min: number; level: CefrLevel }> = [
  { min: 89, level: 'C2' },
  { min: 76, level: 'C1' },
  { min: 61, level: 'B2' },
  { min: 46, level: 'B1' },
  { min: 31, level: 'A2' },
  { min: 16, level: 'A1' },
  { min: 0, level: 'PreA1' },
];

export function scoreToCefr(score: number): CefrLevel {
  for (const band of CEFR_BANDS) {
    if (score >= band.min) return band.level;
  }
  return 'PreA1';
}

const SECTIONS: TestSection[] = ['grammar', 'vocabulary', 'usage', 'reading'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export interface GradedAttempt {
  score: number;
  cefr: CefrLevel;
  breakdown: AttemptBreakdown;
  answered: number;
}

/** answers: { "soru_id": seçenek_indeksi } */
export function gradeAttempt(
  questions: TestQuestion[],
  answers: Record<string, number>
): GradedAttempt {
  const sections = Object.fromEntries(
    SECTIONS.map((s) => [s, { correct: 0, total: 0 }])
  ) as AttemptBreakdown['sections'];
  const levels = Object.fromEntries(
    LEVELS.map((l) => [l, { correct: 0, total: 0 }])
  ) as AttemptBreakdown['levels'];

  let score = 0;
  let answered = 0;

  for (const q of questions) {
    const given = answers[String(q.id)];
    const correct = given === q.answer_index;
    if (given !== undefined && given !== null) answered += 1;
    if (correct) score += 1;

    sections[q.section].total += 1;
    if (correct) sections[q.section].correct += 1;
    if (levels[q.level]) {
      levels[q.level].total += 1;
      if (correct) levels[q.level].correct += 1;
    }
  }

  return {
    score,
    cefr: scoreToCefr(score),
    breakdown: { sections, levels },
    answered,
  };
}
