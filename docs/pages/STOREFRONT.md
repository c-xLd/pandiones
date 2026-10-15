# Mağaza sayfaları: ana sayfa, katalog ve ürün

Kapsam: `/`, `/yeni-gelenler`, `/[kategori]`, `/[kategori]/[altKategori]` ve `/urun/[slug]`. Üst düzey rota listesi [PAGES.md](../PAGES.md) içindedir. `/koleksiyon` ve `/urunler` 2026-10-01'de kaldırıldı (eski adresler 404).

## Ana sayfa `/`

Kampanya görseli marka ile ürünler arasında açık yol kurar. Bölüm sırası: hero → kategori hikâyeleri → gece kampanyası → ürün ızgarası → iki ürün hikâyesi → kampanya videosu → hikâyemiz → rehber şeridi. Hero tam bir ekrandır; altındaki tam genişlik kampanyalar (gece, ürün hikâyeleri, video) `115svh` ile ekrandan biraz uzundur. Ürün hikâyeleri (`PRODUCT_STORIES`, `src/app/(anasayfa)/page.tsx`): Pembe Balenli Dantel Takım ve Beyaz Crop, her biri ürünün kendi iki dikey fotoğrafı yan yana (yalnız ≥1000 px dikey kaynaklar; bkz. PERFORMANCE.md görsel kalitesi); ad, renk ve bağlantı (`/urun/...`) canlı üründen gelir, ürün yayında değilse hikâye çizilmez; telefonda iki fotoğraf yan yana 2:3. Kampanya videosu `public/assets/Create_fashion.mp4` (`HomeVideo.tsx`): dosya yoksa bölüm çizilmez; sessiz, döngüde, yalnız ekrandayken oynar, azaltılmış harekette kendiliğinden başlamaz; ekranda düğme yok (kullanıcı kararı), üstünde kampanya başlığı ve "Yeni gelenleri keşfet". Tipografi ölçeği: hero `h1` `--text-fluid-2xl` (sayfadaki en büyük satır, telefonda da), bölüm başlıkları (gece, ürün hikâyeleri, video, hikâyemiz) `--text-fluid-xl`, kart başlıkları `--text-fluid-lg`; görsel üstü bağlantı etiketleri tek ses: `--text-xs`, medium, büyük harf, `--tracking-widest`. Sayfa sunucu bileşenidir ve yükleme iskeleti yoktur: ürünler `loadHomeCollection()` ile sunucuda okunur ve ilk HTML'de gelir; sonuç 60 sn önbellekte tutulur (etiket `catalog`), yönetimde ürün kaydı, yayın, toplu işlem, medya ve silme önbelleği hemen temizler (`refreshCatalogCache`). Okuma hatası önbelleğe alınmaz. Anasayfa fotoğrafları `public/assets/home/*.webp` (aynı piksel boyutunda, 52–179 KB; kaynak PNG'ler 1,8–2,4 MB) — kaynak değişince `node scripts/optimize-home-images.mjs` (hediye kartı hariç, en yeni 8 parça; fazlası için ızgara altında "Tüm parçaları gör" → `/yeni-gelenler`). Ürün kartları yalnız görsel + görselin üstünde ad (kategori kartlarıyla aynı Cormorant başlık ve alttan karartma); altta fiyat/renk/kategori, favori düğmesi ve hover etkisi yoktur — bunlar ürün sayfasındadır. Izgara sunucuda çizilir (`src/app/_home/HomeProductGrid.tsx`); istemcide yalnız hata durumundaki "Tekrar dene" (`RetryButton.tsx`, `router.refresh()`) ve beden/kumaş rehberi kutuları (`GuideTile.tsx`) vardır. Sorgu hatası boş liste değil uyarı + tekrar dene; ürün yoksa "Henüz yayında parça yok.". Görseller `next/image`; yalnız ilk hero görseli öncelikli, telefonda gizlenen ikinci hero görseli lazy olduğu için inmez. Kategori kartları `/ic-giyim`, `/ev-giyim` ve "İnce ayrıntılar" için `/ic-giyim/dantel-takimlar`; alt şerit dört rehberdir (Stil, Bakım, Beden, Kumaş). Kampanya görseli stok/fiyat yerine geçmez.

