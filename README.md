# Pandiones Maison

Pandiones, Next.js App Router ile geliştirilmiş Türkçe bir iç giyim ve ev giyim mağazasıdır. Bu depo uygulama kodunu, Prisma veri modelini ve geliştirme kurallarını içerir.

> **Durum:** Bu belgeler hedef kaliteyi tanımlar; mevcut kodun tamamının bu hedefe ulaştığını iddia etmez. Özellikle ödeme simülasyonu ve veri doğrulaması için açık işler [QA.md](docs/QA.md) içindedir. Canlı satıştan önce bunlar kapatılmalıdır.

## Doküman haritası

| Dosya | Kapsam |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Ajanlar için çalışma ve teslim kuralları |
| [DESIGN.md](DESIGN.md) | Marka, tipografi, yerleşim, responsive ve erişilebilirlik |
| [PAGES.md](docs/PAGES.md) | Her web sayfasının veri, eylem ve durum sözleşmesi |
| [FUNCTIONALITY.md](docs/FUNCTIONALITY.md) | Link, buton, form ve uçtan uca ticaret akışları |
| [DATA.md](docs/DATA.md) | Gerçek veri, API, ödeme, stok ve güvenlik |
| [STATES.md](docs/STATES.md) | Skeleton, placeholder, boş, hata ve başarı durumları |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | Ölçülebilir performans bütçesi |
| [QA.md](docs/QA.md) | Yayın öncesi kabul listesi ve mevcut açıklar |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Katmanlar, veri akışı ve işlem sınırları |
| [API.md](docs/API.md) | Bütün Route Handler yöntemleri ve sözleşme hedefleri |
| [SECURITY.md](docs/SECURITY.md) | Koddan doğrulanan yetki, oturum, ödeme ve mahremiyet riskleri |
| [CONTENT-SEO.md](docs/CONTENT-SEO.md) | Ürün içeriği, kanonik rota, sitemap ve Merchant feed |
| [OPERATIONS.md](docs/OPERATIONS.md) | Ortamlar, yayın, izleme ve olay yönetimi |
| [TESTING.md](docs/TESTING.md) | Test katmanları, senaryolar ve kabul kanıtı |
| [ACCESSIBILITY.md](docs/ACCESSIBILITY.md) | Klavye, ekran okuyucu, form ve hareket kabul standardı |
| [ROADMAP.md](docs/ROADMAP.md) | Güvenli satıştan operasyonel büyümeye aşamalı işler |
| [Mağaza sayfaları](docs/pages/STOREFRONT.md) | Ana sayfa, katalog ve ürün detayının ayrı kabul ölçütleri |
| [Ödeme sayfaları](docs/pages/CHECKOUT.md) | Sepet, ödeme ve sipariş sonucu |
| [Hesap sayfaları](docs/pages/ACCOUNT.md) | Giriş, hesap, favori, yorum ve iade |
| [Yönetim sayfası](docs/pages/ADMIN.md) | Panel sekmeleri ve işlemleri |

## Teknoloji ve kod haritası

- Next.js 15, React 19, TypeScript; `src/app` altında sayfalar ve Route Handler API'leri.
- Prisma 6 ve PostgreSQL (yerelde gömülü Postgres 17, üretimde Supabase); model `prisma/schema.prisma`, geçişler `prisma/migrations`, katalog verisi `prisma/catalog/catalog.json`.
- Stiller `src/styles` altında (tokenlar `tokens.css`, `base/`, `components/`, `layout/`, `pages/`); `src/app/globals.css` yalnız sıralı import listesidir. Görseller `public/assets`, logo fontu `public/fonts`.
- Kimlik doğrulama `src/lib/auth.ts`; ödeme istemcisi `src/lib/payment/iyzico.ts`.
- Sepet ve favoriler `src/context`; ortak menü, arama, çekmece ve kılavuzlar `src/components`.

## Yerel çalıştırma

```bash
npm ci
npm run db:dev        # ayrı terminalde açık kalır: yerel Postgres 17 (127.0.0.1:54329), geçişleri uygular
npm run db:reset      # ilk kez: pandiones_dev ve pandiones_test'i sıfırlar, kataloğu yükler
npm run dev
```

`npm run dev` derlemesini `.next-dev/`, `npm run build` ise `.next/` klasörüne yazar; dev sunucusu açıkken derleme almak sunucuyu bozmaz (eskiden aynı klasörü paylaşıyorlardı ve `Cannot find module './NNNN.js'` ile 500 dönüyordu). `npm run clean` yalnız `.next`'i siler (çalışan dev sunucusuna dokunmaz); dev önbelleği bozulursa sunucuyu durdurup `npm run clean:dev`.

