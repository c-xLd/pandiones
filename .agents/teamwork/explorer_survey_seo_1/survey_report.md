# Pandiones SEO, Google Merchant Feed ve Test Kapsamı İnceleme Raporu

**Rapor Tarihi:** 2026-10-14  
**İnceleyen:** Teamwork Explorer (`explorer_survey_seo_1`)  
**Kapsam:** R3 (SEO Mimarisi), R4 (Google Merchant Center XML Feed), Test Paketi & Marka Uyumu ve R5 (Yönetim Paneli Entegrasyonu)

---

## 1. Yönetici Özeti (Executive Summary)

Pandiones kod tabanında gerçekleştirilen detaylı inceleme sonucunda:
1. **Mevcut Test Durumu:** Test paketi 282/282 test ile tamamen yeşildir (`npm test`), `npx tsc --noEmit` sıfır hata ile tamamlanmaktadır. `tests/brand-compliance.test.ts` (3 test) yeşildir ve `src/` dizininde yasaklı marka sözcükleri ("atölye", "atolye", "atelier", "maison", "istanbul"), yapay güven rozetleri veya ölü linkler (`href="#"`) bulunmamaktadır.
2. **Kritik SEO Açıkları (R3):**
   - Kök `layout.tsx` içinde `metadataBase` tanımlanmamıştır; kanonik ve Open Graph yolları bağıl çözülemez.
   - Ürün detay sayfasındaki (`src/app/urun/[slug]/page.tsx:96`) JSON-LD çıktısında `offers.availability` değeri, gerçek stok durumundan bağımsız olarak sabit `'https://schema.org/InStock'` yazılmıştır. Stok tükense dahi "InStock" çıkması, AGENTS.md ve R3/R7 "asla mock veri yok" kuralına doğrudan aykırıdır.
   - `robots.ts` statiktir; yönetim panelinden indeksleme ayarını okumaz, `/sepet/`, `/canta/`, `/hesabim/`, `/favorilerim/` gibi özel rotaları dışlamamaktadır.
   - `sitemap.ts` kullanıcıya özel kişisel `/favorilerim` sayfasını hatalı biçimde indeks listesine eklemiştir; buna karşılık `/yardim`, `/iletisim`, `/beden-rehberi`, `/bakim-rehberi`, `/stil-rehberi`, `/hediye-karti` gibi kamusal sayfaları içermemektedir.
   - Kategori sayfalarında (`/[kategori]`, `/[kategori]/[altKategori]`) `BreadcrumbList` JSON-LD bulunmamaktadır. Ana sayfada `Organization` ve `WebSite` yapılandırılmış verisi yoktur.
   - Açık/Twitter Card etiketleri neredeyse tüm sitede eksiktir; Open Graph yalnızca ürün sayfasında kısmi olarak vardır.
3. **Google Merchant Center Feed Açıkları (R4):**
   - `/api/feed/google-merchant` rotası varyantları tek bir üründe toplamakta, Google giyim şartnamesinin zorunlu kıldığı `item_group_id`, `g:size`, varyant bazlı `<item>` hiyerarşisini kurmamaktadır.
   - İndirimli ürünlerde `compareAtPrice` varken `<g:sale_price>` üretilmemekte, yalnızca düz `<g:price>` basılmaktadır.
   - Zorunlu kargo bilgisi (`<g:shipping>`) ve GTIN/MPN/`<g:identifier_exists>no</g:identifier_exists>` alanları hiç üretilmemektedir.
   - Panelden akışı kapatma anahtarı yoktur ve akış kapatıldığında 404 dönme şartı sağlanmamaktadır.
4. **Test Boşluğu:** SEO (sitemap, robots, JSON-LD, metadata) ve Merchant feed için şu an **0 adet otomatik test** bulunmaktadır.

---

## 2. SEO Mimarisi İncelemesi (R3)

### 2.1 Sayfalar Arası Metadata Üretimi (`generateMetadata` & `metadata`)

