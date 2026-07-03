// Veritabanı satır tipleri; supabase/migrations/0001_schema.sql ile eşleşir

export type Role = 'teacher' | 'student';

export type CefrLevel = 'PreA1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Skill =
  | 'grammar'
  | 'vocabulary'
  | 'reading'
  | 'writing'
  | 'listening'
  | 'speaking'
  | 'general';

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type MaterialKind = 'html' | 'link' | 'file' | 'text';

export type AssignmentKind = 'text' | 'html';

export type TestSection = 'grammar' | 'vocabulary' | 'usage' | 'reading';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  phone: string | null;
  /** Ogretmenin verdigi takvim rengi (hex), null = varsayilan */
  color: string | null;
  cefr_level: CefrLevel | null;
  placement_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  student_id: string;
  name: string;
  total_lessons: number;
  price: number | null;
  currency: string;
  starts_on: string;
  notes: string | null;
  created_at: string;
}

export interface Lesson {
  id: string;
  student_id: string;
  package_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  meeting_url: string | null;
  location: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  skill: Skill;
  kind: AssignmentKind;
  html_content: string | null;
  due_at: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
}

/**
 * PostgREST, submissions.assignment_id üzerindeki UNIQUE kısıtı nedeniyle
 * `assignments -> submissions` gömmesini bire-bir ilişki sayar ve dizi DEĞİL
 * tek nesne (veya null) döndürür. Her iki olasılığa karşı güvenli okumak için
 * daima utils'teki submissionOf() yardımcı fonksiyonunu kullanın.
 */
export type AssignmentWithSubmission = Assignment & {
  submissions: Submission | Submission[] | null;
};

export interface Material {
  id: string;
  student_id: string | null;
  title: string;
  description: string | null;
  skill: Skill;
  kind: MaterialKind;
  html_content: string | null;
  body: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestPassage {
  ref: string;
  level: string;
  title: string;
  body: string;
}

export interface TestQuestion {
  id: number;
  section: TestSection;
  level: Exclude<CefrLevel, 'PreA1'>;
  passage_ref: string | null;
  question: string;
  options: string[];
  answer_index: number;
  explanation: string | null;
}

/** Öğrenciye servis edilen soru; cevap anahtarı YOK */
export type PublicTestQuestion = Omit<TestQuestion, 'answer_index' | 'explanation'>;

export interface SectionBreakdown {
  correct: number;
  total: number;
}

export interface AttemptBreakdown {
  sections: Record<TestSection, SectionBreakdown>;
  levels: Record<string, SectionBreakdown>;
}

export interface TestAttempt {
  id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
  answers: Record<string, number>;
  score: number | null;
  cefr_result: CefrLevel | null;
  breakdown: AttemptBreakdown | null;
  duration_seconds: number | null;
}

export interface VocabProgress {
  id: string;
  student_id: string;
  /** YYYY-MM-DD (Istanbul) */
  day: string;
  level: CefrLevel;
  learned_words: string[];
  quiz_correct: number | null;
  quiz_total: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface StudentNote {
  id: string;
  student_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** Server action'ların ortak dönüş tipi */
export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}
