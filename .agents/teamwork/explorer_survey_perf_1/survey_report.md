# Pandiones Performans, Görsel Teslimi ve Önbellek Mimarisi İnceleme Raporu

**Tarih:** 2026-10-14  
**İnceleyen:** `explorer_survey_perf_1`  
**Kapsam:** R1 (Hız ve Görsel Teslimi) ve R2 (Önbellek Mimarisi)  
**Referans Dokümanlar:** `ORIGINAL_REQUEST.md`, `AGENTS.md`, `next.config.mjs`, `src/middleware.ts`  

---

## 1. Yönetici Özeti (Executive Summary)

Pandiones kod tabanında vitrin performansı, görsel teslimi ve önbellek mekanizmaları incelenmiştir. Mevcut mimaride öne çıkan temel bulgular:

1. **Vitrin Sayfalarının Render Davranışı (SSR vs ISR/Static):**
   - Ana sayfa (`(anasayfa)/page.tsx`) ve yeni gelenler (`yeni-gelenler/page.tsx`) sayfalarında `export const dynamic = 'force-dynamic'` tanımlıdır.
   - Kategori (`[kategori]/page.tsx`), alt kategori (`[kategori]/[altKategori]/page.tsx`) ve ürün detay (`urun/[slug]/page.tsx`) sayfalarında dinamik parametre bulunmasına rağmen `generateStaticParams` veya `export const revalidate` tanımlanmamıştır.
   - Bu durum, vitrindeki tüm ana sayfaların her kullanıcı isteğinde sunucu tarafında (SSR) sıfırdan derlenmesine ve veritabanı sorgusu atmasına neden olmaktadır. Hiçbir vitrin rotasında Next.js Full Route Cache (statik HTML / ISR) çalışmamaktadır.

2. **Veritabanı ve Veri Önbelleği (`unstable_cache` & React `cache`):**
   - Sadece iki veri okumasında `unstable_cache` kullanılmaktadır:
     - `src/lib/settings/server.ts` -> `getStoreSettings()` (etiket: `store-settings`)
     - `src/lib/products/load-collection.ts` -> `loadHomeCollection()` (etiket: `catalog`, 60 sn TTL)
   - Kategori sayfaları, alt kategori sayfaları ve ürün detay sayfaları `loadCollection()` veya `loadProduct()` üzerinden her istekte PostgreSQL'e doğrudan sorgu atmaktadır (`prisma.product.findMany`).
   - React `cache()` yalnızca tek bir HTTP isteği içindeki mükerrer fonksiyon çağrılarını (deduplication) önler; istekler arası paylaşılan önbellek sağlamaz.

3. **Görsel Optimizasyonu ve Teslimi (`next/image` vs `img`):**
   - Ana sayfa, kategori kartları ve ürün detay sayfasında `next/image` kullanılmakta, AVIF/WebP dönüşümü yapılmaktadır (`qualities: [60, 85]`, `minimumCacheTTL: 30 gün`).
   - Ana sayfadaki `campaign-model` ve ürün detaydaki birinci görsel (`idx === 0`) `priority` ile doğru şekilde işaretlenmiştir.
   - **Sorun 1 (Boyut Çözünürlüğü / Responsive Sizes):** Kartlarda ve editoryal çerçevelerde kullanılan `sizes` değerleri (örn. `(max-width: 900px) 200vw, 65vw` ve `(max-width: 600px) 200vw, 100vw`), mobil cihazlarda Next.js'in 1600px veya 1920px boyutunda devasa görseller üretip indirmesine yol açmaktadır.
   - **Sorun 2 (Düz `<img>` Kullanımı):** Çanta (`canta/page.tsx:206`) ve ödeme (`odeme/page.tsx:389`) sayfalarında `next/image` yerine ham `<img>` etiketleri kullanılmaktadır; modern format (WebP/AVIF) optimizasyonundan mahrumdur ve çantada genişlik/yükseklik eksikliği CLS riski taşımaktadır.
   - **Sorun 3 (Erişilebilirlik ve SEO - Eksik Alt Metinleri):** Ana sayfa ürün ızgarasında (`HomeProductGrid.tsx:49`), marka hikayesinde (`(anasayfa)/page.tsx:231, 235`), çanta ve ödeme sayfalarında `alt=""` kullanılmıştır.

