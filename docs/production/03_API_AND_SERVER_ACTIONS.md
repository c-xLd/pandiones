# 03 — API ve Sunucu İşlemleri

## Sözleşme kuralları

- Tüm mutation girdileri Zod ile sunucuda doğrulanır. HTML `required` yalnızca yardımcıdır.
- JSON endpoint’leri `application/json`; PayTR callback’i `application/x-www-form-urlencoded` kabul eder.
- Body boyutları route bazında sınırlıdır. Bilinmeyen alanlar reddedilir veya açıkça kaldırılır.
- Kişisel/admin mutation’ları kimlik, rol, kaynak sahipliği, origin/CSRF ve rate limit kontrolünden geçer.
- `POST`, `PATCH`, `DELETE` için çift gönderim riski olan işlemlerde `Idempotency-Key` zorunludur.
- Kullanıcıya gösterilen hata güvenli; ayrıntı correlation/request ID ile structured logdadır.
- Liste uçları cursor pagination kullanır. `limit` üst sınırı vardır; serbest SQL sıralaması yoktur.
- Admin filtreleri allowlist; URL ve redirect değerleri same-origin/allowlist kontrolünden geçer.

## Public okuma route’ları

Sayfalar mümkün olduğunca server component/repository üzerinden SSR edilir. Aşağıdaki JSON uçları yalnızca istemci etkileşimi gerçekten gerektiriyorsa açılır.

| Yöntem ve yol | Sonuç |
| --- | --- |
| `GET /api/catalog/search?q=&cursor=&sort=&filters=` | Yayımdaki ürünlerde normalize edilmiş arama; fiyat/stok özeti |
| `GET /api/products/:slug/availability?variant=` | Güncel satılabilirlik ve fiyat; cache kısa/özel |
| `GET /api/categories/:slug/products?...` | İzinli filtre/sıralama ile ürün listesi |
| `GET /api/content/:slug` | Yayımdaki içerik; draft yok |
| `GET /api/orders/lookup` | Yok; PII’nin query/loga sızmasını önlemek için POST kullanılır |

Arama yalnızca DB’de yayımlanmış ürünleri döndürür. Sonuç yoksa uydurma “popüler ürün” eklenmez; ayrı gerçek öneri sorgusu çalıştırılabilir.

## Sepet

Anonim sepet kimliği HttpOnly, Secure, SameSite=Lax cookie’de rastgele token; D1’de yalnızca token hash’i olarak tutulur. Yanıt her mutation sonrası tamamen yeniden hesaplanan sepet özetini döndürür.

| Yöntem ve yol | Girdi | Davranış |
| --- | --- | --- |
| `GET /api/cart` | — | Aktif sepet, güncel fiyat/stok uyarıları |
| `POST /api/cart/items` | `variantId`, `quantity` | Aktif/yayımdaki varyant ve satılabilir adet kontrolü |
| `PATCH /api/cart/items/:id` | `quantity` | `0` yerine açık silme tercih edilir |
| `DELETE /api/cart/items/:id` | — | Sahiplik kontrolü ile siler |
| `POST /api/cart/coupon` | `code` | Kural/limit/tarih/hedef doğrular; kodu loglamaz |
| `DELETE /api/cart/coupon` | — | Kuponu çıkarır ve toplamı hesaplar |
| `POST /api/cart/shipping-quote` | şehir/ilçe veya adres ID | Geçerli yöntem ve toplam döner |

İstemci hiçbir `price`, `discount`, `tax`, `shippingTotal` veya `grandTotal` göndermez.

## Checkout ve ödeme

### `POST /api/checkout/prepare`

Girdi: e-posta, telefon, alıcı adı, teslimat/fatura adresi, kargo yöntemi, zorunlu sözleşme sürümleri ve onaylar. Pazarlama izni zorunlu sözleşmeye bağlanamaz; ayrı ve varsayılan kapalıdır.

Sunucu sırası:

1. Origin/CSRF, hız ve şema kontrolü.
2. Sepet sahipliği ve ürün/varyant yayın durumu.
3. Fiyat, kupon, vergi ve kargo yeniden hesaplama.
4. Stokların transaction içinde atomik rezervasyonu.
5. Sipariş + order item snapshot + sözleşme sürümleri + payment attempt oluşturma.
6. Transaction commit sonrası PayTR token isteği.
7. Başarılıysa `paymentUrl/tokenViewData`; başarısızsa tekrar denenebilir güvenli hata.

Yanıt kart alanı içermez. `paymentAttemptId`, kullanıcıya gösterilebilen sipariş numarası ve iFrame için gereken sunucu üretimli bilgi döner.

### `POST /api/payments/paytr/callback`

- Kamuya erişilebilir ama yalnızca POST ve küçük form body kabul eder.
- Session/CSRF kullanmaz; güven PayTR HMAC hash doğrulamasından gelir.
- Sabit zamanlı karşılaştırma, `merchant_oid` lookup, tutar/para birimi/test mode kontrolleri ve idempotency uygulanır.
- Callback önce güvenli biçimde D1’e işlenir, sonra yanıt yalnızca düz `OK` olur.
- Tekrar callback yeni sipariş, stok hareketi, e-posta veya teslim üretmez.
- Geçersiz hash’te `OK` dönülmez; olay rate-limited security loga yazılır.

### `GET /odeme/basarili?order=...` ve `GET /odeme/basarisiz?order=...`

Bunlar API değil kullanıcı yönlendirme sayfalarıdır. Query’deki değer ödeme kanıtı değildir. Sipariş D1’den okunur; callback henüz gelmediyse “Ödeme sonucu doğrulanıyor” gösterilir ve sınırlı süre güvenli polling yapılabilir.

