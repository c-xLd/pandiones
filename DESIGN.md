# Pandiones tasarım sistemi

Bu belge mevcut ürünün görsel dilini ve bundan sonra uygulanacak kalite çıtasını tanımlar. Gerçek uygulama kaynağı `src/styles/` altındaki stil dosyaları ve çalışan bileşenlerdir; token değiştiğinde bu belge de güncellenir.

## Marka ve görsel yön

Pandiones'in dili sakin, editoryal ve ürün odaklıdır. Büyük moda fotoğrafı, güçlü boşluk, net tipografi ve ölçülü hareket kullanılır. Kampanya içeriği alışveriş yolunu gölgelememelidir. Ürün görseli ürünü doğru temsil etmeli; konsept fotoğrafı gerçek ürün fotoğrafı gibi sunulmamalıdır. Görsel için hak ve ürün eşleşmesi doğrulanır.

- Birincil eylem her ekranda kolay bulunur: keşif, beden seçimi, sepete ekleme ve ödeme akışı kesintisizdir.
- Dekoratif yazı okunurluğun, kontrastın veya dokunma hedefinin önüne geçmez.
- Gerçek ürün bulunmuyorsa kart icat edilmez; boş durum ve ilgili yönlendirme gösterilir.
- Masaüstü ve mobil aynı bilgiyi sağlar; mobilde kompozisyon değişebilir.

## Tokenlar ve tipografi

Tüm ham değerler yalnız `src/styles/tokens.css` içinde tanımlanır; bileşen ve sayfa stilleri token kullanır. `tests/design-tokens.test.ts` bu kuralı denetler: token dosyası dışında hex/rgb renk, ölçek dışı yazı boyutu, harf aralığı, ağırlık, piksel radius, serbest gölge veya 20 üzeri sabit z-index kullanılamaz. Yeni bir değer gerekiyorsa önce token eklenir ve bu tablo güncellenir.

| Grup | Tokenlar |
| --- | --- |
| Nötr renk | `--paper #fff`, `--surface-soft #f7f6f3`, `--surface #eeefeb`, `--line #dedfda`, `--line-strong #cfd0cb`, `--muted-soft #86857f` (yalnız dekoratif/ikon), `--muted #626560`, `--ink-soft #454b46`, `--ink #202120`, `--muted-on-dark`, `--focus` |
| Saydamlık | `--ink-a03…a50`, `--scrim`, `--card-scrim`, `--paper-a08…a95` — gölge, ince çizgi ve cam yüzeyler |
| Anlamsal | `--danger` / `-surface` / `-line`, `--success` / `-surface`, `--warning` / `-surface`, koyu zemin için `--success-on-dark*`, `--danger-on-dark*`; favori kalbi `--favorite`; vurgu `--accent-gold` |
| Yazı boyutu | `--text-2xs 10` · `xs 11` · `sm 12` · `md 13` · `base 14` · `lg 16` · `xl 18` · `2xl 20` · `3xl 24` · `4xl 28` · `5xl 36` · `6xl 40` px; akışkan başlıklar `--text-fluid-sm…3xl` |
| Harf aralığı | `--tracking-tighter -0.035em`, `tight -0.02em`, `normal 0`, `snug 0.02em`, `wide 0.04em`, `wider 0.08em`, `widest 0.14em`, `display 0.2em`, `monogram` (akışkan) |
| Ağırlık | `--weight-regular 400`, `--weight-medium 500`, `--weight-semibold 600` |
| Boşluk | `--space-1…10` = 4/8/12/16/24/32/48/64/96/128 px |
| Radius | `--radius-sm 2px` (varsayılan, keskin), `--radius-md 4px`, `--radius-lg 12px` (alt sayfa), `--radius-full` (hap), `--radius-round` (daire) |
| Gölge | `--shadow-raised`, `--shadow-overlay`, `--shadow-sheet` (alttan açılan), `--shadow-drawer-start/end`, `--shadow-inset` |
| Katman | `--z-sidebar 25`, `--z-toolbar 35`, `--z-purchase-bar 45`, `--z-header/popover 50`, `--z-backdrop 99`, `--z-overlay 100`, `--z-drawer 110`, `--z-dialog 140`, `--z-toast 200`, `--z-fullscreen 9999` |
| Hareket | `--dur-fast 150ms`, `--dur-base 220ms`, `--dur-slow 320ms`, `--dur-slower 520ms`; `--ease-out`, `--ease-out-strong`, `--ease-drawer`, `--ease-standard` |

