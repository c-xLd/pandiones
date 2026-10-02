# Sistem mimarisi ve değişiklik sınırları

Bu belge mevcut yapıyı ve hedef mimari sınırlarını ayırır. Kod değişmeden hedef tamamlandı sayılmaz.

## Bugünkü akış

```text
Tarayıcı
  ├─ Next.js App Router sayfaları (`src/app`)
  ├─ ortak Auth/Cart/Wishlist context'leri (`src/context`)
  └─ Route Handler çağrıları (`src/app/api`)
         ├─ Prisma istemcisi (`src/lib/prisma.ts`) → PostgreSQL (yerel: gömülü Postgres; üretim: Supabase)
         ├─ oturum imzası (`src/lib/auth.ts`)
         └─ iyzico istemcisi (`src/lib/payment/iyzico.ts`)
```

`src/app/layout.tsx` tüm sayfalara header, footer, modal, toast ve üç context sağlar. Ana sayfa ve katalog ürünleri istemcide `/api/products` üzerinden alır; ürün detay rotaları Prisma ile sunucuda sorgular. Sepet tarayıcı `localStorage` alanında tutulur. Favoriler misafirde yerel, oturum açmış kullanıcıda API/veritabanı üzerinden ilerler. Sipariş oluşturma `/api/checkout`, ödeme dönüşü `/api/payment/callback` içindedir.

## Katman sorumluluğu

| Katman | Sorumluluk | Dışarı taşmaması gereken karar |
| --- | --- | --- |
| Sayfa ve bileşen | Gösterim, klavye etkileşimi, form girişi ve durum | Nihai fiyat, indirim, stok ve yetki |
| Context | Oturum görünümü, geçici sepet/favori davranışı | Satın alma veya ödeme kanıtı |
| Route Handler | Kimlik, doğrulama, sahiplik, işlem ve tutarlı hata | UI'ye ham gizli sağlayıcı yanıtı |
| Prisma | Kalıcı veri ve ilişkiler | İş kuralı olmadan kör güncelleme |
| Ödeme sağlayıcısı | Ödeme sonucunu doğrulama | Tek başına sipariş erişim izni |

## Hedef işlem akışı

1. İstemci ürün ve varyant seçimini gönderir; sunucu ürün, fiyat, stok, miktar ve kuponu tekrar okur.
2. Sipariş `PENDING` durumuyla ve tekil işlem anahtarıyla oluşturulur. Ödeme sağlayıcısı yapılandırılmamışsa işlem başlamaz.
3. Sağlayıcı sonucu güvenilir sunucu çağrısıyla doğrulanır. Callback tekrar gelirse mevcut nihai durum korunur.
4. Stok ve kupon sayaçları başarılı ödeme için yalnız bir kez, sınırları kontrol edilerek güncellenir. Başarısız adım görünür ve uzlaştırılabilir kayıt bırakır.
5. Sipariş sonucu yalnız sahibi veya yetkili yöneticiye, ödeme durumuyla uyumlu metinle gösterilir.

## Geliştirme sınırları

Yeni iş kuralı yalnız bileşen içine gömülmez; API ve veri modeline yansıtılır. API sözleşmesi değişirse [API.md](API.md), sayfa davranışı değişirse [PAGES.md](PAGES.md), veri akışı değişirse [DATA.md](DATA.md) güncellenir. Büyük istemci bileşenleri bölünürken gerçek durum sahipliği korunur; server/client sınırı ölçülen performansla seçilir. Üretim veritabanı ve yüklenen dosyalar kalıcı, yedekli bir ortama bağlanmadan ölçeklenebilirlik iddia edilmez.
