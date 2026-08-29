# 05 — Admin Paneli

## Amaç ve sınır

Admin paneli `/admin` altında, mağaza tasarımından daha sakin ve işlem odaklıdır. Her tablo gerçek D1 verisini; her eylem sunucu sonucu ve audit kaydını gösterir. Dashboard metrikleri boşsa `0`/“veri yok” der; tahmini satış üretmez.

## Güvenli giriş ve kabuk

- Admin kimliği müşteri kimliğinden ayrıdır; onaylı identity provider/workspace auth, allowlist ve MFA gerekir.
- Kısa idle ve absolute timeout; rol/finans değişiminde yeniden doğrulama.
- Menü permission’a göre görünür, fakat tüm endpoint’ler ayrıca sunucuda authorize edilir.
- Üst çubukta ortam rozeti (`STAGING`, `PRODUCTION`), kullanıcı, rol, oturum çıkışı ve sistem sağlığı.
- Production’daki canlı ödeme/iade eylemi test ortamından görsel olarak açıkça ayrılır.

## Dashboard `/admin`

Gerçek sorgularla: bugün/7/30 gün sipariş ve net tahsilat, bekleyen ödeme, hazırlanacak sipariş, düşük stok, başarısız callback/outbox, iade talepleri. Kartlar filtreli ilgili listeye gerçek linktir. Para metriği iade/iptal tanımını tooltip ile açıklar.

## Ürünler `/admin/urunler`

- Arama, durum, kategori, koleksiyon, stok ve yayın eksikleri filtreleri; cursor pagination.
- Satır eylemleri: görüntüle, düzenle, kopyala (taslak olarak), arşivle. Fiziksel silme yok.
- Ürün editörü sekmeleri: Temel, Açıklama, Varyantlar, Fiyat, Stok, Medya, Kategoriler/Koleksiyonlar, SEO, Önizleme, Geçmiş.
- Autosave varsa açık durum göstergesi ve version conflict çözümü; sessiz overwrite yok.
- Yayın öncesi kontrol: ad/slug, Türkçe açıklama, kategori, aktif varyant, benzersiz SKU, fiyat, kapak+alt metin, stok politikası, SEO ve route çakışması.
- Preview token süreli, noindex ve yetkili; draft public API’den görünmez.
- Kopyalama medya referansını paylaşabilir ancak stok ve SKU’yu kopyalayarak çakışma yaratmaz.

### Varyant ve stok

- Beden/renk kombinasyon matrisi; SKU, aktiflik, ağırlık.
- Stok doğrudan değer overwrite yerine adjustment olarak girilir: fark, neden, referans. Sonuç hareket tablosuna yazılır.
- Eşzamanlı düzenleme `version` conflict gösterir.
- Düşük stok eşiği ve satılabilir/rezerve/elde ayrımı görünür.

### Medya

- Çoklu dosya seçimi, upload progress, retry/cancel, drag-sort, cover/hover/galeri rolleri, varyanta bağlama, alt metin ve focal point.
- JPEG/PNG/WebP/AVIF izin listesi; SVG yalnızca ayrı güvenli sanitizasyon kararıyla. Boyut ve çözünürlük limitleri.
- Upload finalize edilmeden ürün medya olarak kaydedilmez. Kullanımdaki dosya silinemez.

## Kategori, koleksiyon ve ana sayfa

- Ağaç kategori düzeni, slug/SEO, sıralama ve yayın durumu.
- Koleksiyon tarih aralığı, hero, ürün sırası ve editoryal içerik.
- Ana sayfa builder yalnızca önceden tanımlı modül tipleri kullanır; keyfi script/HTML yok.
- “Seçili Ürünler” modülü gerçek ürün seçer, masaüstü varsayılan 4 öğe; draft/arşivli/stoksuz politika ihlalinde publish engeli veya açık uyarı.
- Menü yöneticisi internal route seçici kullanır; external URL HTTPS allowlist/doğrulama.
- Değişiklikler preview → publish akışında sürümlenir; rollback için önceki sürüm korunur.

## Siparişler `/admin/siparisler`

- Filtre: sipariş no, e-posta/telefon kontrollü arama, tarih, order/payment/fulfillment durumu, kargo, tutar.
- Liste PII’yi gereksiz göstermemeli; detay erişimi auditlenir.
- Detay: snapshot satırlar ve toplamlar; ödeme denemeleri/callback; stok hareketi; adres; kargo; bildirim; durum geçmişi; admin notları.
- İzinli transition butonları state machine’den gelir. Geçersiz geçiş veya çift tıklama `409`/idempotent sonuç verir.
- “Ödendi” manuel checkbox değildir. İstisnai manuel düzeltme yalnızca finans+yönetici prosedürü, kanıt ve audit ile ayrı iş akışıdır.
- Hazırlama listesi/packing slip hassasiyeti minimum; gereksiz müşteri verisi basılmaz.

