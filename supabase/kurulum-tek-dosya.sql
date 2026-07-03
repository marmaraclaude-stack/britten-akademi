-- ============================================================
-- BRİTTEN AKADEMİ; TEK DOSYA KURULUM
-- Yeni Supabase projenizde SQL Editor'e bu dosyanın TAMAMINI
-- yapıştırıp bir kez çalıştırın (şema + RLS + 100 soruluk sınav
-- + HTML ödev, günlük kelime ve öğrenci rengi desteği).
-- Ardından öğretmen hesabınız için supabase/seed_teacher.sql.example
-- dosyasını düzenleyip çalıştırın.
-- ============================================================

-- ============================================================
-- Britten Akademi; Veritabanı Şeması
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
-- RLS: Satır Düzeyi Güvenlik
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

-- Alıcı yalnızca read_at kolonunu güncelleyebilir; gövde/gönderen değiştirilemez
-- (kolon bazlı yetki, üstteki RLS politikasıyla birlikte çalışır)
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

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

-- Seviye tespit sınavı soru bankası (otomatik üretildi: scripts/generate-seed.mjs)
-- 100 soru, 4 okuma pasajı

delete from public.test_questions;
delete from public.test_passages;

insert into public.test_passages (ref, level, title, body) values ('P1', 'A2', 'Notice: Greenhill Sports Centre', 'The main hall at Greenhill Sports Centre will be closed on Monday 14 August because workers are repairing its roof. The swimming pool and the café will stay open as usual, from 7 a.m. to 9 p.m. If you have a fitness class on Monday, do not worry: your teacher will move it to Tuesday at the same time. Members do not need to pay again. For more information, please call the front desk or visit our website. We are sorry for any problems this causes.');
insert into public.test_passages (ref, level, title, body) values ('P2', 'B1', 'Repair Cafés: Fixing More Than Machines', 'When Sara''s toaster stopped working last year, she almost threw it away. Instead, a neighbour told her about a repair café, a free monthly event where volunteers help people mend broken household items. Sara took her toaster along, and twenty minutes later it was working again.

The first repair café opened in Amsterdam in 2009, and the idea has since spread to more than thirty countries. Visitors bring anything from lamps and bicycles to torn clothes, and skilled volunteers show them how to fix things themselves rather than doing everything for them. Organisers say the events reduce waste, but many visitors value the social side just as much. ''People stay for coffee and a chat,'' says one volunteer. ''Some come every month, even when nothing at home is broken.'' Sara now helps at the café herself, teaching others how to do simple repairs.');
insert into public.test_passages (ref, level, title, body) values ('P3', 'B2', 'In Praise of Darkness', 'Artificial light has transformed human life so completely that genuine darkness is now, for most city dwellers, little more than a memory. Streets, car parks and office towers blaze through the night, and satellite images show the glow spreading year by year. Convenient as this is, I would argue that we have paid too little attention to what it costs us.

The consequences for wildlife are well documented: migrating birds are drawn off course by illuminated buildings, and insects, whose numbers are already collapsing, cluster around lamps until they die of exhaustion. Human health suffers too. Our bodies rely on darkness to produce melatonin, the hormone that regulates sleep, and studies repeatedly link night-time light exposure to poor rest.

None of this means we should switch off every streetlamp; safety matters, and nobody wants unlit roads. But much of our lighting is simply wasteful: empty offices lit until dawn, advertising screens burning at 3 a.m. Cities such as Tucson have dimmed their street lighting with no measurable rise in accidents or crime. Darkness, in short, is not an enemy to be conquered but a resource we should learn to value again.');
insert into public.test_passages (ref, level, title, body) values ('P4', 'C1', 'The Unexpected Uses of Boredom', 'That boredom should need defenders at all is a peculiarly modern development. For most of history, tedium was simply a condition of existence, endured rather than examined; today it is treated as a malfunction, to be eliminated the instant it threatens to arise. The smartphone has proved a remarkably efficient instrument for this purpose, filling every idle interval (the queue, the commute, the minute before a meeting begins) with a stream of frictionless distraction.

Yet a growing body of psychological research suggests that this apparent victory may be a hollow one. Boredom, it turns out, is not an absence of mental activity but a signal: an uncomfortable prompt that our current situation lacks meaning and that we might profitably seek something better. Participants in one series of studies who were assigned deliberately monotonous tasks subsequently produced more original ideas than control groups, as though their minds, deprived of stimulation, had begun to generate their own. To anaesthetise boredom the moment it appears may therefore be to silence a messenger bearing useful, if unwelcome, news.

None of this amounts to a nostalgic plea for dullness. The claim, rather, is that a tolerance for unstimulated time is a capacity, one that atrophies without use, and whose loss we have accepted with scarcely a murmur. A society that cannot bear to be bored is, in the end, a society that cannot bear to be alone with its own thoughts.');

insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (1, 'grammar', 'A1', null, 'My name ___ Anna.', '["am","is","are","be"]'::jsonb, 1, 'Özne üçüncü tekil şahıs olduğu için ''to be'' fiilinin doğru hali ''is''tir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (2, 'grammar', 'A1', null, 'She ___ in a hospital.', '["works","work","working","is work"]'::jsonb, 0, 'Geniş zamanda üçüncü tekil şahıs (she) öznesinden sonra fiile -s eklenir: ''works''.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (3, 'grammar', 'A1', null, 'There ___ two big windows in my bedroom.', '["is","am","be","are"]'::jsonb, 3, 'Çoğul isimlerle (two big windows) ''there are'' yapısı kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (4, 'grammar', 'A1', null, 'The film starts ___ eight o''clock.', '["in","on","at","of"]'::jsonb, 2, 'Saatlerden bahsederken ''at'' edatı kullanılır: at eight o''clock.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (5, 'grammar', 'A1', null, 'They live in ___ old house near the river.', '["a","any","much","an"]'::jsonb, 3, 'Sesli harfle başlayan kelimeden (''old'') önce ''an'' artikeli kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (6, 'grammar', 'A1', null, '___ you like green tea?', '["Are","Does","Do","Is"]'::jsonb, 2, 'Geniş zaman sorularında ''you'' öznesiyle ''do'' yardımcı fiili kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (7, 'grammar', 'A2', null, 'Last night we ___ a really interesting film.', '["saw","sees","see","seen"]'::jsonb, 0, '''Last night'' geçmiş zamanı gösterir; ''see'' fiilinin ikinci hali ''saw''dur.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (8, 'grammar', 'A2', null, 'Listen! Someone ___ the piano upstairs.', '["plays","is playing","play","playing"]'::jsonb, 1, '''Listen!'' şu anda olan bir eylemi gösterir; şimdiki zaman (present continuous) ''is playing'' kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (9, 'grammar', 'A2', null, 'This exercise is ___ than the last one.', '["easy","more easy","easiest","easier"]'::jsonb, 3, 'Kısa sıfatların karşılaştırma hali ''-er'' eki ve ''than'' ile yapılır: easier than.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (10, 'grammar', 'A2', null, 'Hurry up! We haven''t got ___ time.', '["many","a few","lots","much"]'::jsonb, 3, '''Time'' sayılamayan bir isimdir; olumsuz cümlelerde ''much'' kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (11, 'grammar', 'A2', null, 'Look at those dark clouds; it ___ rain.', '["will to","goes to","is going to","going"]'::jsonb, 2, 'Görünen kanıta dayalı tahminlerde ''be going to'' yapısı kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (12, 'grammar', 'A2', null, 'Visitors ___ touch the paintings in this museum.', '["mustn''t","don''t must","must to","not must"]'::jsonb, 0, 'Yasakları ifade etmek için ''mustn''t'' kullanılır; ''must'' yardımcı fiil olduğu için ''don''t'' almaz ve ''to'' ile kullanılmaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (13, 'grammar', 'A2', null, 'Water boils if you ___ it to 100 degrees.', '["will heat","heated","heating","heat"]'::jsonb, 3, 'Genel doğrularda (zero conditional) if''li bölümde geniş zaman kullanılır: if you heat.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (14, 'grammar', 'B1', null, 'They ___ in the same flat since 2019.', '["have lived","live","lived","are living"]'::jsonb, 0, '''Since 2019'' geçmişte başlayıp hâlâ devam eden eylemi gösterir; present perfect (have lived) gerekir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (15, 'grammar', 'B1', null, 'If it ___ tomorrow, we''ll cancel the picnic.', '["rains","will rain","rained","would rain"]'::jsonb, 0, 'Birinci tip koşul cümlesinde (first conditional) if''ten sonra geniş zaman kullanılır: if it rains.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (16, 'grammar', 'B1', null, 'What would you do if you ___ a wallet full of money in the street?', '["find","will find","found","would find"]'::jsonb, 2, 'İkinci tip koşul cümlesinde (second conditional) if''ten sonra geçmiş zaman kullanılır: if you found.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (17, 'grammar', 'B1', null, 'This castle ___ more than five hundred years ago.', '["built","is built","has been built","was built"]'::jsonb, 3, 'Özne eylemi yapan değil, eylemden etkilenendir; ''ago'' ile geçmiş zaman edilgen yapı ''was built'' gerekir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (18, 'grammar', 'B1', null, 'The doctor ___ treated my grandfather has just retired.', '["which","whose","what","who"]'::jsonb, 3, 'İnsanları niteleyen sıfat cümleciklerinde özne konumunda ''who'' kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (19, 'grammar', 'B1', null, 'I ___ dinner when the lights suddenly went out.', '["was cooking","cooked","am cooking","have cooked"]'::jsonb, 0, 'Geçmişte devam ederken başka bir eylemle kesilen olay için past continuous (was cooking) kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (20, 'grammar', 'B1', null, 'You ___ pay to visit the gallery; entry is completely free.', '["mustn''t","don''t have to","can''t","shouldn''t"]'::jsonb, 1, 'Zorunluluk olmadığını anlatmak için ''don''t have to'' kullanılır; ''mustn''t'' yasak bildirir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (21, 'grammar', 'B1', null, 'My brother doesn''t mind ___ early on weekdays.', '["to get up","get up","getting up","to getting up"]'::jsonb, 2, '''Mind'' fiilinden sonra fiil -ing (gerund) hâlinde gelir: mind getting up.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (22, 'grammar', 'B2', null, 'Sara would have passed the exam if she ___ a little harder.', '["studied","had studied","would study","has studied"]'::jsonb, 1, 'Üçüncü tip koşul cümlesinde (third conditional) if''li bölümde past perfect kullanılır: if she had studied.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (23, 'grammar', 'B2', null, 'Elif said that she ___ the documents the following day.', '["will send","sends","would send","has sent"]'::jsonb, 2, 'Dolaylı anlatımda (reported speech) ''said'' geçmiş zaman olduğundan ''will'', ''would''a dönüşür; ''the following day'' bu kaymayı zorunlu kılar.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (24, 'grammar', 'B2', null, 'I wish I ___ more attention during yesterday''s lecture.', '["paid","had paid","would pay","have paid"]'::jsonb, 1, 'Geçmişe yönelik pişmanlıklarda ''wish'' + past perfect kullanılır: wish I had paid.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (25, 'grammar', 'B2', null, 'We''re having our kitchen ___ at the moment, so we''re eating out a lot.', '["redecorate","redecorating","to redecorate","redecorated"]'::jsonb, 3, 'Ettirgen yapıda (have something done) nesneden sonra fiilin üçüncü hali gelir: having our kitchen redecorated.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (26, 'grammar', 'B2', null, 'Tom ___ have received my email; otherwise he would have replied by now.', '["can''t","mustn''t","shouldn''t","won''t"]'::jsonb, 0, 'Geçmişe dair güçlü olumsuz çıkarım ''can''t have + V3'' ile yapılır; ''mustn''t'' bu anlamda kullanılmaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (27, 'grammar', 'B2', null, 'By the time you arrive, I ___ all the packing.', '["will have finished","will finish","am finishing","have finished"]'::jsonb, 0, '''By the time'' ile gelecekte belli bir andan önce tamamlanacak eylem için future perfect (will have finished) kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (28, 'grammar', 'B2', null, 'That''s the author ___ latest novel won several international prizes.', '["who''s","which","whose","whom"]'::jsonb, 2, 'Aitlik bildiren sıfat cümleciklerinde ''whose'' kullanılır: yazarın (kendisine ait) romanı.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (29, 'grammar', 'C1', null, 'If she ___ the job offer in Berlin last year, she would be living abroad now.', '["accepted","would accept","had accepted","was accepting"]'::jsonb, 2, 'Karma koşul cümlesi (mixed conditional): geçmişteki koşul için past perfect (had accepted), şimdiki sonuç için ''would be living'' kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (30, 'grammar', 'C1', null, 'Hardly ___ the meeting when the fire alarm went off.', '["we had started","had we started","did we start","we started"]'::jsonb, 1, '''Hardly ... when'' yapısı cümle başında devrik yapı (inversion) ve past perfect gerektirir: Hardly had we started.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (31, 'grammar', 'C1', null, 'The committee demanded that every candidate ___ a full background check before the interview stage.', '["to undergo","undergoing","would undergo","undergo"]'::jsonb, 3, '''demand that'' gibi talep/gereklilik bildiren fiillerden sonra gelen that-yan cümlesinde mandative subjunctive kullanılır; yani özne ne olursa olsun fiil yalın halde kalır: ''demanded that every candidate undergo''. Orijinal maddedeki ''insisted'' fiili hem talep hem de iddia (bir olguyu öne sürme) anlamı taşıdığından ''underwent'' seçeneği de savunulabilir hale geliyordu; fiil yalnızca talep anlamı taşıyan ''demanded'' ile değiştirildi ve ''underwent'' seçeneği çıkarıldı. Çeldiriciler artık açıkça yanlıştır: ''to undergo'' ve ''undergoing'' that-yan cümlesi çekimli (finite) bir fiil gerektirdiği için kullanılamaz; ''would undergo'' ise ''demand that'' yapısından sonra standart İngilizcede kabul edilmez (İngiliz İngilizcesinde ancak ''should undergo'' mümkün olurdu, o da seçenekler arasında değildir). Böylece tek doğru yanıt ''undergo'' olur.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (32, 'grammar', 'C1', null, 'You ___ prepared so much food; most of the guests didn''t come.', '["mustn''t have","needn''t have","couldn''t have","may not have"]'::jsonb, 1, 'Yapılmış ama gereksiz olduğu anlaşılan eylemler için ''needn''t have + V3'' kullanılır: hazırlamana gerek yoktu.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (33, 'grammar', 'C1', null, 'We regret ___ you that the position has already been filled.', '["informing","to inform","inform","to informing"]'::jsonb, 1, 'Resmî bir kötü haber verirken ''regret + to infinitive'' kullanılır; ''regret + -ing'' ise geçmişteki bir eylemden duyulan pişmanlığı bildirir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (34, 'grammar', 'C2', null, 'Under no circumstances ___ allowed to open the train doors themselves.', '["passengers are","are passengers","do passengers","passengers were"]'::jsonb, 1, 'Cümle ''Under no circumstances'' gibi olumsuz bir zarf öbeğiyle başladığında devrik yapı (inversion) zorunludur: are passengers allowed.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (35, 'grammar', 'C2', null, '___ as it may seem, the committee has never once met in person.', '["Strange","Strangely","However","Despite"]'::jsonb, 0, '''Sıfat + as + özne + may seem'' kalıbı ''her ne kadar ... görünse de'' anlamı verir; bu yapıda zarf değil sıfat kullanılır: Strange as it may seem.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (36, 'grammar', 'C2', null, 'But for the goalkeeper''s brilliant save, the team ___ the match.', '["would lose","had lost","would have lost","lost"]'::jsonb, 2, '''But for'' gizli bir üçüncü tip koşul bildirir (''... olmasaydı''); ana cümlede ''would have + V3'' gerekir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (37, 'vocabulary', 'A1', null, 'She drinks a glass of ___ with her breakfast every day.', '["bread","milk","cheese","rice"]'::jsonb, 1, '''Milk'' (süt) seçenekler arasında içilebilen tek şeydir; ''a glass of milk'' bir bardak süt demektir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (38, 'vocabulary', 'A1', null, 'My mother''s husband is my ___.', '["sister","aunt","father","daughter"]'::jsonb, 2, '''Father'' baba demektir; annenin eşi kişinin babasıdır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (39, 'vocabulary', 'A1', null, 'We ___ TV together in the evening.', '["watch","read","listen","look"]'::jsonb, 0, 'İngilizcede televizyon için ''watch'' (izlemek) fiili kullanılır: ''watch TV''.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (40, 'vocabulary', 'A1', null, 'It is very cold in here. Please close the ___.', '["floor","rain","sun","window"]'::jsonb, 3, '''Window'' pencere demektir; soğukta kapatılabilen tek seçenek penceredir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (41, 'vocabulary', 'A2', null, 'Last summer we stayed in a small ___ near the sea.', '["ticket","hotel","suitcase","kitchen"]'::jsonb, 1, '''Hotel'' (otel) tatilde konaklanan yerdir; ''ticket'', ''suitcase'' ve ''kitchen'' bu cümleye anlamca uymaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (42, 'vocabulary', 'A2', null, 'In the sentence ''The cake she made was very tasty'', the word ''tasty'' is closest in meaning to ___.', '["fresh","cheap","delicious","ready"]'::jsonb, 2, '''Tasty'' (lezzetli) kelimesinin en yakın eş anlamlısı ''delicious''tır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (43, 'vocabulary', 'A2', null, 'Hurry up! The plane ___ off at seven o''clock.', '["takes","gives","makes","does"]'::jsonb, 0, '''Take off'' uçağın kalkması anlamına gelen deyimsel fiildir (phrasal verb).');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (44, 'vocabulary', 'A2', null, 'Every evening, Tom ___ his homework before dinner.', '["makes","writes","does","works"]'::jsonb, 2, 'İngilizcede ödev yapmak ''do homework'' kalıbıyla ifade edilir; ''make homework'' yanlıştır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (45, 'vocabulary', 'A2', null, 'My aunt is a nurse; she works in a busy ___.', '["library","restaurant","cinema","hospital"]'::jsonb, 3, '''Nurse'' (hemşire) hastanede, yani ''hospital''da çalışır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (46, 'vocabulary', 'A2', null, 'Elif feels ___ because her best friend is moving to another country.', '["hungry","sad","thirsty","busy"]'::jsonb, 1, '''Sad'' üzgün demektir; en yakın arkadaşının taşınması kişiyi üzen bir durumdur.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (47, 'vocabulary', 'B1', null, 'They decided to ___ off the meeting until everyone could attend.', '["take","get","put","bring"]'::jsonb, 2, '''Put off'' ertelemek anlamındaki deyimsel fiildir; toplantı ileri bir tarihe ertelenmiştir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (48, 'vocabulary', 'B1', null, 'If you don''t ___ attention in class, you''ll miss important information.', '["give","pay","spend","keep"]'::jsonb, 1, 'İngilizcede dikkat etmek ''pay attention'' eşdizimiyle (collocation) söylenir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (49, 'vocabulary', 'B1', null, 'In the sentence ''Our company plans to purchase fifty new laptops next month'', the word ''purchase'' is closest in meaning to ___.', '["rent","repair","deliver","buy"]'::jsonb, 3, '''Purchase'' satın almak demektir; en yakın eş anlamlısı ''buy''dır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (50, 'vocabulary', 'B1', null, 'Air ___ in large cities can cause serious breathing problems.', '["pollution","litter","recycling","climate"]'::jsonb, 0, '''Air pollution'' hava kirliliği demektir ve solunum sorunlarına yol açar; diğer kelimeler ''air'' ile bu anlamda kullanılmaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (51, 'vocabulary', 'B1', null, 'After working a twelve-hour shift, Maria was absolutely ___.', '["comfortable","energetic","exhausted","cheerful"]'::jsonb, 2, '''Exhausted'' bitkin, çok yorgun demektir; uzun bir vardiyadan sonra hissedilen duygu budur.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (52, 'vocabulary', 'B1', null, 'Don''t forget to ___ your phone before the journey; the battery is nearly dead.', '["fill","charge","feed","refresh"]'::jsonb, 1, '''Charge'' telefonu/pili şarj etmek anlamına gelir; pil bittiğinde telefon şarj edilir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (53, 'vocabulary', 'B2', null, 'In the sentence ''The city council implemented a new recycling scheme last year'', the word ''implemented'' is closest in meaning to ___.', '["looked into","carried out","called off","ran into"]'::jsonb, 1, '''Implement'' uygulamak, hayata geçirmek demektir; en yakın karşılığı ''carry out'' ifadesidir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (54, 'vocabulary', 'B2', null, 'Several doctors have ___ concerns about the side effects of the new treatment.', '["lifted","grown","raised","risen"]'::jsonb, 2, 'Endişe dile getirmek İngilizcede ''raise concerns'' kalıbıyla söylenir; ''rise'' geçişsiz bir fiildir ve bu eşdizimde kullanılmaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (55, 'vocabulary', 'B2', null, 'On her doctor''s advice, Susan finally ___ up smoking after twenty years.', '["gave","took","cut","put"]'::jsonb, 0, '''Give up'' bir alışkanlığı bırakmak demektir; ''take up'' ise başlamak anlamına geldiği için bağlama uymaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (56, 'vocabulary', 'B2', null, 'The two airlines are expected to ___ next year, forming the largest carrier in Europe.', '["blend","melt","merge","attach"]'::jsonb, 2, '''Merge'' şirketlerin birleşmesi anlamında kullanılan iş İngilizcesi terimidir; diğer fiiller bu bağlamda kullanılmaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (57, 'vocabulary', 'B2', null, 'Many rare species are now on the ___ of extinction owing to deforestation.', '["tip","border","foot","brink"]'::jsonb, 3, '''On the brink of extinction'' yok olmanın eşiğinde demektir; bu kalıpta doğru kelime ''brink''tir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (58, 'vocabulary', 'B2', null, 'In the sentence ''A number of employees were reluctant to share their opinions during the survey'', the word ''reluctant'' is closest in meaning to ___.', '["unable","unwilling","careless","dishonest"]'::jsonb, 1, '''Reluctant'' isteksiz, gönülsüz demektir; en yakın eş anlamlısı ''unwilling''dir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (59, 'vocabulary', 'C1', null, 'The property deal fell ___ at the last minute when the investors withdrew their support.', '["out","through","off","down"]'::jsonb, 1, '''Fall through'' bir plan veya anlaşmanın suya düşmesi, gerçekleşmemesi anlamındaki deyimsel fiildir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (60, 'vocabulary', 'C1', null, 'The latest findings ___ serious doubt on the widely accepted theory.', '["cast","drop","lay","push"]'::jsonb, 0, '''Cast doubt on'' bir şeyi şüpheye düşürmek anlamındaki kalıplaşmış eşdizimdir; diğer fiiller ''doubt'' ile bu kalıbı oluşturmaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (61, 'vocabulary', 'C1', null, 'In the sentence ''There was a tacit understanding among the staff that the subject would never be mentioned again'', the word ''tacit'' is closest in meaning to ___.', '["formal","temporary","unspoken","reluctant"]'::jsonb, 2, '''Tacit'' açıkça dile getirilmeyen, örtük demektir; en yakın karşılığı ''unspoken''dır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (62, 'vocabulary', 'C1', null, 'Whenever something goes wrong in the department, the supervisor simply passes the buck. The idiom ''pass the buck'' means ___.', '["to postpone a decision indefinitely","to spend money carelessly","to praise employees publicly","to shift responsibility onto someone else"]'::jsonb, 3, '''Pass the buck'' sorumluluğu başkasının üzerine atmak anlamına gelen bir deyimdir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (63, 'vocabulary', 'C2', null, 'By launching its product a month early, the firm stole a march on its competitors. The idiom ''steal a march on'' means ___.', '["to gain an advantage by acting sooner than others","to copy a rival''s ideas secretly","to suffer an unexpected financial loss","to form a temporary business alliance"]'::jsonb, 0, '''Steal a march on someone'' birinden önce davranarak avantaj elde etmek anlamındaki deyimdir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (64, 'vocabulary', 'C2', null, 'Her prose is marked by a deliberate ___; she never says a word more than is strictly necessary.', '["verbosity","exuberance","reticence","candour"]'::jsonb, 2, '''Reticence'' ketumluk, az ve ölçülü konuşma demektir; cümledeki ''gerekenden fazlasını söylememe'' tanımına yalnızca bu kelime uyar.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (65, 'usage', 'A1', null, 'A: How are you?
B: ___, thank you. And you?', '["I''m Tom","I''m fine","Yes, please","Good night"]'::jsonb, 1, 'Hâl hatır soran ''How are you?'' sorusuna ''I''m fine, thank you.'' diye cevap verilir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (66, 'usage', 'A1', null, 'A: ___ is this T-shirt?
B: It''s ten pounds.', '["How many","How old","How much","What colour"]'::jsonb, 2, 'Fiyat sorarken ''How much is...?'' kullanılır; ''How many'' yalnızca sayılabilir çoğul isimlerle gelir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (67, 'usage', 'A1', null, 'A: Nice to meet you.
B: ___', '["Nice to meet you too.","You''re welcome.","I''m twelve years old.","Yes, it is."]'::jsonb, 0, '''Nice to meet you.'' (Tanıştığımıza memnun oldum) ifadesine doğal karşılık ''Nice to meet you too.'' olur.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (68, 'usage', 'A2', null, 'A: Are you ready to order?
B: Yes, ___ have the chicken salad, please.', '["I''m","I''ve","I did","I''ll"]'::jsonb, 3, 'Restoranda sipariş verirken anlık karar bildiren ''will'' ile ''I''ll have...'' kalıbı kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (69, 'usage', 'A2', null, 'A: Excuse me, how do I ___ to the bus station?
B: Turn right at the traffic lights. It''s next to the bank.', '["arrive","get","reach","make"]'::jsonb, 1, 'Yol tarifi sorarken ''How do I get to...?'' kalıbı kullanılır; ''arrive'' ve ''reach'' bu yapıda ''to'' ile kullanılmaz.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (70, 'usage', 'A2', null, 'A: Hello, could I speak to Mrs Green, please?
B: ___, please. I''ll put you through.', '["Hold off","Hold out","Hold on","Hold up"]'::jsonb, 2, 'Telefonda karşıdakinden hatta beklemesini istemek için ''Hold on, please.'' denir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (71, 'usage', 'A2', null, 'A: These boxes are really heavy!
B: ___ I help you carry them?', '["Do","Shall","Would","Am"]'::jsonb, 1, 'Yardım teklif ederken ''Shall I...?'' yapısı kullanılır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (72, 'usage', 'B1', null, 'A: I''m really sorry I missed your birthday dinner.
B: ___ These things happen.', '["You''re welcome.","That''s a shame.","It serves you right.","Don''t worry about it."]'::jsonb, 3, 'Bir özrü kabul ederken ''Don''t worry about it.'' (Dert etme, önemli değil) denir; ''You''re welcome'' teşekkürlere verilen yanıttır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (73, 'usage', 'B1', null, 'A: Shall we meet outside the cinema at seven?
B: ___ See you there.', '["That works for me.","It''s on me.","I couldn''t agree less.","Make yourself at home."]'::jsonb, 0, 'Bir buluşma önerisini kabul etmek için ''That works for me.'' (Bana uyar) denir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (74, 'usage', 'B1', null, 'A: I''m afraid Ms Adams is away from her desk at the moment.
B: No problem; could I ___ a message for her?', '["say","put","leave","let"]'::jsonb, 2, '''Mesaj bırakmak'' anlamındaki kalıp eşdizim ''leave a message''tır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (75, 'usage', 'B1', null, 'A: In my opinion, the new shopping centre has ruined the town.
B: ___ It brings a lot of jobs to the area, though.', '["Whatever you say.","That''s rubbish.","I see your point.","You must be joking."]'::jsonb, 2, 'Kibarca karşı görüş bildirmeden önce ''I see your point.'' (Ne demek istediğinizi anlıyorum) denir; diğer seçenekler kaba kaçar.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (76, 'usage', 'B2', null, 'A: Would you mind if I opened the window?
B: ___ It''s quite warm in here anyway.', '["Never mind.","Not at all.","Yes, I would.","You''re welcome."]'::jsonb, 1, '''Would you mind...?'' sorusuna izin vermek için ''Not at all.'' denir; ''yes'' ile başlayan yanıt itiraz anlamı taşır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (77, 'usage', 'B2', null, 'A: Good afternoon, madam. ___?
B: Yes, please. I''m looking for a gift for my nephew.', '["What do you want","What''s up","Do you buy something","May I help you"]'::jsonb, 3, 'Mağazada müşteriye resmi ve kibar hitap ''May I help you?'' şeklindedir; diğer seçenekler kaba veya fazla samimidir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (78, 'usage', 'B2', null, 'A: I don''t think the new timetable is fair on part-time staff.
B: ___ It puts them at a real disadvantage.', '["So do I.","Neither am I.","I don''t, too.","Neither do I."]'::jsonb, 3, 'Olumsuz bir cümleye katılırken ''Neither + yardımcı fiil + özne'' kullanılır; ''don''t think'' ile uyumlu yardımcı fiil ''do'' olduğundan doğru yanıt ''Neither do I.'' olur.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (79, 'usage', 'C1', null, 'A: ___ you could possibly send me the final figures before Friday?
B: Of course; I''ll email them over first thing tomorrow.', '["I was wondered if","I''m wondering that","I was wondering if","I wonder you whether"]'::jsonb, 2, 'Çok kibar ve dolaylı ricalarda ''I was wondering if you could...'' kalıbı kullanılır; geçmiş sürekli yapı ifadeyi yumuşatır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (80, 'usage', 'C1', null, 'A: I know it''s a big decision, but we do need your answer today.
B: I appreciate that, but I''d rather ___ and let you know in the morning, if that''s all right.', '["sleep it off","sleep on it","sleep it over","sleep in it"]'::jsonb, 1, '''Sleep on it'' bir karar hakkında bir gece düşünmek demektir; ''sleep it off'' ise yorgunluğu veya içkinin etkisini uyuyarak atmak anlamına gelir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (81, 'reading', 'A2', 'P1', 'What is this notice mainly about?', '["New prices for fitness classes","A change at the sports centre for one day","The opening of a new swimming pool","A job advertisement for builders"]'::jsonb, 1, 'Duyuru, 14 Ağustos Pazartesi günü ana salonun kapanması ve derslerin taşınması gibi tek günlük bir değişikliği bildiriyor. Diğer seçenekler metinde yer almıyor.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (82, 'reading', 'A2', 'P1', 'According to the notice, what time does the swimming pool close?', '["At 7 a.m.","At 7 p.m.","At 9 p.m.","At 9 a.m."]'::jsonb, 2, 'Metinde havuzun ''from 7 a.m. to 9 p.m.'' açık kalacağı yazıyor; yani akşam 9''da kapanıyor.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (83, 'reading', 'A2', 'P1', 'What can we understand about Monday''s fitness classes?', '["They will take place on Tuesday instead.","They are cancelled for the whole month.","Students must pay extra to join them.","They will be held in the café."]'::jsonb, 0, '''Your teacher will move it to Tuesday at the same time'' cümlesi derslerin salı gününe alınacağını gösteriyor.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (84, 'reading', 'A2', 'P1', 'The word ''repairing'' in the notice is closest in meaning to ___.', '["cleaning","painting","selling","fixing"]'::jsonb, 3, '''Repair'' fiili ''tamir etmek'' anlamına gelir; en yakın eş anlamlısı ''fix'' fiilidir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (85, 'reading', 'A2', 'P1', 'How can people get more information?', '["By asking their fitness teacher","By calling the front desk","By visiting the main hall","By sending a letter"]'::jsonb, 1, 'Duyurunun sonunda ''please call the front desk or visit our website'' deniyor; doğru cevap ön bankoyu aramaktır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (86, 'reading', 'B1', 'P2', 'What is the article mainly about?', '["Events where volunteers help people repair their own belongings","The history of coffee shops in Amsterdam","A new shop that sells cheap toasters","The dangers of broken electrical goods"]'::jsonb, 0, 'Makalenin ana konusu, gönüllülerin insanlara eşyalarını tamir etmeyi öğrettiği ''repair café'' etkinlikleridir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (87, 'reading', 'B1', 'P2', 'Where did the first repair café open?', '["In Sara''s home town","In a furniture factory","In thirty different countries at the same time","In Amsterdam"]'::jsonb, 3, 'Metinde ilk repair café''nin 2009''da Amsterdam''da açıldığı açıkça belirtiliyor.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (88, 'reading', 'B1', 'P2', 'What can we infer about the volunteers at repair cafés?', '["They repair everything while visitors simply watch.","They want visitors to learn how to make repairs themselves.","They are paid a salary by the government.","They only accept electrical items."]'::jsonb, 1, '''Show them how to fix things themselves rather than doing everything for them'' ifadesi, amacın ziyaretçilere beceri kazandırmak olduğunu gösterir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (89, 'reading', 'B1', 'P2', 'The word ''mend'' in the article is closest in meaning to ___.', '["replace","throw away","repair","borrow"]'::jsonb, 2, '''Mend'' fiili ''onarmak, tamir etmek'' demektir; en yakın karşılığı ''repair''dir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (90, 'reading', 'B1', 'P2', 'Why do some people go to the café even when nothing at home is broken?', '["They enjoy the coffee and the company.","They want to sell their old items.","They have to attend every month as members.","They are looking for paid work."]'::jsonb, 0, 'Gönüllünün ''People stay for coffee and a chat'' sözü, bazı ziyaretçilerin sosyal ortam için geldiğini gösteriyor.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (91, 'reading', 'B2', 'P3', 'Which statement best expresses the writer''s main argument?', '["Streetlights should be switched off completely to protect wildlife.","Satellite images have made cities look brighter than they really are.","Artificial light brings real costs, so unnecessary lighting should be reduced.","Wildlife has adapted successfully to brightly lit cities."]'::jsonb, 2, 'Yazar, yapay ışığın doğaya ve sağlığa verdiği zararları sıralayıp gereksiz aydınlatmanın azaltılmasını savunuyor; bu, metnin ana fikridir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (92, 'reading', 'B2', 'P3', 'What happened after Tucson dimmed its street lighting?', '["There was no measurable rise in accidents or crime.","Crime increased slightly in the city centre.","Residents demanded brighter lamps.","Traffic accidents fell by half."]'::jsonb, 0, 'Metne göre Tucson ışıkları kıstığında kaza veya suç oranlarında ölçülebilir bir artış olmamıştır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (93, 'reading', 'B2', 'P3', 'What can be inferred about the writer''s view of lighting for safety?', '["The writer believes fears about unlit roads are exaggerated.","The writer thinks safety lighting causes most light pollution.","The writer would prefer cities to remove all streetlamps.","The writer accepts that a certain amount of lighting is necessary."]'::jsonb, 3, '''Safety matters, and nobody wants unlit roads'' cümlesi, yazarın belli bir miktar aydınlatmayı gerekli gördüğünü ima eder.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (94, 'reading', 'B2', 'P3', 'The word ''blaze'' in the passage is closest in meaning to ___.', '["fade slowly","shine intensely","stand empty","cool down"]'::jsonb, 1, '''Blaze'' fiili ''güçlü ve parlak şekilde ışık saçmak'' anlamına gelir; en yakın karşılığı ''shine intensely''dir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (95, 'reading', 'B2', 'P3', 'What is the writer''s main purpose in this article?', '["To describe the history of street lighting","To advertise energy-efficient lamps","To persuade readers to value natural darkness and cut wasteful lighting","To warn drivers about dangerous roads in Tucson"]'::jsonb, 2, '''I would argue'' gibi ifadeler ve sunulan önerilerle bu bir ikna amaçlı fikir yazısıdır; amaç okuru karanlığın değerine ikna etmektir.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (96, 'reading', 'C1', 'P4', 'Which of the following best summarises the central claim of the passage?', '["Modern life was more meaningful when it was more monotonous.","Psychological research has failed to explain the causes of boredom.","Smartphones should be prohibited in public spaces such as queues.","Boredom performs a useful function, and eliminating it instantly carries a hidden cost."]'::jsonb, 3, 'Yazının tezi, can sıkıntısının anlamlı bir sinyal olduğu ve onu anında bastırmanın gizli bir bedeli bulunduğudur. Diğer seçenekler metinde savunulmuyor; yazar nostaljik olmadığını da açıkça belirtiyor.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (97, 'reading', 'C1', 'P4', 'According to the passage, participants who were given deliberately monotonous tasks ___.', '["abandoned the tasks earlier than the control groups","went on to produce more original ideas than the control groups","reported higher levels of anxiety afterwards","completed the tasks more accurately than expected"]'::jsonb, 1, 'Metinde bu katılımcıların kontrol gruplarına göre ''more original ideas'' ürettiği açıkça belirtiliyor.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (98, 'reading', 'C1', 'P4', 'By describing the elimination of boredom as an ''apparent victory'', the writer implies that ___.', '["the achievement is superficial and may actually amount to a loss","the battle against boredom has not yet been won","smartphone designers deserve credit for their efficiency","psychologists disagree about whether boredom exists"]'::jsonb, 0, '''Apparent victory ... may be a hollow one'' ifadesi, zaferin görünüşte kaldığını ve aslında bir kayıp olabileceğini ima eder.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (99, 'reading', 'C1', 'P4', 'The word ''atrophies'' in the passage is closest in meaning to ___.', '["expands rapidly","becomes painful","gradually weakens","stays the same"]'::jsonb, 2, '''Atrophy'', bir yetinin kullanılmadığı için zamanla zayıflaması/körelmesi demektir; ''gradually weakens'' en yakın anlamdır.');
insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (100, 'reading', 'C1', 'P4', 'The writer''s attitude towards filling every idle moment with digital distraction is best described as ___.', '["openly enthusiastic","entirely neutral","bitterly nostalgic for the past","sceptical and quietly disapproving"]'::jsonb, 3, '''Frictionless distraction'' ve ''hollow victory'' gibi ifadeler eleştirel bir kuşku taşır; yazar ayrıca nostaljik olmadığını açıkça söylediği için doğru tutum ''sceptical and quietly disapproving''dir.');

-- ============================================================
-- 0003: HTML odev destegi + gunluk kelime ilerlemesi
-- Idempotenttir; mevcut kurulumlara guvenle uygulanabilir.
-- ============================================================

-- Odevler: tur (klasik / html) ve HTML icerik
alter table public.assignments
  add column if not exists kind text not null default 'text',
  add column if not exists html_content text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'assignments_kind_check'
      and conrelid = 'public.assignments'::regclass
  ) then
    alter table public.assignments
      add constraint assignments_kind_check check (kind in ('text', 'html'));
  end if;
end $$;

-- ------------------------------------------------------------
-- Gunluk kelime calismasi ilerlemesi (ogrenci basina gunde 1 satir)
-- ------------------------------------------------------------
create table if not exists public.vocab_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  level text not null check (level in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  learned_words jsonb not null default '[]'::jsonb,
  quiz_correct integer check (quiz_correct between 0 and 100),
  quiz_total integer check (quiz_total between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, day)
);

create index if not exists vocab_progress_student_idx
  on public.vocab_progress (student_id, day desc);

drop trigger if exists vocab_progress_updated_at on public.vocab_progress;
create trigger vocab_progress_updated_at before update on public.vocab_progress
  for each row execute function public.set_updated_at();

alter table public.vocab_progress enable row level security;

-- Ogrenci kendi kaydini gorur/yazar; ogretmen tumunu gorur
drop policy if exists "vocab_select" on public.vocab_progress;
create policy "vocab_select" on public.vocab_progress for select to authenticated
  using (student_id = auth.uid() or public.is_teacher());

drop policy if exists "vocab_student_insert" on public.vocab_progress;
create policy "vocab_student_insert" on public.vocab_progress for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists "vocab_student_update" on public.vocab_progress;
create policy "vocab_student_update" on public.vocab_progress for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ============================================================
-- 0004: Ogrenci rengi (ogretmen takviminde ders rozetleri icin)
-- Idempotenttir; mevcut kurulumlara guvenle uygulanabilir.
-- ============================================================

alter table public.profiles
  add column if not exists color text;
