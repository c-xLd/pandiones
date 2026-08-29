---
description: Pandiones PageSpeed, Core Web Vitals ve Performans Kuralları
globs:
  - "app/**/*.tsx"
  - "components/**/*.tsx"
  - "next.config.ts"
  - "app/globals.css"
---

# Pandiones PageSpeed & Core Web Vitals Standartları

Bu kurallar, platformun Google PageSpeed Insights ve Lighthouse testlerinde **95-100/100** performans skoruna ulaşması, 0ms algılanan sayfa geçişleri ve kusursuz Core Web Vitals (LCP, INP, CLS, TTFB) değerleri sunması için belirlenmiştir.

---

## 1. Largest Contentful Paint (LCP < 1.2s)
- **Kat Üstü (Above-the-Fold) Görseller:**
  - Hero ve ilk ekranda görünen ana ürün görsellerine mutlaka `loading="eager"` ve `decoding="async"` verilir.
  - Asla ilk ekrandaki ana görsellere `loading="lazy"` verilmez.
- **Modern Görsel Formatları:** AVIF ve WebP formatları tercih edilir (`next.config.ts` format desteği).
- **Yazı Tipi Yüklemesi:** Özel `@font-face` tanımlarında daima `font-display: swap;` kullanılır.

---

## 2. Sayfa Geçişleri ve İstemci Navigasyonu (0ms SPA Routing)
- **Yasak:** Standart `<a href="...">` etiketleri kesinlikle dahili rotalarda kullanılmaz.
- **Zorunlu:** Bütün dahili sayfa ve ürün geçişleri Next.js **`<Link prefetch={true}>`** ile gerçekleştirilir.
- **Arka Plan Ön Yükleme:** Linkler görünüm alanına girdiği veya fare üzerine geldiği anda hedef sayfa arka planda önceden indirilir ve tıklama anında geçiş anlık gerçekleşir.

---

## 3. Cumulative Layout Shift (CLS = 0)
- **Ayrılmış Görsel Alanları:** Tüm görseller, kartlar ve medya blokları için CSS veya kapsayıcı düzeyinde `aspect-ratio` veya sabit boyut ayrılır. Görsel yüklenirken sayfa içeriğini aşağı itmemelidir.
- **Dinamik İçerik:** Banner, uyarı veya toast bildirimleri sayfa akışını zıplatmayacak şekilde `position: fixed` veya `position: absolute` ile konumlandırılır.

---

## 4. Interaction to Next Paint (INP < 100ms)
- **Gecikmesiz Girdi Yanıtı:** Buton tıklamaları, filtre seçimleri ve modal açılışları anında görsel geri bildirim (optimistic state / active class) verir.
- **Ağır Hesaplamalar:** Filtreleme ve sıralama işlemleri React'in `useMemo` ve `useCallback` kancalarıyla sarmalanır; gereksiz render döngüleri önlenir.

---

## 5. Bundle Boyutu ve Tree-Shaking Optimizasyonu
- **Optimize Paket İçe Aktarma:** `next.config.ts` içinde `optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge', '@radix-ui/react-slot']` tanımlı olmalıdır.
- **Gzip/Brotli Sıkıştırma:** Sunucu düzeyinde `compress: true` daima aktif tutulur.
- **Gereksiz Kütüphaneler:** Büyük boyutlu harici animasyon veya UI kütüphaneleri eklenmez; saf CSS ve Tailwind CSS v4 geçişleri tercih edilir.

---

## 6. Önbellekleme (Agresif Caching)
- Statik yazı tipleri (`/fonts/*`): `Cache-Control: public, max-age=31536000, immutable`
- Ürün görselleri ve statik medya: `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`