4. **HTTP Önbellek Başlıkları (Cache-Control):**
   - `public/fonts/` ve `public/assets/` dizinindeki statik dosyalar için `next.config.mjs` içinde uzun ömürlü `Cache-Control` başlığı (`max-age=31536000, immutable`) TANIMLANMAMIŞTIR. Tarayıcılar her istekte `max-age=0` revalidation yapmaktadır.
   - `middleware.ts` sadece `/yonetim*` ve `/api/admin/*` yollarına `Cache-Control: no-store` basmaktadır.
   - Müşteri gizli verisi dönen `/api/auth/me`, `/api/auth/addresses`, `/api/cart/validate` gibi API rotalarında açıkça `Cache-Control: private, no-store` bulunmamaktadır.

5. **Yönetim Değişikliklerinde Önbellek Geçersiz kılma (Revalidation):**
   - Mağaza ayarları değiştiğinde `revalidateStoreSettings()` (`revalidateTag('store-settings')` ve `revalidatePath('/', 'layout')`) çağrılmaktadır.
   - Ürün kaydedildiğinde/yayınlandığında/silindiğinde `refreshCatalogCache()` (`revalidateTag('catalog')`) çağrılmaktadır. Bu SADECE ana sayfa koleksiyon önbelleğini temizlemektedir.
   - **Kritik Eksik:** Yönetim panelinden kategori eklendiğinde, güncellendiğinde, sıralandığında veya silindiğinde (`api/admin/categories/route.ts`) HİÇBİR önbellek geçersiz kılma (revalidation) fonksiyonu ÇAĞRILMAMAKTADIR!

---

## 2. Mevcut Commit Edilmemiş Değişiklikler Analizi (`git status --short`)

Çalışma alanında devam eden iş paketlerine ait uncommitted değişiklikler bulunmaktadır. Bu dosyaların ezilmemesi, geri alınmaması veya bozulmaması gerekmektedir:

### A. Yapılandırma ve Veritabanı
- `next.config.mjs`: LAN preview ve distDir mantığı optimize edilmiş.
- `package.json` & `tsconfig.json`: TypeScript ve script tanımları.
- `prisma/schema.prisma` & `prisma/migrations/20261014000000_product_commerce_fields/`: Ürün ticari alanları (SKU, compareAtPrice, vatRate) ve yeni migrasyon.

### B. Vitrin Sayfaları ve Bileşenleri
- `src/app/(anasayfa)/page.tsx`: Eski `src/app/page.tsx` dosyası `(anasayfa)` route grubuna taşınmış; ana sayfa editoryal hikaye ve görsel düzenlemeleri yapılmış.
- `src/app/urun/[slug]/ProductDetailClient.tsx`: Varyant matrisi, renk geçişleri ve görsel büyütme mantığı güncellenmiş.
- `src/components/collection/CollectionProductCard.tsx`: Kart içi hover, video desteği ve beden butonları revize edilmiş.
- `src/components/product/PriceTag.tsx`: Yeni fiyat etiketi bileşeni eklenmiş.
- `src/lib/products/catalog-cache.ts`: `refreshCatalogCache()` modülü eklenmiş.
- `src/lib/products/public-catalog.ts` & `src/lib/products/load-collection.ts`: Katalog okuma ve dönüştürme fonksiyonları güncellenmiş.
- `public/assets/home/` & `scripts/optimize-home-images.mjs`: Ana sayfa fotoğraflarını WebP'ye dönüştüren script ve çıktıları.

### C. Yönetim Paneli (`/yonetim`)
- `src/app/yonetim/*`, `src/lib/admin/*`, `src/styles/pages/admin-product-editor.css`: Yeni ürün editörü, kategori ağacı seçimi, varyant matrisi ve medya yönetimi dosyaları üzerinde aktif çalışma bulunmaktadır.

---

## 3. Vitrin Performansı ve Görsel Teslimi (R1 Ayrıntılı İnceleme)

