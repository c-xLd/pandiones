# Ürün medyası, renk aileleri ve koleksiyon kartları

Tarih: 2026-09-20  
Durum: İnceleme için tasarım

## Amaç ve sınır

Koleksiyon ızgarası aynı ürüne ait gerçek düz çekim, manken, detay ve varsa video karelerini editoryal bir ritimle göstermeli. Müşteri daha zengin bir seçki görmeli; ancak medya tekrarından sahte ürün, renk veya stok üretilmemeli. Yönetici bu içeriği ürün ekleme ve düzenleme akışından yönetebilmelidir.

Bu çalışma ürün medyası, aynı modelin renkleri arasındaki bağlantı, yönetici yükleme/yayınlama akışı ve koleksiyon kartlarını kapsar. Sepet, sipariş ve ödeme veri modeli değişmez. Yeni medya çekimi/üretimi, toplu katalog içe aktarımı ve genel bir CMS bu kapsamda değildir.

## Seçilen yaklaşım

Her satılabilir renk ayrı `Product` olarak kalır. Aynı modelin renkleri bir `ProductFamily` altında bağlanır. Böylece mevcut fiyat, beden stoğu, sepet kalemi, sipariş ve kanonik ürün URL'si korunur. Ürüne sıralı `ProductMedia` kayıtları eklenir. Yalnızca kart görsellerini koddan döndürmek admin ihtiyacını karşılamaz; renkleri tek ebeveyn ürünün içine taşımak ise mevcut ticaret akışını gereksiz biçimde yeniden kurar.

## Veri modeli ve geçiş

- `ProductFamily`: `id`, yöneticiye görünen `name`, oluşturulma zamanı. Bir aile aynı tasarımın renklerini temsil eder.
- `Product`: isteğe bağlı `familyId`; `status` (`DRAFT` veya `PUBLISHED`). Mevcut kayıtlar geçişte `PUBLISHED` kabul edilir. Yeni yönetici kaydı açıkça `DRAFT` başlar. Mevcut zorunlu `image` alanı eski tüketiciler ve paylaşım/ürün akışı için kanonik poster/kapak URL'si olarak kalır; henüz medya yüklenmemiş taslakta boş string olabilir ve hiçbir genel yanıta girmez.
- `ProductMedia`: `id`, `productId`, `kind` (`IMAGE` veya `VIDEO`), `role` (`FLATLAY`, `MODEL`, `DETAIL`), saklama anahtarı ve genel okuma URL'si, video için zorunlu poster URL'si, erişilebilir açıklama, `position`, `isCover`, oluşturulma zamanı. Ürün başına tek kapak kuralı sunucu işleminde korunur; listeler `position` sırasıyla döner.
- Aynı aileye yalnız aynı kategorideki ürünler bağlanır. Bir ailede normalize edilmiş renk adı tekrar edemez. Aile silinirse ürünler silinmez; `familyId` boşalır.
- Eski ürünlerin `ProductMedia` kaydı olmaması geçerlidir: mevcut `Product.image` tek kare olarak kullanılır. Yeni medya kaydı eklenince seçilen kapağın görseli veya video posteri `Product.image` ile eşzamanlı güncellenir.

Şema değişikliği gözden geçirilmiş migration ile yapılır; üretimde `db:push --accept-data-loss` veya yıkıcı seed kullanılmaz.

## Yönetici akışı

`/yonetim` ürün alanında ekleme ve düzenleme aynı alanları kullanır. Yönetici önce temel alanlarla taslak ürün oluşturur, ardından medya alanında görselleri/videoyu yükler, düz çekim/manken/detay rolü atar, sırasını değiştirir, kapak ve video posterini seçer. Önizleme gerçek koleksiyon kartının oranını gösterir. Renk ailesi alanında mevcut yayınlanmış veya taslak kardeş ürünler aranıp bağlanır; farklı kategori ve tekrar renk sunucuda reddedilir. Düzenleme, fiyat ve beden stoklarının mevcut yönetim davranışını korur.

Yayınlama ayrı ve açık bir eylemdir. Pozitif geçerli fiyat, kategori, renk, en az bir stok varyantı, en az bir gerçek görsel veya video posteri ve seçili kapak olmadan yayınlama başarısız olur. Yükleme/kaydetme hatasında taslak korunur; arayüz başarı demeden hatayı ve tekrar denemeyi gösterir. Taslaklar herkese açık API, arama, kategori, ilgili ürün ve Merchant feed yanıtlarından çıkarılır. Yayınlanmış ürün düzenlenirken mevcut medya yeni yükleme tamamlanana kadar görünür kalır.

## Depolama ve API sınırı