| Sayfa / Rota | Metadata Türü | Durum | Gözlemlenen Eksikler |
|---|---|---|---|
| `src/app/layout.tsx` | `generateMetadata()` (dinamik) | Kısmi | `settings.seoTitle` ve `settings.seoDescription` döner. `metadataBase` eksik. Varsayılan Open Graph (`siteName`, `type`, `locale`, `images`), Twitter card ve canonical yok. |
| `src/app/(anasayfa)/page.tsx` | Yok | Eksik | Sayfaya özel `generateMetadata` veya `metadata` yok; doğrudan `RootLayout` varsayılanlarına düşüyor. Sayfaya özel canonical, Open Graph ve `WebSite` JSON-LD yok. |
| `src/app/urun/[slug]/page.tsx` | `generateMetadata({ params })` | Kısmi | Canonical URL `https://pandiones.com${productHref(...)}` şeklinde `https://pandiones.com` olarak hardcoded yazılmıştır (`process.env.NEXT_PUBLIC_SITE_URL` veya `metadataBase` kullanmıyor). Open Graph var fakat `type: 'website'` eksik, `siteName` eksik. Twitter Card (`summary_large_image`) yok. Panelden girilecek özel SEO alanları (özel başlık, açıklama, canonical, noindex) henüz modelde ve kodda bağlı değil. |
| `src/app/[kategori]/page.tsx` | `generateMetadata({ params })` | Kısmi | `const SITE = 'https://pandiones.com'` hardcoded. `FIXED_META` nesnesinde statik kopyalar var. Open Graph yok, Twitter Card yok, kategori bazlı özel panel SEO alanları yok. |
| `src/app/[kategori]/[altKategori]/page.tsx` | `generateMetadata({ params })` | Kısmi | `const SITE = 'https://pandiones.com'` hardcoded. Open Graph yok, Twitter Card yok. |
| `src/app/yeni-gelenler/page.tsx` | `export const metadata` (statik) | Kısmi | Canonical `https://pandiones.com/yeni-gelenler` hardcoded. Open Graph yok, Twitter Card yok. |
| `src/app/beden-rehberi/page.tsx` | `export const metadata` (statik) | Kısmi | Sadece title & description var. Canonical, Open Graph, Twitter yok. |
| `src/app/bakim-rehberi/page.tsx` | `export const metadata` (statik) | Kısmi | Sadece title & description var. Canonical, Open Graph, Twitter yok. |
| `src/app/stil-rehberi/page.tsx` | `export const metadata` (statik) | Kısmi | Sadece title & description var. Canonical, Open Graph, Twitter yok. |
| `src/app/yardim/page.tsx` | `export const metadata` (statik) | Kısmi | Sadece title & description var. Canonical, Open Graph, Twitter yok. |
| `src/app/iletisim/page.tsx` | `export const metadata` (statik) | Kısmi | Sadece title & description var. Canonical, Open Graph, Twitter yok. |
| `src/app/hediye-karti/page.tsx` | `export const metadata` (statik) | Kısmi | Sadece title & description var. Canonical, Open Graph, Twitter yok. |

### 2.2 Özel / Gizli Sayfalarda Noindex Durumu

R3 Sözleşmesi: *"Yönetim, hesap, sepet, ödeme ve benzeri özel sayfalar indekslenmemeli."*

| Rota | `robots: { index: false }` Var mı? | Durum |
|---|---|---|
| `/yonetim/giris` (`src/app/yonetim/giris/layout.tsx`) | Evet (`index: false, follow: false`) | Uygun |
| `/yonetim` (`src/app/yonetim/page.tsx` ve alt sayfalar) | **HAYIR** | **İhlal** (Yönetim paneli ana ekranı ve ürün düzenleyici indeksleme koruması taşımıyor) |
| `/sepet` (`src/app/sepet/page.tsx`) | **HAYIR** | **İhlal** |
| `/canta` (`src/app/canta/page.tsx`) | **HAYIR** | **İhlal** |
| `/odeme` (`src/app/odeme/page.tsx`) | **HAYIR** | **İhlal** |
| `/hesabim` (`src/app/hesabim/page.tsx`) | **HAYIR** | **İhlal** |
| `/siparislerim` (`src/app/siparislerim/page.tsx`) | **HAYIR** | **İhlal** |
| `/siparis-takip` (`src/app/siparis-takip/page.tsx`) | **HAYIR** | **İhlal** |
| `/siparis-onay/[id]` (`src/app/siparis-onay/[id]/page.tsx`) | **HAYIR** | **İhlal** |
| `/favorilerim` (`src/app/favorilerim/page.tsx`) | **HAYIR** | **İhlal** |
| `/giris-yap` (`src/app/giris-yap/page.tsx`) | **HAYIR** | **İhlal** |
| `/e-posta-dogrula`, `/sifremi-unuttum`, `/sifre-sifirla` | Evet (`layout.tsx` içinde) | Uygun |
| `/bakim` (`src/app/bakim/page.tsx`) | Evet | Uygun |

