# Güvenlik ve mahremiyet incelemesi

Bu belge uygulamaya yönelik somut kontrolleri listeler; bir güvenlik sertifikası değildir. Aşağıdaki “görülen durumlar” kod incelemesine dayanır ve düzeltilene kadar açık risk sayılır.

## Kodda görülen yüksek öncelikli durumlar

| Konum | Görülen davranış | Gerekli düzeltme |
| --- | --- | --- |
| `src/lib/auth.ts` | (DÜZELTİLDİ - 2026-09-23) Üretimde `AUTH_SECRET` zorunlu kılındı, oturum payload'una `exp` zaman aşımı eklendi, veritabanı aktiflik kontrolü ve misafir sipariş erişim token'ı üretimi getirildi (`tests/auth-hardening.test.ts`) | Tamamlandı |
| `src/app/api/orders/[id]/route.ts` | (DÜZELTİLDİ - 2026-09-23) IDOR kapatıldı; sipariş sahibi, ADMIN rolü veya imzalı süreli misafir token'ı (`verifyOrderGuestToken`) zorunlu kılındı (`tests/order-authorization.test.ts`) | Tamamlandı |
| `src/app/siparis-onay/[id]/page.tsx` | (DÜZELTİLDİ - 2026-09-23) Yetkisiz erişimde 403 engeli, bulunmayan siparişte `notFound()`, bekleyen/başarısız ödemede ise başarı başlığı yerine ödeme tekrar deneme ekranı gösterildi | Tamamlandı |
| `src/app/api/admin/returns/route.ts` | (DÜZELTİLDİ - 2026-09-23) GET ve PATCH metodlarına sunucu taraflı ADMIN rol doğrulaması eklendi (`tests/admin-returns-auth.test.ts`) | Tamamlandı |
| `src/app/api/admin/upload/route.ts` | Eski yükleme ADMIN için 410 döner; yeni ürün-bound medya yolu doğrulanır | Canlı S3 kimlik bilgileri, bucket politikası ve uçtan uca yükleme ayrıca doğrulanmalı |
| `src/app/api/checkout/route.ts` | (DÜZELTİLDİ - 2026-09-23) İstemciden gelen indirim kaldırıldı; kupon/sepet sunucuda doğrulanıp hesaplanıyor, varyant stok kontrolü eklendi (`tests/checkout-integrity.test.ts`) | Tamamlandı |
| `src/app/api/payment/callback/route.ts` | (DÜZELTİLDİ - 2026-09-23) İdempotent durum kontrolü eklendi; mükerrer callback'te stok/kupon ikinci kez değişmez, varyant stoğunda sıfır alt sınırı (`Math.max(0, ...)`) uygulandı (`tests/payment-callback-idempotency.test.ts`) | Tamamlandı |
| `src/app/api/products/[id]/reviews/route.ts` | (KALDIRILDI - 2026-10-01) Yorum sistemi, ilgili API rotaları ve veritabanı modeli ürün ve marka dili kararıyla bütünüyle kaldırıldı | Tamamlandı (Kaldırıldı) |
| `src/app/api/contact/route.ts` | (DÜZELTİLDİ - 2026-09-30) Önceden mesajı yalnız loglayıp başarı dönüyordu. Artık `ContactMessage` kaydı + destek kutusuna bildirim; başarı yalnız e-posta gidince, ortak doğrulayıcı, gizli bot alanı (`tests/customer-services.test.ts`, `tests/contact.test.ts`) | Oran sınırı yok; canlıdan önce IP/e-posta başına sınır eklenmeli |
| `src/app/api/stock-alert/route.ts` | (KISMEN DÜZELTİLDİ - 2026-10-01) Girdi doğrulaması (`lib/products/stock-alert.ts`), yalnız yayındaki ürünün tükenmiş bedeni, aynı e-posta + beden için tek bekleyen kayıt; yanıt artık kayıt nesnesini (id, e-posta) döndürmüyor | Oran sınırı yok: aynı IP'den çok sayıda farklı e-posta kaydı açılabilir. Ortak bir oran sınırlayıcı eklenmeli (iletişim ve sipariş takibiyle birlikte) |
| `src/app/api/orders/track/route.ts` | Sipariş numarası + e-posta ile sipariş görünümü; adres maskeli | Oran sınırı yok; numara 6 haneli olduğundan e-posta bilinirse deneme ile bulunabilir. Canlıdan önce sınır eklenmeli |
| `src/lib/email/templates.ts` | (KISMEN DÜZELTİLDİ - 2026-09-30) İletişim ve hediye kartı e-postalarında kullanıcı metni `escapeHtml` ile kaçışlanıyor (hediye notu yabancı alıcıya gidiyordu) | Sipariş onayı/kargo e-postalarında müşteri adı ve adres hâlâ kaçışsız; aynı yardımcıyla düzeltilmeli |
| `src/app/api/checkout/route.ts` (hediye kartı satırı) | (DÜZELTİLDİ - 2026-09-30) Tutar, tema, alıcı e-postası ve not sunucuda `validateGiftCardPurchase` ile doğrulanıyor; ürün adı istemciden alınmıyor (`tests/gift-card-purchase.test.ts`) | Tamamlandı |

