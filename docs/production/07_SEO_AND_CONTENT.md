# 07 — SEO ve İçerik Sistemi

## İlke

SEO ayrı bir metin alanı değil; katalog, navigasyon, performans, yapılandırılmış veri ve gerçek kullanıcı içeriğinin birlikte doğru çalışmasıdır. Arama motoruna sunulan ad, fiyat, stok, görsel ve politika ekranda görülen gerçek D1 verisiyle aynı olmalıdır.

## Teknik SEO

- Her indekslenebilir route server-rendered, benzersiz `<title>`, meta description, tek H1 ve self-canonical üretir.
- `html lang="tr"`; Türkçe karakterli görünen metin, sade ve kalıcı slug. Slug değişiminde eski URL’den tek adım 301 redirect.
- Public navigasyon gerçek `<a href>` ile ana sayfa → kategori → alt kategori → ürün zinciri kurar. Yalnızca arama kutusuyla erişilen ürün bırakılmaz.
- `sitemap.xml` yalnızca yayımlanmış canonical ürün, kategori, koleksiyon ve uygun içerikleri; gerçek `lastmod` ile içerir. Cart/checkout/account/admin/search/draft dahil edilmez.
- `robots.txt` sitemap’i belirtir. Hassas route güvenliği robots’a bırakılmaz; auth gerekir. `noindex` ayrıca metadata/header ile uygulanır.
- 404 gerçekten `404`, kaldırılmış ve geri gelmeyecek ürün gerekirse `410`; benzer ürün varsa editoryal olarak uygun 301. Her şeyi ana sayfaya yönlendirmek yok.
- Pagination ve facet URL’leri için kontrollü parametre allowlist. Sonsuz kombinasyonların crawl bütçesini tüketmesi önlenir; canonical filtresiz kategoriye veya ürün değeri olan seçili landing sayfasına göre açık politika.
- Site içi arama ve kullanıcıya özel sayfalar `noindex`.

## Sayfa metadata şablonları

- Ana sayfa: `Pandiones | Kadın İç Giyim ve Gece Giyim` gibi hukuk/marka onaylı title; marka açıklaması.
- Kategori: `{Kategori Adı} | Pandiones`; özgün kategori tanıtımı, stokta gerçek ürünler.
- Ürün: `{Ürün Adı} | Pandiones`; kısa özgün description, ancak fiyat gibi hızlı değişen bilgi meta description’a zorunlu gömülmez.
- Koleksiyon/içerik: editörün benzersiz title/description girmesi; kopya veya boş değer publish kontrolüne takılır.
- OG/Twitter görseli gerçek medya; mutlak production URL, doğru ölçü ve alt.

## Yapılandırılmış veri

JSON-LD ilk HTML’de, server-side ve D1 verisinden üretilir.

- Tüm site: `Organization` (onaylı ticari/iletişim/logo/return policy), `WebSite` ve destekleniyorsa gerçek arama hedefi.
- Hiyerarşik sayfalar: `BreadcrumbList`.
- Ürün: satın alınabilir mağaza için `Product`/ürün varyantı ihtiyacına göre `ProductGroup`, brand, SKU/GTIN varsa gerçek değer, images, description ve `Offer`.
- Offer: `price`, `priceCurrency=TRY`, canonical URL, gerçek availability, yeni ürün condition, fiyat geçerlilik tarihi yalnızca gerçekten yönetiliyorsa.
- Shipping/return policy markup gerçek admin politikasından ve visible content’ten gelir.
- Review/aggregateRating yalnızca doğrulanmış gerçek yorum sistemi ve gösterilen yorumlar varsa eklenir; başlangıçta yoktur.
- Sahte SKU/GTIN/rating/review, her varyantı ayrı ürün gibi çoğaltma veya category grid’e tek ürün markup’ı ekleme yok.

Google Rich Results Test, Schema.org validator ve Search Console hataları launch/test sürecine girer.

## Ürün varyantı ve URL

