# Veri ve entegrasyon ilkeleri

## Kaynak sahipliği

Prisma şeması `prisma/schema.prisma` içindedir. `Product` ve `Variant` ürün/stok, `Order` ve `OrderItem` sipariş, `PaymentTransaction` ödeme, `User` hesap, `WishlistItem` favori, `Coupon` indirim, `Newsletter` abonelik, `ReturnRequest` iade ve `StockAlert` alarm kaydı tutar. Müşteriye sunulan sayısal veya kişisel bilgi bu kaynaktan veya doğrulanmış entegrasyondan gelir. İstemcideki sabit metin yalnızca editoryal içerik olabilir; materyal, üretim yeri, stok ve teslimat iddiaları gerçek kayıtla doğrulanır.

## Ürün medyası ve renk ailesi

Satılabilir her renk ayrı `Product` kaydıdır. Aynı model renkleri isteğe bağlı `ProductFamily` ile bağlanır; aynı kategoride normalize edilmiş renk tekrarına izin verilmez. `ProductMedia` ürünün doğrulanmış sıralı karelerini ve tek kapağını tutar. `Product.image`, eski tüketiciler için kapak veya video poster URL'sidir; medyasız eski ürünlerde tek kare olarak kalır. Yeni ürün `DRAFT` başlar, yayın kontrolünden önce herkese açık sorgulara girmez. Mevcut kayıtlar migration'da `PUBLISHED` korunur. Şema geçişi additive migration ile yapılır; üretimde yıkıcı `db:push` veya seed uygulanmaz.

## Mock ve seed sınırı

- `prisma/seed.ts` örnek ürün, kullanıcı, kupon ve sipariş üretir; **geliştirme içindir ve kayıtları siler**. Üretim verisi olarak kullanılamaz. Gerçek ürünler yönetim akışından veya doğrulanmış aktarım sürecinden girilir.
- `src/lib/payment/iyzico.ts` anahtar yoksa `MOCK_IYZICO_...` tokenı ve simülatör üretir. Mevcut davranış canlı satış koşulunu karşılamaz. Üretimde fail closed yapılmalı; test/sandbox açık ve izole yapılandırılmalı, simüle sonuç gerçek satış raporlarına girmemelidir.
- Formlardaki placeholder örnek girdidir; otomatik gerçek değer veya başarılı işlem kanıtı değildir.
- Kod içindeki kampanya yazıları ve görselleri ticari iddia içerebilir. İçerik sahibi onayı olmadan “saf ipek”, “sınırlı seri” gibi kesin iddialar yayınlanmaz.

## Sunucu doğrulaması

Siparişte ürün id/slug, varyant, stok ve pozitif tam sayı miktarı sunucudan doğrulanır. Fiyat, kupon ve kargo ücreti sunucuda hesaplanır; istemcinin `discountAmount` veya toplam değeri otorite değildir. Stok azaltma, kupon kullanım sayacı ve ödeme durum geçişi işlem bütünlüğüyle ele alınır. Çift tıklama ve yinelenen callback için idempotency anahtarı gerekir. Sipariş numarası benzersiz ve tahmin edilebilir erişim yetkisi olarak kullanılmaz.

Kimlik ve yetki her API rotasında kontrol edilir. Sipariş, favori, iade ve yönetim verisinde satır düzeyinde sahiplik doğrulanır. Hata yanıtları parola, token, ödeme sağlayıcı ham cevabı veya kişisel bilgiyi sızdırmaz. Çerezler güvenli bayraklar ve uygun süreyle ayarlanır; mutasyonlarda CSRF riskleri değerlendirilir. Görsel yükleme MIME, boyut, dosya adı ve depolama yetkisiyle kısıtlanır.

## Veri ömrü ve operasyon

Veritabanı her ortamda PostgreSQL'dir (2026-10-03): yerelde gömülü Postgres 17 (`npm run db:dev`, `pandiones_dev` ve `pandiones_test`), üretimde Supabase (`eryhwjndozjpifbizsnw`, eu-central-1, Postgres 17). Eski SQLite geçişleri `prisma/migrations-sqlite-archive/` altında yalnız tarih için durur; Postgres şeması tek `20261003000000_init` geçişiyle başlar. Bütün tablolarda RLS açık ve politika yok: uygulama sunucudan tablo sahibi rolüyle bağlanır, Supabase'in `anon`/`authenticated` REST rolleri hiçbir satırı okuyamaz ya da yazamaz. Katalog (kategori, ürün, beden, görsel kaydı) `prisma/catalog/catalog.json`'da tutulur; `scripts/export-catalog.ts` onu eski `dev.db`'den üretti (test ürünleri ve diskte olmayan görseller hariç), `scripts/import-catalog.ts` yalnız ekleyerek yükler, `scripts/catalog-to-sql.ts` aynı veriyi SQL konsolu için yazar. Kullanıcı, sipariş, kupon ve hediye kartı taşınmadı. Tutarlar henüz `DOUBLE PRECISION` TL'dir (aşağıdaki not). Veri taşıma migration ile yapılır; `db push` kullanılmaz. Yedekleme, geri yükleme denemesi, ortam değişkenleri, dosya yüklemelerinin kalıcılığı ve gözlemlenebilirlik yayın öncesi belgelenir. Canlı anahtarlar yalnızca gizli ortam değişkenlerinde bulunur.

Merchant feed stok durumunu gerçek varyant stokundan üretir. Bülten veya stok alarmı e-posta gönderecekse gönderim sağlayıcısı, tekrar deneme, başarısızlık kaydı ve abonelikten çıkış mekanizması gerekir. Ödeme sağlayıcısı, e-posta ve taşıyıcı entegrasyonlarında ağ kesintisi açık hata ve yeniden deneme yolu üretir.