### 3.1. Sayfa Bazlı İnceleme

| Sayfa | Rota Dosyası | Render Türü | Görsel Teknolojisi | LCP Durumu | Temel Tespit & Eksikler |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ana Sayfa** | `src/app/(anasayfa)/page.tsx` | SSR (`force-dynamic`) | `next/image` (WebP/AVIF) | Hero model görselinde `priority` var | `force-dynamic` nedeniyle her istekte SSR. ~20 görsel yükleniyor. 8 ürün ve 2 marka görselinde `alt=""`. `sizes` 200vw istemektedir. |
| **Kategori** | `src/app/[kategori]/page.tsx` | Dinamik SSR | `next/image` | İlk 4 kartta `priority` var | `loadCollection()` önbelleksiz her istekte Prisma sorgusu çalıştırır. `CollectionClient` tüm ürünleri istemciye indirir. |
| **Alt Kategori** | `src/app/[kategori]/[altKategori]/page.tsx` | Dinamik SSR | `next/image` | İlk 4 kartta `priority` var | Kategori sayfasıyla aynı davranış; önbelleksiz veritabanı sorgusu. |
| **Yeni Gelenler** | `src/app/yeni-gelenler/page.tsx` | SSR (`force-dynamic`) | `next/image` | İlk 4 kartta `priority` var | `force-dynamic` tanımlı. Bütün ürünler istemci bileşenine aktarılıyor. |
| **Ürün Detay** | `src/app/urun/[slug]/page.tsx` | Dinamik SSR | `next/image` | Birincil görselde `priority` var | Her istekte Prisma sorgusu (ürün + 3 ilgili ürün). JSON-LD `availability` veritabanından bağımsız sabit `InStock`. İstemci bileşeni 1261 satır. |
| **Çanta** | `src/app/canta/page.tsx` | Client Component | Ham `<img>` | N/A | `next/image` yerine ham `<img>` (satır 206). Genişlik/yükseklik yok (CLS riski). `alt=""`. |
| **Ödeme** | `src/app/odeme/page.tsx` | Client Component (Suspense) | Ham `<img>` | N/A | `next/image` yerine ham `<img>` (satır 389). `alt=""`. Modern format dönüşümü yok. |

### 3.2. Görsel Boyutlandırma ve Responsive `sizes` Hatası
`src/components/collection/CollectionProductCard.tsx:43-47`:
```typescript
const FRAME_SIZES: Record<'2' | '4' | '6', string> = {
  '2': '(max-width: 600px) 200vw, 100vw',
  '4': '(max-width: 900px) 100vw, 50vw',
  '6': '(max-width: 600px) 100vw, (max-width: 900px) 68vw, (max-width: 1200px) 50vw, 34vw',
};
```
- **Etki:** Mobil cihaz genişliği örneğin 390px olduğunda `200vw` = 780px CSS genişliği demektir. Cihaz piksel oranı (DPR=3) ile çarpıldığında tarayıcı Next.js'ten ~2340px'e en yakın `deviceSize` olan **1920px** görseli talep eder!
- Gerçekte mobilde kart genişliği ~180px–360px civarındadır. Kullanıcı gereksiz yere 5-10 kat daha büyük görsel indirerek mobil veri ve LCP süresini tüketmektedir.

### 3.3. Font Yükleme Stratejisi
`src/app/layout.tsx:18-56` ve `src/styles/base/fonts.css`:
- Logo fontu: `localFont` ile `MontserratAlt1-Medium-subset.woff2` (7 KB) yüklenmektedir.
- Metin fontları: Cormorant Garamond ve Manrope Variable fontları `public/fonts/web/` altından sunulmaktadır.
- `RootLayout` içinde kritik 3 font dosyası `preload` ile erken çağrılmaktadır:
  - `/fonts/web/manrope-latin-wght-normal.woff2`
  - `/fonts/web/manrope-latin-ext-wght-normal.woff2`
  - `/fonts/web/cormorant-garamond-latin-400-normal.woff2`
- **Değerlendirme:** Font yükleme stratejisi son derece başarılıdır; WOFF2 subsetting ve preload doğru uygulanmıştır.

