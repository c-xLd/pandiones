PANDIONES — SİNEMATİK KOLEKSİYON SAYFASI

Mevcut Pandiones e-ticaret projesine dinamik koleksiyon detay sayfası geliştir.

Route:
- /koleksiyon/[slug]

Örnekler:
- /koleksiyon/second-skin
- /koleksiyon/soft-edit
- /koleksiyon/after-dark
- /koleksiyon/new-drop
- /koleksiyon/yeni-gelenler

Bu sayfa klasik kategori başlığı + ürün grid görünümünde olmamalı.

Ana sayfada oluşturulan:
- LIVING FABRIC
- P-CUT
- SOFT / BOLD
- Sinematik motion commerce
- Büyük tipografi
- Katmanlı moda fotoğrafçılığı
tasarım sistemiyle tamamen tutarlı çalışmalı.

AMAÇ

Koleksiyon sayfası iki görevi birlikte yerine getirmeli:

1. Koleksiyonun dünyasını, hikâyesini ve duygusunu sunmalı.
2. Kullanıcının ürünleri kolayca filtreleyip satın almasını sağlamalı.

İlk bölüm yaratıcı bir campaign experience olabilir. Ürün keşfi başladıktan sonra arayüz sakin, hızlı ve anlaşılır hâle gelmeli.

DİNAMİK KOLEKSİYON SİSTEMİ

Her koleksiyon veritabanından yönetilsin.

Koleksiyon alanları:

- id
- name
- slug
- eyebrow
- title
- subtitle
- description
- manifesto
- theme
- season
- drop_number
- status
- cover_image
- mobile_cover_image
- hero_video
- video_poster
- background_color
- foreground_color
- accent_color
- gradient_config
- motion_preset
- hero_layout
- story_blocks
- seo_title
- seo_description
- og_image
- published_at
- starts_at
- ends_at
- sort_order

Koleksiyona bağlı ürünler ayrı ilişki tablosunda tutulsun:

collection_products:
- collection_id
- product_id
- sort_order
- is_featured
- editorial_size
- editorial_position
- custom_caption

Koleksiyon içindeki ürün sırası admin tarafından sürükle-bırak mantığıyla yönetilebilsin.

Veri yoksa mock koleksiyon veya ürün oluşturma.

Koleksiyon bulunamazsa özel 404 sayfası göster.

Yayınlanmamış koleksiyonlar normal kullanıcıya görünmesin. Admin preview yetkisi olan kullanıcı taslağı görüntüleyebilsin.

KOLEKSİYON TEMA SİSTEMİ

Her koleksiyon ayrı bir atmosfere sahip olabilir fakat aynı Pandiones markasına ait görünmelidir.

Desteklenecek temalar:

SOFT:
- Bone white ve sıcak nude tonlar
- Yumuşak kumaş hareketi
- Daha sakin serif tipografi
- İnce tül ve doğal ışık hissi

BOLD:
- Ink black ve deep wine
- Daha yüksek kontrast
- Keskin tipografik geçişler
- Gece ve dramatik ışık hissi

MONOCHROME:
- Siyah, beyaz ve gri
- Moda dergisi estetiği
- Büyük negatif alan
- Minimal hareket

DROP:
- Daha enerjik kompozisyon
- Drop numarası
- Yeni sezon mesajı
- Kontrollü signal red vurgusu

Tema yalnızca renk değiştirmemeli. Aşağıdakileri de kontrol etmeli:

- Tipografik ritim
- Hero kompozisyonu
- Animasyon karakteri
- Geçiş hızı
- Görsel maskeleri
- Arka plan atmosferi
- Ürün gridindeki editorial bloklar

SAYFA YAPISI

1. TRANSPARENT HEADER

Sayfa hero üzerinde açıldığında header transparan olsun.

Header içeriği:
- Menü
- Pandiones logosu
- Arama
- Hesap
- Favoriler
- Sepet

Header metin ve ikon rengi hero görseline göre koleksiyon verisinden belirlenebilsin.

Scroll sonrasında:
- Header sade, okunabilir bir zemine geçsin.
- Ürün gridine gelindiğinde normal alışveriş header’ı gibi davransın.
- Renk değişimi aniden değil kontrollü biçimde gerçekleşsin.

