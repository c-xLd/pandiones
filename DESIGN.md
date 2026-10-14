# Pandiones tasarım sistemi

Bu belge mevcut ürünün görsel dilini ve bundan sonra uygulanacak kalite çıtasını tanımlar. Gerçek uygulama kaynağı `src/styles/` altındaki stil dosyaları ve çalışan bileşenlerdir; token değiştiğinde bu belge de güncellenir.

## Marka ve görsel yön

Pandiones'in dili sakin, editoryal ve ürün odaklıdır. Büyük moda fotoğrafı, güçlü boşluk, net tipografi ve ölçülü hareket kullanılır. Kampanya içeriği alışveriş yolunu gölgelememelidir. Ürün görseli ürünü doğru temsil etmeli; konsept fotoğrafı gerçek ürün fotoğrafı gibi sunulmamalıdır. Görsel için hak ve ürün eşleşmesi doğrulanır.

- Birincil eylem her ekranda kolay bulunur: keşif, beden seçimi, sepete ekleme ve ödeme akışı kesintisizdir.
- Dekoratif yazı okunurluğun, kontrastın veya dokunma hedefinin önüne geçmez.
- Gerçek ürün bulunmuyorsa kart icat edilmez; boş durum ve ilgili yönlendirme gösterilir.
- Masaüstü ve mobil aynı bilgiyi sağlar; mobilde kompozisyon değişebilir.
- **Yasaklı Sözcükler:** "atölye" / "atelier", "maison" ve "istanbul" / "İstanbul" / "İSTANBUL" sözcükleri marka metinlerinde, başlıklarda ve etiketlerde kesinlikle ve asla kullanılamaz.

## Tokenlar ve tipografi

Tüm ham değerler yalnız `src/styles/tokens.css` içinde tanımlanır; bileşen ve sayfa stilleri token kullanır. `tests/design-tokens.test.ts` bu kuralı denetler: token dosyası dışında hex/rgb renk, ölçek dışı yazı boyutu, harf aralığı, ağırlık, piksel radius, serbest gölge veya 20 üzeri sabit z-index kullanılamaz. Yeni bir değer gerekiyorsa önce token eklenir ve bu tablo güncellenir.

| Grup | Tokenlar |
| --- | --- |
| Nötr renk | `--paper #fff`, `--surface-soft #f7f6f3`, `--surface #eeefeb`, `--line #dedfda`, `--line-strong #cfd0cb`, `--muted-soft #86857f` (yalnız dekoratif/ikon), `--muted #626560`, `--ink-soft #454b46`, `--ink #202120`, `--muted-on-dark`, `--focus` |
| Saydamlık | `--ink-a03…a50`, `--scrim`, `--card-scrim`, `--paper-a08…a95` — gölge, ince çizgi ve cam yüzeyler |
| Anlamsal | `--danger` / `-surface` / `-line`, `--success` / `-surface`, `--warning` / `-surface`, koyu zemin için `--success-on-dark*`, `--danger-on-dark*`; favori kalbi `--favorite`; vurgu `--accent-gold`; hediye kartı "Pudra" tasarımı için yalnız `/hediye-karti` önizlemesinde `--gift-rose-surface` / `-ink` / `-accent` |
| Yazı boyutu | `--text-2xs 10` · `xs 11` · `sm 12` · `md 13` · `base 14` · `lg 16` · `xl 18` · `2xl 20` · `3xl 24` · `4xl 28` · `5xl 36` · `6xl 40` px; akışkan başlıklar `--text-fluid-sm…3xl`; hediye kartı yüzü `--text-card` (3.4cqi, kartın kendi genişliğiyle ölçeklenir; içindeki yazılar `em`) |
| Harf aralığı | `--tracking-tighter -0.035em`, `tight -0.02em`, `normal 0`, `snug 0.02em`, `wide 0.04em`, `wider 0.08em`, `widest 0.14em`, `display 0.2em`, `monogram` (akışkan) |
| Ağırlık | `--weight-regular 400`, `--weight-medium 500`, `--weight-semibold 600` |
| Boşluk | `--space-1…10` = 4/8/12/16/24/32/48/64/96/128 px |
| Radius | `--radius-sm 2px` (varsayılan, keskin), `--radius-md 4px`, `--radius-lg 12px` (alt sayfa), `--radius-xl 24px` / `--radius-xl-inner 18px` (iç içe çerçeve: dış kabuk + 6 px iç çekirdek, yalnız `/hediye-karti`), `--radius-full` (hap), `--radius-round` (daire) |
| Gölge | `--shadow-raised`, `--shadow-overlay`, `--shadow-sheet` (alttan açılan), `--shadow-drawer-start/end`, `--shadow-inset`, `--shadow-float` (yönetim kartları: ince kaldırma + geniş yumuşak düşüş) |
| Katman | `--z-sidebar 25`, `--z-toolbar 35`, `--z-purchase-bar 45`, `--z-header/popover 50`, `--z-backdrop 99`, `--z-overlay 100`, `--z-drawer 110`, `--z-dialog 140`, `--z-toast 200`, `--z-fullscreen 9999` |
| Hareket | `--dur-fast 150ms`, `--dur-base 220ms`, `--dur-slow 320ms`, `--dur-slower 520ms`; `--ease-out`, `--ease-out-strong`, `--ease-drawer`, `--ease-standard`, `--ease-in` (çıkış hareketleri) |
| Header | `--header-height` sabit çubuk yüksekliği (82 / 900 px altı 72 / 600 px altı 66) — sayfa üst boşluğu bununla verilir; `--header-offset` canlı değerdir (kaydırınca 66, gizlenince 0) ve yalnız yapışkan öğelerin `top` değerinde, `transition: top` ile kullanılır |

