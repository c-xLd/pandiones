# Pandiones Web Tasarım Hafızası

Bu dosya Pandiones web sitesinde yeni sayfa ve bileşen üretirken korunacak görsel ve deneyim kararlarını tanımlar. Tasarım değişikliklerinden önce bu dosya referans alınmalıdır.

## Teknik arayüz standardı

- Uygulama Next.js App Router ve React Server Components kullanır; `vinext` yalnızca Cloudflare/Sites çalışma ve dağıtım adaptörüdür.
- Tailwind CSS 4 tema değişkenleri `app/globals.css` içindeki Pandiones renk ve tipografi tokenlarına bağlıdır.
- Tekrar kullanılabilir erişilebilir arayüz parçaları `components/ui` altında shadcn modelinde tutulur. Yeni buton, input, badge ve benzeri temel parçalar sayfa içinde sıfırdan çoğaltılmaz.
- shadcn bileşenleri varsayılan demo görünümüyle bırakılmaz; keskin köşeler, marka renkleri ve Pandiones tipografi kurallarına uyarlanır.
- Sayfaya özel editoryal kompozisyonlar mevcut CSS katmanında kalabilir; Tailwind daha çok bileşen kompozisyonu ve durum stilleri için kullanılır.

## Marka yönü

- Marka hissi: sakin, özgüvenli, feminen, çağdaş ve ürün merkezli.
- Premium etki; aşırı animasyon, yapay parıltı veya her sayfada dev hero kullanılarak değil, doğru boşluk, güçlü fotoğraf, iyi oran ve ölçülü tipografiyle kurulmalıdır.
- Ana palet: kemik `#f1ede4`, mürekkep `#11100f`, şarap `#5f1227`, ten `#d7b5a8`.
- Köşeler ağırlıklı olarak keskin olmalı; yuvarlak kart görünümü kullanılmamalıdır.

## Tipografi

- `Montserrat Alt1` yalnızca gerçek `PANDIONES` kelime markasında kullanılabilir.
- Logo fontu başlık, buton, sayaç, ürün adı veya dekoratif metinde kullanılmaz.
- Editoryal başlıklar `--font-editorial`, arayüz ve ürün metinleri `--font-sans` kullanır.
- Büyük başlıklar her sayfada aynı ölçü ve kompozisyonda tekrarlanmamalıdır.

## Ortak alanlar

- `SiteHeader` ve `SiteFooter` bütün sayfalarda aynıdır; sayfa bazında alternatif header/footer oluşturulmaz.
- Ana sayfada aynı `SiteHeader` hero üzerine konumlanır ve normal belge akışında hero'yu aşağı itmez; görsel tasarımı diğer sayfalarla aynıdır.
- Ana navigasyon: Koleksiyon, Beden Rehberi, Teslimat & İade, İletişim, Ara ve Çanta.
- Koleksiyon kategorileri üst navigasyonu kalabalıklaştırmaz. İç giyimin kanonik adresi `/ic-giyim`dir; eski `/koleksiyon/kategori/ic-giyim` adresi kalıcı olarak bu adrese yönlenir.

## Sayfa kimlikleri

