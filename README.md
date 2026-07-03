# Britten Akademi

Birebir İngilizce eğitimi için profesyonel öğretmen–öğrenci platformu.
**Next.js 15 + Supabase + Vercel** üzerine kuruludur.

## Özellikler

### Öğrenci paneli
- **100 soruluk seviye tespit sınavı** — ilk girişte zorunlu; Dil Bilgisi (36),
  Kelime Bilgisi (28), Günlük İngilizce (16) ve Okuma (20) bölümleri, CEFR
  (Pre-A1 – C2) sonuç raporu, bölüm/seviye bazında döküm. Cevaplar otomatik
  kaydedilir, ara verilip devam edilebilir. Puanlama tamamen sunucu tarafında
  yapılır; cevap anahtarı istemciye asla gönderilmez.
- **Ders takvimi** — öğretmenle ortak takvim; ders saatleri, durumları,
  çevrim içi ders bağlantısı, ders özetleri.
- **Ödevler** — teslim (metin + dosya), not ve geri bildirim görüntüleme.
- **Materyaller** — öğretmenin yüklediği interaktif HTML içerikler
  (sandbox iframe'de güvenle çalışır), bağlantılar, dosyalar ve notlar;
  beceriye göre filtreleme.
- **İlerleme sayfası** — not gelişim grafiği, beceri ortalamaları, ders
  istatistikleri, paket durumu.
- **Mesajlaşma** — öğretmenle birebir.

### Öğretmen paneli
- **Genel bakış** — yaklaşan dersler, notlanacak teslimler, sınav durumu,
  okunmamış mesajlar.
- **Öğrenci yönetimi** — hesap açma (e-posta + geçici şifre), şifre sıfırlama,
  girişi askıya alma/açma, seviye sınavını sıfırlama, bilgi düzenleme.
- **Öğrenci detayı** — sınav sonucu analizi (yanlış yapılan sorular, açıklamalarıyla),
  ders paketleri (kalan ders takibi), özel notlar.
- **Takvim** — ders planlama (haftalık tekrar desteği), durum işleme
  (tamamlandı / iptal / gelmedi), ders özeti yazma.
- **Ödev** — beceri etiketiyle ödev verme (dosya ekli), notlama + geri bildirim.
- **Materyal stüdyosu** — HTML içerik editörü (canlı önizleme,
  `{{ogrenci_adi}}` ve `{{seviye}}` kişiselleştirme değişkenleri), bağlantı,
  dosya ve not türleri; öğrenciye özel veya herkese açık yayınlama.

## Kurulum

### 1) Supabase projesi

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun.
2. **SQL Editor**'de `supabase/kurulum-tek-dosya.sql` dosyasının tamamını
   yapıştırıp bir kez çalıştırın (şema + RLS politikaları + storage kovası +
   100 soruluk sınav bankası). Dilerseniz aynı işi
   `supabase/migrations/0001_schema.sql` ve `0002_seed_questions.sql`
   dosyalarını sırasıyla çalıştırarak da yapabilirsiniz.
3. Öğretmen hesabınızı oluşturun: `supabase/seed_teacher.sql.example`
   dosyasını açın, e-posta/şifre/ad alanlarını değiştirin ve SQL Editor'de
   çalıştırın.

> Alternatif olarak [Supabase CLI](https://supabase.com/docs/guides/local-development)
> ile `supabase db push` kullanabilirsiniz.

### 2) Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyalayın ve Supabase
Dashboard > **Project Settings > API** bölümündeki değerleri girin:

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Proje URL'si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable anahtar |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` anahtarı — **gizli**, yalnızca sunucuda kullanılır |

### 3) Yerel geliştirme

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tip kontrolü
npm run build      # üretim derlemesi
```

### 4) Vercel'e yayınlama

1. Bu repoyu GitHub'a itin ve [vercel.com](https://vercel.com) üzerinde
   **New Project** ile içe aktarın (framework otomatik algılanır: Next.js).
2. **Environment Variables** bölümüne yukarıdaki üç değişkeni ekleyin.
3. **Deploy**'a basın. Yayın sonrası `https://<proje>.vercel.app/giris`
   adresinden öğretmen hesabınızla giriş yapın.

### 5) İlk kullanım akışı

1. Öğretmen olarak giriş yapın → **Öğrenciler > Yeni Öğrenci** ile
   öğrencinize e-posta + geçici şifre tanımlayın.
2. Şifreyi öğrencinizle güvenli bir kanaldan paylaşın.
3. Öğrenci ilk girişinde **otomatik olarak seviye tespit sınavına** yönlendirilir;
   sınav bitmeden panele erişemez.
4. Sonuç anında her iki panele düşer; ders programınızı buna göre kurarsınız.

## Güvenlik mimarisi

- **RLS her tabloda açık** — öğrenci yalnızca kendi kayıtlarını görür;
  yazma yetkileri politikalarla sınırlandırılmıştır (ör. öğrenci kendi
  sınav denemesine puan yazamaz, profildeki rolünü değiştiremez).
- **Cevap anahtarı** (`test_questions`) istemciye tamamen kapalıdır;
  soru servis etme ve puanlama yalnızca sunucu tarafında `service_role`
  ile yapılır.
- **Dosyalar** özel storage kovasında tutulur; erişim, uygulama katmanı
  yetki kontrolünden geçen kısa ömürlü imzalı URL'lerle verilir.
- **Hesap açma/şifre sıfırlama** yalnızca öğretmen rolündeki oturumun
  tetikleyebildiği server action'larla, service-role üzerinden yapılır;
  herkese açık kayıt yoktur.
- Öğretmenin HTML materyalleri öğrenciye **sandbox iframe** içinde gösterilir
  (`allow-same-origin` verilmez): içerikteki script'ler çalışır ama oturum
  çerezlerine ve üst sayfaya erişemez.

## Proje yapısı

```
src/
  app/
    giris/              # Giriş sayfası
    ogretmen/           # Öğretmen paneli (layout + sayfalar)
    ogrenci/            # Öğrenci paneli (seviye sınavı dahil)
  components/           # UI kiti, takvim, sınav, grafikler, mesajlaşma
  lib/
    actions/            # Server action'lar (tüm yazma işlemleri)
    supabase/           # SSR/istemci/admin Supabase istemcileri
    cefr.ts             # Puanlama ve CEFR band eşlemesi
    placement.ts        # Soru servisi (cevap anahtarı sunucuda kalır)
supabase/
  migrations/           # Şema + soru bankası seed
  seed_teacher.sql.example
content/
  placement-questions.json  # Soru bankası kaynağı
scripts/
  generate-seed.mjs     # JSON -> SQL seed üretici
```
