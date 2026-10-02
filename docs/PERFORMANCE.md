# Performans bütçesi

Ölçümler üretim build'inde, orta sınıf mobil cihaz profili ve yavaş 4G benzeri ağda alınır. Değerler hedef bütçedir; ölçülmeden “hızlı” denmez. En çok kullanılan `/`, `/yeni-gelenler`, `/[kategori]`, ürün detay ve `/odeme` ayrı ölçülür.

| Metrik | Hedef | Ölçüm |
| --- | --- | --- |
| LCP | 75. yüzdelikte ≤ 2,5 sn | Gerçek kullanıcı verisi, Lighthouse laboratuvar kontrolü |
| INP | 75. yüzdelikte ≤ 200 ms | Gerçek kullanıcı verisi; filtre, sepet ve form etkileşimleri |
| CLS | 75. yüzdelikte ≤ 0,1 | Görsel, font, skeleton ve ödeme alanı kaymaları |
| TTFB | Uygun coğrafyada ≤ 800 ms hedef | Sunucu/DB/API zamanlaması |
| Sayfa etkileşimi | Ana eylem ilk yüklemede çalışır | Mobil klavye ve dokunma denemesi |

## Uygulama kuralları

- İlk görünür büyük görsele doğru `width`/`height` veya `aspect-ratio`, uygun `sizes` ve öncelik verin; ekran altı görselleri lazy yükleyin. Görsel optimizasyonu açık (`next.config.mjs`: AVIF/WebP, `deviceSizes`, S3 için `MEDIA_PUBLIC_BASE_URL` kalıbı); `next/image` kullanan yerler kaynak PNG/JPEG yerine slota uygun boyutta dosya indirir. Ana sayfa, koleksiyon ve ürün detayı `next/image` kullanır; düz `<img>` yalnız çanta, ödeme, sipariş ve yönetim küçük resimlerinde kalır.
- **Görsel kalitesi (2026-10-02):** Kalite `src/lib/images.ts` içinde: fotoğraflar `PHOTO_QUALITY = 85`, küçük resimler `THUMB_QUALITY = 60`; `next.config.mjs` `images.qualities: [60, 85]` dışındaki değer geliştirmede hata verir, `quality` verilmeyen görsel 85'e yuvarlanır. 70–75'te AVIF dantel ve fitil dokusunu siliyordu. Ürün fotoğrafları dikey ya da yatay olabilir ve dikey çerçevelere `object-fit: cover` ile kırpılır; tarayıcı dosyayı çerçeve genişliğine göre seçtiği için yatay kırpım 2–3 kat büyütülüyordu. Bu yüzden ürün kartı, ana sayfa ızgarası, galeri ve ilgili ürün `sizes` değerleri slotun iki katıdır; Next büyütmez, en fazla kaynak boyutu gelir. 1440 px masaüstünde ölçülen piksel yoğunluğu koleksiyonda 0,37–0,89 → 0,75–2,0 oldu. Ana sayfanın uzun çerçevelerinde yalnız ≥1000 px genişlikte dikey kaynaklar kullanılır (`siyah-crop`, `beyaz-crop`, `pembe-balen`, `lace`/`satin`/`campaign-chocolate`); 1376×768 yatay `campaign-*.jpeg`, `askili-crop/*.jpeg` ve 537×719 `indir.png`/`pembe-fitilli-takim.png` bu çerçevelerde 1,5–2,5 kat büyütülüp bulanıklaştığı için ana sayfadan çıkarıldı. Ürün kayıtlarındaki yatay görseller (ör. Düğmeli Askılı Crop) için en az 1600×2400 dikey kaynak gerekir.
- Ürün galerisi ve kampanya görsellerinde modern format ve uygun çözünürlük kullanın. Aynı büyük dosyayı küçük kartta indirmeyin. Görsel URL'si bozuksa hata yüzeyi gösterin.
- Fontlar `public/fonts/web/` altından kendi `@font-face` kurallarımızla (`src/styles/base/fonts.css`, yalnız latin + latin-ext) yüklenir; Manrope latin/latin-ext ve Cormorant 400 latin `app/layout.tsx` içinde preload edilir. `base/font-fallbacks.css` ölçüsü eşlenmiş yedek yüzler tanımlar (`size-adjust`, `ascent-override`): web fontu gelince metin yer değiştirmez. Logo fontu yalnız 500 ağırlığında, harf alt kümesi WOFF2 (7 KB).
- Sayfa CSS'i rotasında yüklenir: `globals.css` yalnız ortak katmanları içerir; `pages/checkout|account|cart|favorites|orders|auth|admin|guides|gift-card|product` ve ürün bileşen stilleri ilgili sayfa/bileşende import edilir ("Route stylesheet" yorumu). Menü, arama, çanta ve rehber pencereleri (`DeferredOverlays`) ve stilleri (`overlays.css`, `bag-drawer.css`) yalnız açıldığında veya ilk etkileşimde yüklenir.
- Kart üstü küçük öğelerde `backdrop-filter` ve kalıcı `will-change` kullanılmaz (her kart için ayrı katman); bulanıklık yalnız sabit/yapışkan yüzeylerde ve görünürken uygulanır.
- Öncelikle sunucuda veri getirilebilen sayfaları sunucu bileşeni tutun; istemci JS'ini gerçekten etkileşim gereken bölüme sınırlandırın. Tek veri için birden çok istek, render sırasında pahalı sıralama ve gereksiz polling eklemeyin.
- Filtre ve aramada giriş gecikmesini düşük tutun. Uzun katalog listesinde sayfalama veya kademeli yükleme planlayın; bir kerede bütün görselleri yüklemeyin.
- Hareketli galeri `transform` ile akıcı çalışmalı; görünmüyorsa veya azaltılmış hareket seçiliyse animasyonu durdurun. Scroll listener kullanılıyorsa pasif, sınırlandırılmış ve temizlenen biçimde olmalıdır.
- API sorgularında ihtiyaç duyulan alanları seçin, indeks ve sorgu süresini ölçün. N+1 sorgu ve siparişte ürün başına tekrarlı ağ/DB maliyetini kontrol edin.
- CDN/cache yalnız herkese açık, fiyat/stok tutarlılığı yönetilen içerikte kullanılır; hesap, sepet ve ödeme verisi yanlış kullanıcıya cache'lenmez.

