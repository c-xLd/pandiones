# Hesap, favoriler ve iade

Kapsam: `/giris-yap`, `/hesabim`, `/siparislerim`, `/favorilerim` ve iade talebi.

## Giriş ve kayıt

Giriş ve kayıt tek ekranda ayrı durumlar olarak görünür. Alanlar kalıcı etiketlidir; parola kuralları gönderimden önce görülebilir. Hatalı bilgi genel hata verir, kullanıcıyı belirsiz döngüye sokmaz. Başarılı giriş hedeflenen sayfaya güvenli biçimde döner; açık yönlendirme URL'si kabul edilmez. Giriş yapmış kullanıcı aynı formda kalmaz. Bekleme sırasında tekrar gönderim kilitlenir; ağ hatasında alanlar korunur. Test/seed hesapları arayüzde gösterilmez. `?redirect=` yalnız site içi yol kabul eder (`src/lib/auth/safe-redirect.ts`); header'daki hesap bağlantısı bulunulan sayfayı bu parametreyle taşır.

## Hesabım

Oturum doğrulanana kadar özel veri render edilmez; bekleme sırasında başlık ve sekme geometrisinde skeleton görünür. Oturum yoksa sayfa `/giris-yap?redirect=/hesabim#<sekme>` adresine `replace` ile yönlenir. Sayfa ince bir kabuktur (`src/app/hesabim/page.tsx`); sekmeler `src/app/hesabim/_components/` altındadır, saf yardımcılar `_components/lib.ts` içinde test edilir (`tests/account-lib.test.ts`). Stiller `src/styles/pages/account.css` dosyasındadır ve yalnız token kullanır.

Görsel dil editoryaldir: Cormorant selamlama, monogram, gerçek sayılardan oluşan metrik satırı (aktif/toplam sipariş, favori, hediye kartı bakiyesi), ince çizgilerle ayrılan bölümler; altın vurgu yalnız etkin sekme alt çizgisi, monogram ve sipariş ilerlemesindeki güncel adımdadır. Yapay rozet ("doğrulanmış hesap" vb.) kullanılmaz.

Sekmeler WAI-ARIA tab desenidir (`role="tablist"`, `aria-controls`, ok/Home/End tuşları) ve hash ile derin bağlanır: `#favoriler` (varsayılan), `#cuzdan`, `#iadeler`, `#adresler`, `#profil`, `#tercihler`. Eski `#siparisler` bağlantısı `/siparislerim`'e yönlenir. Sekmelerin üstünde son siparişi gösteren şerit (`RecentOrder`) ve siparişlere götüren metrikler bulunur. Diyaloglar `components/ui/Dialog.tsx` ile açılır: body'ye portal, odak tuzağı, Escape, kaydırma kilidi, odağın açan düğmeye dönmesi; telefonda alt sayfa.

- **Hediye kartları (`#cuzdan`):** `GET /api/gift-cards/my-cards`; yükleme skeleton, hata "Tekrar dene" ile gösterilir ve boş liste yalnız başarılı boş yanıtta çıkar. Kartın durumu gerçek alanlardan (aktif, süre, bakiye) türetilir. Bakiye sorgusu `POST /api/gift-cards/balance`.
- **Favoriler:** `user.wishlists`; stok ve mevcut bedenler, ürün bağlantısı, kaldırma (bekleme ve satır içi hata ile).
- **İadeler:** tüm talepler (yeni talep `/siparislerim` üzerinden açılır), durum (`BEKLIYOR`, `ONAYLANDI`, `REDDEDILDI`) ve müşteri hizmetleri notu; iç giyim hijyen kuralı hatırlatılır.
- **Adresler:** `GET/POST/PATCH/DELETE /api/auth/addresses`. Başlık seçimi (Ev, İş, Yazlık, Diğer), alan düzeyinde doğrulama (telefon, en az 5 karakterlik açık adres, il, ilçe, 5 haneli posta kodu), varsayılan yapma, kopyalama, "Haritada aç" bağlantısı, satır içi silme onayı; tüm hata yolları görünür. Otomatik adres önerisi yoktur. Geçmiş siparişlerde kullanılan adresler ayrıca listelenir.
- **Profil ve güvenlik:** `PATCH /api/auth/profile` (ad en az 2 karakter, telefon 7–15 rakam) ve `PATCH /api/auth/password` (en az 6 karakter, eşleşme, eski şifreden farklı). E-posta salt okunurdur. Alan hataları `aria-describedby` ile bağlıdır.
- **İletişim tercihleri:** `POST /api/newsletter/account`; başarı ve hata tonları ayrı gösterilir.