2. COLLECTION HERO

Hero, masaüstünde en az 90svh büyüklüğünde sinematik bir sahne olsun.

Katmanlar:

Arka katman:
- Koleksiyona ait gerçek kampanya görseli veya optimize edilmiş video
- Tema renkleriyle kontrollü ışık/gradient
- Çok hafif grain dokusu

Orta katman:
- Koleksiyona ait model veya ürün
- Varsa Living Fabric WebGL katmanı
- P-CUT maske geometrisi
- Hafif depth/parallax

Ön katman:
- Eyebrow: PANDIONES PRESENTS
- Koleksiyon adı
- Kısa slogan
- Drop veya sezon bilgisi
- “Koleksiyonu Keşfet” CTA
- Aşağı kaydırma göstergesi

Başlığı klasik ortalanmış hero şeklinde yerleştirme.

Tipografi görselle katmanlı ve asimetrik çalışmalı. Bazı harfler görselin arkasından geçiyormuş hissi verebilir fakat metin okunabilir kalmalı.

Örnek:

PANDIONES PRESENTS
AFTER / DARK

For the hours that belong to you.

DROP 02 — 2026
[Koleksiyonu Keşfet]

Hero videosu:
- Sessiz başlamalı
- Poster görseli bulunmalı
- Oynat/durdur kontrolü olmalı
- Mobilde gerektiğinde mobile_cover_image kullanılmalı
- Düşük bağlantıda video yerine poster gösterilmeli
- Ana metin ve CTA video yüklenmeden görünmeli

3. COLLECTION INTRO

Hero sonrasında kısa bir koleksiyon manifestosu göster.

Örnek:

“Not made for the room.
Made for the way you own it.”

Bu bölüm:
- Geniş negatif alana sahip olsun.
- Metin 2–3 satırı geçmesin.
- Scroll sırasında clip reveal veya satır bazlı reveal kullansın.
- SEO açısından gerçek HTML metni olarak kalsın.
- Canvas içine yazılmasın.

Admin tarafından manifesto alanı boş bırakılırsa bölüm hiç render edilmesin.

4. SIGNATURE STORY SCENE

Koleksiyona ait 2–4 adet hikâye bloğu gösterilebilsin.

Desteklenen blok türleri:

- Full-screen image
- Split image/text
- Sticky image sequence
- Video
- Quote
- Material close-up
- Product spotlight
- Horizontal editorial reel

Her koleksiyonda tüm blokları zorunlu olarak kullanma. Yalnızca admin tarafından eklenen gerçek blokları göster.

Örnek sticky sahne:

Sol bölüm:
- Sabit büyük kampanya görseli

Sağ bölüm:
- Kullanıcı scroll ettikçe değişen koleksiyon mesajları
- Materyal bilgisi
- Tasarım fikri
- Öne çıkan ürün bağlantısı

Yeni metin geldiğinde sol görsel mask reveal ile değişebilir.

Scroll hijacking yapma. Doğal scroll davranışını koru.

5. COLLECTION NAVIGATION

Ürün alanına geçmeden önce minimal alt koleksiyon navigasyonu göster.

Örnek:
- TÜMÜ
- SÜTYEN TAKIMLARI
- BÜSTİYER
- GECELİK
- CROP
- AKSESUAR

Bu seçenekler koleksiyondaki gerçek ürün kategorilerinden dinamik oluşturulsun.

Koleksiyonda bulunmayan kategori gösterilmesin.

Navigasyon:
- Ürün gridine ulaşıldığında sticky olsun.
- Aktif filtre belirgin görünsün.
- URL query parametresiyle senkronize çalışsın.
- Mobilde yatay kaydırılabilir olsun.
- Seçilen kategoriye göre sonuç sayısı güncellensin.

6. FEATURED PRODUCT PORTAL

Admin tarafından is_featured olarak belirlenen ürün varsa sinematik ürün spotlight alanı göster.

Masaüstü:
- Ürün görseli merkez veya ekranın bir tarafında
- Arkada koleksiyon temasına uygun shader/gradient
- Büyük arka plan ürün adı
- Diğer tarafta fiyat, kısa açıklama ve CTA