Mevcut `/api/admin/upload` sınırsız dosyayı `public/uploads` altına yazdığı için yeni medya akışında güvenli sözleşme ile değiştirilir. ADMIN rolü her okuma/yazma metodunda sunucuda doğrulanır. JPEG, PNG, WebP için en çok 10 MB; MP4 veya WebM için en çok 50 MB kabul edilir. MIME, dosya imzası ve gerçek byte sayısı denetlenir; SVG, çalıştırılabilir içerik, URL ile dış dosya bağlama ve istemcinin verdiği dosya yolu reddedilir. Dosya adı rastgele anahtarla üretilir. Video için aynı ürüne ait doğrulanmış görsel poster zorunludur.

Yükleme ürün taslağına bağlı yapılır: dosya başarıyla saklandıktan sonra medya kaydı oluşturulur; DB adımı başarısızsa yeni nesne temizlenir. Medya silme yalnız o ürüne ait kayıtla yetkilendirilir; artık nesne temizleme hatası kaydedilir ve yöneticiye açıklanır. Yerel geliştirme depolaması yalnız geliştirmede kullanılabilir. Canlı ortam, yapılandırılmış kalıcı S3-uyumlu nesne depolaması olmadan yükleme kabul etmez ve açık hata döner. Okuma URL'si herkese açık ürün medyası içindir; yazma yetkisi yalnız sunucudadır. Depolama kimlik bilgileri uygulama yanıtına girmez.

Admin ürün API'si taslak oluşturma, ürün/medya düzenleme, renk ailesi bağlama ve yayınlama işlemlerinde alan düzeyinde doğrulama ve uygun 400/403/404/409/5xx yanıtları verir. Genel ürün API'si yalnız yayınlanmış ürünleri ve sıralı medya ile yayınlanmış renk kardeşlerinin asgari alanlarını döner. Mutasyon yanıtı veritabanındaki güncel ürünü içerir; istemci ardından listeyi yeniler.

## Mağaza davranışı

Bir kart bir gerçek `Product` kaydıdır; aynı ürünün farklı fotoğrafları ayrı sonuç sayılmaz. Kartın ilk karesi adminin seçtiği kapak, ikinci karesi sıralı uygun görseldir. Admin kapak olarak video seçerse ilk görünüm poster olur. Masaüstünde hover ile sessiz, döngülü, satır içi video oynayabilir; klavye ve mobilde ayrı oynat/duraklat kontrolü bulunur. Video kart görünümünden çıkınca veya sekme arka plana geçince durur; aynı anda yalnız bir kart videosu oynar. `prefers-reduced-motion` altında otomatik oynatma yoktur. Yavaş bağlantıda video `preload="none"` kullanır ve poster ürün kartını tamamlar.

Renk seçenekleri kart ve ürün detayında gerçek kardeş ürünlere bağlantıdır; her seçenek kendi fiyat ve stok bağlamını kendi sayfasında gösterir. Yayınlanmamış kardeş gösterilmez. Medya/renk ailesi yoksa kart mevcut tek görsel davranışına döner, boş video veya sahte renk işareti göstermez. Ürün sıralaması, filtreler, favori, hızlı ekleme ve görünüm kontrolleri korunur. Kart görselleri sabit oran ayırır; kırpma ürünün kesimini veya rengini yanlış temsil etmemelidir.

## Doğrulama ve kabul

- Migration mevcut ürünleri kaybetmeden çalışır; eski tek görsel kartları görünmeye devam eder.
- Oturumsuz ve CUSTOMER, medya/ürün yönetim yöntemlerinde 403 alır; ADMIN geçerli dosyayla taslak oluşturup yayınlayabilir.
- Hatalı MIME/imza, aşırı boyut, eksik poster, başka ürüne ait medya anahtarı, tekrar renk, kategori uyuşmazlığı ve çift kapak reddedilir.
- Yükleme veya DB hatasında yarım yayınlanmış ürün ve sahte başarı oluşmaz. Canlı depolama yapılandırılmamışsa yükleme açıkça başarısız olur.
- Genel API, arama, kategori ve ürün detayında taslak yoktur; yalnız gerçek kardeş renk ve medya gösterilir. Fiyat/stok mevcut yetkili kaynaktan gelir.
- Kart fotoğraf, ikinci kare ve video durumları; 320/375/768/1024/1440 px; klavye, ekran okuyucu, dokunma, azaltılmış hareket ve yavaş ağ ile kontrol edilir.
- İlgili API/bileşen testleri, `npx tsc --noEmit` ve `npm run build` uygulanır. Değişen sözleşmeler `DESIGN.md`, `docs/pages/ADMIN.md`, `docs/pages/STOREFRONT.md`, `docs/API.md`, `docs/DATA.md`, `docs/SECURITY.md` ve `docs/QA.md` ile eşzamanlı güncellenir.

## Yayına alma sınırı

Bu özellik tamamlandığında bile mevcut ödeme, oturum ve admin güvenlik açıklarının kapandığı varsayılmaz. Özellikle kalıcı nesne depolaması kimlik bilgileri, dosya yükleme güvenlik testleri ve `docs/QA.md` kapıları tamamlanmadan canlı satış/yönetim hazır ilan edilmez.
