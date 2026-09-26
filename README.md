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
- Prisma 6 ve SQLite; model `prisma/schema.prisma`, geliştirme seed'i `prisma/seed.ts`.
- Stiller `src/styles` altında (tokenlar `tokens.css`, `base/`, `components/`, `layout/`, `pages/`); `src/app/globals.css` yalnız sıralı import listesidir. Görseller `public/assets`, logo fontu `public/fonts`.
- Kimlik doğrulama `src/lib/auth.ts`; ödeme istemcisi `src/lib/payment/iyzico.ts`.
- Sepet ve favoriler `src/context`; ortak menü, arama, çekmece ve kılavuzlar `src/components`.

## Yerel çalıştırma

```bash
npm ci
npm run db:generate
npm run db:push
npm run dev
```

Kök dizindeki `.env` içinde `DATABASE_URL="file:./dev.db"` gerekir. `npm run seed` **yıkıcıdır**: `prisma/seed.ts` müşteri, ürün, sipariş ve ilişkili kayıtları silip örnek kayıtlar oluşturur. Yalnızca sıfırlanabilir yerel geliştirme veritabanında çalıştırın. `db:push` betiği de `--accept-data-loss` kullanır; üretim için gözden geçirilmiş migration gerekir.

Ödeme için `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, uygun `IYZICO_BASE_URL` ve dışarıdan erişilen `NEXT_PUBLIC_SITE_URL` gerekir. Mevcut kod anahtarlar yoksa simülasyona geçer. Bu nedenle ödeme yapılandırılmadan uygulama gerçek sipariş kabul ediyor sayılmamalıdır. Anahtarları depoya koymayın.

## Doğrulama

```bash
npx tsc --noEmit
npm run build
npm test
```

`npm test` `.ts`, `.tsx` ve `.mjs` testlerini birlikte çalıştırır; `tests/design-tokens.test.ts` stil dosyalarının token kurallarını denetler. Tam doğrulama için [QA.md](docs/QA.md) matrisindeki tarayıcı, erişilebilirlik ve ödeme kontrolleri uygulanır.

## Temel ilke

Müşteriye gösterilen ürün, fiyat, stok, yorum, sipariş ve ödeme sonucu gerçek yetkili kaynaktan gelmelidir. Tasarım örnek metni veya seed kaydı canlı veri yerine geçmez. Her görünen kontrolün erişilebilir, çalışan ve ölçülebilir bir sonucu olmalıdır.

## Ürün medyası geliştirme notu

Yönetici `/yonetim` → Ürünler alanında önce taslak açar, sonra gerçek JPEG/PNG/WebP (en çok 10 MB) veya MP4/WebM (en çok 50 MB) yükler. Videoya aynı ürünün görsel posteri seçilir; kapak, medya sırası ve renk ailesi bağlandıktan sonra ayrı **Yayınla** eylemi kullanılır. Taslaklar genel API, koleksiyon, ürün detayı ve Merchant feed'de görünmez. Eski `/api/admin/upload` artık 410 döner.

Yerel geliştirme yüklemeleri `public/uploads` altına yazılır. Üretimde yükleme için kalıcı S3-uyumlu depolama şarttır: `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`. Bu değerler eksikse üretim yüklemesi yerel diske düşmez, hata verir. Gizli anahtarları depoya veya istemciye koymayın. Mevcut veritabanı için yedek alın, `prisma migrate resolve --applied 20260920000000_baseline` ve ardından `prisma migrate deploy` ile additive geçişi uygulayın; boş yeni veritabanında iki migration doğrudan deploy edilir. Canlı veritabanında seed veya `db:push --accept-data-loss` çalıştırmayın.