Gösterilecek gerçek bilgiler:
- Ürün adı
- Fiyat
- İndirimli fiyat
- Renk seçenekleri
- Mevcut bedenler
- Stok durumu
- Ürünü incele
- Favoriye ekle

Hızlı sepete ekleme yapılacaksa:
- Beden seçimi zorunlu olmalı.
- Stokta olmayan beden disabled olmalı.
- Seçilen gerçek varyasyon sepete eklenmeli.
- Başarı ve hata durumları görünür olmalı.

Ürünün gerçek 3D modeli yoksa sahte 3D garment oluşturma. Transparan ürün görseli, kontrollü gölge, depth ve ışık kullan.

7. PRODUCT GRID

Sinematik anlatım sonrasında alışveriş alanına geç.

Grid pazar yeri görünümünde olmamalı.

Masaüstü:
- Varsayılan 4 sütun
- Kullanıcı 2 veya 4 sütun arasında geçiş yapabilsin
- Geniş modda daha büyük editorial ürün görselleri

Tablet:
- 2 veya 3 sütun

Mobil:
- 2 sütun varsayılan
- Kullanıcı 1 veya 2 sütun seçebilsin

Grid yoğunluğu tercihi kullanıcı oturumu boyunca korunsun.

Ürün kartı:
- Birincil görsel
- Hover’da ikinci gerçek görsel
- Ürün adı
- Normal ve indirimli fiyat
- Renk swatch’ları
- Favori
- Yeni/indirim/sınırlı stok rozeti
- Hızlı bakış
- Gerekliyse beden seçerek hızlı sepete ekleme

Kartları beyaz kutulara hapsetme.
Gereksiz border, shadow ve büyük radius kullanma.

Hover sırasında:
- İkinci görsel P-CUT maskesiyle açılabilir.
- Ürün adı ve fiyat kaybolmamalı.
- Hover olmadan da tüm temel işlemler erişilebilir olmalı.

Her 6–10 ürün arasında admin tarafından eklenmiş bir editorial block gösterilebilsin.

Editorial block:
- Bir veya iki kolon kaplayabilir.
- Kampanya görseli/video içerebilir.
- Koleksiyon mesajı içerebilir.
- İlgili ürüne bağlanabilir.
- Gerçek ürünlerin grid sırasını veya filtre sonucunu bozmamalı.

8. FILTER AND SORT SYSTEM

Filtre sistemi gerçek ürün ve varyasyon verileriyle çalışmalı.

Filtreler:
- Kategori
- Beden
- Renk
- Fiyat
- Materyal
- Kalıp
- Destek tipi
- Pedli/pedsiz
- Balenli/balensiz
- Stokta olanlar
- İndirimli ürünler

Sıralama:
- Koleksiyon sırası
- Öne çıkanlar
- Yeni gelenler
- Çok satanlar
- Fiyat artan
- Fiyat azalan
- İndirim oranı

Masaüstünde:
- Minimal sticky toolbar
- Filtre paneli drawer veya kontrollü açılır panel

Mobilde:
- Alt taraftan açılan filter bottom sheet
- Filtre ve sıralama için kolay erişilebilir iki buton
- Uygula ve temizle butonları
- Aktif filtre sayısı

Kurallar:
- Filtreler URL query parametrelerine yazılsın.
- Sayfa yenilendiğinde seçimler korunsun.
- Browser geri butonu doğru çalışsın.
- Filtre uygulanınca sayfanın en başına gitmesin.
- Sonuç sayısı gerçek zamanlı güncellensin.
- Seçeneklerin yanında gerçek sonuç adetleri gösterilsin.
- Sonuç vermeyecek seçenekler disabled olabilir.
- “Filtreleri temizle” gerçekten bütün filtreleri kaldırmalı.

9. QUICK VIEW

Hızlı bakış modal/drawer sistemi oluştur.

İçerik:
- Ürün galerisi
- Ürün adı
- Fiyat
- Renk
- Beden
- Stok
- Sepete ekle
- Ürün detayına git
- Favoriye ekle

