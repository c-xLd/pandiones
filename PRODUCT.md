# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pandiones, premium kadın giyim ve iç giyim ürünlerini keşfetmek ve satın almak isteyen müşterilere hizmet eder. Kullanıcılar ürünün rengini, dokusunu, kesimini ve oranlarını güvenilir biçimde değerlendirmek; koleksiyonlar arasında gezinmek; varyasyon ve beden seçmek; favorilerini ve sepetini yönetmek; satın alma akışını tamamlamak ister.

## Product Purpose

Pandiones, kadın giyim ve iç giyim ürünleri satan premium bir moda e-ticaret markasıdır. Ürünün merkezde olduğu, editoryal ve görsel odaklı bir alışveriş deneyimiyle güçlü ve kendine özgü bir marka algısı oluşturmayı amaçlar. Başarı; sinematik marka anlatısının hızlı, anlaşılır ve gerçek bir alışveriş deneyimiyle birleşmesi; müşterinin ürünü güvenle keşfedip satın alabilmesi demektir.

## Positioning

Pandiones, Zara veya Nike gibi markaları ya da hazır moda mağazası kalıplarını kopyalamadan aynı seviyede güçlü marka algısı hedefler. Ayrıştırıcı yaklaşımı; büyük moda fotoğraflarını, güçlü tipografiyi, kontrollü boşlukları ve performanslı sinematik geçişleri gerçek ve işlevsel ürün keşfi ile birleştiren özgün bir dijital moda dünyasıdır.

## Operating Context

- Ana müşteri yolculuğu koleksiyon ve ürün keşfi, ürün ayrıntılarını inceleme, varyasyon ve beden seçimi, favorilere ekleme, sepet yönetimi ve satın alma adımlarından oluşur.
- Masaüstü deneyimi editoryal ve deneyimsel olabilir; mobil deneyim hızlı, alışveriş odaklı ve uygulama benzeri olmalıdır.
- Ürün görselleri karar vermenin ana kanıtıdır ve tasarımın merkezinde yer alır.

## Capabilities and Constraints

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion ve Supabase hedef teknoloji bileşimidir.
- Mevcut işlevler, gerçek ürün verileri, SEO yapısı ve marka içerikleri korunmalıdır.
- Ürün keşfi, koleksiyonlar, varyasyon seçimi, beden seçimi, favoriler, sepet ve satın alma akışı gerçek ve fonksiyonel olmalıdır.
- Mock veri, işlevsiz buton ve sahte bağlantı kullanılmamalıdır.
- Ürün fotoğrafları kıyafetin rengini, dokusunu, kesimini veya oranlarını değiştirecek biçimde işlenmemelidir.
- Sinematik hareket marka anlatısını desteklemeli, performansı veya alışveriş kullanılabilirliğini zayıflatmamalıdır.

## Brand Commitments

- Marka adı: Pandiones.
- Marka karakteri premium, kendine özgü, editoryal, görsel odaklı ve moda merkezlidir.
- Sıradan e-ticaret şablonlarından, gereksiz kartlardan, mor yapay zekâ gradyanlarından, aşırı yuvarlatılmış kutulardan ve kurumsal SaaS görünümünden kaçınılır.
- Büyük moda fotoğrafları, güçlü tipografi ve kontrollü boşluklar temel marka anlatım araçlarıdır.
- Zara, Nike, Motion Sites ve Get Layers yalnızca kalite seviyesi referansıdır; marka, düzen veya görsel dil kopyalanmaz.

## Evidence on Hand

- Mevcut görsel ve deneyim kararları: `DESIGN_SYSTEM.md`.
- Ayrıntılı ürün ve üretim gerçekleri: `docs/production/`.
- Mevcut ana sayfa uygulaması: `app/page.tsx` ve `components/home/`.
- Mevcut marka ve ürün varlıkları: `public/`, özellikle `public/products/`.
- Katalog ve gerçek veri entegrasyonu: `lib/catalog.ts`, Supabase istemci/sunucu katmanları ve mevcut mağaza rotaları.
- Doğrulanmamış ürün, fiyat, stok, müşteri kanıtı veya ticari iddia gelecek tasarım çalışmalarında uydurulmamalıdır.

## Product Principles

1. Ürün görseli ve ürün gerçeği her tasarım kararının merkezinde kalır.
2. Marka etkisi kopyayla değil, Pandiones'a özgü editoryal bir dünya ve tutarlı uygulama kalitesiyle kurulur.
3. Deneyimsel anlatı keşfi zenginleştirir; satın alma yolunu asla gizlemez veya yavaşlatmaz.
4. Görünen her etkileşim gerçek, erişilebilir ve işlevsel olmalıdır.
5. Masaüstü ve mobil aynı markayı taşır fakat her cihazın kullanım bağlamına göre ayrı biçimde kurgulanır.

## Accessibility & Inclusion

Arayüz klavye ile kullanılabilir, semantik, yeterli kontrasta sahip ve en az 320 px genişlikten başlayarak erişilebilir olmalıdır. Kritik kontroller yalnızca hover'a bağlı kalmamalı; ürün görselleri anlamlı alternatif metinlerle sunulmalı ve hareket azaltma tercihleri desteklenmelidir.