Kırılım noktaları yalnız 560 · 768 · 900 · 1024 · 1440 px'tir (medya sorgusu değişken okuyamadığı için sayı olarak yazılır).

Üç yazı ailesi kullanılır; başka aile eklenmez:

- **Cormorant Garamond** (`--font-display`): editoryal başlıklar, kampanya dili ve ürün detay başlığı. 400, 400 italik ve 500 yüklenir.
- **Manrope** (`--font-body`): gövde, navigasyon, form, fiyat, buton ve ürün adları.
- **MontserratAlt1** (`--font-logo-stack`, `next/font/local`): yalnız logo ve monogram.

Ürün adı rolü (`--font-product`, `base/product-name.css`): Manrope 500, `--product-name-size` (12 px), `--tracking-wider`, büyük harf. Kart, sepet, arama, beden paneli ve sipariş satırlarında aynıdır. Ürün detay başlığı bu rolü kullanmaz; Cormorant ile büyük harfsiz yazılır. Fiyatlar `tabular-nums` ile hizalanır.

Başlık hiyerarşisi gerçek HTML `h1`–`h3` ile kurulur. Her sayfada bir anlamlı `h1` bulunur. Fiyat ve varyant bilgisi stil kadar metinle de açık olmalıdır. Metin %200 büyütmede ve 320 px genişlikte kaybolmaz.

## Dosya yapısı

`src/app/globals.css` yalnız sıralı `@import` listesidir; sıra kaskad sırasıdır ve değiştirilirken görsel regresyon kontrol edilir.

| Klasör | İçerik |
| --- | --- |
| `src/styles/tokens.css` | Tüm tokenlar |
| `src/styles/base/` | Reset, gövde, odak, ürün adı rolü, giriş animasyonları |
| `src/styles/components/` | `button.css`, `form.css` primitifleri; ürün kartı, çekmece, sepet, beden paneli, galeri modalı, toast, rozetler |
| `src/styles/layout/` | Header, footer, menü/arama katmanları, genel responsive kurallar |
| `src/styles/pages/` | Ana sayfa, koleksiyon, ürün, ödeme, rehberler, yönetim |

## Yerleşim ve sayfalar

Site içerik genişliği `--site-max-width: 1720px`; yatay boşluk `--site-gutter` tokenlarıyla uyarlanır. Kampanya görselleri tam genişlik olabilir, form ve uzun metin okunabilir genişlikte kalır. Kart kırpması ürünün rengini veya kesimini yanıltmaz. Görsel oranı yüklemeden önce rezerve edilir.

Ürün grid'i viewport boyunca header ve footer'ın dış sınırına kadar uzanır. Kartların arasında yatay veya dikey boşluk yoktur. Masaüstü varsayılanı dört büyük, 2:3 oranlı fotoğraf sütunudur; dar ekranda iki sütuna iner. Kart bilgisi fotoğrafın hemen altında kategori, ad, renk ve fiyatı açık hiyerarşiyle verir. İkinci ürün görseli yalnız aynı ürüne ait gerçek kayıt varsa kullanılır; kampanya görseli alternatif ürün açısı gibi gösterilmez.

Ana sayfa kampanya → kategori → gerçek ürün akışı kurar. Katalogda filtre, sıralama ve sütun seçimi sonuçlarla tutarlı olur. Ürün detayında galeri, tam/kompakt satın alma şeridi, beden, kılavuz, bilgi ve yorum bölümleri birlikte işler; şerit footer ile çakışmaz. Ödeme ve hesap sayfalarında dekorasyon formun anlaşılmasını zorlaştırmaz. Yönetim panelinde yoğun veri okunabilir tablo ve net işlem durumlarıyla gösterilir. Rota bazında ayrıntı [PAGES.md](docs/PAGES.md) içindedir.

## Bileşen sözleşmesi