## Kargo

- İlk sürüm manuel sağlayıcı + takip numarası; doğrulanmış pattern ve sağlayıcıdan oluşturulan takip URL’si.
- Kısmi gönderi desteklenir: satır/adet, zaman, bildirim.
- Kargo durumunu geri almak yalnızca yetkili gerekçe ile; teslim edilmiş sipariş rastgele hazırlanıyor yapılamaz.
- Sağlayıcı API’si gelince aynı shipment modeline bağlanır.

## Fatura ve destek

- e-Arşiv/e-Fatura sağlayıcısı seçilene kadar siparişte fatura durumu ve yetkili manuel belge ilişkilendirme bulunur; sahte fatura numarası üretilmez.
- Sağlayıcı bağlandığında oluşturma/iptal idempotent adapter üzerinden, provider reference ve audit ile yapılır. Vergi/TCKN/VKN yalnızca ihtiyaç duyan finans rolüne maskeli gösterilir.
- Destek kuyruğu konu, sipariş, durum, öncelik ve atanan kişiyle çalışır. Yanıt gerçek bildirim outbox’ına gider; “gönderildi” yalnız provider kabulüyle gösterilir.
- Kullanıcı mesajları rich HTML/script değildir; ekler medya güvenlik hattından geçer. Sipariş/PII görüntülemesi auditlenir.

## İptal, iade ve geri ödeme

- Müşteri talebi, ürün satırı/adedi, teslimat/mühür-hijyen bilgisi ve iletişim geçmişi görünür.
- Operasyon ürün kabul/ret; finans para iadesi yetkisine ayrılır.
- İade önizlemesi: tahsilat, önceki iadeler, azami tutar, kargo/vergi dağılımı ve PayTR işlem bilgisi.
- Gönder butonu tutar+sipariş+gerekçe özetini tekrar gösterir; production rozeti, yeniden doğrulama, idempotency ve gerekiyorsa çift onay.
- UI başarılı mesajı yalnızca PayTR sonucu ve DB kaydı tamamlandığında gösterir. Belirsiz ağ hatasında aynı key ile durum sorgu/retry; ikinci iade yaratılmaz.

## Promosyonlar

- Kupon kodu, tür, değer, para birimi, tarih, hedef, minimum sepet, toplam ve müşteri limiti, ilk sipariş, kombinasyon kuralı.
- Preview örnek ürün uydurmaz; seçilmiş gerçek katalog üzerinde hesaplama simülasyonu yapar.
- Aktif kupon kritik alanı değişirse version/audit; kullanım kayıtları silinmez.

## İçerik ve SEO

- Hakkımızda, iletişim, teslimat-iade, gizlilik, çerez, ön bilgilendirme ve mesafeli satış metinleri.
- Yasal belgelerde sürüm, yürürlük tarihi, yayınlayan aktör; eski siparişler eski sürüme bağlı kalır.
- SEO title/description, canonical override sınırlı, OG medya, robots policy, redirect.
- Rich text paste sanitize; script, inline event, iframe ve tehlikeli URL şemaları reddedilir.
- Redirect loop/chain/çakışma yayın öncesi kontrol edilir.

## Kullanıcı, rol ve audit

- Admin listesi, davet/askıya alma/rol atama. Son aktif super-admin kendini silemez/askıya alamaz.
- Permission matrisi okunabilir; rol değişimi yeniden doğrulama ve audit ister.
- Audit ekranı aktör, eylem, nesne, tarih ve request ID ile filtrelenir; before/after redacted diff. Düzenleme/silme yok.
- Müşteri verisi export’u gerekçe, yetki, süreli dosya ve audit ister; varsayılan toplu export yok.

## Sistem ve operasyon

- Secret olmayan ayarlar: mağaza adı, destek bilgileri, ücretsiz kargo eşiği, stok rezervasyon süresi, sosyal linkler ve özellik bayrakları.
- Entegrasyon ekranı yalnızca “configured/tested/last success” gösterir; secret değerini asla geri göstermez.
- Sağlık: D1/R2 erişimi, PayTR callback son zamanı/başarı, outbox kuyruğu, başarısız job, migration sürümü.
- Scheduled job’lar manuel “güvenli tekrar çalıştır” destekleyebilir; aynı işi iki kez üretmez.

## Admin kabul kriteri

Her eylem için: permission testi, validation, confirmation gereksinimi, disabled/loading/success/error, idempotency, audit, concurrent update testi, mobile/tablet temel kullanılabilirlik ve klavye erişimi bulunur.