**Kabul:** Logo ana sayfaya; kategori linkleri gerçek kategoriye; filtre seçimleri listeye; kart ve hızlı görünüm aynı ürüne gider. Boş/hata/yavaş ağ durumları ayrı görünür. İlk görünür görselin boyutu ve odak noktası mobilde kontrol edilir.

**Hikâyemiz (`#hikayemiz`):** Footer'daki "Hikâyemiz" ayrı sayfaya değil bu bölüme gelir. Solda dantel (`lace.webp`) ve saten (`satin.webp`) görselleri hafif döndürülmüş, kademeli iki çerçeve; sağda mevcut marka metni ve koleksiyon, stil rehberi, bakım rehberi bağlantıları. Kuruluş yılı veya üretim yeri gibi doğrulanmamış hikâye eklenmez. 600 px altında döndürme kalkar.

## Katalog: `/yeni-gelenler`, `/[kategori]` ve `/[kategori]/[altKategori]`

Kategori başlığı, ürün sayısı, sıralama ve ızgara görünümü birlikte anlaşılır. Seçimlerin hangi ürünleri gösterdiği belirsiz kalmaz. Bilinmeyen kategori 404; eski kategori alias'ları doğru yönlendirme alır. Filtre sıfır sonuç ürettiğinde sıfır sonucu açıklayan metin ve “filtreyi temizle” eylemi bulunur. Ürün listesi büyükse sayfalama veya kademeli yükleme, geri tuşu ile konumu koruyacak şekilde tasarlanır.

**Kabul:** Fiyat artan/azalan sırası gerçek fiyatla, ad sırası yerel karakterlerle test edilir. Sütun seçimi yalnız görünümü değiştirir; seçili ürünler kaybolmaz. Liste ile ürün detay fiyatı/stoku güncel kaynaktan gelir. Yükleme sırasında filtre kontrolünün erişilebilir durumu açıktır.

**Kart kompozisyonu:** Referans ölçüde masaüstünde dört büyük dikey fotoğraf yan yana, grid boşluğu sıfırdır. Grid sayfa boyunca header/footer dış genişliğiyle hizalanır. Bilgi alanı fotoğrafın altındadır; ek beyaz aralık kartlar arasında oluşmaz. Mobilde iki sütun, okunur ad/fiyat ve ürün detayına açık erişim korunur. Hızlı ekleme yalnız gerçek stokta olan bedenleri gösterir.

Bir ürün her ızgarada tek karttır. Kapak ve ikinci kare yalnız o ürüne bağlı sıralı medyadan gelir; eski medyasız ürün kendi `image` alanına döner. Video varsa posterle açılır, ağ yükünü azaltmak için `preload="none"` kullanır. Masaüstü hover oynatması azaltılmış hareket tercihini izler; mobil/klavyede oynat-duraklat düğmesi vardır ve aynı anda yalnız bir kart videosu oynar. Renkler yalnız yayınlanmış gerçek kardeş ürünlerin kanonik bağlantılarıdır. Liste isteği başarısız olduğunda boş sonuç gibi gösterilmez, yeniden deneme sunulur.

Kategori gezinmesi (2026-10-01): `/yeni-gelenler` başlığın altında tek satır **metin sekmeleri** gösterir (`components/collection/CategoryRail.tsx`, görselsiz): "Tümü" ve tüm etkin ana kategoriler, gerçek parça sayısı üst simge olarak; ürünü olmayan kategori soluk yazılır ve ekran okuyucuya "henüz ürün yok" denir. Seçili sekmenin altında mürekkep çizgi; görünüm kategori sayfalarındaki alt kategori sekmeleriyle aynıdır. Satır sığarsa ortalı, sığmazsa yatay kaydırma + sağ kenar solması. Bir ürün, kategorisi veya alt kategorisi o kategori ya da alt kategorilerinden biriyse listelenir (`src/lib/products/category-match.ts`); sekme sayısı ile sayfa içeriği aynı kuralı kullanır. Filtre/sıralama çubuğu sayfa içindeyken zeminsizdir, header'ın altına yapışınca cam yüzey (`::before` bulanıklık, `::after` alt çizgi + gölge) opaklıkla belirir; yapışma `data-stuck` ile işaretlenir.

