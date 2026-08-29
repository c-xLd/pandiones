# 04 — Mağaza İşlevsel Şartnamesi

## Ortak kabuk

### Header

- Logo `/` bağlantısıdır ve Montserrat Alt1 fontunu kullanır; metin/görsel erişilebilir adı `Pandiones` olur.
- Ana menü DB’de yayımlanmış kategori/koleksiyonlardan gelir. Boş/eksik URL’li öğe render edilmez.
- Arama butonu gerçek arama dialog/drawer’ını açar; submit `/arama?q=` route’una gider.
- Hesap ikonu auth özelliği açıksa `/hesabim`, değilse misafir sipariş takip akışına veya hiç gösterilmemeye gider.
- Sepet ikonu `/sepet`e bağlanır; sayaç sunucu sepetinden gelir. Mini cart açılırsa tüm klavye/focus davranışları çalışır.
- Mobil menü odak kilidi, Escape/kapatma, scroll lock ve gerçek bağlantılara sahiptir.

### Footer

Yönetilebilir menüler: Kategoriler, Yardım, Kurumsal, yasal sayfalar, iletişim ve sosyal hesaplar. Boş `href="#"`, `javascript:` veya işlevsiz newsletter formu yasaktır. Bülten sağlayıcısı hazır değilse form gösterilmez.

## Route haritası

| Route | Amaç | İndeks |
| --- | --- | --- |
| `/` | Marka/ürün ana sayfası | Evet |
| `/kategori/[slug]` | Kategori ürünleri | Evet; canonical filtrelenmemiş kategori |
| `/koleksiyon/[slug]` | Editoryal koleksiyon + ürünler | Evet |
| `/urun/[slug]` | Tek ürün ve varyantlar | Evet |
| `/arama?q=` | Site içi arama | Varsayılan noindex, follow |
| `/sepet` | Sepet | noindex, nofollow |
| `/odeme` | Checkout | noindex, nofollow |
| `/odeme/basarili` | Sonuç ekranı | noindex, nofollow |
| `/odeme/basarisiz` | Sonuç ekranı | noindex, nofollow |
| `/siparis-takip` | Misafir doğrulama/takip | noindex, nofollow |
| `/hesabim/*` | Hesap | noindex, nofollow |
| `/hakkimizda`, `/iletisim`, `/teslimat-iade`, yasal sayfalar | İçerik | Uygun olanlar indeks |

404/410, hata ve bakım durumları markalı, güvenli ve gerçek navigasyonlu olur.

## Ana sayfa

Tüm modüller `home_modules` ve gerçek katalog ilişkilerinden gelir. Editör boş modülü yayımlayamaz.

1. Hero: Türkçe iç giyim metni, yönetilen dikey/yatay medya, çalışan koleksiyon CTA’sı. WebGL/video yoksa poster ve CTA aynen çalışır.
2. Living Fabric hikâyesi: dekoratif hareket içerikten ayrıdır; metin gerçek HTML’dir.
3. Soft/Bold: yalnızca renk değiştirmez; DB’de etiketlenmiş gerçek koleksiyon filtresine bağlantı verir. Seçim URL veya kontrollü cookie ile korunur.
4. The Drop/koleksiyon: her kart gerçek ürün/koleksiyon route’una gider; fiyat/renk varsa DB’den.
5. Seçili Ürünler: varsayılan dört yayımlanmış ürün; editör sırası veya `featured_rank`. Dikey görsel oranı korunur. Yetersiz geçerli ürün varsa sahte/duble ürün eklenmez ve grid kalan sayıya göre dengelenir.
6. Kategori dünyaları ve editoryal kampanya: yalnızca yayımlanmış hedef route ve medya ile görünür.
7. Güven/teslimat/iade metinleri sistem ayarındaki gerçek politika ile uyumludur; uydurma “aynı gün kargo” yazılmaz.

Sinematik alan performans bütçesini aşarsa statik fallback’e geçer. Ana CTA JavaScript/WebGL beklemez.

## Listeleme, filtre ve arama

- Ürün kartı: kapak/hover görseli, ad, fiyat, indirim varsa eski/yeni fiyat, satılabilirlik, favori ve ürün bağlantısı.
- Kartın tamamına click handler verilse bile gerçek ürün linki bulunur. Hızlı ekleme yalnızca tek açık varyant varsa; aksi halde ürün/quick view içinde seçim ister.
- Filtreler: kategoriye göre beden, renk, fiyat aralığı, stok; değerler gerçek yayımlanmış varyantlardan hesaplanır.
- Sıralama: önerilen, yeni, fiyat artan/azalan. İzinli sabit enum dışında sorgu yoktur.
- URL parametreleri geri/ileri ve paylaşımda durumu korur. Desktop sidebar ve mobil drawer aynı state’i kullanır.
- Filtre uygula/temizle, aktif chip kaldırma ve sonuç sayısı çalışır. Her işlem yükleme/boş/hata durumuna sahiptir.
- Pagination/cursor crawl edilebilir kategori linklerini engellemez. Sonsuz scroll varsa erişilebilir “Daha fazla yükle” fallback’i bulunur.
- Arama boş/çok kısa sorguyu açıklayıcı biçimde reddeder; XSS-safe highlight; sonuçsuz durumda gerçek kategori linkleri sunar.

## Ürün detay

