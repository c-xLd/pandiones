# Sayfa sözleşmeleri

Bu belge Next.js rotalarını ve her sayfanın tamamlanma ölçütünü tanımlar. Rota adları mevcut `src/app` yapısından alınmıştır. Ortak kurallar: header/footer bağlantıları çalışır; veri isteklerinde yükleme, boş, hata ve tekrar deneme ayrıdır; mobil ve klavye kullanımı eşdeğerdir. Durum ayrıntıları [STATES.md](STATES.md) içindedir.

Ayrıntılı sayfa şartları: [mağaza](pages/STOREFRONT.md), [sepet ve ödeme](pages/CHECKOUT.md), [hesap](pages/ACCOUNT.md), [yönetim](pages/ADMIN.md).

| Rota | Kaynak | Görünür içerik ve çalışan eylemler | Özel durum |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx`, `/api/products` | Gerçek kampanya bağlantıları, kategori geçişleri, ürün kartları, filtre, hızlı görünüm, favori ve sepete giden yol | Ürün yoksa kampanya kalır, ürün alanı açık boş durum gösterir; istek hatası boş listeye dönüştürülmez |
| `/koleksiyon` | `src/app/koleksiyon/page.tsx`, `CollectionClient.tsx` | Tüm ürünler; kategori, sıralama, görünüm sayısı, ürün kartı, favori ve hızlı görünüm | Sıfır sonuçta filtreyi temizleme eylemi; başarısız istekte tekrar dene |
| `/koleksiyon/[kategori]` | `src/app/koleksiyon/[kategori]/page.tsx` | `ic-giyim` ve `ev-giyim` için doğru başlık ve ilgili gerçek ürünler | Bilinmeyen kategori 404; eski alias yönlendirmeleri çalışır |
| `/koleksiyon/[kategori]/[slug]` | Sunucu Prisma sorgusu, ürün istemcisi | Gerçek ürün, varyant/beden/stock, galeri, ayrıntı, yorum, öneriler ve sepete ekleme | Yanlış kategori kanonik adrese yönlenir; bilinmeyen ürün 404; stok yoksa satın alma kapalı ve uygun alarm seçeneği |
| `/urunler/[slug]` | Sunucu Prisma sorgusu | Ürün detayına alternatif rota; aynı fiyat, stok, yorum ve satın alma kuralları | Bilinmeyen slug 404; iki rota arasında içerik/SEO tutarlılığı |
| `/favorilerim` | `WishlistContext`, `/api/wishlist` | Favoriyi görüntüle, kaldır, ürüne git ve uygun varyantla sepete ekle | Misafir yerel kayıt ile hesap kaydı arasındaki geçiş açık ve veri kaybı olmadan tasarlanır; boş liste mesajı |
| `/giris-yap` | Auth API'leri | Giriş ve kayıt; alan doğrulaması, parola görünürlüğü varsa çalışması, yönlendirme | Hatalı kimlik bilgisi alan dışı hata; gönderim sürerken tekrar gönderim engeli |
| `/hesabim` | Auth, sipariş/iade API'leri | Profil, gerçek sipariş geçmişi, iade talebi ve durumları | Yetkisiz kullanıcı girişe gider; boş geçmişte anlamlı yönlendirme; yalnızca kendi kayıtları |
| `/odeme` | Sepet, kupon ve checkout API | Teslimat bilgisi, kupon doğrulama, sunucu hesaplı toplam, ödeme başlatma | Boş sepet yönlendirmesi; sağlayıcı yoksa açık hata; iptal/başarısızlıkta sepet korunur |
| `/siparis-onay/[id]` | Prisma sipariş sorgusu | Doğrulanmış ödeme sonucu, sipariş özeti, durum ve varsa takip bilgisi | Bekleyen/başarısız sipariş başarı gibi görünmez; yetkisiz erişim engellenir |
| `/yonetim` | Admin API'leri | İstatistik, sipariş, ürün, kupon, bülten, yorum, iade yönetimi ve CSV | ADMIN dışında veri erişimi yok; her mutasyonda bekleme, hata, başarı ve yenilenmiş gerçek veri |
| `not-found`, `error`, `loading` | App Router sınırları | Açıklayıcı 404, kurtarılabilir hata, veri geometrisine uygun yükleme | Ana sayfaya dönüş ve tekrar deneme çalışır |

## Ortak yüzeyler

Header: menü, kategori linkleri, arama, favoriler, hesap ve sepet. Footer: koleksiyon, hikâye bağlantısı, kılavuzlar, bülten formu, yasal metinler ve yukarı çık. Açılan panelde odak yönetimi, Escape, kapatma düğmesi ve geri dönüş odağı gerekir. Ürün kartındaki link, favori ve hızlı görünüm birbirini yanlışlıkla tetiklemez.

## Sayfa bazında teslim kontrolü

Her rota için 320/375/768/1440 px ekran görüntüsü ve klavye akışı kontrol edilir. Gerçek veriyle bir dolu, bir boş ve bir hata örneği görülür. Sayfada bulunan her linkin hedefi ve her düğmenin sonucu kaydedilir. Sayfa başlığı ve meta açıklama ürüne/kategoriye özgüdür; yanlış veya kaldırılmış ürün 404 verir. Satışa yönelik tüm metinler güncel ticari bilgiyle doğrulanır.