Alt kategoriler (2026-10-01): kategori sayfasındaki alt kategori sekmeleri sayfa içi filtre değil, `/[kategori]/[altKategori]` sayfasına (ör. `/sutyen/bralet`) giden bağlantılardır. Alt kategori sayfasında başlık ağaçtaki adıdır, sekmeler kardeş alt kategorileri gösterir ve geçerli olan işaretlidir; "Hepsine bakın" üst kategoriye döner. Liste, ürünün kategorisi veya alt kategorisi o alt kategoriyse ürünü gösterir.

**Veri ve hız (2026-10-01):** `/yeni-gelenler`, `/[kategori]` ve `/[kategori]/[altKategori]` ürünleri ve kategori ağacını sunucuda okur (`lib/products/load-collection.ts`) ve HTML ile gönderir; istemci yalnız "Tekrar dene" için `/api/products` çağırır. Sorgu hatası boş liste değil uyarı + tekrar dene olarak görünür. Dijital hediye kartı ürünü (`category: hediye-karti`) giyim listesine girmez. Kategori şeridi sunucu bileşenidir. Filtre seçenekleri (renk, beden) sabit listeden değil, sayfadaki ürünlerden türetilir (`lib/products/filter-options.ts`); eski uydurma "Stil & Model" filtresi ve doğrulanmamış iddialar taşıyan alt imza ("%100 Saf İpek", "Sınırlı Edisyon") kaldırıldı. Filtre panelinin içeriği ilk açılışta oluşturulur. Kart görselleri `next/image` ile ızgaraya uygun boyutta ve AVIF/WebP iner; ilk satır öncelikli yüklenir. Akış sırasında `koleksiyon/loading.tsx` aynı geometride bir iskelet gösterir (CLS 0).

**Arayüz cilası (2026-10-01):** Uygulanan her filtre (alt kategori, renk, beden, fiyat, stok) panel kapalıyken de ızgaranın üstünde tek tek kaldırılabilir çip olarak görünür; birden fazlaysa "Tümünü temizle". Filtre yokken sonuç sıfırsa "Filtreleri Temizle" yerine "Bu kategoride henüz parça yok" ve tüm koleksiyon bağlantısı gösterilir. Sayfa yolu tam kontrastlıdır, son öğe `aria-current`. 640 px altında parça sayısı başlığın altında, 600 px altında aynı görünen 4'lü/6'lı düğmeleri tek düğmeye iner. Dokunmatikte araç çubuğu hedefleri 44 px'tir. 1024 px altındaki filtre çekmecesi açılınca odak içeri girer, Tab içeride kalır, sayfa kaymaz, kapanınca odak "Filtrele"ye döner. Sıralama listesi açılınca seçili seçeneğe odaklanır; ok/Home/End ile gezilir, Escape ve seçim odağı tetikleyiciye döndürür. Sayfa üst boşluğu `--header-height` ile verilir.

**Sade görünüm (2026-10-01):** Katalog başlığı Cormorant (`--font-display`, `--text-fluid-2xl`). Araç çubuğu kontrolleri tek stil: ince `--line-strong` çerçeve, dolgu ve gölge yok; durum mürekkeple (açık filtre mürekkep zemin, seçili ızgara simgenin altında ince mürekkep çizgi) verilir; sayfa içinde altta saç çizgisi. Filtre paneli başlığı Cormorant, bölümler saç çizgisiyle ayrılır; renkler kutusuz örnek + ad listesi (seçili örnek mürekkep halka), bedenler 44 px kare, fiyat gerçek radyo görünümü; masaüstünde panel ızgarayı canlı güncellediği için "Sonuçları Göster" yalnız 1024 px altında. Kartta tek hover hareketi kalır: ikinci gerçek görsel belirir (tek görselli kartta hafif yakınlaşma); gölge, üst çizgi ve parıltı süpürmesi kaldırıldı. Kategori/renk metni opaklıkla soldurulmaz, ürün adı "…" ile kesilmez (iki satır). Favori ve hızlı beden çubuğu klavye odağında da görünür. 600 px altında fiyat adın altına iner, "İncele" gizlenir (görsel ve ad zaten bağlantı).