- Canonical ana ürün URL’sidir; beden/renk seçimi erişilebilir UI state veya doğrulanmış query ile yapılır.
- Google’ın varyant yönergeleri implementasyon anında tekrar incelenir. Varyantların ayrı URL ile indekslenmesi yalnızca özgün medya/içerik ve kalıcı stok/fiyat değeri varsa bilinçli karar olur.
- Structured data içindeki availability seçilen veya ana satılabilir teklif ile deterministik olmalı; ekranda “stokta” görünen ürün JSON-LD’de `OutOfStock` olamaz.

## İçerik modeli ve Türkçe metin

- Ürün adı açıklayıcı: ürün tipi + belirgin model/nitelik; anahtar kelime doldurma yok.
- Kısa açıklama ürün kartı/üst bölüm; detay açıklama kalıp, materyal, kullanım, bakım ve gerçek özellikler.
- Beden tablosu marka ölçüleriyle yönetilir; uydurma standart ölçü yok.
- Kategori metni kullanıcı niyetini yanıtlar, her kategoride özgündür.
- İç giyim metinlerinde saygılı, güven veren ve kapsayıcı dil; garanti edilemeyen sağlık/beden iddiaları yok.
- Ürün görseli alt metni görünür ürünü, renk/modeli tarif eder; “görsel” veya anahtar kelime listesi değildir. Dekoratif sahne `alt=""`.
- Yasal/teslimat/iade metinleri pazarlama kopyasından ayrı sürümlenir.

## Görsel SEO ve performans

- R2 medya için kalıcı, HTTPS ve crawl edilebilir URL; robots ile engellenmez.
- Responsive image, genişlik/yükseklik, doğru `sizes`, modern format; orijinal dikey oran korunur.
- LCP hero/ürün görseli öncelikli; geri kalan lazy. Ürün görseli canvas içinde tek kopya olarak hapsedilmez.
- Dosya adı yardımcı olabilir fakat alt/metin ve sayfa bağlamının yerini tutmaz.
- Image sitemap yalnızca ihtiyaç/ölçek doğrulandığında.

## Core Web Vitals bütçesi

75. persentil gerçek kullanıcı hedefi: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. İlk JS ve medya bütçesi ölçülerek belirlenir; WebGL ana CTA/LCP’yi bloke ederse poster fallback zorunludur.

- Font self-hosted, gerekli weight’ler, preload yalnızca kritik dosya; `font-display` stratejisi CLS/FOIT test edilir.
- Montserrat Alt1 logo/marka kullanımıyla sınırlanır; gövde okunabilir sistem/marka fontu.
- Üçüncü taraf analytics/marketing scriptleri rıza ve performans bütçesi sonrası yüklenir.

## Merchant Center ve ölçüm

- Product feed ayrı fazdır; DB ile structured data arasında fiyat/stok tutarlılığı kontrol edilir.
- Search Console site doğrulama, sitemap gönderimi, indeks ve merchant listing raporları izlenir.
- Analytics yalnızca onaylı, veri minimizasyonlu ve consent durumuna uygun eventleri toplar. Arama sorgusu, e-posta, telefon, adres, order token veya PayTR token analytics’e gönderilmez.
- Ölçülebilir eventler: view_item_list, select_item, view_item, add_to_cart, begin_checkout, purchase. `purchase` yalnızca doğrulanmış başarılı ödeme sonrası server/outbox veya güvenli client state ile bir kez.

## Yayın kontrolü

- Canonical/redirect loop yok; sitemap URL’leri 200 ve indexable.
- Her ürün route’u navigasyon veya sitemap’ten erişilebilir.
- Metadata ve JSON-LD SSR HTML’de; görünür gerçek veriyle eşleşiyor.
- OG URL/görselleri absolute ve 200.
- Mobile rendering, JS kapalı temel içerik ve reduced-motion fallback anlamlı.
- Staging `noindex`; production yanlışlıkla noindex değil.

## Resmî kaynaklar

- [Google: e-ticarette yapılandırılmış veri](https://developers.google.com/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce)
- [Google: Product yapılandırılmış verisi](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google: e-ticaret navigasyon yapısı](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure)
- [Google: e-ticaret sitesi yayına alma](https://developers.google.com/search/docs/specialty/ecommerce/how-to-launch-an-ecommerce-website)