## Siparişlerim

`/siparislerim` (`src/app/siparislerim/`, stiller `src/styles/pages/orders.css`). Oturum yoksa `/giris-yap?redirect=/siparislerim…` adresine yönlenir; veri `user.orders` (sunucuda sahiplikle filtrelenmiş). Sipariş yardımcıları `src/lib/orders.ts`, diyaloglar `src/components/orders/` altındadır.

- **Düzen:** Başlıkta konum bağlantısı, büyük serif başlık ve gerçek sayılar (sipariş, devam eden, teslim edilen). Masaüstünde iki bölme: solda yapışkan, kendi içinde kayan liste; sağda seçili siparişin ayrıntısı. Seçim `?siparis=PAN-…` ile derin bağlanır; parametre yoksa masaüstünde ilk sipariş gösterilir. 900 px altında tek görünüm: liste ya da "Tüm siparişler" geri bağlantılı ayrıntı. Hesabın "Aktif sipariş" metriği `?filtre=devam` ile açılır.
- **Liste satırı:** Siparişteki parçaların yelpaze gibi açılan küçük görselleri, numara, toplam, tarih ve parça sayısı, durum etiketi (devam eden durumda nabız atan nokta; azaltılmış harekette durur) ve dört parçalı ilerleme çizgisi. Filtre (tümü, devam eden, teslim edilen, iade talepli) ve numara/ürün araması; boş sonuçta "Filtreleri temizle".
- **Ayrıntı:** Büyük serif durum başlığı ve duruma göre kısa açıklama; dört adımlı yolculuk çizgisi (altın dolgu güncel adıma kadar büyür; adım tarihi yalnız kayıtlı `paidAt` için yazılır, diğer adımlar için tarih uydurulmaz). Takip kodu varsa sayfadaki tek koyu yüzey olan takip kartı (kopyala, bilinen taşıyıcıda resmi takip bağlantısı). Parçalar büyük görsellerle, teslimat adresi, ödeme dökümü, "Sipariş özeti" (yazdırılabilir, fatura değildir) ve iade talebi ya da mevcut talebin durumu. Ödeme başarısız siparişte açıklayıcı uyarı gösterilir.
- **İade talebi:** Ödemesi alınmış ve talep açılmamış siparişte açılır (`POST /api/returns` kuralıyla aynı); neden zorunlu, sunucu hatası formda, başarı kalıcı mesaj + "Kapat".
- Bilinmeyen `?siparis=` değeri "Sipariş bulunamadı" paneli ve tüm siparişlere dönüş gösterir.

## Favoriler

`/favorilerim` (`src/app/favorilerim/page.tsx`, stiller `src/styles/pages/favorites.css`). Kaynak `WishlistContext`: oturum açık kullanıcıda `/api/wishlist`, misafirde bu tarayıcının yerel kaydı; misafire "yalnız bu tarayıcıda saklanıyor" notu ve giriş bağlantısı gösterilir. Kayıtlı ürünler anlık kopya olduğundan fiyat, bedenler ve stok `/api/products?ids=` ile güncel katalogdan okunur; yayından kalkan ürün "Satışta değil" olarak işaretlenir ve çantaya eklenemez. Tazeleme başarısızsa kayıtlı bilgiler bir uyarı ve "Tekrar dene" ile gösterilir.

- Kategori filtresi (yalnız birden fazla kategori varsa) ve sıralama (eklenme sırası, fiyat).
- Beden seçimi giyim sırasıyla (`src/lib/products/sizes.ts`) radyo grubu olarak gösterilir; tükenen beden görünür ama seçilemez. Beden seçilmeden "Çantaya ekle" kapalıdır ve nedeni yazılır; beden verisi olmayan ürün ürün sayfasına yönlendirir. Toplu "tümünü çantaya ekle" yoktur.
- Favoriden çıkarma karttaki kapat düğmesiyle yapılır (erişilebilir ad ürün adını içerir).

## Kabul senaryoları

- Misafir, CUSTOMER ve ADMIN görünümü ayrı kontrol edilir.
- Başkasının sipariş/iade/favori kaydına doğrudan URL veya API ile erişim reddedilir.
- Oturum süresi bittiğinde özel içerik temizlenir ve giriş yolu sunulur.
- Her formda yükleme, alan hatası, sunucu hatası ve başarı durumu vardır.