### 2.3 `robots.txt` (`src/app/robots.ts`) İncelemesi

Mevcut Kod:
```ts
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/yonetim/', '/api/', '/odeme/', '/siparis-onay/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

Eksikler ve Bulgular:
1. **Statik ve Panelden Bağımsız:** `getStoreSettings()` fonksiyonunu çağırmıyor. R5 gereksinimi: *"sitenin indekslenmesini aç/kapat (robots). `robots.txt` panelden indeksleme kapatıldığında tüm siteyi engeller, açıldığında özel yolları engeller."* Bu özellik henüz kodlanmamış.
2. **Eksik Disallow Listesi:** `/sepet/`, `/canta/`, `/hesabim/`, `/favorilerim/`, `/siparislerim/`, `/siparis-takip/`, `/giris-yap/`, `/sifremi-unuttum/`, `/sifre-sifirla/`, `/e-posta-dogrula/` yolları disallow listesinde yer almamaktadır.

### 2.4 `sitemap.xml` (`src/app/sitemap.ts`) İncelemesi

Mevcut Kod Özeti:
- `PUBLIC_PRODUCT_WHERE` ile yayındaki ürünleri çekiyor (`status: 'PUBLISHED'`, `category: { not: 'hediye-karti' }`).
- `loadCategoryTree()` ile aktif kategorileri ve alt kategorileri ekliyor.
- Statik yollar: `/`, `/yeni-gelenler`, kategori yolları ve `/favorilerim`.

Eksikler ve Bulgular:
1. **Kişisel Sayfa Sızıntısı:** Satır 52'de `{ url: `${baseUrl}/favorilerim`, ... }` eklenmiştir. `/favorilerim` kullanıcıya özel kişisel bir sayfadır ve sitemap'te yer alması hatadır.
2. **Eksik Bilgilendirici Sayfalar:** `/yardim`, `/iletisim`, `/beden-rehberi`, `/bakim-rehberi`, `/stil-rehberi`, `/hediye-karti` sitemap'e dahil edilmemiştir.
3. **Site İndeksleme Kapatıldığında Davranış:** Panelden genel indeksleme kapatıldığında sitemap boş liste veya 404 dönmelidir.
4. **Kategori ve Ürün Bazlı `noindex`:** Ürün ve kategori modellerinde henüz `noindex` alanı olmadığından, ileride eklenince sitemap sorgusunda filtrelenmelidir.
5. **`lastModified` Tarihi:** `Product` modelinde `updatedAt` alanı bulunmamaktadır (yalnızca `createdAt` vardır). Ürün güncellendiğinde sitemap'te `lastModified` yenilenememektedir.

### 2.5 Yapılandırılmış Veri (JSON-LD) İncelemesi

Mevcut Durum: JSON-LD `<script type="application/ld+json">` **yalnızca** `src/app/urun/[slug]/page.tsx` içinde bulunmaktadır. Sitenin başka hiçbir yerinde yoktur.

Ürün Sayfası JSON-LD Analizi:
```ts
// src/app/urun/[slug]/page.tsx:79-98
const jsonLdProduct = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  image: product.image.startsWith('http') ? product.image : `${siteUrl}${product.image}`,
  description: product.description,
  sku: product.id,
  color: product.color,
  brand: {
    '@type': 'Brand',
    name: 'Pandiones',
  },
  offers: {
    '@type': 'Offer',
    url: `${siteUrl}${productHref(product.slug)}`,
    price: product.price,
    priceCurrency: 'TRY',
    availability: 'https://schema.org/InStock', // <-- KRİTİK HATA!
  },
};
```
Bulgular:
1. **Mock / Sabit Stok Bildirimi:** `availability` değeri ürünün veya varyantlarının gerçek stok sayısına bakılmaksızın `'https://schema.org/InStock'` olarak sabit kodlanmıştır. Eğer toplam stok 0 ise veya tüm bedenler tükenmişse bu değer `'https://schema.org/OutOfStock'` olmalıdır. Bu durum AGENTS.md ve R3/R7 kriterlerini ihlal eder.
2. **Varyant / Offer Detayları:** Ürünün beden varyantları (ve varsa SKU / barkodları) `offers` içinde ya varyant listesi ya da `AggregateOffer` (`lowPrice`, `highPrice`, `offerCount`, `offers`) olarak sunulabilir. En azından tekil Offer içinde `availability` dinamik hesaplanmalıdır (`totalStock > 0 ? InStock : OutOfStock`). Ayrıca `itemCondition: 'https://schema.org/NewCondition'`, `priceValidUntil` gibi standart schema alanları eklenebilir.
3. **Kategori Sayfalarında `BreadcrumbList` Eksikliği:** `[kategori]/page.tsx` ve `[kategori]/[altKategori]/page.tsx` içinde hiçbir JSON-LD üretilmemektedir. R3 açıkça *"kategorilerde `BreadcrumbList`... yapılandırılmış verisi"* istemektedir.
4. **Site Geneli `Organization` ve `WebSite` Eksikliği:** Root layout veya ana sayfada `Organization` (isim, url, logo, iletişim, sosyal bağlantılar) ve `WebSite` (isim, url, potansiyel arama kutusu / searchAction) yapılandırılmış verisi bulunmamaktadır.

---

## 3. Google Merchant Center XML Feed İncelemesi (R4)

### 3.1 Mevcut Dosya: `src/app/api/feed/google-merchant/route.ts`

Mevcut akış:
- `PUBLIC_PRODUCT_WHERE` ile yayındaki ürünleri çeker (`status: 'PUBLISHED'`, `category != 'hediye-karti'`).
- Görseli olan her ürün için bir `<item>` oluşturur.
- `<g:id>${product.id}</g:id>`
- `<g:title>`, `<g:description>`, `<g:link>`, `<g:image_link>`, `<g:brand>Pandiones</g:brand>`
- `<g:condition>new</g:condition>`
- `<g:availability>${availability}</g:availability>` (burada `totalStock > 0 ? 'in_stock' : 'out_of_stock'` yapılmış)
- `<g:price>${price}</g:price>`
- `<g:color>${color}</g:color>`
- `<g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Underwear &amp; Socks</g:google_product_category>`

### 3.2 Google Merchant Şartnamesi ve R4 İhtiyaçları Karşılaştırması

| Gereksinim | Mevcut Kod | Google Şartnamesi / R4 Kriteri | Uygunluk |
|---|---|---|---|
| **Varyant Desteği (`item_group_id`)** | Ürün başına tek bir `<item>` üretiliyor; varyantlar birleştiriliyor. | Giyim/ayakkabı kategorilerinde beden/renk varyantları ayrı `<item>` olarak çıkmalı, ana ürün ID'si `<g:item_group_id>` içinde belirtilmelidir. Ayrıca `<g:size>` alanı zorunludur. | **UYUMSUZ** |
| **İndirimli Fiyat (`sale_price`)** | Sadece `<g:price>${product.price.toFixed(2)} TRY</g:price>` basılıyor. | Eğer üründe `compareAtPrice` varsa (`compareAtPrice > price`): `<g:price>` orijinal liste fiyatı (`compareAtPrice`), `<g:sale_price>` ise indirimli satış fiyatı (`price`) olmalıdır. | **UYUMSUZ** |
| **Kargo Bilgisi (`<g:shipping>`)** | Hiç yok. | Türkiye ve hedef ülke için zorunlu veya şiddetle tavsiye edilen alan: `<g:shipping><g:country>TR</g:country><g:service>Standart Kargo</g:service><g:price>X.XX TRY</g:price></g:shipping>`. Ayarlardaki `shippingFee` ve `freeShippingThreshold` ile dinamik hesaplanmalıdır. | **UYUMSUZ** |
| **GTIN & MPN** | Hiç yok. | Varyantta `barcode` (EAN-13) varsa `<g:gtin>`, `sku` varsa `<g:mpn>` eklenmelidir. İkisi de yoksa `<g:identifier_exists>no</g:identifier_exists>` yazılmalıdır; aksi takdirde Google Merchant feed'i reddeder. | **UYUMSUZ** |
| **Google Kategori Eşleştirmesi** | Sabit: `Apparel & Accessories > Clothing > Underwear & Socks` | Ürün `ev-giyim` ise (pijama, sabahlık vb.), `Apparel & Accessories > Clothing > Sleepwear & Loungewear` olmalıdır. | **UYUMSUZ** |
| **Feed Açma/Kapama & 404** | Sürekli 200 XML dönüyor. | R4 kabul kriteri: *"akış kapatıldığında 404 döner (otomatik test)"*. Panelden açılıp kapatılabilmelidir. | **UYUMSUZ** |
| **Ürün Bazında Hariç Tutma** | Veritabanında veya kodda hariç tutma filtresi yok. | R4/R5: Ürün bazında `excludeFromMerchantFeed` veya `googleMerchantExcluded` seçeneği olmalı. | **UYUMSUZ** |
| **Zorunlu Alan Doğrulaması & Raporlama** | Görseli olmayan ürünler sessizce `filter` ile eleniyor. | R4/R5: Zorunlu bilgisi eksik (görsel, açıklama, vb.) ürünler akışa girmemeli ve yönetim panelinde nedeni ("Görsel eksik", "Fiyat geçersiz" vb.) raporlanmalıdır. | **UYUMSUZ** |
| **Marka Alanı** | Sabit `<g:brand>Pandiones</g:brand>` | Mağaza ayarlarındaki `googleMerchantBrand` (varsayılan: Pandiones) değerinden beslenmelidir. | **KISMEN** |
| **XML Geçerliliği & Karakter Kaçırma** | Basit string `replace` yapılmış. | Geçerli XML; ancak varyantlı XML hiyerarşisi oluşturulduğunda CDATA veya sağlam XML escape fonksiyonu kullanılmalıdır. | **İYİLEŞTİRİLMELİ** |

---

## 4. Test Paketi & Marka Uyumu İncelemesi

### 4.1 Mevcut Test Paketi Durumu
- Toplam test sayısı: **282 test** (tamamı `node:test` ve `assert/strict` ile yazılmıştır).
- Test yürütme süresi: ~160 saniye (yerel PostgreSQL ile).
- Sonuç: **282 geçti, 0 başarısız, 0 atlanan**.
- `npx tsc --noEmit`: 0 hata.
- `tests/brand-compliance.test.ts`:
  1. `Brand compliance: src/ contains zero prohibited brand words`: GEÇTİ
  2. `Brand compliance: src/ contains zero artificial marketing / trust badges`: GEÇTİ
  3. `UI integrity: src/ contains zero dead placeholder hrefs (href="#")`: GEÇTİ

### 4.2 Marka Uyumu ve Yasaklı Sözcükler Denetimi
AGENTS.md Kuralları:
- Yasaklı sözcükler: `"atölye" / "atolye" / "atelier", "maison" ve "istanbul" / "İstanbul" / "İSTANBUL"`.
- Pazarlama ve Güven Rozetleri Yasağı: `"Özel Pandiones Kutusu", "Sigortalı Gönderim", "30 Gün Değişim", "BDDK güvencesi", "uçtan uca şifreleme"`.

Regex İncelemesi:
`tests/brand-compliance.test.ts` içindeki kontrol:
`const prohibitedPattern = /\b(atölye|atolye|atelier|maison|istanbul)\b/i;`
JavaScript'te varsayılan regex motorunda `\b` (word boundary) ASCII dışı karakterlerde (özellikle Türkçe `İ`, `ı`, `ö`, `ü`) standart harf olarak algılanmayabilir veya case-folding'te `\bistanbul\b/i` ifadesi `"İstanbul"` (noktalı büyük İ) kelimesini yakalamayabilir.
Testin daha sağlam olması için `(atölye|atolye|atelier|maison|istanbul|İstanbul|İSTANBUL)` açık alternatifleri eklenmeli veya unicode flag (`/u`) ve Türkçe harf varyasyonları kapsanmalıdır.
Bununla birlikte `src/` taramasında Türkçe `İstanbul` veya varyasyonlarına rastlanmamıştır; mevcut kod temizdir.

### 4.3 R1 - R7 Kabul Kriterleri Karşısında Test Boşlukları (Test Gaps Matrix)

| Kabul Kriteri | Mevcut Test Kapsamı | Eksik Olan Testler |
|---|---|---|
| **R3.1: Sitemap yayındaki ürün ve kategorileri içerir** | **YOK (0 test)** | `sitemap.ts` çağrısı yapıp dönen XML/nesnede yalnızca `PUBLISHED` ürünlerin olduğunu, taslakların olmadığını, aktif kategorilerin olduğunu ve `/favorilerim` gibi kişisel yolların OLMADIĞINI doğrulayan test yazılmalıdır. |
| **R3.2: Robots.txt dinamik engelleme** | **YOK (0 test)** | Panelden indeksleme kapatıldığında `disallow: '/'` döndüğünü; açıkken özel yolları (`/yonetim/`, `/sepet/`, `/canta/`, `/odeme/`, `/hesabim/` vb.) engellediğini doğrulayan test. |
| **R3.3: Ürün sayfası JSON-LD Product + Offer** | **YOK (0 test)** | Ürün sayfasının HTML veya bileşen çıktısında JSON-LD doğrulaması: `Product` ve `Offer` alanlarının DB fiyatı ve DB stok durumuyla (`availability: InStock` vs `OutOfStock`) birebir eşleştiğini test eden otomatik test. |
| **R3.4: Kategori sayfası JSON-LD BreadcrumbList** | **YOK (0 test)** | Kategori ve alt kategori sayfalarında hiyerarşik `BreadcrumbList` JSON-LD bulunduğunu test eden otomatik test. |
| **R4.1: Merchant XML geçerli XML ve zorunlu alanlar** | **YOK (0 test)** | `/api/feed/google-merchant` rotasına istek atıp dönen XML'in parse edilebilir olduğunu, `id`, `title`, `description`, `link`, `image_link`, `availability`, `price`, `brand`, `shipping`, `item_group_id` alanlarını içerdiğini doğrulayan test. |
| **R4.2: Merchant Feed indirimli fiyat (`sale_price`)** | **YOK (0 test)** | `compareAtPrice` bulunan bir üründe `<g:price>`'ın liste fiyatı, `<g:sale_price>`'ın satış fiyatı olduğunu doğrulayan test. |
| **R4.3: Merchant Feed kapalıyken 404 dönmesi** | **YOK (0 test)** | Ayarlardan `googleMerchantEnabled: false` yapıldığında `/api/feed/google-merchant` rotasının HTTP 404 döndüğünü test eden otomatik test. |
| **R4.4: Merchant Feed taslak ve hariç tutulan ürünleri içermez** | **YOK (0 test)** | `DRAFT` olan veya `excludeFromMerchantFeed: true` olan ürünlerin feed XML'inde yer almadığını doğrulayan test. |
| **R5.1: Panelde girilen SEO meta verilerinin sayfaya yansıması** | **Kısmi (sadece save test edilmiş)** | Panelden kaydedilen `seoTitle`, `seoDescription` ve sayfa bazlı SEO alanlarının vitrin sayfaları HTML çıktısında (`<title>`, `<meta name="description">`) göründüğünü test eden uçtan uca / entegrasyon testi. |
| **R5.2: Önbellek temizleme API ve vitrin yenileme** | **YOK (0 test)** | `/api/admin/cache/purge` (veya ilgili rota) çağrısının ADMIN yetkisi istediğini, vitrindeki katalog önbelleğini temizlediğini doğrulayan test. |
| **R5.3: Yeni Yönetim API Güvenliği (Auth & Rate Limit)** | **YOK (yeni API'ler henüz yok)** | Önbellek temizleme, Merchant sağlık raporu ve SEO ayar API'lerinin oturumsuz/müşteri isteklerini 403 ile reddettiğini doğrulayan test. |

---

## 5. Yönetim Paneli (R5) ve Veritabanı Şeması İhtiyaçları

R5 maddesinde yer alan ve veritabanı / panel düzeyinde yapılması gereken geliştirmelerin analizi:

### 5.1 `StoreSettings` Modeli Genişletme İhtiyacı
`prisma/schema.prisma` içindeki `StoreSettings` ve `src/lib/settings/shared.ts` şu yeni alanları gerektirmektedir:
- `robotsIndexingEnabled`: `Boolean` (varsayılan: `true` — sitenin indekslenmesini aç/kapat)
- `defaultOgImage`: `String?` (varsayılan sosyal medya paylaşım görseli)
- `googleMerchantEnabled`: `Boolean` (varsayılan: `true` — Merchant akışı aç/kapat)
- `googleMerchantBrand`: `String?` (varsayılan: `null` -> 'Pandiones')
- `googleSearchConsoleVerification`: `String?` (GSC meta doğrulama kodu)
- `googleMerchantVerification`: `String?` (Merchant doğrulama kodu)
- `ga4MeasurementId`: `String?` (Google Analytics 4 ölçüm kimliği, ör. `G-XXXXXXXXXX`)

### 5.2 `Product` ve `Category` Modelleri Genişletme İhtiyacı
Sayfa / kategori / ürün bazında SEO ve Feed kontrolü için:
- **`Product`:**
  - `seoTitle`: `String?`
  - `seoDescription`: `String?`
  - `canonicalUrl`: `String?`
  - `noindex`: `Boolean` (`@default(false)`)
  - `excludeFromMerchantFeed`: `Boolean` (`@default(false)`)
- **`Category`:**
  - `seoTitle`: `String?`
  - `seoDescription`: `String?`
  - `canonicalUrl`: `String?`
  - `noindex`: `Boolean` (`@default(false)`)

### 5.3 Yönetim Paneli Yeni API ve Sekme Fonksiyonları
1. **`/api/admin/cache/purge`:**
   - Görev: `revalidateTag('catalog')`, `revalidateTag('store-settings')`, `revalidatePath('/', 'layout')` işlemlerini ADMIN oturumu ve CSRF koruması altında yürütür.
   - Dönen yanıt: `{ success: true, timestamp: string, purgedTags: string[] }`.
2. **`/api/admin/seo/health` (Sağlık Raporu):**
   - Eksik meta başlığı/açıklaması olan ürün ve kategoriler.
   - Eksik görsel alt metni (`alt === ''` veya boş) olan medya kayıtları.
   - Google Merchant feed'ine giremeyen ürünler (görseli eksik, açıklaması boş, barkodu geçersiz veya hariç tutulmuş) ve listesi/nedenleri.
3. **`SettingsTab.tsx` Geliştirmesi:**
   - SEO Bölümü: Genel robots indeksleme anahtarı (Açık/Kapalı), GSC ve GA4 doğrulama alanları.
   - Google Merchant Bölümü: Akış aç/kapat, marka adı, akış linki (`/api/feed/google-merchant`), son durum ve kargo ücreti özeti.
   - Önbellek Bölümü: "Vitrini Yenile / Önbelleği Temizle" eylem butonu.

---

## 6. Eyleme Dönüştürülebilir Yol Haritası (Actionable Implementation Plan)

Bu incelemenin bulgularına dayanarak inşaat (builder) ve test ajanları için önerilen fazlar:

### Faz 1: Veritabanı ve Ayarlar Altyapısı
1. `prisma/schema.prisma` içine `StoreSettings` (robotsIndexingEnabled, googleMerchantEnabled vb.) ve `Product`/`Category` SEO & Feed alanlarını ekleme; migration hazırlama.
2. `src/lib/settings/shared.ts` ve `src/lib/settings/server.ts` içinde yeni alanların doğrulamalarını (`validateSettings`) ve varsayılanlarını tanımlama.
3. `src/app/api/admin/settings/route.ts` içinde alanların kaydedilmesi ve audit log entegrasyonu.

### Faz 2: SEO ve Yapılandırılmış Veri İyileştirmeleri (R3)
1. `src/app/layout.tsx`: `metadataBase` tanımlama, genel Open Graph ve Twitter kartı ekleme, `Organization` ve `WebSite` JSON-LD enjeksiyonu; GA4/GSC doğrulama etiketleri (varsa).
2. `src/app/urun/[slug]/page.tsx`:
   - Sabit `'https://schema.org/InStock'` hatasını dinamik stok kontrolüyle düzeltme (`totalStock > 0 ? InStock : OutOfStock`).
   - Canonical URL'i dinamik `siteUrl` ve ürünün `canonicalUrl` alanına bağlama.
   - Twitter Cards ve Open Graph zenginleştirme.
3. `src/app/[kategori]/page.tsx` ve `[kategori]/[altKategori]/page.tsx`:
   - `BreadcrumbList` JSON-LD ekleme.
   - Hardcoded site URL'i kaldırma; Open Graph & Twitter etiketleri ekleme.
4. `src/app/robots.ts`: `readStoreSettings()` ile dinamik robots kuralı oluşturma (`robotsIndexingEnabled === false` ise `disallow: '/'`, açık ise tüm özel yolları kapatma).
5. `src/app/sitemap.ts`: `/favorilerim`'i çıkarma, rehber ve kamusal sayfaları ekleme, noindex kontrolü.
6. Özel sayfaların tamamına (`/sepet`, `/canta`, `/odeme`, `/hesabim`, `/siparislerim`, `/yonetim` vb.) `robots: { index: false, follow: false }` ekleme.

### Faz 3: Google Merchant Center Feed Revizyonu (R4)
1. `src/app/api/feed/google-merchant/route.ts`:
   - `googleMerchantEnabled` kapalıysa 404 dönme.
   - Varyant hiyerarşisi oluşturma: Her beden/varyant için ayrı `<item>`, ana ürün ID'si için `<g:item_group_id>`, `<g:size>`, `<g:availability>`.
   - İndirimli ürünler için `<g:price>` (eski liste fiyatı) ve `<g:sale_price>` (gerçek satış fiyatı).
   - `<g:shipping>` blokları (ülke: TR, kargo ücreti dinamik).
   - Barkod varsa `<g:gtin>`, SKU varsa `<g:mpn>`, yoksa `<g:identifier_exists>no</g:identifier_exists>`.
   - Kategoriye göre `google_product_category` (iç giyim vs ev giyim ayrımı).
   - Hariç tutulan (`excludeFromMerchantFeed`) ve taslak ürünleri filtreleme.

### Faz 4: Yönetim Paneli Entegrasyonu (R5)
1. `/api/admin/cache/purge` rotası oluşturma ve `SettingsTab.tsx` içine buton ekleme.
2. `/api/admin/seo/health` rotası oluşturma ve sağlık raporunu gösterme.
3. `SettingsTab.tsx` içine SEO, Google Merchant ve Doğrulama bölümlerini ekleme.
4. Ürün düzenleyicide (`ProductEditor.tsx`) SEO & Feed alanları için sekme/bölüm ekleme.

### Faz 5: Otomatik Test Paketi Geliştirmesi
1. `tests/seo-metadata.test.ts`: Robots.txt dinamik davranışı, sitemap.xml içeriği ve filtreleri, `BreadcrumbList` ve `Product` JSON-LD stok doğruluğu.
2. `tests/google-merchant-feed.test.ts`: XML şeması, varyant ve `item_group_id` doğrulaması, indirimli fiyat (`sale_price`), shipping etiketi, kapalıyken 404 dönmesi.
3. `tests/admin-cache-purge.test.ts`: Cache purge API yetkilendirme ve önbellek temizleme doğrulaması.
4. `tests/brand-compliance.test.ts`: Regex'in Türkçe karakter varyasyonlarını (`İstanbul`, `İSTANBUL`) güvenceye alacak şekilde güncellenmesi.