| `src/app/api/admin/settings`, `audit`, `search` | (YENİ - 2026-10-02) Üçü de `getCurrentUser(request)` + ADMIN; oturumsuz ve CUSTOMER 403 (`tests/admin-settings.test.ts`). Ayar girdisi sunucuda `validateSettings` ile doğrulanır: duyuru bağlantısı yalnız site yolu ya da `https://` (`javascript:`/`//` reddedilir), sosyal bağlantılar yalnız kendi alan adında `https://` | Oran sınırı yok (yalnız yönetici) |
| `src/middleware.ts` | (YENİ - 2026-10-02) Bakım modunda ziyaretçiye `/bakim` (503), API'lere 503; `/yonetim`, `/giris-yap`, `/api/admin`, `/api/auth`, `/api/payment` (başlamış ödemenin geri dönüşü) ve statik dosyalar açık. Yönetici atlaması imzalı oturum çerezindeki role bakar; rolü sonradan düşürülen bir hesabın eski çerezi oturum süresi boyunca siteyi görmeye devam eder (yalnız görüntüleme, veri yetkisi API'de ayrıca denetlenir) | Bilinçli sınır |
| `src/lib/auth.ts`, `/api/auth/session` | (YENİ - 2026-10-02) Yönetici oturumu süreli: girişten en fazla 8 saat (`ADMIN_SESSION_MS`), 30 dakika işlemsizlikte kapanır (`ADMIN_IDLE_MS`). İşlemsizlik sınırı imzalı token içindedir (`idle`) ve her istekte `verifySession` ile sunucuda denetlenir; panel kullanıldıkça `POST /api/auth/session` dakikada en çok bir kez yeniler, mutlak sonu asla uzatmaz. ADMIN rolü taşıyan her token bu alanlarla imzalanır; değişiklikten önceki 30 günlük yönetici tokenları yönetim rotalarını açmaz (yeniden giriş gerekir). Müşteri oturumu 30 gün, değişmedi (`tests/admin-session.test.ts`) | Yönetici mağazada gezinirken yenileme yalnız `/yonetim` açıkken olur; panel kapalıyken 30 dakika sonra oturum kapanır |
| `scripts/reset-admin-password.ts` | (YENİ - 2026-10-02) `npm run admin:reset-password`: yerel/hedef veritabanında yönetici şifresini terminalde gizli girişle sıfırlar (en az 8 karakter, iki kez); test hesaplarını listelemez. Şifre kod, log veya sohbet içine girmez | Yalnız veritabanına erişimi olan kişi çalıştırabilir |
| `src/app/yonetim` | (DÜZELTİLDİ - 2026-10-02) Giriş formu eskiden `admin@pandiones.com` / şifre ile önceden doluydu; alanlar artık boş, müşteri hesabıyla girene neden giremediği söylenir | — |

## Kimlik ve yetki modeli

Müşteri yalnız kendi hesabını, favorisini, siparişini ve iadesini görür. Yönetici tüm yönetim rotalarında server tarafında ADMIN kontrolünden geçer. Rol bilgisi imzalı çerezde olsa da uzun süreli oturumda kullanıcı silinmesi/rol değişimi için güncel kayıt doğrulanır. Oturum çerezi `HttpOnly`, üretimde `Secure`, uygun `SameSite` ve kısa/yenilenebilir süre kullanır. Parola sıfırlama, oturumdan çıkış ve hesap kapatma akışları eklenirse belirgin güvenlik sınırlarıyla tasarlanır.

## Girdi, ödeme ve dosya güvenliği

