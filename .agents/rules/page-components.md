---
description: Kurallar ve mimari standartlar; her sayfanın kendi components klasörüne sahip olması.
globs:
  - "app/**/*.tsx"
  - "components/**/*.tsx"
---

# Sayfa Bazlı Bileşen Mimarisi (Page-Component Architecture)

Bu projede kodun okunabilirliğini, yönetilebilirliğini ve düzenleme kolaylığını artırmak için sayfalar tek bir devasa dosya yerine parçalara bölünerek tasarlanır. 

Eğer yeni bir sayfa ekliyor veya var olan bir sayfayı düzenliyorsanız, aşağıdaki kurallara **kesinlikle** uyun:

## 1. Sayfa Dosyaları (app/...) Sadece Kalıp Görevi Görür
`app/[sayfa_adi]/page.tsx` dosyaları minimum düzeyde JSX içermelidir. Sayfanın iş mantığı ve ana HTML yapısı alt bileşenlere (sections) bölünmelidir. Sayfa dosyası sadece bu bileşenleri alt alta çağıran bir "Layout" (Kalıp) vazifesi görmelidir.

**Örnek (KÖTÜ):**
`app/iletisim/page.tsx` içinde doğrudan tüm HTML formlarını ve metinleri yazmak.

**Örnek (İYİ):**
`app/iletisim/page.tsx` içinde `<ContactFormSection />` ve `<ContactInfoSection />` bileşenlerini çağırmak.

## 2. Bileşenler Ait Oldukları Sayfaya Göre Klasörlenir
Her sayfanın parçaları `components/[sayfa_adi]/` klasörü altında toplanmalıdır.

Örneğin, Ana Sayfa (`/`) için yazılan özel bir alan şu dizinde yer almalıdır:
`components/home/hero-section.tsx`

Ürün Detay Sayfası (`/urun/[slug]`) için yazılan bir alan:
`components/urun/product-details.tsx`

## 3. Ortak Bileşenler (Shared Components)
Eğer bir bileşen *birden fazla* sayfada kullanılıyorsa, o bileşen doğrudan `components/` kök dizinine (veya yapısal bir buton/input ise `components/ui/` dizinine) yerleştirilir. (Örn: `site-header.tsx`, `site-footer.tsx`, `product-card.tsx`).

## 4. İsimlendirme Standardı
- Bölüm (Section) bileşenleri her zaman `-section.tsx` ile bitmelidir (Örn: `cart-intro-section.tsx`).
- React bileşen adları her zaman PascalCase olmalıdır (`CartIntroSection`).
- Dosya adları her zaman kebab-case olmalıdır (`cart-intro-section.tsx`).
