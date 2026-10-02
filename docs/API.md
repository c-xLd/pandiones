# API envanteri ve sözleşme hedefi

Bu tablo `src/app/api/**/route.ts` dosyalarının mevcut yöntemlerini gösterir. “Hedef” sütunu uygulanmış olduğu anlamına gelmez. Örnek isteklerdeki alanlar değişirse UI, test ve bu belge birlikte güncellenir.

| Rota | Yöntem | Bugünkü amaç | Yetki ve hedef doğrulama |
| --- | --- | --- | --- |
| `/api/products` | GET | Kategori/arama ile ürün listeleme | Herkese açık; sayfalama, görünür ürün ve sınırlı alanlar |
| `/api/products/[id]` | GET | ID veya slug ile ürün | Herkese açık; bulunamazsa 404 |
| `/api/auth/register` | POST | Hesap açma ve oturum | Güçlü doğrulama, oran sınırı, benzersiz e-posta |
| `/api/auth/login` | POST | Oturum açma | Oran sınırı, güvenli çerez ve süre sonu |
| `/api/auth/me` | GET | Aktif kullanıcı | Asgari kişisel veri |
| `/api/auth/logout` | POST | Çerez silme | CSRF ve oturum geçersizleştirme stratejisi |
| `/api/wishlist` | GET, POST | Favori listeleme/değiştirme | Sahiplik; misafir cevabı gerçek kalıcılık olarak sunulmaz |
| `/api/coupons/validate` | POST | Kupon önizleme | İstemci `subtotal` güvenilmez; gerçek sepetten hesap |
| `/api/checkout` | POST | Sipariş ve ödeme oturumu | Sunucu fiyat/stok/kupon doğrulaması; idempotency. Hediye kartı satırı `lib/gift-cards/purchase.ts` ile doğrulanır (500–50.000 ₺, 50 ₺ adım, tema, alıcı e-postası, not ≤200); ürün adı sunucuda kurulur, `deliveryDate` her zaman `now` |
| `/api/payment/callback` | POST | Sağlayıcı sonucunu işleme | Token/işlem eşleştirme; tekrar callback güvenliği |
| `/api/orders/[id]` | GET | Sipariş özeti | Sahiplik veya güvenli misafir erişimi zorunlu |
| `/api/returns` | POST | İade talebi | Sipariş sahipliği, tekrar talep ve uygunluk denetimi |
| `/api/newsletter` | POST | Bülten kaydı | E-posta doğrulama, izin kaydı, abonelikten çıkış |
| `/api/contact` | POST | İletişim formu: `ContactMessage` kaydı + `CONTACT_INBOX_EMAIL` (yoksa `destek@pandiones.com`) adresine bildirim, yanıt adresi müşteri | Ortak doğrulayıcı `lib/contact/validate.ts`; `400 {error, field, fieldErrors}`, gizli `website` alanı doluysa 400; e-posta gitmezse kayıt `notifiedAt=null` kalır ve `503 {code:"NOTIFY_FAILED"}`; başarı yalnız bildirimden sonra `201 {success, id}`. Oran sınırı yok (açık madde) |
| `/api/orders/track` | POST | Misafir sipariş takibi: numara + e-posta | Eşleşme yoksa 404; adres maskeli, il/ilçe ve `paidAt` döner. Oran sınırı yok (açık madde) |
| `/api/gift-cards/balance` | POST | Kod ile bakiye/son kullanma | Bulunamaz/pasif/süresi dolmuşsa 404 |
| `/api/stock-alert` | POST | Stok alarmı kaydı | Ürün/beden doğrulama, tekrar kayıt, gerçek gönderim |
| `/api/feed/google-merchant` | GET | XML ürün akışı | Gerçek stok/fiyat ve kanonik URL |
| `/api/checkout` | POST | Sipariş oluşturma (stok, kupon, hediye kartı bakiyesi sipariş anında rezerve; ödenmezse geri) | Herkes; gövde ≤32 KB, satır ≤30, adet ≤10, hediye kartı ≤5; `Idempotency-Key` başlığı (16–80 karakter) tekrar gönderimde ikinci sipariş açmaz (409); stok/kupon/bakiye yarışında 409 |
| `/api/payment/callback` | POST | iyzico dönüşü | Sonuç token ile iyzico'dan çekilir; tutar ve sepet kimliği siparişle eşleşmezse `REVIEW`; yalnız `ODEME_BEKLENIYOR → ODENDI` |
| `/api/cron/expire-orders` | GET | 45 dk'dan eski bekleyen siparişleri iptal edip rezervasyonları geri verir | `Authorization: Bearer $CRON_SECRET` (≥32 karakter), yoksa 401 |
| `/api/coupons/validate` | POST | Kod önizlemesi `{ code, cart }` | Checkout ile aynı kurallar; hiçbir şey rezerve etmez; kişisel veri dönmez |
| `/api/admin/stats` | GET | Yönetim metrikleri + gösterge paneli (`dashboard`: 30 günlük/12 aylık ödenmiş ciro serisi, dönem karşılaştırması, en çok satanlar; `lowStockVariants` Ayarlar'daki eşikle, yalnız yayındaki ürünler) | ADMIN |
| `/api/admin/settings` | GET, PUT | Mağaza ayarları (`StoreSettings`). PUT tam set + okunan `updatedAt` ister; `validateSettings` 422 + `fieldErrors`, eski form 409 + güncel ayarlar; kayıt ve etkinlik satırı tek transaction, ardından `revalidateTag('store-settings')` | ADMIN |
| `/api/admin/audit` | GET | Etkinlik kaydı, yeniden eskiye; `?entity=settings\|order\|product\|coupon\|return`, `?cursor=` ile 30'arlı sayfa | ADMIN |
| `/api/admin/search` | GET | Komut paleti araması `?q=` (≥2 karakter): sipariş no/e-posta/ad/takip kodu, ürün ad/slug/renk, müşteri ad/e-posta/telefon; tür başına ≤5 | ADMIN |
| `/api/admin/orders` | GET, PATCH | Sipariş, takip ve yönetici notu yönetimi (tekil veya toplu) | ADMIN; durum yalnız tanımlı değerlerden (aksi 400; geçiş sırası henüz denetlenmiyor), güncelleme + etkinlik kaydı tek transaction; `KARGODA` e-postası yanıt dönmeden beklenir, gönderim hatası güncellemeyi geri almaz |
| `/api/admin/products` | GET, POST, PATCH | Ürün/stok/fiyat yönetimi | ADMIN; alan ve sınır doğrulama |
| `/api/admin/coupons` | GET, POST, DELETE | Kupon yönetimi | ADMIN; indirim/limit doğrulama |
| `/api/admin/newsletter` | GET, DELETE | Abone listeleme/silme | ADMIN; kişisel veri erişim kaydı |
| `/api/admin/customers` | GET | Müşteri dizini ve sipariş geçmişi | ADMIN |
| `/api/admin/contact-messages` | GET, PATCH, DELETE | İletişim mesajları ve durum yönetimi | ADMIN |
| `/api/admin/gift-cards` | GET, POST, PATCH | Hediye kartı oluşturma ve bakiye yönetimi | ADMIN |
| `/api/admin/stock-alerts` | GET, PATCH | Stok talepleri ve bildirim yönetimi | ADMIN |
| `/api/admin/returns` | GET, PATCH | İade yönetimi | ADMIN kontrolü |
| `/api/admin/upload` | POST | Eski yol, ADMIN için 410 | Yeni yükleme yalnız ürüne bağlı `/media` rotasından |
| `/api/admin/products/[id]` | GET, PATCH | Yönetici ürün detayını okuma ve taslağı düzenleme | ADMIN; alan/beden doğrulama |
| `/api/admin/products/[id]/media` | POST, PATCH, DELETE | Dosya yükleme, kapak/sıra ve silme | ADMIN; ürün sahipliği, imza/MIME/byte sınırı, poster |
| `/api/admin/products/[id]/publish` | POST | Doğrulanmış taslağı yayınlama | ADMIN; tek gerçek kapak, geçerli fiyat/kategori/beden |
| `/api/admin/product-families` | GET, POST, PATCH | Renk ailesi listeleme/oluşturma/bağlama | ADMIN; aynı kategori, normalize edilmiş tekil renk |

Genel `/api/products` ve `/api/products/[id]` yalnız `PUBLISHED` ürünleri döner; medya `position` sırasıyla, kardeş renkler yalnız yayınlanmış aynı aile üyeleri olarak gelir. Taslak detay 404 döner ve Merchant feed'e girmez. Yeni ürün POST yanıtı `DRAFT` ve boş kanonik görselle başlar. Medya POST multipart `file`, `role`, `alt`, `isCover` ve video için `posterMediaId` alır; PATCH `{action:"cover"|"order",mediaId,position?}`, DELETE `{mediaId}` alır. Mutasyonlar güncel ürünü içerir. İzinli görseller JPEG/PNG/WebP ≤10 MB, videolar MP4/WebM ≤50 MB'dır.

## Ortak yanıt kuralları

- Başarı yanıtı gerçek kalıcı sonucu ve gerekiyorsa güncel kaydı taşır. Başarısız işlem `success: true` döndürmez.
- `400` alan/biçim hatası, `401` oturum gerekli, `403` yetki yok, `404` gizliliği bozmayan bulunamadı, `409` çakışma/stok değişimi, `429` oran sınırı, `5xx` sunucu/sağlayıcı arızası için kullanılır.
- Hata gövdesinde sabit kod ve kullanıcıya uygun kısa mesaj bulunur; gizli token, ham ödeme cevabı, yığın izi ve başka müşterinin verisi bulunmaz.
- Mutasyon yanıtı önbelleğe alınmaz. GET önbelleği yalnız herkese açık ve güvenle eskiyebilen veride kullanılır.
- Tarih UTC olarak saklanır, kullanıcıya uygun yerel biçimde gösterilir. Para tutarı kuruş tamsayısı veya güvenli decimal ile işlenir; Float yuvarlama kararları açıkça test edilir.

## Sözleşme testleri

Her rota için geçerli istek, eksik alan, yanlış tip, oturumsuz kullanıcı, yanlış rol, başkasının kaydı, bulunmayan kayıt ve DB/sağlayıcı hatası denenir. Mutasyonlarda tekrar gönderim ve paralel istek ayrıca test edilir. [TESTING.md](TESTING.md) yürütme matrisini tanımlar.

## Güvenlik uç noktaları (2026-10-02)

| Rota | Yöntem | Amaç | Koruma |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | E-posta + şifre | IP + e-posta oran sınırı, kilit, eşit süre; yönetici/2FA'lı hesap → `{ mfaRequired, setup }` + 10 dk bekleyen çerez |
| `/api/auth/register` | POST | Kayıt | Turnstile, oran sınırı, şifre politikası; her durumda aynı yanıt, oturum açmaz |
| `/api/auth/verify-email` | POST | E-posta doğrulama bağlantısı | Tek kullanım, 24 sa, oran sınırı |
| `/api/auth/2fa/setup` | GET, POST | TOTP kurulumu (QR) | Bekleyen "setup" çerezi ya da oturum; onaylanmamış anahtar varsa aynısı döner (yenileme QR'ı değiştirmez); onayla 10 yedek kod |
| `/api/auth/2fa/verify` | POST | Girişin ikinci adımı | Bekleyen çerez, oran sınırı, tekrar oynatma yok |
| `/api/auth/2fa/disable` | POST | Müşteri 2FA kapatma | Şifre + kod; yöneticide kapalı |
| `/api/auth/reauth` | POST | Hassas yönetim işlemi için 2FA onayı (10 dk) | Yönetici oturumu |
| `/api/auth/session` | GET, POST | Yönetici oturum süreleri / hareketsizlik penceresini yenileme | Yönetici oturumu |
| `/api/auth/sessions` | GET, DELETE | Açık oturumlar; birini ya da diğerlerini kapat | Oturum |
| `/api/auth/password/forgot` | POST | Şifre sıfırlama bağlantısı | Turnstile, oran sınırı, her durumda aynı yanıt |
| `/api/auth/password/reset` | GET, POST | Bağlantı kontrolü / yeni şifre | Tek kullanım, 30 dk, politika, tüm oturumları kapatır |
| `/api/auth/account` | GET, DELETE | Verilerimi indir / hesabı kapat | Oturum; silmede şifre + 2FA + onay metni |
| `/api/admin/security` | GET | Güvenlik olayları ve 24 sa sayıları | Yönetici |
| `/api/cron/cleanup`, `/api/cron/reconcile` | GET | Günlük temizlik / ödeme mutabakatı | `Bearer $CRON_SECRET` |

Ortak: durum değiştiren API'ler yalnız aynı kökenden (CSRF); API gövdesi ≤64 KB; `/api/admin/*` middleware'de de yönetici + 2FA ister.