Modal:
- URL’yi isteğe bağlı olarak güncelleyebilsin.
- ESC ile kapansın.
- Focus trap kullansın.
- Kapanınca focus ürün kartına dönsün.
- Mobilde full-screen sheet olarak çalışsın.
- Ürün detay sayfasının tamamını modal içine kopyalama.

10. LOAD MORE

SEO ve performans için kontrollü “Daha Fazla Göster” sistemi kullan.

- İlk ürün grubu sunucu tarafında render edilsin.
- Sonraki ürünler gerçek API/veritabanı sorgusuyla getirilsin.
- Aynı ürün tekrar gösterilmesin.
- Loading skeleton kullanılsın.
- Buton kaç ürün kaldığını gösterebilir.
- JavaScript kapalıyken sayfalama bağlantıları erişilebilir kalsın.
- Sahte sonsuz scroll kullanma.

11. EMPTY STATE

Filtre sonucu boşsa profesyonel empty state göster:

“Bu seçimde henüz bir parça bulunmuyor.”

Aksiyonlar:
- Filtreleri temizle
- Tüm koleksiyonu göster
- Benzer koleksiyona git

Rastgele veya koleksiyon dışı ürün gösterme.

12. COLLECTION ENDING

Ürünlerden sonra koleksiyonu sinematik şekilde kapatan alan oluştur.

İçerik:
- Tam genişlikte kampanya görseli
- Son koleksiyon mesajı
- Sonraki koleksiyon
- Önceki koleksiyon
- Lookbook bağlantısı

Örnek:

NEXT WORLD
SOFT / EDIT

Explore the softer side.

Sonraki koleksiyon veritabanındaki sort_order değerine göre gelsin. Son koleksiyonda ilk koleksiyona dönmek yerine admin tarafından belirlenen CTA gösterilebilsin.

13. RECENTLY VIEWED

Kullanıcının gerçekten görüntülediği ürünler varsa göster.

- Veri yoksa bölüm render edilmesin.
- Giriş yapmayan kullanıcıda local storage kullanılabilir.
- Giriş yapınca hesap verisiyle güvenli şekilde birleştirilebilir.
- Aynı ürün tekrarlanmasın.
- Mevcut koleksiyon gridinden kopyalanmış sahte liste oluşturma.

MOTION SYSTEM

Ana animasyon aracı:
- GSAP + ScrollTrigger: sinematik scroll sahneleri
- Framer Motion: drawer, modal, filtre ve küçük UI geçişleri
- CSS transform/opacity/clip-path: hover ve basit reveal
- Three.js veya React Three Fiber: yalnızca gerekli WebGL sahneleri

Kurallar:
- Aynı elementi iki animasyon kütüphanesiyle yönetme.
- ScrollTrigger instance’larını route değişiminde temizle.
- Memory leak bırakma.
- Layout shift oluşturma.
- Animasyonlarda mümkün olduğunca transform ve opacity kullan.
- prefers-reduced-motion durumunda bütün içerik animasyonsuz erişilebilir olsun.
- Mobilde pinned alanları ve parallax miktarını azalt.
- Görünmeyen video ve canvas animasyonlarını durdur.
- Ürün gridinde ağır WebGL kullanma.

LOADING GEÇİŞİ

Koleksiyon değiştirildiğinde:
- Uzun loader gösterme.
- P-CUT veya kumaş wipe ile maksimum 300–600 ms geçiş kullan.
- Yeni sayfa verisi yüklenmediyse eski içeriği hemen kaldırma.
- Hata durumunda kullanıcıyı boş siyah ekranda bırakma.
- Browser back/forward navigasyonu düzgün çalışmalı.

ADMIN PANELİ

Admin paneline “Koleksiyonlar” modülü ekle.

Özellikler:
- Koleksiyon oluşturma
- Düzenleme
- Taslak kaydetme
- Önizleme
- Yayınlama
- Yayından kaldırma
- Başlangıç/bitiş tarihi
- Tema seçme
- Tema renklerini belirleme
- Hero masaüstü/mobil görselleri
- Video ve poster yükleme
- Motion preset seçimi
- Story block ekleme/silme/sıralama
- Ürün ekleme/çıkarma
- Ürün sıralama
- Featured ürün seçme
- Editorial block oluşturma
- Önceki/sonraki koleksiyon kontrolü
- SEO alanları