Kırılım noktaları yalnız 560 · 768 · 900 · 1024 · 1440 px'tir (medya sorgusu değişken okuyamadığı için sayı olarak yazılır).

Üç yazı ailesi kullanılır; başka aile eklenmez:

- **Cormorant Garamond** (`--font-display`): editoryal başlıklar, kampanya dili ve ürün detay başlığı. 400, 400 italik ve 500 yüklenir.
- **Manrope** (`--font-body`): gövde, navigasyon, form, fiyat, buton ve ürün adları.
- **MontserratAlt1** (`--font-logo-stack`, `next/font/local`): yalnız logo ve monogram.

Ürün adı rolü (`--font-product`, `base/product-name.css`): Manrope 500, `--product-name-size` (12 px), `--tracking-wider`, büyük harf. Kart, sepet, arama, beden paneli ve sipariş satırlarında aynıdır. Ürün detay başlığı bu rolü kullanmaz; Cormorant ile büyük harfsiz yazılır. Ana sayfa ürün ızgarası da bu rolü kullanmaz: ad görselin üstünde, kategori kartlarıyla aynı Cormorant başlıktır (fiyat ve favori yok). Fiyatlar `tabular-nums` ile hizalanır; Cormorant ile yazılan rakamlarda eski stil rakamlar "1"i "I" gibi gösterdiği için `lining-nums tabular-nums` kullanılır.

Başlık hiyerarşisi gerçek HTML `h1`–`h3` ile kurulur. Her sayfada bir anlamlı `h1` bulunur. Fiyat ve varyant bilgisi stil kadar metinle de açık olmalıdır. Metin %200 büyütmede ve 320 px genişlikte kaybolmaz.

## Dosya yapısı

`src/app/globals.css` yalnız sıralı `@import` listesidir; sıra kaskad sırasıdır ve değiştirilirken görsel regresyon kontrol edilir. Yalnız tek rotada kullanılan sayfa stilleri globals'te değil, o rotanın `page.tsx`'inde (veya bileşeninde) "Route stylesheet" yorumuyla import edilir; global dosyalardan sonra yüklenirler. Birden çok rotada gereken kurallar (beden tablosu `components/size-chart.css`, iskelet `.skeleton-block` → `components/status.css`, telefonda `.form-row` yığılması → `components/form.css`) ortak dosyada durur. `tests/helpers/stylesheets.ts` token denetimine globals dışındaki tüm `src/styles` dosyalarını da katar.