### 3.4. CSS Mimarisi ve Bundle Yükü
`src/app/globals.css`:
- Global CSS içinde `home.css`, `collection.css`, `product-card.css`, `collection-responsive.css` ve `collection-category.css` import edilmektedir.
- Bu durum, ana sayfa ve koleksiyon stillerinin giriş yap, şifre sıfırla, sepet ve ödeme gibi tüm sayfalara da gitmesine neden olmaktadır.
- Ancak diğer sayfa stilleri (`checkout.css`, `account.css`, `product.css`, `admin-content.css`) ilgili sayfa bileşenleri tarafından izole edilmiş route stylesheet olarak yüklenmektedir (başarılı ayrım).

### 3.5. İstemci Bileşenleri ve Hidrasyon Maliyeti
- `src/components/layout/DeferredOverlays.tsx`: Menü, arama, sepet çekmecesi ve rehber modallarını `next/dynamic` ile `{ ssr: false }` olarak bölmüş ve ilk kullanıcı etkileşimine (`pointerdown`, `touchstart` vb.) kadar ertelemiştir. Bu mükemmel bir optimizasyondur.
- `src/components/layout/Footer.tsx`: Sunucu bileşenidir; yalnızca bülten formu ve etkileşimli 3 buton (`FooterIslands.tsx`) istemci tarafında hidrate olur.
- `ProductDetailClient.tsx`: 1261 satır uzunluğunda devasa bir client component'tir. Zoom modalı, çekmeceler, hotspotlar, scroll gözlemcileri hepsi tek bir bileşendedir. Bu bileşenin alt modüllere ayrılması veya etkileşime göre dinamik yüklenmesi ilk JS maliyetini düşürecektir.

---

## 4. Önbellek Mimarisi (R2 Ayrıntılı İnceleme)

### 4.1. Next.js App Router Davranışı
- **Full Route Cache:** Projedeki vitrin sayfalarının hiçbiri Full Route Cache'e (statik HTML) girmemektedir.
  - `(anasayfa)` ve `yeni-gelenler`: `export const dynamic = 'force-dynamic'` ile açıkça zorunlu SSR yapmaktadır.
  - `[kategori]`, `[kategori]/[altKategori]`, `urun/[slug]`: `generateStaticParams` veya `revalidate` içermediğinden her istekte SSR çalışır.
- **Route Segment `revalidate`:** Tüm projede `export const revalidate = ...` araması 0 sonuç vermiştir. Projede hiçbir rotada ISR süresi tanımlanmamıştır.

### 4.2. Veritabanı ve Veri Önbelleği Matrisi

| Veri Fonksiyonu | Çağrıldığı Yer | Önbellek Mekanizması | Etiket / TTL | Admin Değişikliğinde Temizleme |
| :--- | :--- | :--- | :--- | :--- |
| `getStoreSettings()` | Layout, Sayfalar | `unstable_cache` | `tags: ['store-settings']` | `revalidateStoreSettings()` -> `revalidateTag` & `revalidatePath('/', 'layout')` |
| `loadHomeCollection()` | `(anasayfa)/page.tsx` | `unstable_cache` | `tags: ['catalog']`, TTL: 60s | `refreshCatalogCache()` -> `revalidateTag('catalog')` |
| `loadCollection()` | `[kategori]`, `[altKategori]`, `yeni-gelenler` | **YOK (Doğrudan Prisma)** | Yok | **YOK** |
| `loadProduct(slug)` | `urun/[slug]/page.tsx` | React `cache()` (tek istek içi) | İstek içi | **YOK** |
| `prisma.product.findMany (related)` | `urun/[slug]/page.tsx` | **YOK (Doğrudan Prisma)** | Yok | **YOK** |
| `getCategoriesTree(false)` | `loadCategoryTree()`, `/api/categories` | React `cache()` (tek istek içi) | İstek içi | **YOK** |
| `/api/products` | Client fetch | **YOK (Doğrudan Prisma)** | Yok | **YOK** |