| Bileşen | Görünüm ve davranış |
| --- | --- |
| Buton (`.btn`) | `components/button.css`. Varyant `--primary` (mürekkep zemin), `--secondary` (çizgili), `--ghost`, `--on-dark`, `--link`; boyut `--sm` 36 / varsayılan 44 / `--lg` 52 px; `--block`, `--split` (etiket + fiyat/ok), `--icon`. Manrope 600, 11 px, `--tracking-widest`, büyük harf. hover/focus-visible/active/disabled ve `aria-busy` (spinner, tekrar tıklama engeli) durumları primitifte; bileşen sınıfı yalnız konum ve genişlik ekler. Açık fiil; tek tıklama tek işlem |
| Ürün kartı | Gerçek görsel, ad, fiyat ve stok bağlamı; kart linki ile favori ayrı hedefler |
| Beden seçimi | Etiketli grup; tükenen beden seçilemez, stok alarmı ayrı eylemdir |
| Form alanı (`.field`) | `components/form.css`. `.field__label` kalıcı, büyük harf 11 px; `.field__control` 48 px, `--line-strong` kenar, odakta mürekkep halka; `aria-invalid` kırmızı kenar; `.field__hint`, `.field__error` (ikon + metin, `aria-describedby` ile bağlı); form düzeyi mesaj `.form-alert--error/--success`. Placeholder yalnız örnektir. Telefonda kontrol 16 px (iOS yakınlaştırmasını önler). Eski `.form-group/.form-input` aynı kuralları paylaşır. React'te `components/ui/FormField.tsx` etiketi, `aria-invalid` ve `aria-describedby` bağlantısını kurar |
| Durum paneli (`StatusPanel`, `.status-panel`) | `components/ui/StatusPanel.tsx`. Yetkisiz, bekliyor, başarısız, boş sayfa durumları: ikon (dekoratif), eyebrow, `h1`/`h2` başlık, açıklama, eylem satırı. Tonlar `--success/--warning/--danger` |
| Bilgi kutusu (`Notice`, `.notice`) | `components/ui/Notice.tsx`. `info/success/warning/danger`; yalnız kullanıcının eylem yapması gereken hatada `role="alert"`, bekleyen durum için `role="status"`. Test modu uyarısı `warning` tonudur |
| Seçim kartı (`.choice-card`) | `fieldset.choice-group` + `legend` içinde gizli radyo girdili `label`; seçili durumda mürekkep halka, klavye odağında focus halkası |
| Çip (`.chip`) | Kısa etiket/rozet (kart ağı, durum); bilgi yalnız renkle verilmez |
| Modal/çekmece | Açılınca odak içeriğe gider, Tab içeride kalır, Escape ve görünür kapat çalışır, kapanınca odak döner |
| Bildirim | Kısa ve somut; başarı/hata metinle de anlaşılır, uygun canlı bölge kullanılır |
| Skeleton | Gerçek bileşenin geometrisini korur, veri gibi okunmaz, azaltılmış hareketi izler |

## Responsive, hareket ve erişilebilirlik

320, 375, 768, 1024, 1440 px ve geniş masaüstü kontrol edilir. Mobilde gezinme, filtre, sepet, satın alma ve formlar başparmakla kullanılabilir; hedefler en az 44×44 CSS px tasarlanır. Bilgi yalnız renk, ikon, hover veya hareketle aktarılmaz. Görünür focus halkası vardır; doğrulama hatası ilgili alanla ilişkilendirilir.

Hareket kısa ve işlevseldir. Otomatik kayan ürün galerisinde duraklatma ve `prefers-reduced-motion` yolu bulunur; mobilde manuel gezinme tercih edilir. Skeleton shimmer azaltılmış hareket altında kapatılır. Açılan katmanlarda arka plan kaydırması ve odak yönetimi tutarlıdır.

Kampanya ve ürün metni gerçek ticari iddialara dayanır. Materyal, üretim yeri, teslimat ve iade metinleri doğrulanmadan kesin vaat olarak yazılmaz. Ayrıntılı arayüz durumları [STATES.md](docs/STATES.md) içindedir.

## Ölçü, ritim ve görsel kalite

Boşluk sistemi 4/8/12/16/24/32/48/64 px ölçeğine dayanır; istisna ürün görselinin gerçek oranı veya içerik gereği belgelenir. Ana başlık, alt başlık, gövde, yardımcı metin ve fiyat kendi içinde tutarlı ölçek kullanır. Uzun paragraf yaklaşık 60–75 karakterlik satır uzunluğunu aşmaz. Çizgiler içeriği ayırır; kartların etrafına gereksiz kalın çerçeve, ağır gölge veya dekoratif rozet eklenmez.

