-- ============================================================
-- 0004: Ogrenci rengi (ogretmen takviminde ders rozetleri icin)
-- Idempotenttir; mevcut kurulumlara guvenle uygulanabilir.
-- ============================================================

alter table public.profiles
  add column if not exists color text;
