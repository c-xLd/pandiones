---
description: Pandiones SEO ve Arama Motoru Optimizasyonu Standartları
globs:
  - "app/**/*.tsx"
  - "components/**/*.tsx"
  - "lib/**/*.ts"
---

# Pandiones SEO Mükemmeliyet Standartları (SEO Excellence)

Bu kurallar Pandiones e-ticaret platformunda arama motoru görünürlüğünü, indekslenme hızını, zengin snippet (rich results) kalitesini ve organik sıralamaları en üst düzeye çıkarmak için zorunludur.

---

## 1. Temiz ve Üst Seviye URL Standartları
- **Doğrudan Kök Ürün URL'leri:** Ürün sayfaları alt dizinler olmadan doğrudan kök dizinde barındırılır (Örn: `/fitilli-v-yaka-crop-bustiyer`, `/simli-destekli-bustiyer-takim`).
- **Kategori Rotaları:** Kategoriler `/koleksiyon/kategori/...` yerine doğrudan yalın adrese sahip olmalıdır (Örn: `/ic-giyim`, `/crop-bustiyer`, `/gecelik`).
- **308 Kalıcı Yönlendirme:** Eski veya alt dizinli rota yapıları varsa daima `308 Permanent Redirect` ile yeni temiz rotaya yönlendirilir.

---

## 2. Meta Veri ve Sosyal Paylaşım (Metadata & OpenGraph)
Her sayfa (`page.tsx`) eksiksiz ve benzersiz bir `Metadata` veya `generateMetadata` fonksiyonu barındırmalıdır:
- **Title Formatı:** `[Sayfa / Ürün Adı] | Pandiones` veya `Pandiones — [Açıklayıcı Başlık]`.
- **Description:** 120-155 karakter arası, anahtar kelime zengini ve doğrudan kullanıcıyı harekete geçiren net Türkçe açıklama.
- **Kanonik URL (Canonical):** Her sayfada mutlaka `alternates: { canonical: '[sayfa_adresi]' }` tanımlanır.
- **OpenGraph & Twitter Card:**
  - `openGraph: { title, description, url, images: [{ url, width, height, alt }] }`
  - `twitter: { card: 'summary_large_image', title, description, images }`

---

## 3. Yapılandırılmış Veri (JSON-LD Structured Data)
Google ve diğer arama motorlarının ürünleri, fiyatları, stok durumunu ve marka bilgisini zengin sonuç olarak tanıması için:
- **Product Schema:** Her ürün sayfasında `@type: "Product"`, `name`, `image`, `description`, `sku`, `brand: { "@type": "Brand", name: "Pandiones" }` ve `offers: { "@type": "Offer", priceCurrency: "TRY", price, availability: "InStock" }` şeması yer alır.
- **BreadcrumbList Schema:** Kategori ve koleksiyon sayfalarında gezinme yolu şeması eklenir.
- **Organization / WebSite Schema:** Ana sayfada kurumsal marka ve site içi arama şeması yer alır.

---

## 4. Semantik HTML ve Başlık Hiyerarşisi
- **Tek `<h1>` Kuralı:** Her sayfada yalnızca 1 adet `<h1>` etiketi bulunur ve sayfanın ana odağını temsil eder.
- **Sıralı Başlıklar:** `<h2>`, `<h3>` başlık seviyeleri atlanmadan hiyerarşik sırada kullanılır (`<h1>` altına doğrudan `<h4>` gelmez).
- **Semantik Landmark Etiketleri:** `header`, `nav`, `main`, `section`, `article`, `aside`, `footer` doğru anlamlarıyla kullanılır; anlamsız `<div>` yığınlarından kaçınılır.
- **Görsel Alt Metinleri:** Bütün `<img>` ve görsel etiketlerinde boş olmayan, ürün rengi, formu ve modelini tanımlayan erişilebilir `alt` açıklamaları yer alır.

---

## 5. Dil ve Bölgesel Ayarlar
- Kök layout (`app/layout.tsx`) daima `<html lang="tr">` içermelidir.
- Fiyatlar ve para birimleri Türk Lirası (`TRY`, `₺`) ve `Intl.NumberFormat('tr-TR', ...)` standartlarına uygun formatlanır.
