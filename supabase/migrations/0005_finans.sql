-- ============================================================
-- 0005: Finans; paket odemeleri takibi
-- Idempotenttir; mevcut kurulumlara guvenle uygulanabilir.
-- ============================================================

alter table public.packages
  add column if not exists paid_at timestamptz;