Yeni ürün medya yolu JPEG/PNG/WebP ≤10 MB ve MP4/WebM ≤50 MB ile sınırlıdır; MIME, dosya imzası ve gerçek byte sayısı depolamadan önce denetlenir. Sunucu rastgele `products/<uuid>.<ext>` anahtarı üretir. Video posteri aynı ürünün doğrulanmış görseli olmalıdır; yabancı medya ID'si reddedilir. Geliştirmede yerel dosya, üretimde yalnız yapılandırılmış S3-uyumlu kalıcı depolama kullanılır; yapılandırma yoksa yükleme açık hatayla durur. Bu özellik diğer P0 oturum/ödeme açıklarını kapatmaz.

Sunucu her string için uzunluk ve biçim, her sayı için sonlu/pozitif sınır, her enum için izinli değer denetler. Kullanıcı metni HTML olarak basılmaz. Dosya yüklemesi uzantıya güvenmez; MIME ve dosya imzası doğrular, tehlikeli türleri reddeder, boyut ve kota uygular. Ödeme tokenı yalnız sağlayıcı doğrulamasından sonra işlenir. Sağlayıcı callback'inde `conversationId`, token, tutar, para birimi ve beklenen sipariş birbiriyle eşleştirilir. Kart verisi uygulamada saklanmaz.

## Mahremiyet ve kayıtlar

Adres, telefon, e-posta, sipariş ve ödeme yanıtı kişisel veridir. Üretim loglarında gereksiz tam değerler ve ödeme ham yanıtları bulunmaz; erişim ihtiyaca göre kısıtlanır. Saklama, silme, dışa aktarma ve abonelikten çıkış akışları ürün politikası ve geçerli hukukla doğrulanır. Bu belge hukuki metin yerine geçmez. Gizlilik ve kullanım koşulları UI'de açılıyorsa gerçek güncel metne bağlanır.

## Güvenlik kabul testi

Misafir, CUSTOMER ve ADMIN hesaplarıyla rota matrisi çalıştırılır. Başkasının sipariş numarası, sipariş ID'si, iade ID'si ve ürün yükleme isteği denenir. Oturum anahtarı eksik üretim başlangıcı başarısız olur. Tekrarlanan callback stok/kuponu ikinci kez değiştirmez. Her bulgu [QA.md](QA.md) içinde kapanış kanıtıyla işaretlenir.

## Güvenlik yol haritası (2026-10-02)

Kapsam: giriş, kayıt, yönetim, çanta, ödeme, sipariş onayı. Hedef barındırma Vercel + Cloudflare + yönetilen PostgreSQL; 2FA yöneticide zorunlu, müşteride isteğe bağlı. Fazlar: **0** para/sipariş bütünlüğü → **1** kimlik doğrulama → **2** yönetim izolasyonu → **4** başlıklar/XSS → **3** bot/DDoS (uygulama içi; Cloudflare barındırma kurulunca) → **5** veri koruma → **6** izleme ve süreç.

### Faz 0 — Para ve sipariş bütünlüğü (TAMAMLANDI, 2026-10-02)

| Bulgu | Önceki davranış | Düzeltme |
| --- | --- | --- |
| C1 Hediye kartı tekrar harcama | Kartla ödenen siparişte bakiye rezerve edilmiyordu; callback `min(bakiye, tutar)` düşüyor, sipariş tam indirimle ödendi sayılıyordu → bir kart sınırsız kez | Bakiye sipariş oluşturulurken aynı transaction'da koşullu düşülür (`currentBalance >= tutar`), ödenmezse geri verilir |
| C2 Eşzamanlı 0 TL sipariş | Bakiye transaction dışında okunup koşulsuz düşülüyordu → eksi bakiye, bedava siparişler | Aynı koşullu düşüm; paralel 6 istekten yalnız biri geçer |
| H1 Kupon limiti/süresi | Limit ödemede sayılıyordu; son kullanma yoktu | Kupon kullanımı sipariş anında koşullu artırılır (`usedCount < maxUses`), ödenmezse geri alınır; `startsAt`, `expiresAt`, `perEmailLimit` + `CouponRedemption` |
| H2 İndirimle hediye kartı | Kupon/hediye kartı hediye kartı satırlarına da uygulanıyordu | İndirim yalnız ürün satırlarına; hediye kartı alımında kod reddedilir |
| H3 Stok | Satır bazında, rezervesiz kontrol; aynı beden iki satır, son ürün iki kez | Aynı varyant satırları toplanır; stok sipariş anında koşullu düşülür (`stock >= adet`), ödenmezse geri verilir |
| H4 Sınırsız adet / satır | Hediye kartı adedi sınırsız ve ödeme öncesi satır açıyordu | Satır başı ≤10, hediye kartı ≤5, sepet ≤30 satır, gövde ≤32 KB (413) |
| M1 Callback | Ödenen tutar ve sepet kimliği siparişle karşılaştırılmıyordu; `conversationId` gövdeden | `paidPrice` (kuruş) ve `basketId` eşleşmezse sipariş açılmaz, işlem `REVIEW`; `conversationId` DB'den; durum yalnız `ODEME_BEKLENIYOR → ODENDI` (tek sefer); süresi dolmuş siparişe gelen ödeme `REVIEW` olur, sessizce canlanmaz |
| L1 Çift gönderim | Her gönderim yeni sipariş | `Idempotency-Key` başlığı + `Order.idempotencyKey` (unique) |
| M2 (kısmi) Sipariş no | `Math.random` 6 hane | `PAN-` + 10 karakter `crypto.randomInt` (≈50 bit) |
| L3 Simülatör | Yalnız `NODE_ENV`'e bağlıydı | Ayrıca açık `PAYMENT_MODE=simulator` gerekir; üretimde hiçbir durumda çalışmaz |
| Bakımda statik dosya muafiyeti | Uzantılı her yol muaftı | Yalnız gerçek statik dosya türleri |