### `GET /api/orders/:publicToken/status`

Yalnızca yüksek entropili, süreli checkout status token’ıyla minimum veri döndürür: `pending|paid|failed`, sipariş numarası ve güvenli mesaj. E-posta/adres/ürün detayı döndürmez. Rate limitlidir.

## Sipariş ve müşteri işlemleri

| Yol | Güvenlik ve davranış |
| --- | --- |
| `POST /api/orders/lookup` | Sipariş no + e-posta + tek kullanımlık e-posta doğrulama; doğrudan PII göstermez |
| `POST /api/orders/:id/cancel-request` | Sahiplik, iptal edilebilir state, gerekçe; otomatik iade değil |
| `POST /api/orders/:id/return-requests` | Satır/adet/neden/hijyen beyanı; politika sürümü kaydı |
| `GET/POST/PATCH/DELETE /api/account/addresses` | Onaylı customer auth ve kaynak sahipliği şart |
| `GET/POST/DELETE /api/account/favorites` | Onaylı customer auth; yayımlanmış ürün kontrolü |
| `POST /api/privacy/requests` | Kimlik doğrulamalı veya e-posta doğrulamalı erişim/silme talebi; yasal saklama istisnaları |
| `POST /api/support/tickets` | Doğrulanmış iletişim, spam/rate limit, gerçek ticket referansı; hassas veri uyarısı |
| `GET /api/orders/:id/invoice` | Sahiplik veya süreli misafir doğrulama; yetkili belge varsa güvenli indirme |

Müşteri auth fazı devre dışıysa `/hesabim` kontrolleri gösterilmez; misafir sipariş sorgulama akışı kullanılır.

## Admin route alanı

Tüm `/api/admin/*` uçları admin identity, MFA/oturum tazeliği, permission ve CSRF/origin ister. Finans ve rol yönetiminde yakın zamanda yeniden doğrulama gerekir.

### Katalog

- `GET/POST /api/admin/products`
- `GET/PATCH /api/admin/products/:id`
- `POST /api/admin/products/:id/publish`
- `POST /api/admin/products/:id/archive`
- `POST/PATCH /api/admin/products/:id/variants`
- `POST /api/admin/categories`, `PATCH /api/admin/categories/:id`
- `POST /api/admin/imports/products` yalnızca doğrulama önizlemesi; `POST .../:id/commit` ayrı onay.

Publish servisi ürün bütünlük denetimi yapar; eksikleri alan bazında döndürür.

### Medya

- `POST /api/admin/media/upload-intent`: MIME, uzantı, boyut ve yetki doğrular; süreli upload bilgisi.
- `POST /api/admin/media/:id/finalize`: R2 objesini magic-byte, boyut, hash ve görsel metadata ile doğrular; başarısızsa karantinaya alır/siler.
- `DELETE /api/admin/media/:id`: kullanımda değilse soft delete; referanslı dosyada conflict.

### Stok ve sipariş

- `POST /api/admin/inventory/:variantId/adjustments`: adet farkı + zorunlu gerekçe; transaction ve audit.
- `GET /api/admin/orders`, `GET /api/admin/orders/:id`.
- `POST /api/admin/orders/:id/transitions`: yalnızca izinli state transition.
- `POST /api/admin/orders/:id/shipments`: doğrulanmış takip no/sağlayıcı ve satır adedi.
- `POST /api/admin/orders/:id/invoices`: sağlayıcı seçildiyse idempotent oluşturma; değilse doğrulanmış manuel belge kaydı.
- `GET/PATCH /api/admin/support/tickets/:id`: permission, PII minimizasyonu ve mesaj audit’i.
- `POST /api/admin/returns/:id/decision`: rol ve gerekçe.

### Ödeme/iade

- `POST /api/admin/payments/:id/status-query`: PayTR server-to-server; response redacted.
- `POST /api/admin/refunds/preview`: iade edilebilir azami tutar ve sipariş özeti.
- `POST /api/admin/refunds`: idempotency, yetki, yeniden doğrulama, mümkünse iki kişi kuralı; PayTR sonucu kayıtlanır.
- İade route’u serbest `amount` kabul etse bile sipariş/başarılı iadeler üzerinden sınırlar; kuruş ve pozitif değer kontrolü yapar.

### İçerik ve güvenlik

- Sayfa, menü, home module, redirect ve SEO CRUD.
- Admin identity/rol yalnızca `admin.manage`.
- Audit log salt okunur ve export yetkili; silme route’u yok.
- Sistem ayarları tipli allowlist; key/value ile keyfi secret girişi yok.

## Rate limit başlangıç politikası

Rakamlar trafik ve saldırı ölçümüne göre ayarlanır; kimlik + IP hash + route anahtarı kullanılır.

- Arama: 60/dk/IP.
- Sepet mutation: 60/dk/cart ve 120/dk/IP.
- Checkout prepare: 5/10dk/cart ve 10/10dk/IP.
- Sipariş lookup/OTP: 5/saat/IP+identifier; hesap varlığını belli etmeyen yanıt.
- Admin login/reauth sağlayıcı tarafında güçlü limit + MFA.
- PayTR callback normal kullanıcı limitiyle engellenmez; body/POST/hash kontrolleri, kötü hash alarmı ve güvenli hacim koruması uygulanır.

## HTTP ve cache

- Public katalog: uygun `Cache-Control`, ETag/tag invalidation.
- Sepet, checkout, account, admin, callback: `Cache-Control: no-store`.
- Mutation başarı kodları semantik (`201`, `204`); validation `422`, auth `401`, permission `403`, conflict `409`, rate `429`.
- Form post sonrası çift submit’i önlemek için UI disabled/loading olur; sunucu idempotency olmadan UI engeline güvenmez.