## Ölçüm kaydı

**2026-10-01, `/koleksiyon`, yerel üretim build'i, Lighthouse 12 (mobil: simüle yavaş 4G + 4× CPU).** Ölçüm makinesi paylaşımlı ve yavaştı (`benchmarkIndex` 585–903; PSI sunucuları ~1500+), bu yüzden mutlak puanlar karamsardır; aynı koşulda karşılaştırma içindir.

| Durum | Mobil | Masaüstü | Not |
| --- | --- | --- | --- |
| Başlangıç | 41 | — | 6,9 MB indirme (iki 2 MB PNG), LCP 8,8 sn, TBT 1,36 sn, CLS 0,096 |
| Sunucu verisi + `next/image` + logo fontu | 27–56 | 45–73 | Bayt 6,9 MB → 0,4 MB; CLS font değişiminden 0,8'e çıktı |
| + yedek font ölçüleri, rota CSS'i, ertelenmiş pencereler, skeleton | 71–81 | 98 | CLS 0 |
| Referans: neredeyse JS'siz sayfa (`/bakim-rehberi`) | 88 | 99 | Bu makinede ortak katmanın tavanı |

Kalan darboğaz ilk düzen hesabı ve React/Next hidrasyonu (çerçeve parçası `1255` app router çalışma zamanı). Gerçek puan PageSpeed Insights ile yayın ortamında doğrulanmalıdır.

Her önemli sürümde tarih, commit, ortam, cihaz profili, dört ana rota için LCP/INP/CLS, transfer boyutu ve en büyük darboğaz kaydedilir. Regresyon varsa düzeltme veya bilinçli istisna açıklaması olmadan yayın yapılmaz.