**Üçüncü tur (2026-10-01):** Kartlardaki fotoğraf türü etiketi ("Ürün Çekimi" vb.) kaldırıldı. Hızlı eklemede beden düğmesi ~1,2 sn mürekkep zemin ve ✓ gösterir (`aria-label` "… eklendi"). Kategori sayfası alt kategorileri kutusuz sekmelerdir: seçili olan mürekkep alt çizgili; telefonda tek satır kaydırma ve sağ kenar solması. Sıralama menüsü düz kağıt (bulanıklık ve başlık satırı yok), tetikleyicide kısa etiket ("Önerilen", "Fiyat ↑", "Fiyat ↓", "A–Z"). 2/4/6 geçişi destekleyen tarayıcıda View Transitions ile kısa çapraz geçiş yapar, azaltılmış harekette anlıktır. **2'li (duo) düzen:** ürünün iki gerçek görseli (kapak + sıradaki ikinci `ProductMedia` görseli) yan yana; tek görselli üründe görsel sol yarıda, ad/açıklama/fiyat/beden sağ yarıda (600 px altında alt alta). Eksik ikinci görsel dosya adından veya slug'dan tahmin edilmez; yönetim panelinden medya eklenince çift görünüm kendiliğinden oluşur.

**2'li görünüm ve başlık (2026-10-01):** 2'li (duo) düzende her satır tek üründür: iki gerçek görsel yan yana (2:3, aralarında 1px çizgi), bilgiler görselin **altında** kağıt zeminde — solda kategori · renk, Cormorant ad, açıklama (2 satır), renk bağlantıları; sağda fiyat, beden çipleri ve alt çizgili "Ürünü incele ↗". İkinci gerçek görsel yoksa sağ yarı boş `--surface-soft` yüzeydir; görsel dosya adından tahmin edilmez, yönetimden medya eklenince dolar. Hızlı ekleme paneli: kağıt zemin, "Hızlı ekle" + canlı ipucu ("Beden seçin" / gerçek stok ≤ 3 ise altın nokta ve "az kaldı" / "Çantaya eklendi"), bedenler giyim sırasında (`lib/products/sizes.ts` `sortBySize`) tek parça şerit; tükenen beden üstü çizili ve devre dışı. Başlık bölümü sade ve ortalıdır: sayfa yolu yok; büyük Cormorant başlık, altında "N parça", kategorinin yönetimde yazılmış açıklaması (`Category.description`) varsa altında.

## Ürün detayı: iki rota, tek sözleşme

Sunucu geçerli ürün ve varyantları bulur; yanlış kategori kanonik adrese gider. Galeri gerçek ürüne ait görsellerden oluşur. Beden grubu stok durumunu belirtir; stoksuz varyant sepete eklenmez. Fiyat, materyal, bakım ve teslimat/iade metni doğrulanmış kaynağa dayanır. “Daha fazla bilgi”, beden ve kumaş kılavuzu, galeri kontrolü, favori ve öneri kartları somut sonuç üretir. İlgili ürün, beden seçimi ve sepet eylemi mobil satın alma şeridinde de erişilebilir kalır.

**Kabul:** Ürün yoksa 404. Beden yoksa alan düzeyinde açıklama. Stok eşzamanlı değişmişse sepete/ödemeye geçiş açık hata verir. Galeri duraklatılabilir ve azaltılmış hareket seçeneğini izler. Her iki detay rotasında kanonik URL, SEO ve veri aynı kalır.

Detay galerisi `ProductMedia.position` sırasındaki gerçek kareleri ve varsa posterli, kontrollü videoyu gösterir. Medyası olmayan eski ürün yalnız kendi kapak görselini gösterir; slug'a göre kampanya karesi eklenmez. Gerçek kardeş renge geçiş, o rengin ayrı fiyat/stok bağlamına sahip ürün rotasını açar.