Hero görselinin odak noktası mobil kırpmada kaybolmaz. Ürün görsellerinde arka plan ve ışık tutarlılığı aranır; farklı ürünün fotoğrafı varyant fotoğrafı olarak kullanılmaz. Ürün adı ve fiyatı görsel üstünde okunmaz hale gelecekse ayrı yüzeye taşınır. Görsellerin dosya boyutu ve yüklenme önceliği [PERFORMANCE.md](docs/PERFORMANCE.md) ile birlikte kararlaştırılır.

## Sayfa kompozisyonu

| Yüzey | İlk bakışta görünmesi gereken | Ana eylem | Kaçınılacak sorun |
| --- | --- | --- | --- |
| Ana sayfa | Marka, kampanya yönü, koleksiyona giriş | Koleksiyonu aç | Çok sayıda eşit ağırlıklı CTA |
| Katalog | Kategori adı, ürün sayısı, filtre ve sıralama | Ürüne git | Sonuç değişirken seçimi gizlemek |
| Ürün | Gerçek galeri, ad, fiyat, uygun bedenler | Sepete ekle | CTA'nın galeri veya footer altında kalması |
| Favoriler/sepet | Kaydedilmiş kalem, beden, miktar ve toplam | Ürüne/ödemeye git | Eski fiyatı nihai fiyat gibi göstermek |
| Giriş/hesap | Form veya kullanıcı durumu ve sonraki adım | Giriş/kayıt veya sipariş görüntüle | Hata alanını formdan uzakta göstermek |
| Ödeme | Teslimat alanları ve doğrulanacak özet | Ödemeyi başlat | Simülasyonu gerçek ödeme gibi göstermek |
| Yönetim | Sekme, tarih/filtre bağlamı, gerçek kayıt | İlgili kaydı işle | Kaydedilmemiş değişikliği başarı gibi göstermek |

## Durumların görsel dili

Loading yüzeyi gerçek içeriğin yerini ve yaklaşık yüksekliğini korur. Boş durum bir başlık, kısa neden ve gerçek sonraki adımdan oluşur. Hata durumu yüksek kontrastlı metin ve tekrar deneme eylemi sunar. Başarı durumu kaydın kalıcı sonucunu gösterir. Disabled durum nedeni belirsiz kalmaz; stok yok, gerekli alan eksik veya işlem sürüyor gibi sebep yakınında açıklanır. Form alanı sadece renkli kenarlıkla hata iletmez.

## Tasarım inceleme listesi

- [ ] Masaüstü, tablet ve mobilde hiyerarşi aynı karar yolunu destekliyor.
- [ ] Birincil CTA, fiyat, stok ve seçili beden tüm durumlarda okunuyor.
- [ ] Her ikonun erişilebilir adı; her inputun kalıcı etiketi var.
- [ ] Açılır katmanlar odak, Escape, arka plan ve geri dönüş davranışını tamamlıyor.
- [ ] Boş, yükleme, hata, başarı ve uzun metin örneklerinde yerleşim bozulmuyor.
- [ ] Ürün görselleri ve ticari iddialar gerçek kayıtla eşleşiyor.
- [ ] Hareket azaltma ve %200 metin büyütmede içerik/eylem kaybı yok.

## Gerçek medya kompozisyonu

Tek ürün tek karttır; kapak ve ikinci kare aynı ürünün doğrulanmış sıralı medyasından gelir. Medya olmayan eski ürün yalnız kendi kapak görselini kullanır. Video posteri fotoğraf ritmini korur, oynatma düğmesi görünürdür; azaltılmış harekette kendiliğinden başlamaz. Renk bağlantıları yalnız yayınlanan kardeş ürünleri gösterir, uydurma renk noktası eklenmez. Yönetici editöründe taslak, yükleme ve yayın eylemleri ayrı yüzeylerdir; fotoğrafsız taslakta boş önizleme açıkça görünür. Düzenleyici küçük ekranda tam yüksekliğe geçer, odak ve hata mesajları görünür kalır.