Docker gerekmez; `db:dev` gömülü Postgres'i (`embedded-postgres`) `.pg-data/` altında çalıştırır. Kök dizindeki `.env` içinde `DATABASE_URL` ve `DIRECT_URL` `postgresql://postgres:postgres@127.0.0.1:54329/pandiones_dev` olmalıdır (yalnız yerel). Şema değişikliği `npm run db:migrate` ile yeni migration olarak eklenir. `npm run db:import-catalog` kataloğu (kategori, ürün, beden, görsel kaydı) yalnız ekleyerek yükler; uzak bir veritabanında `--remote` ister. `npm run seed` **yıkıcıdır** ve yalnız `localhost` veritabanında çalışır. Testler `pandiones_test` veritabanını kullanır ve loopback dışına bağlanmayı reddeder (`tests/helpers/test-env.mjs`).

Ödeme için `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, uygun `IYZICO_BASE_URL` ve dışarıdan erişilen `NEXT_PUBLIC_SITE_URL` gerekir. İstemci resmi `iyzipay` SDK'sını kullanır (`src/lib/payment/iyzico.ts`). Geliştirme ve test için iyzico Sandbox hesabının `sandbox-` anahtarları kullanılır (SMS şifresi `123456`); `IYZICO_BASE_URL` verilmezse sandbox adresi varsayılır ve checkout yanıtı `isTestMode: true` döner. `NODE_ENV=production` iken sandbox adresiyle ödeme başlatılmaz (hata döner); canlıda `IYZICO_BASE_URL=https://api.iyzipay.com` ve canlı anahtarlar zorunludur. Anahtar yoksa ve ortam üretim değilse kod geliştirme simülatörüne geçer. Bu nedenle ödeme yapılandırılmadan uygulama gerçek sipariş kabul ediyor sayılmamalıdır. Anahtarları depoya koymayın.

## Doğrulama

```bash
npx tsc --noEmit
npm run build
npm test
```

`npm test` önce `pandiones_test`'e kataloğu yükler (`pretest`), ardından `.ts` ve `.mjs` testlerini çalıştırır (`db:dev` açık olmalı); `.tsx` testleri `node --import tsx --import ./tests/helpers/test-env.mjs --test tests/*.test.tsx` ile çalışır; `tests/design-tokens.test.ts` stil dosyalarının token kurallarını denetler. Tam doğrulama için [QA.md](docs/QA.md) matrisindeki tarayıcı, erişilebilirlik ve ödeme kontrolleri uygulanır.

## Temel ilke

Müşteriye gösterilen ürün, fiyat, stok, yorum, sipariş ve ödeme sonucu gerçek yetkili kaynaktan gelmelidir. Tasarım örnek metni veya seed kaydı canlı veri yerine geçmez. Her görünen kontrolün erişilebilir, çalışan ve ölçülebilir bir sonucu olmalıdır.

## Ürün medyası geliştirme notu

Yönetici `/yonetim` → Ürünler alanında önce taslak açar, sonra gerçek JPEG/PNG/WebP (en çok 10 MB) veya MP4/WebM (en çok 50 MB) yükler. Videoya aynı ürünün görsel posteri seçilir; kapak, medya sırası ve renk ailesi bağlandıktan sonra ayrı **Yayınla** eylemi kullanılır. Taslaklar genel API, koleksiyon, ürün detayı ve Merchant feed'de görünmez. Eski `/api/admin/upload` artık 410 döner.

Yerel geliştirme yüklemeleri `public/uploads` altına yazılır. Üretimde yükleme için kalıcı S3-uyumlu depolama şarttır: `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`. Bu değerler eksikse üretim yüklemesi yerel diske düşmez, hata verir. Gizli anahtarları depoya veya istemciye koymayın. Üretimde bu depo Supabase Storage `media` kovasıdır (S3 uyumlu uç, herkese açık okuma, yazma yalnız S3 erişim anahtarıyla). Vercel'de sunucu fonksiyonu gövdesi 4,5 MB ile sınırlıdır; bundan büyük dosyalar yükleme sırasında platform tarafından reddedilir. Canlı veritabanında seed çalıştırmayın; şema yalnız `prisma migrate deploy` ile (Vercel derlemesinde `vercel-build`) değişir.