**Ürün sayfası yenilemesi (2026-10-01):**
- *Hız:* ürün tek sorguyla okunur (metadata ve sayfa `cache`'li `loadProduct`'ı paylaşır); galeri ve modal görselleri `next/image` (ilk kare öncelikli, ilk dört kare erken; modal açılınca orijinal PNG'ler değil ekran boyutlu dosyalar iner).
- *Galeri:* sayfa açılınca akış hemen başlar; imleç sayfa açılırken zaten galerinin üstündeyse ilk 1,5 sn hover duraklatmaz (`hoverGraceUntil`). Azaltılmış harekette kendiliğinden akmaz.
- *Satın alma çubuğu (`pdp-purchase-stage`):* masaüstünde tek satır — kimlik (kategori · renk · varsa gerçek REF, Cormorant ad, fiyat + "KDV dahil") · renk varyantları · beden · favori + çantaya ekle. Yükseklik ekran yüksekliğine göre `--pdp-bar-h` (112 / ≤860px 96 / ≤720px 84); üst bölümün alt boşluğu aynı değeri kullanır, kısa dizüstü ekranlarda galeri alanı korunur. Sayfa kaydırılınca çubuk animasyonla `--pdp-bar-h-compact`'a (68 / 60) iner, ad/fiyat/küçük resimler/beden kutuları/düğmeler küçülür, üst satır ve beden başlığı katlanır; `--pdp-panel-h` yalnız tam ve oturmuş yükseklikten yazılır, üstteki alan oynamaz. Telefonda kenetli panel: ad, fiyat, renk küçük resimleri, beden düğmesi.
- *Renk varyantları:* aynı ailedeki yayında kardeş ürünler (`siblingColors`), kendi fotoğraflarıyla; tıklayınca o rengin `/urun/...` sayfası açılır, geçerli renk işaretli. Ayrı renk satırı kaldırıldı.
- *Bedenler:* sabit S–XL listesi yerine ürünün gerçek varyantları (giyim sırası); tükenen beden üstü çizili ve seçilemez, ilk stoktaki beden ön seçili; hiç stok yoksa düğme "Tükendi". Mobil beden sayfası gerçek stok yazar ("Son N adet", "Tükendi"; telefon düzeni için aşağıya bakın). Onaysız "Orijinal Ürün & Güvenli Ödeme" ibaresi ve paylaşılan sahte "REF. PN-001" kaldırıldı.
- *Stok bildirimi:* ürünün tükenen bedeni varsa hero altında "Bedenin tükendiyse haber verelim" formu (`StockAlertForm`); tükenen bedene tıklamak (masaüstü çubuk veya mobil sayfa) formu o bedenle açar. `/api/stock-alert` yalnız yayındaki ürünün gerçekten tükenmiş bedenini kabul eder, aynı e-posta + beden için ikinci kayıt açmaz; e-posta beden stoğa girince `dispatchStockAlerts` ile gider (kayıt ≠ gönderim).
- *Hero altı:* ana sayfa dili — Cormorant başlıklar, saç çizgileri. "Ürün hakkında" görseli ürünün ikinci gerçek karesi, yoksa kapağı (slug eşlemesi kaldırıldı). "Bilmen gerekenler" solda yapışkan başlık + sağda çizgili açılır liste (Kumaş ve bakım, Beden ve kalıp, Teslimat, Değişim ve iade). "Koleksiyondan" görsel üstü başlıklı kartlar + "Tümünü gör" → kategori; uydurma beden listeli hızlı ekleme kaldırıldı.
- *Galeri modalı:* açılınca odak kapat düğmesine gider, Tab içeride kalır, kapanınca açan düğmeye döner; kısa çıkış animasyonu; kontroller ve küçük resimler kademeli girer; büyütme noktası CSS değişkeniyle (yeniden çizim yok); büyüt/küçült simgesi bağlamsal geçişle değişir; düğmelerde sert çerçeve yerine gölge, basınca 0.96; dokunmatikte "Büyütmek için dokun".

**Satın alma çubuğu ve iskelet (2026-10-02):** Masaüstü çubuk üç bölge: solda yalnız ürün adı (Cormorant); ortada tek satır seçimler, etiket kontrolün solunda ("RENK" + renk küçük resimleri, geçerli renk altı çizili; "BEDEN" + kutular + "Beden rehberi"); sağda favori + fiyatı içinde taşıyan "Çantaya ekle". Kategori · renk · REF üst satırı ve ayrı fiyat satırı kaldırıldı. Tüm kontroller tek yükseklik (`--pdp-ctl` 44, kısa ekranda 40) ve aynı hizada; kaydırınca hepsi birlikte `--pdp-ctl-compact`'a (36) iner. Renk bloğu kardeş renk yoksa da görünür (yalnız geçerli renk). Ürün sayfası iskeleti (`urun/[slug]/loading.tsx`) gerçek sayfanın sınıflarını kullanır ve `pages/product.css`'i kendisi de içe aktarır; tam yüklemede, ürün→ürün geçişinde ve telefonda ölçülen CLS 0.

**Telefon düzeni (≤900px, 2026-10-15, Stradivarius mobil ürün sayfası örnek alındı):** Masaüstü değişmedi.
- *Header:* masaüstünde anasayfayla aynı hareket (üstte şeffaf, kaydırınca buzlu zemin ve çizgi gelir, aşağı kaydırınca saklanır, yukarıda geri gelir). Telefonda görselin üstünde sabit kalır, saklanmaz.
- *Galeri:* ekranın sabit panelin üstünde kalan kısmını doldurur (`100svh - --pdp-panel-h`, en az 420px), header görselin üstünde şeffaf. Kareler tam genişlik ve aralıksız, yana kaydırılır (scroll-snap).
  - Panelin hemen üstünde bölmeli çubuk: kayan tek çizgi yerine her kare için bir bölme. Görülen kareler soluk, gösterilen kare soldan dolar, sonrakiler silik. Ekran okuyucuya "Görsel 2 / 9" olarak okunur.
  - Sağda favori ve büyüt düğmeleri (44px, yarı saydam beyaz).
  - Duraklat düğmesi telefonda gizli.
- *Geri oku:* header'ın altında, ürünün kategorisine gerçek bağlantı.
- *Sayfa:* telefonda yalnız galeri ve bilgi paneli; footer ve galerinin altında içerik yok, sayfa kaymaz.
- *Bilgi paneli:* masaüstündeki gibi ekranın altına sabit ve hep görünür; galerinin alt kenarına biner. Yüksekliği JS ile ölçülür (`--pdp-panel-h`, ölçülene kadar 168px), galeri bu değeri kullanır.
  - Solda ürün adı (Manrope 18px, büyük harf, en çok iki satır), sağda fiyat.
  - Birden fazla renk varsa renk küçük resimleri.
  - Tam genişlik siyah "Beden seç" düğmesi; hiç stok yoksa "Tükendi — gelince haber ver".
  - Üstte tutamaç (panelin üst 44px'i). Çekerken panel parmağı izler; bırakınca açılırken çeyreği, kapanırken üçte biri geçtiyse o yöne oturur. Dokunmak açar/kapar.
  - Açıkken ekranın %85'i; köşeler büyür, arkası yavaşça kararır. Ad ile "Beden seç" arasında içerik panelin içinde kayar: ürün bilgileri (`ProductNotes`), stok bildirimi formu, "Koleksiyondan" şeridi.
  - Kapatma: aşağı çekince, karartmaya dokununca ya da Escape ile; odak tutamaca döner.
  - Tükenen bedene dokununca panel açılır, form görünür hâle gelir ve e-posta alanına odaklanır.
  - Açıkken sayfa kaymaz. Galeriyi boyutlandıran `--pdp-panel-h` açılıp kapanırken yeniden yazılmaz.
- *Beden paneli:* ortak `Dialog` ile alttan açılan panel; odak içeri girer, Escape kapatır, odak düğmeye döner, sayfa kaymaz.
  - Başlık "Beden seç", sağda "Ölçüler" (beden rehberi).
  - Bedenler 56px satırlar halinde.
  - Stokta bedene dokunmak çantaya ekler ve çantayı açar.
  - Az stokta "Son N adet" yazar.
  - Tükenen bedende "Tükendi" ve "Gelince haber ver ›" görünür, dokunmak stok bildirimi formunu açar.
- *Bilgi listesi (panelin içinde, sade liste):*
  1. "Daha fazla bilgi" açık başlar: açıklama, detaylar, renk.
  2. Kumaş ve bakım, Beden ve kalıp, Teslimat, Değişim ve iade: 54px satırlar, aralarında ince çizgi, ok işaretli.
  3. Satış koşulları bağlantısı.
- *Panelin alt içeriği:* stok bildirimi formu (tükenen beden varsa) ve "Koleksiyondan" yana kaydırmalı şerit.
  - `ProductLowerContent` telefonda panelin içinde çizilir. Sunucu çıktısı masaüstü yerindedir; telefonda CSS onu gizler, JS çalışınca panele taşınır.
  - Masaüstündeki "Bilmen gerekenler" bölümü panelde gizli; aynı liste en üstte.
- *Tam ekran galeri (≤768px):* her görsel ekranı kaplar, yukarı kaydırınca sonraki görsel gelir. Küçük resimler sağ kenarda dikey sütun: gösterilen büyük, diğerleri küçük, dokununca o görsele gider. Dokunma alanı hepsinde 44px; sütun en çok 340px boyunda. Kapat ve büyüt sağ üstte; oklar ve alt bilgi hapı telefonda gizli.
- *Gizlenenler:* "Ürün hakkında" görsel bölümü telefonda gizli.
- *Kategori adı:* geri oku ve göz atma satırları, kategori adını `Category` tablosundan alır (`categoryName`).

## Rehberler ve hizmet sayfaları

`/beden-rehberi`, `/stil-rehberi`, `/bakim-rehberi`, `/siparis-takip`, `/yardim`, `/iletisim` aynı düzeni paylaşır (`GuideHero` + `pages/guides.css`): mürekkep çizgili başlık, masaüstünde yapışkan başlık sütunlu numaralı bölümler, kartsız ince çizgili içerik, sonda ilgili rehberlere bağlantı.

- **Beden:** Satılan bedenler S, M, L, XL; ölçüler Türkiye (TR 36–42). Tek kaynak `lib/products/size-chart.ts`; göğüs/bel/kalça girildikçe gereken en büyük beden önerilir, tablo satırı işaretlenir, ölçüler farklı bedenlere düşerse veya tablo dışındaysa açıklanır. Sütyen bölümü göğüs altı ve göğüs farkından TR/EU bant + kup (70–95, A–E) hesaplar; satışın harf bedenle olduğu açıkça yazılır.
- **Stil:** Her kesim gerçek alt kategoriye (`/sutyen/bralet` vb.) bağlanır; kapatma oranı dört çizgili ölçekle gösterilir. Kesimi temsil etmeyen fotoğraf kullanılmaz.
- **Bakım:** Etiket sembolleri SVG çizimdir; kumaşa göre numaralı kurallar ve "Kaçın" notu. Doğrulanmamış sertifika/köken rozeti yok.
- **Takip:** Durum adları ve adımlar `lib/orders.ts` ile `/siparislerim` ile aynıdır.
- **Yardım:** Yanıtlar `yardim/faq.ts` içinde; koddaki davranışla (ücretsiz teslimat, 12 ay hediye kartı, iade `/siparislerim` üzerinden) tutarlı tutulur.
- **İletişim:** WhatsApp yalnız ortam değişkeniyle görünür; başarı ekranı yalnız mesaj destek kutusuna gittiğinde.

### Ayarlardan gelen vitrin (2026-10-02)

Yönetim → Ayarlar kaydedilince (`revalidateTag('store-settings')`) sitede hemen değişir:
- **Duyuru çubuğu** (`components/layout/AnnouncementBar.tsx`): açıksa header'ın üstünde tek satır, isteğe bağlı bağlantı (site yolu ya da yeni sekmede `https://`). Sayfa çubuğun yüksekliği kadar aşağı itilir; kaydırınca çubuk yukarı kayar ve header en üste çıkar (header'ın kendi eğrisi; azaltılmış harekette anlık).
- **Alt bilgi:** "Bize ulaşın" sütunu (e-posta, ayarlıysa telefon, WhatsApp, Instagram/TikTok/Pinterest; boş olan gösterilmez) ve `© yıl mağaza adı`.
- **İletişim sayfası:** e-posta, telefon, WhatsApp ayardan; form hata mesajındaki adres de.
- **Varsayılan başlık/açıklama:** kök düzen `generateMetadata`; sayfanın kendi başlığı varsa o geçerli.
- **"Az kaldı":** koleksiyon kartlarında eşik ayardan (0 işareti kapatır).
- **Bakım modu:** ziyaretçi `/bakim`'i görür (503, `Retry-After`), sepete ekleme/ödeme API'leri 503 döner; yönetici oturumu siteyi normal görür.
Header, duyuru ve alt bilgi `/yonetim` içinde çizilmez (`SiteChrome`).