- Ana sayfa: markanın tek sinematik anlatı alanıdır.
- Ana sayfadaki “Rahatlığına göre tasarlandı” bölümü iki parçalı interaktif ürün vitrini olarak çalışır. Form, doku ve hareket sekmeleri aynı ürünün gerçek görsellerini ve açıklamasını değiştirir; uzun scroll hikâyesi veya yoğun kolaj kullanılmaz.
- Ana sayfa “Seçili Ürünler” alanı dört üründen oluşan yatay, dikey görsel oranlı bir vitrin kullanır. İlk kart ritmi başlatmak için daha geniş olabilir; ürün linki, beden seçimi yönlendirmesi ve favori kontrolü görünür ve çalışır olmalıdır.
- Koleksiyon: sakin ve kısa koleksiyon kapağı, kategori geçişleri ve doğrudan ürün grid'i. Masaüstü kapak yaklaşık `44vh`, mobil görsel yaklaşık `46svh` tutulmalı; ürünleri aşağı iten tam ekran hero kullanılmamalıdır.
- Kategori: kategoriye özel fotoğraf, kısa açıklama ve asimetrik editoryal ürün akışı. Masaüstü kategori kapağı yaklaşık `56vh`, mobil kategori görseli yaklaşık `52svh` tutulmalıdır.
- Ürün detayı: pazarlama hero’su kullanılmaz. Masaüstünde çoklu dikey galeri ile yapışkan satın alma paneli yan yana; mobilde satın alma paneli önce, yatay kaydırılan ürün görselleri sonra akar. Ürün bilgisi, beden, teslimat ve hizmet alanları erişilebilir açılır bölümlerde sunulur.
- Ürün görseline tıklandığında tam ekran inceleme modalı açılır. Modal dikey scroll ile görsel değiştirir; sıra göstergesi ve thumbnail’ler aktif görselle senkron kalır. Yakınlaştırma kontrolleri, çift tıklama, Escape ile kapatma ve mobil dokunmatik kaydırma desteklenir.
- Ürün detayı öneri alanı düz ve eşit kart grid’i değildir. Masaüstünde farklı ölçek ve dikey ritme sahip editoryal seçki, mobilde scroll-snap ürün vitrini kullanılır; öneriler daima aynı kategoriye ait gerçek veritabanı ürünlerinden gelir.
- Beden rehberi: ölçü ve form odaklı.
- Teslimat & İade: süreç odaklı.
- İletişim: daha kişisel ve bordo ağırlıklı.
- Gizlilik: kompakt ve belge odaklı.
- Arama ve sepet: pazarlama hero'su değil, doğrudan işlem yüzeyi.
- Sepet: ilk ekranda ürünler ve sipariş özeti görünür. Adet kontrolleri satır bazında geri bildirim verir; silme işlemi geri alınabilir. Ödeme bağlantısı hazır değilken sahte veya çalışmayan checkout sayfasına yönlendirme yapılmaz.
- Beden rehberinde doğrulanmamış beden aralığı veya ölçü tablosu uydurulmaz; ölçüm tekniği ve ürünün gerçek kalıp bilgisi üzerinden yönlendirme yapılır.
- Teslimat & İade sayfası üç aşamalı sipariş akışı, hijyen uyarısı ve açılır destek yanıtlarıyla ilerler; kesinleşmemiş kargo süresi veya ücret yazılmaz.
- İletişim sayfasında yalnızca doğrulanmış Pandiones kanalları gösterilir; çalışmayan form, uydurma telefon veya e-posta eklenmez.

## Ürün görselleri

- Ürünlerin doğal dikey oranı korunur; görseller yatay karta zorlanmaz.
- Görsel kırpma ürünün formunu veya önemli detayını kesmemelidir.
- Aynı ürünün birden fazla görseli varsa ürün detayında galeri olarak kullanılır.
- Liste sayfalarında görsel hareketi yalnızca hafif ölçek ve doygunluk geçişiyle sınırlıdır.

## UX kuralları

- Görünen link, buton, form ve seçimler çalışmalıdır; sahte filtre veya pasif kontrol eklenmez.
- Fiyat, beden ve ürün bilgisi veritabanından gelir. Bilinmeyen ticari bilgi uydurulmaz.
- Mobil düzen yalnızca küçültülmüş masaüstü değildir; akış yeniden sıralanır ve yatay taşma engellenir.
- Tüm sayfalar en az `320px` genişlikten başlayarak mobil, tablet ve masaüstünde çalışır; hover ile açılan kritik bir kontrol mobilde görünür durumda olmalıdır.
- Klavye odağı görünür, görsellerin açıklayıcı `alt` metni ve bölümlerin semantik başlıkları olmalıdır.

## Kaçınılacaklar

- Her sayfada ana sayfaya benzeyen sinematik hero.
- Logo fontunun logo dışı kullanımı.
- Gereksiz marquee, parallax, canvas, film greni ve dekoratif efekt yığını.
- Aynı dört kartın her sayfada aynı grid ile tekrarı.
- Ürünle ilgisiz stok görseller veya Pandiones görsel dilinden kopan çekimler.