Görsel yüklemelerinde:
- Dosya tipi doğrulama
- Boyut limiti
- Alt metin
- Masaüstü/mobil odak noktası
- Görsel oranı
- Önizleme
bulunsun.

Admin alanında gerçek önizleme göster. Sahte ürün kullanma.

SEO

Her koleksiyon sayfasında:
- Dinamik title
- Dinamik meta description
- Canonical URL
- Open Graph görseli
- BreadcrumbList structured data
- ItemList structured data
- Koleksiyon açıklaması
- Indexlenebilir ürün bağlantıları
- Gerçek breadcrumb

Breadcrumb:
Ana Sayfa / Koleksiyonlar / [Koleksiyon Adı]

Filtreli URL’lerin indexlenmesini kontrollü yönet.
Canonical her durumda doğru ana koleksiyon adresini göstermeli.
Koleksiyon taslak veya pasifse sitemap’e eklenmemeli.

PERFORMANS

- Hero görselini preload et.
- Video için poster kullan.
- Mobil ve masaüstü için responsive source üret.
- AVIF/WebP kullan.
- Görsellerin width/height değerleri belirli olsun.
- İlk ürünleri server-side render et.
- Filtre işlemlerinde bütün sayfayı tekrar yükleme.
- WebGL yüklenene kadar tasarımı boş bırakma.
- LCP içeriğini canvas içine yerleştirme.
- Ürün görsellerinde lazy loading uygula.
- İlk viewport dışındaki videoları geç yükle.
- Düşük güçlü cihazda WebGL yerine statik görsel kullan.

İŞLEVSELLİK KURALLARI

- Mock veri kullanma.
- Sabit ürün dizisi oluşturma.
- Koleksiyon ürünlerini gerçek Supabase sorgusundan getir.
- Boş href veya “#” bağlantı bırakma.
- Bütün CTA’lar gerçek route’a gitmeli.
- Ürün kartı doğru ürüne bağlanmalı.
- Favori, hızlı bakış, filtre, sıralama ve sepete ekleme çalışmalı.
- Stokta olmayan varyasyon sepete eklenmemeli.
- Fiyat client tarafından belirlenmemeli.
- Gizli ürün normal kullanıcıya gösterilmemeli.
- Koleksiyon dışındaki ürün filtre sonucuna karışmamalı.
- Loading, empty, success ve error durumlarını oluştur.
- Console error, hydration warning ve yatay taşma bırakma.
- Mevcut sepet, üyelik, ürün ve varyasyon sistemini bozma.

MOBİL KONTROL

Sayfayı şu genişliklerde test et:
- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- 1024 px
- 1440 px

Kontrol et:
- Hero başlığı taşmıyor.
- Video/görsel doğru kırpılıyor.
- Sticky filtre header’la çakışmıyor.
- Bottom sheet safe area’ya uyuyor.
- Ürün kartı butonları rahat kullanılabiliyor.
- Mobilde hover’a bağımlı işlev yok.
- WebGL cihazı yavaşlatmıyor.
- Sticky sepete ekleme alanları alt navigasyonu kapatmıyor.
- Sayfada yatay taşma bulunmuyor.

SONUÇ

Koleksiyon sayfası ilk bölümde bir moda kampanyası, devamında kusursuz bir alışveriş deneyimi gibi hissettirmeli.

Kullanıcı:
- Koleksiyonun duygusunu anlamalı
- Ürünleri hızlıca bulabilmeli
- Filtreleyebilmeli
- Varyasyonları görebilmeli
- Favoriye ekleyebilmeli
- Sepete ekleyebilmeli
- Sonraki koleksiyona geçebilmeli

Sinematik tasarım satış işlevlerini gizlememeli.

Önce /koleksiyon/[slug] için tek bir gerçek koleksiyonla çalışan prototip oluştur. Hero, hikâye, filtre, ürün grid, quick view ve sonraki koleksiyon akışını tamamlayıp test et. Sistem doğrulandıktan sonra bütün koleksiyonlara dinamik olarak uygula.