## Mağaza ayarları ve etkinlik kaydı (2026-10-02)

- `StoreSettings` tek satırdır (`id = "store"`): mağaza adı, iletişim e-postası/telefon/WhatsApp, sosyal bağlantılar, kargo ücreti ve ücretsiz kargo eşiği, duyuru (açık/kapalı, metin, bağlantı), bakım modu ve mesajı, varsayılan SEO başlık/açıklama, düşük stok eşiği. Satır yokken site `SETTINGS_DEFAULTS` (`src/lib/settings/shared.ts`; bugünkü gerçek değerler) kullanır; okuma satır oluşturmaz.
- Okuma: sayfalar `getStoreSettings()` (`unstable_cache`, etiket `store-settings`; statik sayfalar statik kalır), yönetim API'si, iletişim API'si, e-posta sağlayıcı ve `/bakim` doğrudan `readStoreSettings()`; middleware bakım bayrağını 5 sn bellek önbelleğiyle okur. Kaydetme etiketi ve kök düzeni yeniden doğrular.
- Kullanan yerler: kök düzen (`generateMetadata` SEO, `AnnouncementBar`), `Footer` (iletişim, sosyal, telif satırı), `/iletisim` (e-posta, telefon, WhatsApp), iletişim API'si (`CONTACT_INBOX_EMAIL` yoksa gelen kutusu), tüm e-posta alt bilgileri, koleksiyon kartlarındaki "az kaldı" ve yönetim düşük stok listesi, `src/middleware.ts` bakım modu. **Kargo ücreti ve eşiği şu an yalnız kaydedilir; ödeme toplamına Dilim 2'de bağlanır** (ayar ekranı bunu açıkça yazar).
- `AuditLog`: `actorId`, `actorEmail`, `action`, `entity`, `entityId`, `summary`, `diff` (JSON metin: alan → [önce, sonra]). Ayar, kupon, iade, sipariş ve vitrin değişikliklerinde değişiklikle aynı transaction'da; kendi transaction'ını yöneten ürün servisi (`saveProduct`, `saveVariantStock`) için değişiklikten hemen sonra `recordAuditAfter` ile yazılır (log hatası isteği düşürmez, sunucu loguna `[AUDIT_WRITE_FAILED]`). Yönetici notunun metni loga yazılmaz, yalnız değiştiği.
- Migration: başlangıçta `20261002000000_store_settings_audit_log` (SQLite); Postgres'te `20261003000000_init` içinde.

## Ürün ticari alanları (2026-10-14)

- `Product.compareAtPrice` (isteğe bağlı piyasa fiyatı): yalnız satış fiyatından yüksekse saklanır ve mağazada üstü çizili gösterilir; yüzde rozeti yok. `Product.vatRate` (1/10/20, varsayılan 10): fiyatlar KDV dahildir; sipariş anında `OrderItem.vatRate`'e kopyalanır (hediye kartı satırında null), yönetimdeki sipariş ayrıntısı kupon sonrası tutar üzerinden oran başına dahil KDV'yi gösterir.
- `Variant.sku`, `Variant.barcode`: isteğe bağlı, katalogda tekil; barkod EAN-13 kontrol hanesiyle doğrulanır, hiçbir zaman üretilmez. Mağaza API'si ve sayfaları bu kodları almaz (`toPublicProduct`).
- Renkler ayrı ürünlerdir (kendi stok, görsel ve sayfası) ve `ProductFamily` ile bağlanır; düzenleyicinin "Renk ekle"si aileye taslak açar.
- Beden sistemi kategoriden gelir (`src/lib/products/size-systems.ts`): sütyen alt kategorileri bant+kap (beden rehberi tablosu), çoraplar S/M–L/XL, küçük aksesuarlar Standart, diğerleri harf beden. Alt kategorisi olan bir kategori yalnız onları toplar; ürün alt kategoriye yerleştirilir.
- Migration: `20261014000000_product_commerce_fields` (yalnız ekleme).

## Sipariş rezervasyonları (2026-10-02)

- Sipariş oluşturulurken tek transaction'da: varyant stoğu `stock >= adet` koşuluyla düşülür, kupon `usedCount` `< maxUses` koşuluyla artırılır ve `CouponRedemption(couponId, email, orderId)` yazılır, hediye kartı `currentBalance >= tutar` koşuluyla düşülür ve `GiftCardUsage` yazılır. Satın alınan hediye kartları `isActive: false` oluşur.
- Ödeme başarılı: sipariş `ODEME_BEKLENIYOR → ODENDI` (yalnız bir kez), satın alınan kartlar etkinleşir; stok/kupon/bakiye yeniden düşülmez.
- Ödeme başarısız ya da 45 dk içinde ödenmedi (`/api/cron/expire-orders`): `releaseOrder` stok, kupon sayacı ve bakiyeyi geri verir, kullanım/kullanım kaydını ve etkin olmayan kartları siler; sipariş `ODEME_BASARISIZ`, `paymentStatus` `FAILURE`/`EXPIRED`.
- `Coupon`: `startsAt`, `expiresAt`, `perEmailLimit` (boş = sınırsız). `Order.idempotencyKey` unique.
- Migration'lar: başlangıçta `20261002010000_password_reset`, `20261002020000_checkout_integrity` (SQLite); Postgres'te `20261003000000_init` içinde. Bekleyen siparişler `Order(status, createdAt)` indeksiyle bulunur; süresi dolanlar günlük cron'a ek olarak her ödeme isteğinin başında (en çok 20) serbest bırakılır.