Kod: `src/lib/orders/checkout-service.ts` (`resolveCart`, `planDiscount`, `placeOrder`, `releaseOrder`, `expirePendingOrders`), `src/lib/orders/coupon-rules.ts`, `src/app/api/checkout`, `src/app/api/payment/callback`, `src/app/api/coupons/validate` (önizleme artık sepeti sunucuda fiyatlar, kart sahibinin adını döndürmez), `src/app/api/cron/expire-orders` (`CRON_SECRET`; Hobby planı nedeniyle günlük, ayrıca her ödeme isteğinin başında süresi dolmuş en çok 20 sipariş serbest bırakılır). Testler: `tests/security-checkout.test.ts`, `tests/payment-callback-idempotency.test.ts`, `tests/checkout-integrity.test.ts`, `tests/coupon-rules.test.ts`.

**Ek (2026-10-03):** iyzico `checkoutForm.retrieve` yanıtının `signature` alanı (HMAC-SHA256, üye işyeri gizli anahtarı) ve `conversationId` doğrulanır; tutmayan yanıt ödeme sayılmaz, `payment.mismatch` güvenlik olayı yazılır (`checkoutFormSignatureValid`, `src/lib/payment/iyzico.ts`). iyzico'ya alıcı IP'si olarak sabit adres yerine gerçek istemci IP'si gider.

