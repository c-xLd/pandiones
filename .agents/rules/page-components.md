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
`app/[sayfa_adi]/page.tsx` dosyaları minimum düzeyde JSX içermelidir. Sayfanın iş mantığı ve ana HTML yapısı alt bileşenlere bölünmelidir. Sayfa dosyası sadece bu bileşenleri alt alta çağıran bir "Layout" (Kalıp) vazifesi görmelidir.

## 2. Bileşenler Ait Oldukları Sayfaya Göre Klasörlenir
Her sayfanın parçaları doğrudan `components/[sayfa_adi]/` klasörü altında toplanmalıdır.

Örneğin, Ana Sayfa (`/`) için yazılan alanlar:
- `components/home/hero.tsx`
- `components/home/comfort-switch.tsx`
- `components/home/mood.tsx`
- `components/home/portal.tsx`
- `components/home/worlds.tsx`
- `components/home/manifesto.tsx`

Ürün Detay Sayfası (`/urun/[slug]`) için yazılan alanlar:
- `components/urun/product-details.tsx`
- `components/urun/product-values.tsx`
- `components/urun/related-products.tsx`

Arama Sayfası (`/arama`):
- `components/arama/search-form.tsx`
- `components/arama/search-results.tsx`
- `components/arama/search-suggestions.tsx`

Sepet Sayfası (`/sepet`):
- `components/sepet/cart-intro.tsx`
- `components/sepet/cart-content.tsx`

## 3. Ortak Bileşenler (Shared Components)
Eğer bir bileşen *birden fazla* sayfada kullanılıyorsa, o bileşen doğrudan `components/` kök dizinine (veya yapısal bir buton/input ise `components/ui/` dizinine) yerleştirilir. (Örn: `site-header.tsx`, `site-footer.tsx`, `product-card.tsx`).

## 4. İsimlendirme Standardı
- Dosya adlarında gereksiz `-section` veya `-content` ekleri kullanılmaz; doğrudan içeriğin yalın adı verilir (Örn: `hero.tsx`, `product-details.tsx`, `cart-intro.tsx`).
- React bileşen adları PascalCase olmalıdır (`Hero`, `ProductDetails`, `CartIntro`).
- Dosya adları kebab-case olmalıdır (`hero.tsx`, `product-details.tsx`).
