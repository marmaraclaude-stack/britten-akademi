-- ============================================================
-- Britten Akademi — Veritabanı Şeması
-- Birebir İngilizce eğitim platformu: öğretmen + öğrenci
-- ============================================================

-- ------------------------------------------------------------
-- Profiller (auth.users ile 1:1)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('teacher', 'student')),
  full_name text not null default '',
  email text not null default '',
  phone text,
  cefr_level text check (cefr_level in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  placement_completed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Yeni auth kullanıcısı -> otomatik profil satırı
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rol denetimi (RLS politikalarında kullanılır; recursion'ı kırmak için definer)
create or replace function public.is_teacher()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

-- updated_at otomasyonu
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Ders paketleri (ör. 8 derslik paket)
-- ------------------------------------------------------------
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Ders Paketi',
  total_lessons integer not null check (total_lessons > 0),
  price numeric(10, 2),
  currency text not null default 'TRY',
  starts_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index packages_student_idx on public.packages (student_id, starts_on desc);

-- ------------------------------------------------------------
-- Dersler / Takvim
-- ------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid references public.packages(id) on delete set null,
  title text not null default 'İngilizce Dersi',
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  meeting_url text,
  location text,
  summary text, -- ders sonrası özet: öğrenci de görür
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_time_valid check (ends_at > starts_at)
);

create index lessons_student_time_idx on public.lessons (student_id, starts_at);
create index lessons_time_idx on public.lessons (starts_at);

create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Ödevler ve teslimler
-- ------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  skill text not null default 'general'
    check (skill in ('grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking', 'general')),
  due_at timestamptz,
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_student_idx on public.assignments (student_id, due_at);

create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  attachment_path text,
  attachment_name text,
  submitted_at timestamptz not null default now(),
  grade integer check (grade between 0 and 100),
  feedback text,
  graded_at timestamptz
);

create index submissions_student_idx on public.submissions (student_id, submitted_at desc);

-- ------------------------------------------------------------
-- Materyaller (HTML içerik, bağlantı, dosya, not)
-- ------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade, -- null = tüm öğrenciler
  title text not null,
  description text,
  skill text not null default 'general'
    check (skill in ('grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking', 'general')),
  kind text not null default 'html' check (kind in ('html', 'link', 'file', 'text')),
  html_content text,
  body text,
  url text,
  file_path text,
  file_name text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index materials_student_idx on public.materials (student_id, created_at desc);

create trigger materials_updated_at before update on public.materials
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Seviye tespit sınavı: sorular, pasajlar, denemeler
-- ------------------------------------------------------------
create table public.test_passages (
  ref text primary key,
  level text not null,
  title text not null,
  body text not null
);

create table public.test_questions (
  id integer primary key,
  section text not null check (section in ('grammar', 'vocabulary', 'usage', 'reading')),
  level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  passage_ref text references public.test_passages(ref),
  question text not null,
  options jsonb not null,
  answer_index integer not null check (answer_index between 0 and 3),
  explanation text
);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  answers jsonb not null default '{}'::jsonb, -- {"1": 2, "2": 0, ...} soru_id -> seçenek indeksi
  score integer check (score between 0 and 100),
  cefr_result text check (cefr_result in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  breakdown jsonb, -- bölüm ve seviye bazında doğru/yanlış dökümü
  duration_seconds integer
);

create index test_attempts_student_idx on public.test_attempts (student_id, started_at desc);

-- ------------------------------------------------------------
-- Mesajlar (öğretmen <-> öğrenci)
-- ------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_not_self check (sender_id <> recipient_id)
);

create index messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

-- ------------------------------------------------------------
-- Öğretmenin özel öğrenci notları (öğrenci GÖREMEZ)
-- ------------------------------------------------------------
create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_notes_student_idx on public.student_notes (student_id, created_at desc);

create trigger student_notes_updated_at before update on public.student_notes
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — Satır Düzeyi Güvenlik
-- ============================================================
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.lessons enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.materials enable row level security;
alter table public.test_passages enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.messages enable row level security;
alter table public.student_notes enable row level security;

-- profiles: herkes kendi profilini görür; öğretmen herkesi görür;
-- öğretmen profili (ad, iletişim) mesajlaşma için tüm oturumlulara görünür.
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_teacher() or role = 'teacher');