| Klasör | İçerik |
| --- | --- |
| `src/styles/tokens.css` | Tüm tokenlar |
| `src/styles/base/` | Reset, gövde, odak, ürün adı rolü, giriş animasyonları, kendi barındırılan fontlar (`fonts.css`) ve ölçüsü eşlenmiş yedek yüzler (`font-fallbacks.css`) |
| `src/styles/components/` | `button.css`, `form.css`, `dialog.css` primitifleri; ürün kartı, çekmece, sepet, beden paneli, galeri modalı, toast, rozetler |
| `src/styles/layout/` | Header, footer, menü/arama katmanları, genel responsive kurallar |
| `src/styles/pages/` | Ana sayfa, koleksiyon, ürün, çanta (`cart.css`), hesap (`account.css`), favoriler (`favorites.css`), siparişler (`orders.css`), ödeme (`checkout.css`), rehber ve hizmet sayfaları (`guides.css`: mürekkep çizgili başlık, yapışkan başlık sütunlu numaralı bölümler, kart yerine ince çizgi), hediye kartı (`gift-card.css`), yönetim (`admin-shell.css` kabuk ve gösterge paneli, `admin-content.css` sekme içerikleri ve ürün düzenleyici) |

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
| Segment filtre (`.segments`, `.segment`) | `components/selection.css`. `fieldset` içinde gizli radyolu hap etiketler; seçili hap mürekkep zemin, sayaç `.segment__count`. Sipariş ve favori filtrelerinde kullanılır |
| Beden seçici (`.size-picker`) | `pages/favorites.css`. Giyim sırasına dizilmiş kare radyo çipleri (44 px yükseklik); tükenen beden kesikli çerçeve + üstü çizili, `disabled` ve ekran okuyucuya "tükendi". Beden seçilmeden ekleme eylemi kapalı ve nedeni yazılı |
| Modal/çekmece | Açılınca odak içeriğe gider, Tab içeride kalır, Escape ve görünür kapat çalışır, kapanınca odak döner |
| Diyalog (`Dialog`, `.dialog`) | `components/ui/Dialog.tsx` + `components/dialog.css`. Body'ye portal (dönüşümlü üst öğeler sabit arka planı hapsetmez), `--z-dialog`, `--scrim`, Cormorant başlık, isteğe bağlı eyebrow ve başlık eylemleri; masaüstünde ortada `md` 560 / `lg` 820 px, 560 px altında alt sayfa (`--radius-lg` üst köşe). Başarı sonucu otomatik kapanmaz; "Kapat" düğmesiyle biter |
| Çanta satırı (`.cart-line`) | 2:3 görsel, ürün adı rolü, renk · beden, birim ve satır fiyatı (`tabular-nums`), 44 px adet adımlayıcı (`.qty-stepper`), metin eylemleri; stok/fiyat notu metinle (`--danger`, `--warning`) verilir |
| Durum etiketi (`StatusTag`, `.account-status`) | `components/ui/StatusTag.tsx` + `components/status.css`. Nokta + metin; devam eden durumlar `--accent-gold` ve yavaş nabız (azaltılmış harekette yok), tamamlanan `--success`, başarısız `--danger`. Bilgi yalnız renkle verilmez |
| Sipariş yolculuğu (`.journey`) | `pages/orders.css`. Dört adım, ince çizgi üzerinde noktalar; mürekkepten altına geçen dolgu güncel adıma kadar `scaleX` ile büyür. Kayıtta olmayan adım tarihi yazılmaz |
| Rehber başlığı (`GuideHero`) | `components/guides/GuideHero.tsx` + `pages/guides.css`. Sayfa yolu, altın çizgili eyebrow, Cormorant `--text-fluid-2xl` başlık, en fazla 58ch giriş, isteğe bağlı sağ sütun ("Bu sayfada" bağlantıları `GuideJumpLinks`). Rehber, takip, yardım ve iletişim sayfaları paylaşır |
| Beden tablosu (`SizeChartTable`, `.size-chart`) | Tek kaynak `lib/products/size-chart.ts` (Türkiye, S–XL / TR 36–42). Hesaplayıcının önerdiği satır `--accent-gold-soft` zemin ve altın sol çizgiyle işaretlenir; ürün sayfası modalı da aynı bileşeni kullanır |
| Kaydırma girişi (`Reveal`) | `components/ui/Reveal.tsx` + `components/reveal.css`. IntersectionObserver ile bir kez; zaten ekrandaysa ve azaltılmış harekette gizlenmez, JS olmadan içerik görünür |
| Takip kartı (`.tracking-card`) | Sipariş ayrıntısındaki tek koyu (`--ink`) yüzey; taşıyıcı, büyük takip kodu, kopyala ve takip bağlantısı |
| Bildirim | Kısa ve somut; başarı/hata metinle de anlaşılır, uygun canlı bölge kullanılır |
| Header (`layout/header.css`) | Aşağı kaydırmada `--ease-in` ile hızlı gizlenir (16 px kararlı hareketten sonra), yukarıda 8 px sonra `--ease-out` ile daha yavaş döner; en üstte, açık menü/arama/çanta varken ve odak header'dayken gizlenmez. Buzlu yüzey `::before`, alt çizgi + gölge `::after` yalnız opaklıkla gelir; kaydırınca çubuk 66 px'e iner, logo `scale` ile küçülür. Çantaya ürün eklenince sayaç kısa bir büyümeyle tepki verir. Azaltılmış harekette tüm geçişler kapalıdır. Telefonda solda menü + arama, sağda favori + hesap + çanta; logo 600 px altında 16 px ve dar harf aralığıyla 320 px'e sığar |
| Skeleton | Gerçek bileşenin geometrisini korur, veri gibi okunmaz, azaltılmış hareketi izler |
| Yönetim sekmesi (`.adm-tab`) | `pages/admin-content.css`. Sırasıyla: özet satırı/birincil eylem (`.adm-tab__head`, hap `.adm-pill`), araç çubuğu (`.adm-toolbar`: tepsi zeminli arama `.adm-search`, `.adm-segmented` filtre, `.adm-select`), sonuç bildirimi, veri yüzeyi. Bölüm başlığını kabuk verir; sekme kendi `h2`'sini tekrarlamaz |
| Aranabilir seçim (`.adm-combo`) | `pages/admin-product-editor.css`, `Combobox.tsx` / `CategoryTreeSelect.tsx`. Tek alan: yazınca süzülür, büyüteç + ayraç + aşağı ok; liste kâğıt zeminli, mürekkep çerçeveli, satırlar ince çizgiyle ayrılır. Çoklu seçimde tik kutusu ve alan içinde çip (×); "“X” ekle" satırı italik. Ağaç türünde dallar oklu açılır, ana kategori seçilmez. Yönetim formlarında yerel `select` yerine bu kullanılır |
| Varyant tablosu (`.adm-vx`) | `pages/admin-product-editor.css`. Bölüm başlığı + `.adm-fieldset__lead`; renk satırı tepsi zeminde; renk çipleri hap; "Mevcut ürünü bağla" `--ink-a03` kutuda aranabilir seçim; tablo renge göre gruplu (grup satırı `--ink-a03`, altında kâğıt zeminli medya şeridi satırı), hücre içi girişler `--line-strong` çerçeve, hatada `--danger-surface`; boş stok kodu önerilen kodu yer tutucu olarak gösterir. Boş durum çizgisel kutu simgesi + eksik alanlar |
| Medya şeridi (`.adm-vx__strip`, `.adm-vx__tile`) | 60×80 px kareler galeri sırasıyla, yatay kaydırma; altta kâğıt etiket çekim türünü yazar, kapak karesi 2 px `--accent-gold` halka + mürekkep "Kapak" etiketi (renk tek başına bilgi taşımaz); video karesinde mürekkep oynat rozeti; "Görsel"/"Video" kesikli çerçeveli ekleme kareleri; odakta 2 px mürekkep çizgi. Özet satırı kapaksızken `--warning` |
| Renk medyası (`.adm-vmedia`) | `Dialog` lg: kayıtlı öğeler kartı (`--surface-soft`, 96 px 2:3 küçük görsel, çekim türü + açıklama + video posteri, öğe başına canlı durum satırı, sağda sıra/kapak/sil), kesikli sürükle-bırak alanı, dosya başına önizleme + tür + açıklama kuyruğu, video bölümü. Kayıtsız renkte aynı görünüm "Seçilen medya, yüklenmedi" olarak tarayıcıda bekletir. 720 px altında tek sütun |
| Yönetim tablosu (`.adm-table`) | Çift çerçeve: `.adm-table-wrap` tepsi + `.adm-table-scroll` kâğıt çekirdek (`--shadow-float`), yatay kaydırma içeride. `th` 10 px büyük harf, satır hover `--surface-soft`, seçili satır `--accent-gold-soft`, okunmamış satır altın sol çizgi; sayılar `.adm-num` (`tabular-nums`, sağa). Hücre içi `.adm-cell` (`__main`, `__sub`, `--clamp` 3 satır). Ay ayırıcısı `.adm-table__group`. Diyalog içinde `.adm-table-scroll--flat` |
| Yönetim durum hapı (`.adm-status`) | Nokta + metin. Sipariş durumları `--odendi/--hazirlaniyor/--kargoda/--teslim_edildi/--odeme_basarisiz` (`OrderStatus` bileşeni), genel tonlar `--success/--warning/--danger/--muted` |
| Yönetim sonucu (`useTabNotice`, `.adm-notice`) | `alert()` yerine sekme üstünde satır: başarı `--success` zemin, 5 sn sonra kendiliğinden kapanır; hata `role="alert"`, kapatılana kadar kalır. Canlı bölge her zaman çizilir |
| Yönetim onayı (`useConfirm`) | `confirm()` yerine `Dialog` + `.adm-dialog--confirm` (440 px): başlık nesneyi adlandırır, açıklama sonucu söyler, tehlikeli eylem `.adm-btn--danger`. Eylem sürerken düğme bekleme metni ve `aria-busy`; hata pencerede kalır, pencere açık kalır |
| Yönetim diyaloğu (`.adm-dialog`) | `Dialog` primitifi + `adm-dialog` sınıfı: `--radius-xl`, alt çizgisiz başlık, `.adm-form` / `.adm-form__grid`, `.adm-field` (kalıcı etiket, ipucu, alan hatası), eylemler `.adm-dialog__actions` sağda (telefonda eşit genişlik). Sipariş ayrıntısı `--sheet` (900 px üstünde sağdan tam yükseklik), depo fişi `--print` (yazdırmada yalnız fişler, her sipariş ayrı A4) |
| Toplu işlem çubuğu (`.adm-dock`) | Seçim varken altta ortalanmış mürekkep hap; sayaç + eylemler + "Seçimi kaldır". 768 px altında kenardan kenara; azaltılmış harekette animasyonsuz |
| Satır içi stok (`.adm-size`) | Beden etiketi + sayı girdisi; yalnız değer değişince odak kaybında veya Enter'da kaydeder, Escape geri alır; "Kaydediliyor/Kaydedildi" canlı bölgede, hata alanın altında |
| İkon düğmesi (`.adm-icon-btn`) | 34 px yuvarlak, yalnız ikonlu eylemler için; her zaman `aria-label`. Tehlikeli varyant `--danger` |
| Sıralanabilir başlık (`.adm-sort`) | `th[aria-sort]` içinde düğme; etkin sütun mürekkep rengi ve ↓/↑ (dekoratif). Aynı sıralama araç çubuğundaki seçimden de yapılır |
| Satır içi sayı (`InlineNumber`, `.adm-inline`) | Fiyat ve beden stoğu tabloda düzenlenir: yalnız değişince odak kaybında/Enter'da kaydeder, Escape geri alır; "Kaydediliyor/Kaydedildi" canlı bölgede, hata altında. Eşik altı stok `--warning-surface`, 0 stok `--danger-surface`; bekleyen talep altın rozet |
| Yükleme çizgisi (`.adm-progress`) | Liste arka planda yenilenirken tablo yerinde kalır (soluk), üstte 2 px ilerleme çizgisi; azaltılmış harekette sabit |
| Sipariş zaman çizelgesi (`.adm-timeline--sheet`) | Ayrıntı panelinde dar tarih sütunlu zaman çizelgesi; başarılı olay yeşil, başarısız (ödeme, kargo e-postası) kırmızı nokta |
| Ürün düzenleyici (`ProductEditorForm`, `.adm-editor`) | Tam sayfa (`/yonetim/urunler/yeni`, `/[id]`): `.adm-fieldset` tepsi + kâğıt çekirdekli iki bölüm (Ürün bilgileri; Renkler, bedenler ve medya), sağda 300 px yapışkan ray: tepsi zeminli 2:3 önizleme, renk noktaları (`aria-pressed`), yayın kutusu (eksikler, Yayınla/Taslağa al). 1100 px altında ray alta iner. Kaydet/Vazgeç `.adm-savebar` (Ayarlar ile aynı; burada `grid-column: auto`, yeni üründe hep görünür), devre dışı birincil düğme okunur kalır |
| Telefonda tablo kartı (`.adm-products-table`) | 768 px altında satırlar karta döner; hücre etiketi `data-label`'dan, seçim kutusu sağ üstte |
| Kargo etiketi (`ShippingLabelDialog`, `.ship-label`) | 100 × 100 mm termal etiket, her biri ayrı sayfa (`@page label`, kenar boşluğu yok). Yukarıdan aşağı: PTT KARGO + desi/koli, gönderen, kalın çizgiler arasında alıcı (ad ve İLÇE / İL büyük), Code 128 barkod (`lib/shipping/code128.ts`, bağımlılıksız SVG) + numara, sipariş no ve ürün adedi. Yalnız mürekkep rengi; yazı 11 px tabandan em ile ölçeklenir. Yazdırmada panel ve pencere çerçevesi basılmaz |

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
| Giriş/hesap | Form veya kullanıcı durumu ve sonraki adım | Giriş/kayıt veya sipariş görüntüle | Hata alanını formdan uzakta göstermek; yapay güven rozeti |
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