**Açık kalan (Faz 0):** tutarlar hâlâ `DOUBLE PRECISION` TL (PostgreSQL'de de); her hesap kuruşa yuvarlanıyor ve iyzico karşılaştırması kuruşla yapılıyor, ancak `Int` kuruş şemasına geçiş (85 dosya) ayrı bir değişiklik olarak bekliyor. Bekleyen sipariş 45 dk rezervasyon tutar; bu sürede kötü niyetli biri stok kilitleyebilir → Faz 3 oran sınırı ile kapanır.

### Faz 1 — Kimlik doğrulama (TAMAMLANDI, 2026-10-02)

- **Sunucu taraflı oturum** (`Session` tablosu): çerezde yalnız imzalı `{sid, uid, role, mfa, exp}`; her istekte satır okunur. Çıkış, şifre değişimi, "diğer oturumları kapat" satırı iptal eder → kopyalanmış çerez de anında geçersiz. Hesap sayfasında açık oturumlar listesi.
- **Anahtarlar:** `AUTH_SECRET` (≥32 karakter) zorunlu; gömülü yedek anahtar kaldırıldı. Oturum, 2FA-bekleme, misafir sipariş, abonelikten çıkma, TOTP şifreleme, IP karma için HKDF ile ayrı anahtarlar (`src/lib/security/crypto.ts`) — bir amaçla imzalanan belirteç başka amaçla kullanılamaz.
- **2FA (TOTP, RFC 6238, bağımlılıksız):** yönetici için zorunlu (şifreden sonra 10 dk'lık "bekleyen" çerez, oturum yalnız kod doğrulanınca), müşteri için isteğe bağlı. Sır AES-256-GCM ile şifreli, aynı kod iki kez geçmez, 10 yedek kod yalnız karma olarak saklanır, kullanılınca düşer. QR `qrcode-generator` ile sunucuda SVG.
- **Hesap varlığı sızıntısı yok:** girişte bilinmeyen e-posta da bcrypt süresi kadar bekler ve aynı mesajı alır; kilitli hesap da aynı mesaj; kayıt her durumda aynı yanıt ve oturum açmaz — hesap e-posta bağlantısıyla (`/e-posta-dogrula`, POST, tek kullanım, 24 sa) açılır; var olan adrese "hesabınız zaten var" e-postası gider; bülten de aynı yanıt.
- **Kilitleme:** 10 hatalı şifre → 15 dk kilit + sahibine e-posta; ayrıca IP ve e-posta başına oran sınırı.
- **Şifre politikası:** 10–128 karakter, e-postayı içeremez, Have I Been Pwned k-anonymity ile sızmış şifre reddi (1,5 sn'de yanıt yoksa geçer), bcrypt maliyet 12. Kayıt, değiştirme ve sıfırlamada aynı kural.
- **Şifremi unuttum:** `/sifremi-unuttum` → 30 dk, tek kullanımlık bağlantı (yalnız SHA-256 karması saklanır, 60 sn bekleme), `/sifre-sifirla` (belirteç adres çubuğundan silinir, noindex); sıfırlama tüm oturumları kapatır. Bağlantı alanı üretimde `NEXT_PUBLIC_SITE_URL` (Host başlığı zehirlemesi yok).
- **Seed:** üretimde ve yerel olmayan veritabanında asla çalışmaz (`ALLOW_PRODUCTION_SEED` kaldırıldı); sabit şifre yok, her çalıştırmada rastgele üretilir ve yalnız terminale yazılır. Yerel yönetici şifresi için `npm run admin:reset-password`.

### Faz 2 — Yönetim izolasyonu (TAMAMLANDI)

- `src/middleware.ts`: `/yonetim` ve `/api/admin` yalnız 2FA'lı, geçerli yönetici oturumuna (satır kontrolü) açılır; diğerleri sayfada **404** (panel kodu bile gönderilmez), API'de 403. Giriş `/yonetim/giris`. Yanıtlar `no-store` + `noindex`.
- İsteğe bağlı `ADMIN_ALLOWED_IPS`. İstemci IP'si yalnız güvenilen vekilin başlığından okunur (`TRUSTED_PROXY`: varsayılan Vercel `x-real-ip`, `cloudflare` ise `cf-connecting-ip`); istemcinin gönderdiği `cf-connecting-ip`/`x-forwarded-for` üretimde yok sayılır, böylece oran sınırı ve izin listesi başlık taklidiyle aşılamaz.
- **CSRF:** durum değiştiren her API isteğinde `Origin` (yoksa `Sec-Fetch-Site`) aynı köken olmalı; iyzico dönüşü hariç. Yönetici çerezi `SameSite=Strict`, üretimde tüm çerezler `__Host-` önekli.
- **Yeniden doğrulama:** ayarlar, kupon oluştur/sil, hediye kartı tanımlama son 10 dk içinde 2FA kodu ister (`REAUTH_REQUIRED` → panelde kod penceresi → otomatik tekrar).
- Kişisel veri okuma (müşteri listesi, aboneler, mesajlar, stok talebi e-postaları) etkinlik kaydına `pii.read` (yönetici + kaynak başına 30 dk'da bir).
- Açık kalan: rol ayrımı (`STAFF`) henüz yok; tüm yöneticiler tam yetkili.

### Faz 3 — Bot ve kötüye kullanım (uygulama tarafı TAMAMLANDI)

- `src/lib/security/rate-limit.ts`: veritabanında sabit pencereli sayaç (tüm sunucu örnekleri ortak; atomik upsert). IP + konu (e-posta, hesap) bazlı; 429 + `Retry-After`. Uygulanan: giriş, kayıt, şifremi unuttum/sıfırla, 2FA, yeniden doğrulama, e-posta doğrulama, sipariş takibi, kupon/hediye kartı kodu sorgusu, iade, iletişim, bülten, stok alarmı, ödeme. Veritabanı hatasında açık kalır (kenar sınırları sürer).
- **Cloudflare Turnstile:** kayıt, şifremi unuttum, iletişim, sipariş takibi. `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` tanımlıysa zorunlu ve hata halinde reddeder; tanımlı değilse atlanır (üretimde uyarı loglanır).
- Bal küpü alanı: iletişim + bülten. Gövde sınırı: API 64 KB (medya yükleme hariç), ödeme 32 KB, sepet/adet sınırları (Faz 0).
- Kenar (Cloudflare) kuralları kullanıcı hesabında kurulacak: `docs/OPERATIONS.md`.

### Faz 4 — Başlıklar ve XSS (TAMAMLANDI)

- `src/lib/security/headers.mjs` (`next.config.mjs` `headers()`): CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self' iyzico`, izinli kaynaklar: iyzico, Turnstile, S3 medya), HSTS (2 yıl, preload; yalnız üretim), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, COOP; `poweredByHeader: false`.
- Bilinçli sınır: `script-src` `'unsafe-inline'` içerir (Next.js satır içi hidrasyon; nonce her sayfayı dinamik yapardı). XSS kaynağında kapatıldı: işlemsel e-postalarda tüm kullanıcı alanları `escapeHtml`, JSON-LD `<>&` kaçışı, abonelikten çıkma sayfası kaçışı.

### Faz 5 — Veri koruma (uygulama tarafı TAMAMLANDI)

- Açık `select`: `/api/auth/me`, `/api/orders/[id]`, `/api/returns`; yönetici notu, ödeme kimliği, idempotency anahtarı, şifre/2FA verisi dönmez. Hediye kartı bakiye sorgusu yalnız bakiye/tema/son kullanma (alıcı, gönderen, not dönmez).
- Misafir sipariş erişimi: URL'de 7 günlük belirteç yerine 24 saatlik `HttpOnly` çerez (ödeme dönüşü ve 0 TL siparişte set edilir); sayfada telefon maskeli; yetkisiz ve olmayan sipariş aynı 404.
- İade: hesaba bağlı sipariş yalnız sahibi; misafir sipariş numara (10 karakter rastgele) + e-posta ile; gerekçe ≤1000 karakter; tüm reddedişler 404.
- Loglar: e-posta adresleri ve hediye kartı kodları maskelenir (`src/lib/security/redact.ts`).
- KVKK: `GET /api/auth/account` verilerimi indir (JSON), `DELETE` hesabı kapat (şifre + 2FA + "HESABIMI SIL"; siparişler fatura için kalır, hesaptan ayrılır). Saklama: iletişim mesajı 2 yıl, etkinlik ve güvenlik kaydı 1 yıl, ödenmemiş siparişin kişisel alanları 30 gün sonra anonim (`/api/cron/cleanup`).
- **PostgreSQL (2026-10-03):** Supabase'de bütün tablolarda RLS açık ve politika yok (REST rolleri hiçbir satıra erişemez), `rls_auto_enable()` yalnız sahibe açık, bağlantı TLS. Görseller Supabase Storage `media` kovasında (herkese açık okuma, listeleme yok, yazma yalnız S3 anahtarıyla, MIME ve 50 MB sınırı).
- **Açık kalan:** DDL yetkisiz ayrı uygulama rolü (şu an `postgres`), yedek/geri yükleme denemesi, tutarların `Int` kuruşa taşınması, adres/telefon alan şifrelemesi.

### Faz 6 — İzleme ve süreç (TAMAMLANDI)

- `SecurityEvent` tablosu + Yönetim → **Güvenlik** sekmesi: hesap kilidi, sınır aşımı (pencere başına bir kez), ödeme tutar/sepet uyuşmazlığı, süresi dolmuş siparişe ödeme, hatalı 2FA, hatalı yeniden doğrulama, yönetici girişleri; kritikler `SECURITY_ALERT_EMAIL` (yoksa mağaza e-postası) adresine saatte en çok bir e-posta.
- `/api/cron/reconcile` (günlük): son 48 saatte ödenen kart siparişlerini iyzico'dan yeniden çeker, tutar/sepet karşılaştırır, sapmayı kritik olay yapar; sipariş değiştirmez.
- CI (`.github/workflows/ci.yml`): `npm audit --omit=dev --audit-level=high`, migration'dan veritabanı, tsc, testler, build. Dependabot (`.github/dependabot.yml`). `public/.well-known/security.txt`.
- Migration geçmişi tamamlandı: `20261002060000_schema_catchup` ile boş veritabanı `migrate deploy` sonrası şemayla birebir (daha önce `db push` ile eklenmiş tablolar).
- Testler: `tests/security-*.test.ts`, `tests/admin-session.test.ts`, `tests/auth-hardening.test.ts` (CSRF, IP listesi, yeniden doğrulama, başlıklar, e-posta kaçışı, oran sınırı, oturum iptali, 2FA, kilit, kayıt sızıntısı, misafir çerezi).
