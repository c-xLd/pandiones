# Mağaza sayfaları: ana sayfa, katalog ve ürün

Kapsam: `/`, `/koleksiyon`, `/koleksiyon/[kategori]`, `/koleksiyon/[kategori]/[slug]` ve `/urunler/[slug]`. Üst düzey rota listesi [PAGES.md](../PAGES.md) içindedir.

## Ana sayfa `/`

Kampanya görseli marka ile koleksiyon arasında açık yol kurar. Kategori görselleri doğru kategoriye, ürün kartları gerçek ürünün kanonik detayına gider. Ürün seçkisi `/api/products` yanıtından gelir; sonuç sayısı sıfırsa boş metin, istek başarısızsa tekrar dene gösterilir. Kampanya görseli stok/fiyat yerine geçmez. Her kartta görsel, ad, fiyat ve uygunluk tutarlı olmalıdır. Favori ve hızlı görünüm kart bağlantısından ayrı klavye hedefleridir.

**Kabul:** Logo ana sayfaya; kategori linkleri gerçek kategoriye; filtre seçimleri listeye; kart ve hızlı görünüm aynı ürüne gider. Boş/hata/yavaş ağ durumları ayrı görünür. İlk görünür görselin boyutu ve odak noktası mobilde kontrol edilir.

## Katalog `/koleksiyon` ve kategori

Kategori başlığı, ürün sayısı, sıralama ve ızgara görünümü birlikte anlaşılır. Seçimlerin hangi ürünleri gösterdiği belirsiz kalmaz. Bilinmeyen kategori 404; eski kategori alias'ları doğru yönlendirme alır. Filtre sıfır sonuç ürettiğinde sıfır sonucu açıklayan metin ve “filtreyi temizle” eylemi bulunur. Ürün listesi büyükse sayfalama veya kademeli yükleme, geri tuşu ile konumu koruyacak şekilde tasarlanır.

**Kabul:** Fiyat artan/azalan sırası gerçek fiyatla, ad sırası yerel karakterlerle test edilir. Sütun seçimi yalnız görünümü değiştirir; seçili ürünler kaybolmaz. Liste ile ürün detay fiyatı/stoku güncel kaynaktan gelir. Yükleme sırasında filtre kontrolünün erişilebilir durumu açıktır.

**Kart kompozisyonu:** Referans ölçüde masaüstünde dört büyük dikey fotoğraf yan yana, grid boşluğu sıfırdır. Grid sayfa boyunca header/footer dış genişliğiyle hizalanır. Bilgi alanı fotoğrafın altındadır; ek beyaz aralık kartlar arasında oluşmaz. Mobilde iki sütun, okunur ad/fiyat ve ürün detayına açık erişim korunur. Hızlı ekleme yalnız gerçek stokta olan bedenleri gösterir.

Bir ürün her ızgarada tek karttır. Kapak ve ikinci kare yalnız o ürüne bağlı sıralı medyadan gelir; eski medyasız ürün kendi `image` alanına döner. Video varsa posterle açılır, ağ yükünü azaltmak için `preload="none"` kullanır. Masaüstü hover oynatması azaltılmış hareket tercihini izler; mobil/klavyede oynat-duraklat düğmesi vardır ve aynı anda yalnız bir kart videosu oynar. Renkler yalnız yayınlanmış gerçek kardeş ürünlerin kanonik bağlantılarıdır. Liste isteği başarısız olduğunda boş sonuç gibi gösterilmez, yeniden deneme sunulur.

## Ürün detayı: iki rota, tek sözleşme

Sunucu geçerli ürün ve varyantları bulur; yanlış kategori kanonik adrese gider. Galeri gerçek ürüne ait görsellerden oluşur. Beden grubu stok durumunu belirtir; stoksuz varyant sepete eklenmez. Fiyat, materyal, bakım, teslimat/iade ve yorum metni doğrulanmış kaynağa dayanır. “Daha fazla bilgi”, beden ve kumaş kılavuzu, galeri kontrolü, favori ve öneri kartları somut sonuç üretir. İlgili ürün, beden seçimi ve sepet eylemi mobil satın alma şeridinde de erişilebilir kalır.

**Kabul:** Ürün yoksa 404. Beden yoksa alan düzeyinde açıklama. Stok eşzamanlı değişmişse sepete/ödemeye geçiş açık hata verir. Galeri duraklatılabilir ve azaltılmış hareket seçeneğini izler. Yorum sayısı sıfırsa beş yıldız gibi yapay puan sunulmaz. Her iki detay rotasında kanonik URL, SEO ve veri aynı kalır.

Detay galerisi `ProductMedia.position` sırasındaki gerçek kareleri ve varsa posterli, kontrollü videoyu gösterir. Medyası olmayan eski ürün yalnız kendi kapak görselini gösterir; slug'a göre kampanya karesi eklenmez. Gerçek kardeş renge geçiş, o rengin ayrı fiyat/stok bağlamına sahip ürün rotasını açar.
