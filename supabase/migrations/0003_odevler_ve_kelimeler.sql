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