- Breadcrumb gerçek hiyerarşiyi ve bağlantıları gösterir.
- Galeri dikey görselleri bozmadan render eder; thumbnail, klavye, swipe, zoom ve alt metinleri çalışır.
- Başlık, SKU, açıklama, gerçek fiyat/indirim, stok, varyant seçenekleri, beden rehberi, materyal/bakım ve teslimat/iade özeti gösterilir.
- Seçenek kombinasyonu tek varyanta çözülür. Geçersiz kombinasyon disabled; URL varyant parametresi doğrulanır ve canonical ürün URL’sini bozmaz.
- “Sepete Ekle” varyant seçilmeden çalışmaz; alan hatasını gösterir. İşlemde disabled/loading, başarıda sepet sayacı ve canlı bölge güncellenir.
- Miktar maksimum satılabilir stok ve iş kuralıyla sınırlıdır.
- Favori yalnızca desteklenen auth varsa çalışır; giriş gerekiyorsa güvenli yönlendirme yapılır.
- İlgili ürünler gerçek kategori/koleksiyon sorgusudur; mevcut ürün tekrarlanmaz, uydurma veri yoktur.
- JSON-LD ile görünen fiyat/stok/varyant aynı sorgudan gelir.

## Sepet

- Her satır ürün linki, snapshot olmayan güncel isim/görsel, varyant, adet kontrolü, güncel fiyat ve kaldır eylemi sunar.
- Adet değişince sunucu doğrular; optimistic UI hata halinde geri alınır.
- Fiyat/stok değişmişse açık uyarı ve yeni toplam gösterilir; kullanıcı checkout öncesi kabul eder.
- Kupon ekle/kaldır gerçek endpoint’e bağlıdır; neden uygulanmadığı güvenli ve anlaşılırdır.
- Kargo tahmini yalnızca gerçek kuralla hesaplanır; kesin olmayan değer “tahmini” olarak etiketlenir.
- Özet: ara toplam, indirim, kargo, vergi politikası ve genel toplam.
- Boş sepette gerçek kategori bağlantıları. Checkout butonu boş/geçersiz sepette disabled ve neden açıklıdır.

## Checkout

Tek sayfa veya adımlı olabilir; her iki durumda da browser back veri kaybettirmez ve ödeme oluşturma çift sipariş üretmez.

1. İletişim: e-posta, telefon.
2. Teslimat: ad-soyad, şehir, ilçe, posta kodu gerekiyorsa, açık adres; opsiyonel fatura ayrımı.
3. Kargo: yalnızca adrese uygun gerçek yöntemler.
4. Sipariş özeti: son sunucu hesaplaması.
5. Onaylar: Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi sürümleri link/modal ile okunabilir; zorunlu onaylar ayrı. KVKK aydınlatması “okudum” kaydı olabilir, hukuki dayanak olmadan zorunlu açık rıza gibi sunulmaz. Pazarlama izinleri opsiyonel ve kapalıdır.
6. “Ödemeye Geç”: validation, stok rezervasyonu, sipariş, PayTR token. Tek tıklama sırasında yükleme ve güvenli retry.
7. PayTR iFrame: kart alanları PayTR’de. Güvenli ödeme metni gerçeğe uygun; kart/log/analytics kaydı yok.

Form davranışı: label her zaman görünür, autocomplete doğru, telefon/e-posta normalize, alan hatası yanında ve özet olarak, ilk hataya focus. Checkout girdisi query string’e veya analytics’e gitmez.

## Ödeme sonucu ve sipariş takip

- Başarı redirect’i önce `pending` görebilir. “Siparişiniz doğrulanıyor” + sınırlandırılmış status kontrolü; callback başarılıysa sipariş numarası ve sonraki adımlar.
- Başarısız redirect siparişi kendi başına iptal etmez; D1 durumu gösterilir. Retry aynı sepet/sipariş kuralına göre yeni benzersiz payment attempt üretir.
- Sonsuz polling yok; kullanıcı destek ve sipariş takip yollarına yönlendirilir.
- Misafir takipte sipariş no/e-posta göndermek doğrudan detay açmaz; e-posta OTP veya imzalı süreli link ile doğrulanır.
- Takip sayfası ödeme özeti, durum zaman çizgisi, kargo takip ve izinli iptal/iade eylemlerini gösterir.

## İletişim ve yasal sayfalar

- İletişim formu gerçek kayda/ticket veya doğrulanmış e-posta gönderimine bağlıdır; spam koruması, rate limit, başarı referansı ve privacy notice içerir. Sağlayıcı yoksa form yerine doğrulanmış iletişim kanalları gösterilir.
- Teslimat/iade sayfası admin’de sürümlenir; checkout siparişe kullanılan sürümü bağlar.
- İç giyim hijyen istisnası koşullu ve hukuk onaylı metinle açıklanır.

## Responsive ve performans

- 320 px’den geniş masaüstüne taşma olmadan; gerçek cihazlarda touch target en az yaklaşık 44×44 px.
- Dikey ürün kartları `aspect-ratio` ile kararlı alan ayırır; CLS üretmez.
- Hero poster ve kritik ürün görseli responsive `srcset/sizes`, sonraki görseller lazy.
- Mobilde ağır WebGL yerine optimize poster/video; reduced-motion’da sticky/pinning olmadan içerik sırası korunur.
- Checkout ve admin’de ağır motion/WebGL yoktur.

