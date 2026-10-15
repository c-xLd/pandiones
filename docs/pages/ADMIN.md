# Yönetim paneli sözleşmesi

Kapsam: `/yonetim` ve `/api/admin/*`. Yönetim UI'si rol kontrolünün tek katmanı değildir; her Route Handler aynı yetkiyi kendi içinde denetler.

## Yapı (2026-10-02)

`src/app/yonetim/page.tsx` yalnız kabuktur: kenar çubuğu grupları (Genel, Satış, Katalog, Müşteri, Mağaza; `_lib/tabs.ts`), üst çubuk, başlık ve komut paleti. Her sekme kendi dosyasındadır (`_tabs/OrdersTab`, `ProductsTab`, `CategoriesTab`, `CouponsTab`, `GiftCardsTab`, `ReturnsTab`, `WaitlistTab`, `CustomersTab`, `MessagesTab`, `NewsletterTab`; `_components/DashboardTab`, `SettingsTab`, `ActivityTab`, `SecurityTab`) ve kendi verisini yükler; eski tek dosya (2279 satır) bölündü. `?tab=` geri/ileri ile senkron, eski `?tab=stats` gösterge paneline açılır. Kenar çubuğu rozetleri `/api/admin/stats` sayılarındandır.

Görsel dil (`src/styles/pages/admin-shell.css`): sıcak kâğıt zemin + sabit hafif doku, koyu "ada" kenar çubuğu, göz başlığı (eyebrow) + büyük Cormorant sayfa başlığı, çift çerçeveli kartlar (renkli tepsi + kâğıt çekirdek, eşmerkezli `--radius-xl`/`--radius-xl-inner`, `--shadow-float`), iç içe ikonlu hap düğmeler, ince çizgi ikonlar (`AdminIcon`). Hareket yalnız `transform`/`opacity`, `--ease-drawer`; azaltılmış harekette kapalı. 1024 px altında kenar çubuğu çekmece olur, 768 px altında kartlar tek sütun.

- **Gösterge paneli:** son 30 gün ciro (önceki 30 güne göre değişim), tek seri alan grafiği (30 gün / 12 ay; imleç + ipucu, ok tuşlarıyla gezinme, ekran okuyucu için tablo), sipariş ve ortalama sepet kartları, bekleyen işler (ilgili sekmeye gider), düşük stokta satır içi stok kaydetme (mevcut `PATCH /api/admin/products`), en çok satanlar, son siparişler. Ciro yalnız ödenmiş siparişler, ödeme gününe göre (`src/lib/admin/dashboard.ts`, `tests/admin-dashboard.test.ts`).
- **Ayarlar:** altı bölüm (Mağaza, İletişim ve sosyal medya, Kargo, Duyuru ve bakım, Arama motorları, Stok); kalıcı etiketler, istemcide ve sunucuda aynı doğrulama (`validateSettings`), alan hataları ve ilk hatalı alana odak, yalnız değişiklik varken etkin kaydet/vazgeç çubuğu, kaydedilmemiş değişiklikte sayfadan çıkış uyarısı, eşzamanlı düzenlemede 409. Kayıt sitede hemen uygulanır.
- **Etkinlik kaydı:** tür filtresi, zaman çizelgesi, alan bazında önce → sonra, "Daha eski kayıtlar".
- **Komut paleti:** Ctrl/⌘ K; bölümlere git, sipariş/ürün/müşteri ara (`/api/admin/search`), ok tuşları + Enter, Esc ile kapanır ve odak geri döner.
- **Oturum süresi:** yönetici oturumu en fazla 8 saat, 30 dakika işlemsizlikte kapanır (sunucu denetler). `SessionGuard` panel kullanıldıkça süreyi yeniler; bitişe 2 dakika kala geri sayımlı uyarı açılır ("Oturumu sürdür" / "Çıkış yap"; 8 saat dolarken yalnız çıkış). Bitişten önce sunucuya yeniden sorar (başka sekme yenilemişse çıkış yapmaz). Kapanınca giriş ekranı nedenini yazar. Şifre unutulursa: `npm run admin:reset-password`.
- Oturum doğrulanırken metin ve kök vitrin `loading.tsx` yerine panelin kendi iskeleti (`src/app/yonetim/loading.tsx` ve `AdminShellSkeleton`) çizilir; sekmeler `next/dynamic` ile kod bölmeli yüklenir ve sekme yüklemeleri 1:1 geometrik iskelettir (`TabLoading`, `OrdersSkeleton`, `ProductsSkeleton`, `DashboardSkeleton`, `SettingsSkeleton`). Sekmeler arası geçişte ziyaret edilen sekmeler unmount edilmeden `hidden` ile korunur, böylece filtre ve arama durumu kaybolmaz.
- Giriş kapısı: boş alanlar (önceden doldurulmuş kimlik bilgisi kaldırıldı), bekleme ve hata durumu; müşteri hesabıyla gelene yetkisi olmadığı söylenir.