### 4.3. HTTP Cache Headers (Statik Varlıklar, Görseller, API)
1. **Statik Varlıklar (`/fonts/*`, `/assets/*`):**
   - `next.config.mjs` içinde statik varlıklara özel `headers()` kuralı bulunmamaktadır.
   - Sonuç: `public/fonts/web/*.woff2` ve `public/assets/home/*.webp` dosyaları için `Cache-Control: public, max-age=31536000, immutable` gönderilmemektedir.
2. **Görseller (`/_next/image`):**
   - Next.js görüntü işleyicisi `minimumCacheTTL: 2592000` (30 gün) ile doğru şekilde `Cache-Control: public, max-age=2592000, must-revalidate` başlığı vermektedir.
3. **Google Merchant XML Akışı (`/api/feed/google-merchant`):**
   - `Cache-Control: s-maxage=3600, stale-while-revalidate` ayarlanmıştır (CDN kenar önbelleği çalışır).
4. **Müşteri Özel API'leri (`/api/auth/*`, `/api/cart/*`):**
   - `/api/auth/me`: Müşterinin adını, adreslerini, sipariş geçmişini döner. `Cache-Control: private, no-store` başlığı EKSİKTİR.
   - `/api/auth/addresses`: Adresleri döner. `Cache-Control: private, no-store` EKSİKTİR.
   - `/api/cart/validate`: Sepet fiyat ve stok durumunu doğrular. `Cache-Control: no-store` EKSİKTİR.

### 4.4. Özel / Müşteri / Yönetim Rotalarının İzolasyonu
- `src/middleware.ts` satır 66-70:
  ```typescript
  function privateHeaders(response: NextResponse) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  ```
- Bu fonksiyon **sadece** `isAdminPage`, `isAdminApi` ve `ADMIN_LOGIN` için çalıştırılmaktadır!
- `/hesabim`, `/siparislerim`, `/canta`, `/odeme`, `/siparis-onay/[id]` rotaları ve müşteri auth API'leri `privateHeaders` kapsamına dahil edilmemiştir. Bu rotaların paylaşılan önbelleklere (proxy/CDN) girmemesi için `no-store` başlıklarının eklenmesi zorunludur.

### 4.5. Yönetim Paneli Değişikliklerinde Yeniden Doğrulama (Revalidation) Analizi
1. **Ürün Güncelleme / Yayınlama / Silme (`api/admin/products/*`):**
   - `refreshCatalogCache()` çağrılır -> `revalidateTag('catalog')`.
   - Etki: Sadece ana sayfa (`home-collection`) önbelleği düşer. Ürün detay sayfası (`/urun/[slug]`) ve kategori sayfaları için `revalidatePath` çağrılmaz.
2. **Kategori Değişiklikleri (`api/admin/categories/*`):**
   - POST, PATCH, DELETE operasyonlarında **hiçbir revalidation yapılmamaktadır**. Ne `revalidateTag` ne de `revalidatePath` çağrılmaktadır.
3. **Mağaza Ayarları Değişiklikleri (`api/admin/settings/*`):**
   - `revalidateStoreSettings()` çağrılır -> `revalidateTag('store-settings')` ve `revalidatePath('/', 'layout')`.
   - Doğru şekilde tüm layout hiyerarşisini yeniler.

---

## 5. Uygulama Ekibi İçin Somut Çözüm Önerileri (Actionable Roadmap)

### Öncelik 1: Statik Varlık ve Görsel İyileştirmeleri (R1)
1. **Statik Başlıklar (`next.config.mjs`):**
   - `/fonts/:path*` ve `/assets/:path*` için `Cache-Control: public, max-age=31536000, immutable` başlığı eklenmeli.
2. **Çanta ve Ödemede `next/image` Geçişi:**
   - `canta/page.tsx:206` ve `odeme/page.tsx:389` içindeki ham `<img>` etiketleri `next/image` `<Image>` bileşenine dönüştürülmeli; uygun `width={72} height={96}` ve `quality={THUMB_QUALITY}` (60) verilmeli.
3. **Eksik `alt` Metinlerinin Düzeltilmesi:**
   - `HomeProductGrid.tsx` içindeki `<Image alt={p.name} />` yapılmalı.
   - Marka hikayesi ve editoryal görsellerde açıklayıcı `alt` metinleri verilmeli.