-- Profil güncelleme yalnızca öğretmende (rol yükseltme saldırısını engeller;
-- öğrenci profil düzenlemesi service-role üzerinden kontrollü yapılır).
create policy "profiles_update_teacher" on public.profiles for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- packages
create policy "packages_select" on public.packages for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());
create policy "packages_teacher_write" on public.packages for insert to authenticated
  with check (public.is_teacher());
create policy "packages_teacher_update" on public.packages for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy "packages_teacher_delete" on public.packages for delete to authenticated
  using (public.is_teacher());

-- lessons
create policy "lessons_select" on public.lessons for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());
create policy "lessons_teacher_insert" on public.lessons for insert to authenticated
  with check (public.is_teacher());
create policy "lessons_teacher_update" on public.lessons for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy "lessons_teacher_delete" on public.lessons for delete to authenticated
  using (public.is_teacher());

-- assignments
create policy "assignments_select" on public.assignments for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());
create policy "assignments_teacher_insert" on public.assignments for insert to authenticated
  with check (public.is_teacher());
create policy "assignments_teacher_update" on public.assignments for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy "assignments_teacher_delete" on public.assignments for delete to authenticated
  using (public.is_teacher());

-- submissions: öğrenci kendi ödevine teslim ekler; notlanana kadar düzenler;
-- öğretmen görür ve notlar.
create policy "submissions_select" on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());
create policy "submissions_student_insert" on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and grade is null and feedback is null and graded_at is null
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.student_id = auth.uid()
    )
  );
create policy "submissions_student_update" on public.submissions for update to authenticated
  using (student_id = auth.uid() and graded_at is null)
  with check (student_id = auth.uid() and grade is null and feedback is null and graded_at is null);
create policy "submissions_teacher_update" on public.submissions for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy "submissions_teacher_delete" on public.submissions for delete to authenticated
  using (public.is_teacher());

-- materials: öğrenci yalnızca yayımlanmış ve kendisine (veya herkese) atanmış olanı görür
create policy "materials_select" on public.materials for select to authenticated
  using (
    public.is_teacher()
    or (is_published and (student_id is null or student_id = auth.uid()))
  );
create policy "materials_teacher_insert" on public.materials for insert to authenticated
  with check (public.is_teacher());
create policy "materials_teacher_update" on public.materials for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
create policy "materials_teacher_delete" on public.materials for delete to authenticated
  using (public.is_teacher());

-- test_questions / test_passages: istemciden ERİŞİM YOK (cevap anahtarı sızmasın).
-- Sorular ve puanlama yalnızca service-role üzerinden sunucu tarafında işlenir.
-- (RLS açık, policy yok = varsayılan RED)

-- test_attempts: öğrenci kendi denemesini görür/başlatır/cevap kaydeder;
-- puan ve seviye alanlarını İSTEMCİ ASLA yazamaz (service-role puanlar).
create policy "attempts_select" on public.test_attempts for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());
create policy "attempts_student_insert" on public.test_attempts for insert to authenticated
  with check (
    student_id = auth.uid()
    and completed_at is null and score is null and cefr_result is null and breakdown is null
  );
create policy "attempts_student_update" on public.test_attempts for update to authenticated
  using (student_id = auth.uid() and completed_at is null)
  with check (
    student_id = auth.uid()
    and completed_at is null and score is null and cefr_result is null and breakdown is null
  );

-- messages
create policy "messages_select" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages_insert" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      public.is_teacher()
      or exists (select 1 from public.profiles p where p.id = recipient_id and p.role = 'teacher')
    )
  );
create policy "messages_mark_read" on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- student_notes: yalnızca öğretmen
create policy "student_notes_teacher_all" on public.student_notes for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- ============================================================
-- Storage: özel dosya kovası (imzalı URL ile servis edilir)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('dosyalar', 'dosyalar', false, 20971520) -- 20 MB
on conflict (id) do nothing;
-- Kova özel; tüm yükleme/indirme sunucu tarafında service-role ile,
-- uygulama katmanındaki yetki kontrolleriyle yapılır. İstemciye policy açılmaz.