**Sekme içerikleri (Dilim 3, 2026-10-02):** on veri sekmesi (siparişler, ürünler, kategoriler, kuponlar, hediye kartları, iadeler, stok talepleri, müşteriler, destek, bülten) kabukla aynı dile taşındı (`src/styles/pages/admin-content.css`, kurallar DESIGN.md "Yönetim …" satırlarında). İşlevler aynıdır; değişen davranış:

- `alert()`/`confirm()` yok: sonuç sekme üstünde canlı bölgeli bildirimle (`_components/TabNotice`), silme/dondurma/toplu durum gibi eylemler onay penceresiyle (`_components/ConfirmDialog`) yapılır; hata pencerede kalır.
- Her istek `_lib/request.ts` üzerinden: sunucu hatası ve bağlantı kopması görünür mesajdır, hiçbir istek sessizce başarısız olmaz. Hassas işlemler `adminFetch` ile 2FA yeniden doğrulamasını korur.
- Formlar `Dialog` içinde kalıcı etiket, istemci doğrulaması (kuponda sunucuyla aynı `validateCouponInput`), bekleme metni ve çift gönderim engeliyle çalışır.
- Kaydedilen satır sunucunun döndürdüğü kayıtla güncellenir (sipariş PATCH'i güncel siparişleri döndürür); listeyi baştan yüklemek gerekmez.
- Sipariş satırında tek "sonraki adım" düğmesi (Hazırlamaya al → Kargoya ver → Teslim edildi); takip numarası yoksa "Kargoya ver" kargo penceresini açar. Serbest durum seçimi sipariş ayrıntısındadır. "Kaydet ve kargoya ver" yalnız ödenmiş/hazırlanan siparişte görünür.
- WhatsApp takip mesajı ("kargoya verilmiştir") yalnız takip numarası olan siparişte sunulur.
- Depo fişi yazdırılırken yalnız fişler basılır ve her sipariş ayrı A4 sayfasına düşer (önceden sayfa kesmesi yoktu).
- Ürün kartında beden stoğu yalnız değer değiştiğinde kaydedilir; kayıt durumu ve hata alanın yanında görünür. Kategori filtresi ürünlerdeki gerçek kategorilerden üretilir.
- Kupon durumu tarih ve kotadan hesaplanır (Geçerli, Başlamadı, Süresi doldu, Kota doldu, Kapalı); önceden pasif kupon da yeşil "Aktif" görünüyordu.
- Hediye kartı oluşturma, e-postanın gerçekten gönderilip gönderilmediğini bildirir (API `emailSent` döndürür); gönderilemezse kodun elle iletilmesi istenir.
- İade reddinde gerekçe düzenlenebilir ve müşterinin gördüğü söylenir.
- Uydurma/pazarlama metinleri kaldırıldı ("VIP", "lüks teslimat", rakip marka adı, emoji etiketler).

## Sekmeler ve işlemler

| Sekme | Gösterilen veri | Çalışan eylem | Doğrulama |
| --- | --- | --- | --- |
| İstatistik | Gerçek sipariş/ciro/AOV/sayı | Tarih veya kapsam varsa yenile | Ödenmemiş sipariş ciroya girmez |
| Sipariş & Sevkiyat | Durum, kalem, takip, ödeme hareketleri, yönetici notu | Öncelikli yeni gelen siparişler alanı, aylara göre filtre ve tablo ayrımı, sayfalama (10–100), arama, kargo/tarih filtresi, tek tıkla durum stepper'ı, hızlı kargo kodu girişi, canlı kargo takip linki & WhatsApp bildirim kısayolu, yönetici notu, detay çekmecesi, tekil ve toplu A4 depo fişi yazdır, CSV | Geçiş kuralları, taşıyıcı ve takip numarası sunucuda denetlenir (`transitions.ts`); Kargoda'ya geçişte kargo e-postası ve sonucunun kaydı; ödeme kayıtları ve zaman çizelgesi |
| Ürün | Taslak/yayın durumu, sıralı medya, renk ailesi, fiyat, beden stoğu, vitrin durumu | Taslak oluştur/düzenle, görsel/video yükle, kapak/sıra/renk bağla, yayınla, vitrin (featured) toggle, CSV | Pozitif fiyat, negatif olmayan stok, gerçek kapak ve video posteri |
| Kategori | Hiyerarşik kategori ağacı | Kategori ekle, düzenle, sırala, sil | Slug benzersizliği, alt kategori tutarlılığı |
| Hediye Kartı | Kod, bakiye, alıcı, tema, kullanım dökümü | Hediye kartı tanımla, dondur/aç, kullanım geçmişi incele | Geçerli bakiye ve e-posta; e-posta gönderim sonucu bildirilir |
| Destek Masası | İletişim mesajları, ilgili sipariş, konu, durum | Yanıtlandı işaretle, mailto ile yanıtla, sil | Yalnızca yetkili ADMIN erişimi |
| Müşteriler | Kayıtlı üyeler, LTV, sipariş toplamı, adresler | Arama, profil dökümü, CSV dışa aktar | KVKK güvenli dışa aktarma |
| Stok Talepleri | Beden bekleme listesi (Waitlist) yoğunluk özeti | Talep incele, talep kaydı sil | Stok 0'dan yukarı çıkınca bekleyenlere e-posta (`tests/stock-alert-trigger.test.ts`) |
| Kupon | Kod, indirim, limit, geçerlilik, durum | Oluştur, sil (kapatma API'si yok) | İndirim oranı/tutarı ve kullanım limiti sınırı |
| İade | Sipariş, gerekçe, durum | Onayla/reddet, müşteriye görünen gerekçe | ADMIN kontrolü; durum değeri listede olmalı (geçiş sırası denetlenmiyor) |
| Bülten | Gerçek aboneler | Listele, panoya kopyala, sil | Kişisel veriye ADMIN erişimi |

## Etkileşim standardı

Sekmeler arası geçişte `?tab=` parametresi senkronize edilir; sayfa yenilendiğinde aktif sekme korunur. Her sekme: yükleme iskeleti → hata + "Tekrar dene" (asla boş liste gibi değil) → boş durum metni → veri.

Siparişler (`?tab=orders`, Dilim 4 — 2026-10-03):
- **Sunucu tarafı liste:** filtre, arama ve sayfalama `GET /api/admin/orders`'ta; filtreler adres çubuğunda (`?tab=orders&status=…&q=…&page=…`), yenileme ve paylaşılan bağlantı aynı listeyi açar. Arama 300 ms gecikmeli, eski istek iptal edilir; yenilenirken tablo yerinde kalır, üstte ince yükleme çizgisi. Sekme değişince filtre parametreleri temizlenir.
- **Durum kutuları ve sayılar** tüm siparişlerden (filtreden bağımsız): Hazırlanacak, Kargoya verilecek, Kargoda, Takip numarası eksik.
- **Öncelikli liste:** ödenmiş siparişler en eskiden; ilk 25'i, fazlası için "Tümünü listede göster".
- **Güvenli durum akışı** (`src/lib/orders/transitions.ts`): satırda yalnız izinli adımlar — birincil sonraki adım (Hazırlamaya al → Kargoya ver → Teslim edildi) ve ikincil adımlar (Doğrudan kargoya ver, bir adım geri al; geri alma onaylı). Ödeme bekleyen/başarısız ve iade edilmiş sipariş panelden değişmez; Teslim edildi son durum. Takip numarası yoksa "Kargoya ver" kargo penceresini açar. Toplu çubuk her hedef için uygun sipariş sayısını gösterir; uymayanlar atlanır ve nedenleriyle bildirilir.
- **Kargo e-postası sonucu:** gönderilemezse bildirimde, sipariş ayrıntısında uyarı ve zaman çizelgesinde kırmızı satır.
- **Sipariş ayrıntısı** (`GET /api/admin/orders/[id]`): izinli durum düğmeleri, kargo (firma listeden, takip no 6–40 harf/rakam/tire), yönetici notu (yalnız panel ve depo fişinde), ürünler ve tutar dökümü, **zaman çizelgesi** (oluşturuldu, ödeme denemeleri, ödeme alındı, durum/kargo/not değişiklikleri kimin yaptığıyla, kargo e-postası), ödeme kayıtları.
- **Toplu kargo yükle:** dosya ya da yapıştırma (`sipariş no; firma; takip no`, ≤200 satır) → sunucuda deneme (hiçbir şey yazılmaz) → satır satır geçerli/hatalı önizleme → isteğe bağlı "Kargoya da ver" → uygula → yazılan, atlanan ve e-postası gitmeyenler.
- **CSV:** seçiliyse seçilenler, değilse mevcut filtrenin tamamı (en çok 2.000 satır; aşılırsa söylenir).

PTT gönderisi (Dilim 5 — 2026-10-04):
- **Akış (sözleşme yokken, elle kip):** Siparişte "PTT gönderisi" → ayrıntıda desi, koli, isteğe bağlı ağırlık → "Gönderi oluştur" (sipariş Ödendi ise Hazırlanıyor olur) → "Kargo etiketi" (10×10 cm, sipariş referansının Code 128 barkoduyla) → paket şubeye → şubenin fişindeki **PTT barkodu** girilir (müşterinin takip numarası olur) → "Şubeye teslim ettim" (sipariş Kargoda, müşteriye kargo e-postası; gönderilemezse uyarı) → PTT takip sayfasına bakılarak Dağıtımda / Teslim edildi / Teslim edilemedi / Göndericiye döndü elle girilir (Teslim edildi siparişi de tamamlar).
- **Barkod girildikten sonra** etiket PTT barkodunu basar. Gönderi yalnız kargoya verilmeden iptal edilir; iptal siparişin takip numarasını kaldırır ve yeni gönderiye izin verir.
- **Tutarlılık:** sipariş listesinden yapılan Kargoda / Teslim edildi / geri alma ve CSV ile toplu takip numarası yüklemesi gönderiyi de günceller (`src/lib/shipping/sync.ts`); iki ekran birbirinden ayrışmaz.
- **Liste:** kargo sütununda gönderi durumu ("Barkod bekleniyor", "Etiket basılmadı"); toplu çubukta "Kargo etiketi" (seçili siparişlerin gönderileri, her biri ayrı 10×10 sayfa); filtre "Etiketi basılmamış", "Teslim edilemeyen".
- **Gönderici:** Ayarlar → Kargo (ad, telefon, adres, ilçe, il, varsayılan desi). Eksikse etiket ve gönderi oluşturma kapalı, nedeni yazılı.
- **PTT web servisi (sözleşme sonrası):** `PTT_MUSTERI_ID` ve `PTT_SIFRE` tanımlanınca API kipi: barkod kaydedilirken alıcı bilgileri PTT'ye yüklenir (`kabulEkle2`), iptal PTT kaydını da siler, hareketler günde bir otomatik gelir (`/api/cron/shipments`, zaman çizelgesinde "PTT:" satırları) ve durumlar kendiliğinden ilerler. Ayrıntı OPERATIONS.md.

Ürünler (`?tab=products`, Dilim 4):
- **Tablo:** görsel, ad + renk + kategori + medya sayısı, durum ve vitrin anahtarı, fiyat ve beden stokları satır içinde düzenlenir (yalnız değişince kaydedilir; Ayarlar'daki düşük stok eşiğinin altı sarı, 0 kırmızı; bedende bekleyen talep rozeti), son 30 gün satılan adet ve ciro (ödenmiş siparişler).
- **Sıralama:** eklenme, ad, fiyat, stok, 30 gün satış, bekleyen talep (başlık düğmeleri `aria-sort` ya da seçim kutusu). **Filtre:** arama, kategori; özet kutuları Yayında / Taslak / Eşik altı stok / Talep bekleyen beden filtreyi açar.
- **Toplu işlem:** Yayınla (yayınlanamayanlar eksikleriyle bildirilir), Taslağa al, Vitrine al/çıkar, Kategori değiştir, Toplu sil — onaylı, her ürün etkinlik kaydına. Seçim yapıldığında altta akıcı slide-up ve yüzen dalgalanma (floating) animasyonlu, canlı sayaç göstergeli toplu işlem çubuğu (`.adm-dock`) açılır. Sipariş geçmişi olan ürünler silinemez ve raporda belirtilir; siparişi olmayan ürünler ilişkili bedenleri ve medya dosyalarıyla birlikte güvenle silinir.
- **Sil** (çöp kutusu, 2026-10-14): onay penceresi + 2FA yeniden doğrulama; ürün, bedenleri, görselleri, favori ve stok talepleri kalıcı silinir, etkinlik kaydına yazılır. Siparişte geçen ürün silinmez (fatura/iade kaydı); pencere bunu söyler ve taslağa almayı önerir. Depodan silinemeyen dosya varsa sessiz geçilmez, uyarı gösterilir.
- **Kopyala:** aynı bilgi ve bedenlerle taslak; stok 0, medya kopyalanmaz (dosyalar paylaşılırsa birinden silmek diğerini bozar). Kopya düzenleyicide açılır.
- **Ürün düzenleyici** (`/yonetim/urunler/yeni`, `/yonetim/urunler/[id]`, 2026-10-14):
  - **Düzen:** yönetim kabuğu içinde tam sayfa; Ayarlar ile aynı tepsi + kâğıt çekirdekli iki bölüm ve sağda yapışkan önizleme (renk noktalarıyla renk değiştirme) + yayın kutusu (1100 px altında alta iner). Kaydet/Vazgeç alttaki kaydet çubuğunda; kaydedilmemiş değişiklikle sayfadan çıkışta tarayıcı uyarısı. Ayrı "Ürün medyası" ve "Renk ailesi" bölümleri kaldırıldı; ikisi de renk tablosunda.
  - **Ürün bilgileri:** ad; tek alanda aranabilir kategori ağacı (ana kategori yalnız açılır, ürün alt kategoriye yerleşir; alt kategorisi olmayan kategori seçilebilir); açıklama; detaylar ve bakım çoklu, materyal tekli aranabilir seçim (hazır seçenekler + yazıp ekleme, bu tarayıcıda hatırlanır).
  - **Renkler, bedenler ve medya:** renk skalası + renk ismi + "Renk ekle", seçilen renkler × ile çip olarak; "Mevcut bir ürünü renk olarak bağla" aynı kategorideki, bu modelin ailesinde olmayan bir ürünü onayla aileye alır (fiyatı, stoğu, görselleri kendi kaydında kalır; ailesi yoksa ürün adıyla aile açılır). Beden çoklu seçimi kategoriye göre önerilir (uyumsuz beden uyarı olarak gösterilir, silinmez). Tablo renge göre gruplu: grup satırında satış fiyatı, piyasa fiyatı, KDV; altında **medya şeridi**; beden satırında barkod, stok, stok kodu. Hücre bazında doğrulama kaydetmeden önce gösterilir.
  - **Medya şeridi ve Renk medyası:** şerit rengin görsellerini ve videosunu galeri sırasıyla gösterir; her karede çekim türü (Düz / Manken / Detay) ya da "Kapak". Kareye tıklamak "Renk medyası" penceresini o öğede açar: her öğenin çekim türü ve açıklaması ayrı düzenlenir (hemen kaydedilir, öğe altında "Kaydedildi"/hata), sıra, kapak, silme (iki adımlı), videoda poster seçimi. Yeni görseller çoklu seçilir/sürüklenir; her dosyanın kendi çekim türü ve açıklaması vardır, boş açıklama yüklemede ad + renk + türden oluşturulur. Her renge **en çok bir video** (MP4/WebM ≤50 MB); poster o rengin görsellerinden seçilir, posteri olan görsel silinemez.
  - **Kaydedilmemiş renk:** fiyat ya da ad girilmeden de görsel/video seçilebilir; dosyalar tarayıcıda bekler (şeritte "kaydedince yüklenir"), "Taslak oluştur"/"Değişiklikleri kaydet" rengi oluşturduktan sonra yükler (ilk görsel kapak). Yüklenemeyen dosya renk ve dosya adıyla bildirilir; yeni ürün o durumda sayfada kalır.
  - **Stok kodu:** boş bırakılan her beden kodu kayıtta sunucuda oluşturulur: `PAN-<ad 8>-<renk 4>-<beden>` (Türkçe harfler ASCII). Başka üründe aynı kod varsa `-2`, `-3` … eklenir; elle yazılan kod korunur (çakışırsa hata). Hücre boşken önerilen kod yer tutucu olarak görünür. Ürün adı değişince mevcut kodlar değişmez; "Kodları yeniden oluştur" kaç kodun değişeceğini sorup hepsini (elle yazılanlar dâhil) yeniden türetir, kaydedene kadar Vazgeç ile geri alınır.
  - **Kaydet:** önce bu ürün, sonra değişen diğer renkler, sonra yeni renkler (aileye taslak); bir renk kaydedilemezse adıyla bildirilir, diğerleri kayıtlı kalır. Kayıtlı bir rengin ×'i ürünü silmez, aileden çıkarır (onaylı).
  - **Yayın kutusu:** düzenlenen rengin eksikleri (kapak, fiyat, beden), Yayınla/Taslağa al; diğer renkler kendi sayfalarından yayınlanır. Kategoriler yüklenemezse görünür hata ve tekrar dene.

Hediye kartı sekmesinde yöneticinin tanımladığı kart alıcıya e-postayla gönderilir; her kartın hangi siparişlerde ne kadar harcandığı `GiftCardUsage` geçmişinden gösterilir.

Stok talepleri (`WaitlistTab`) bekleyen "Gelince haber ver" taleplerini ürün ve bedene göre gruplar; en çok talep edilen üstte. Tek tek kayıtlar ikinci görünümdedir.

## Yetki kabulü

Oturumsuz istek, CUSTOMER ve ADMIN ile tüm GET/POST/PATCH/DELETE rotaları `tests/` paketinde denetlenmektedir. Tüm API rotaları `getCurrentUser(request)` üzerinden sunucu tarafında rol kontrolü yapar; yetkisiz çağrılarda 403 döner ve veri sızdırmaz. `tests/admin-gift-cards.test.ts`, `tests/admin-contact-messages.test.ts`, `tests/admin-returns-auth.test.ts` ve `tests/admin-stats-accuracy.test.ts` ile tüm yönetim rotalarının güvenliği ve ciro doğruluğu kanıtlanmıştır.