4. **Responsive `sizes` Düzeltmesi:**
   - `CollectionProductCard.tsx` ve `(anasayfa)/page.tsx` içindeki `200vw` tanımları gerçek slot boyutlarına (mobilde `(max-width: 600px) 50vw` veya `100vw`) çekilmeli. Böylece mobil cihazlarda 1920px yerine 480px–640px görsel talep edilir.

### Öncelik 2: Önbellek Mimarisi ve İzolasyon (R2)
1. **Müşteri Özel Rotalarında `no-store` Güvencesi:**
   - `middleware.ts` matcher kuralına veya özel rota kontrolüne `/hesabim`, `/siparislerim`, `/canta`, `/odeme`, `/siparis-onay/:path*` ve `/api/auth/:path*` eklenmeli; bu yanıtlara `Cache-Control: private, no-store` ve `X-Robots-Tag: noindex, nofollow` basılmalıdır.
2. **Katalog ve Ürün Okumalarında `unstable_cache` & Revalidation:**
   - `loadCollection()` fonksiyonu `unstable_cache` ile `tags: ['catalog', 'categories']` altında önbelleğe alınmalı (örn. 60 sn veya on-demand).
   - Ürün detayında `loadProduct(slug)` fonksiyonu `unstable_cache` ile `tags: ['catalog', `product-${slug}`]` altına alınmalı.
3. **Admin Kategori ve Ürün Revalidation Entegrasyonu:**
   - `api/admin/categories/route.ts` mutasyonlarına (POST, PATCH, DELETE) `revalidateTag('catalog')`, `revalidateTag('categories')` ve `revalidatePath('/', 'layout')` eklenmeli.
   - `api/admin/products/*` mutasyonlarına `revalidateTag('catalog')` yanında ilgili ürünün yolu için `revalidatePath(`/urun/${slug}`)` eklenmeli.
4. **Yönetim Panelinden Önbellek Temizleme Düğmesi (R5 Hazırlığı):**
   - Yönetim paneline gerçek sunucu işlemi yapan bir `/api/admin/cache/purge` uç noktası bağlanmalı; `revalidateTag('catalog')`, `revalidateTag('store-settings')` ve `revalidatePath('/', 'layout')` çalıştırılarak anlık sonuç dönmeli.

---

## 6. Bulgular Doğrulama Matrisi

| Doğrulanan İddia | Dosya ve Satır | Doğrulama Yöntemi | Sonuç |
| :--- | :--- | :--- | :--- |
| TypeScript Derleme Sağlığı | Proje kökü | `npx tsc --noEmit` | **0 Hata (Exit 0)** |
| Test Paketi Bütünlüğü | Proje kökü | `npm test` | **282/282 Başarılı (0 Hata)** |
| Ana Sayfa Dynamic Segmenti | `src/app/(anasayfa)/page.tsx:15` | `view_file` | `export const dynamic = 'force-dynamic'` mevcut |
| Çantada Ham `<img>` Kullanımı | `src/app/canta/page.tsx:206` | `view_file` | `<img src={item.image} alt="" ... />` mevcut |
| Ödemede Ham `<img>` Kullanımı | `src/app/odeme/page.tsx:389` | `view_file` | `<img src={item.image} alt="" ... />` mevcut |
| Font Ön Yüklemesi (Preload) | `src/app/layout.tsx:44-55` | `view_file` | 3 adet WOFF2 dosyası `preload` ile çağrılıyor |
| Statik Varlık Cache Başlığı Eksikliği | `next.config.mjs:41-43` | `view_file` | `/fonts/` veya `/assets/` için `headers()` tanımlı değil |
| Kategori Admin Revalidation Eksikliği | `src/app/api/admin/categories/route.ts` | `view_file` | POST, PATCH, DELETE'te hiçbir `revalidate` çağrısı yok |
| Gizli Müşteri API Başlık Eksikliği | `src/app/api/auth/me/route.ts` | `view_file` | `NextResponse.json(...)` doğrudan dönüyor; `no-store` yok |
