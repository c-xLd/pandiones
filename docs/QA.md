# Yayın öncesi kabul ve açık işler

Bu liste test raporu değildir; hedef kapıları ve kod incelemesinde görülen açıkları kaydeder. Her madde gerçek sonuç ve kanıtla kapatılır. Sadece doküman yazmak uygulamanın hazır olduğu anlamına gelmez.

## P0 — canlı satıştan önce

- [x] `src/lib/auth.ts` için üretimde `AUTH_SECRET` zorunlu kılındı; oturum token'ına `exp` zaman aşımı, DB kullanıcı aktiflik denetimi ve süreli misafir sipariş erişim token'ı eklendi (`tests/auth-hardening.test.ts`).
- [x] `src/app/api/orders/[id]/route.ts` ve `src/app/siparis-onay/[id]/page.tsx` içindeki oturumsuz sipariş/adres erişimi kapatıldı; IDOR engellendi, bulunmayan siparişte `notFound()`, bekleyen/başarısız ödemede ise tekrar deneme ekranı bağlandı (`tests/order-authorization.test.ts`).
- [x] `src/app/api/admin/returns/route.ts` GET/PATCH yöntemlerine sunucu tarafında ADMIN kontrolü eklendi (`tests/admin-returns-auth.test.ts`).
- [x] `src/lib/payment/iyzico.ts` içindeki anahtar eksikliğinde çalışan mock ödeme yolu üretimde kapatıldı; canlı ortamda simülatör ve mock token reddedilir (`tests/payment-callback-idempotency.test.ts`).
- [x] `src/app/api/checkout/route.ts` içindeki istemciden gelen `discountAmount` kabulü kaldırıldı; kupon ve tutar sunucuda hesaplanıyor, varyant stok kontrolü eklendi (`tests/checkout-integrity.test.ts`). Callback tarafı atomik stok/idempotency kontrolü ise P0 callback maddesinde izlenir.
- [x] `src/app/siparis-onay/[id]/page.tsx` ve sipariş API'sinde sipariş sahibi/yetkili yönetici kontrolü doğrulandı; bekleyen/başarısız ödeme başarı olarak görünmüyor (`tests/order-authorization.test.ts`).
- [x] `prisma/seed.ts` üretim çalıştırma yolundan ayrıldı (`NODE_ENV === 'production'` koruması eklendi); gerçek verinin silinmesi engellendi.
- [x] Yönetim API'lerinde ADMIN kontrolü ve görsel yükleme kısıtları rota rota denetlendi (`tests/admin-product-routes.test.ts`, `tests/admin-returns-auth.test.ts`).
- [x] `src/app/api/feed/google-merchant/route.ts` içindeki sabit `in_stock` değeri gerçek varyant stok toplamına bağlandı (`totalStock > 0 ? in_stock : out_of_stock`).
- [x] İşlemsel e-posta servis mimarisi ve sağlayıcı soyutlaması (`src/lib/email/`) kuruldu; şablonlar, HTML/metin çift formatı ve Resend/InMemory test sağlayıcısı doğrulandı (`tests/email-service.test.ts`).
- [x] Ödeme callback'inde sipariş `ODENDI` durumuna geçtiğinde müşteriye otomatik sipariş onay e-postası tetikleniyor.
- [x] Stok alarmı (`StockAlert`) mekanizması kuruldu; yönetici stok yenilediğinde (`0 -> >0`) bekleyen talep sahiplerine e-posta bildirimi gidiyor ve `isNotified: true` olarak işaretleniyor (`tests/stock-alert-trigger.test.ts`).
- [x] Yönetici siparişi `KARGODA` durumuna getirdiğinde kargo takip e-postası müşteriye otomatik iletiliyor (`tests/order-shipping-notification.test.ts`).
- [x] KVKK/GDPR uyumlu kriptografik HMAC imzalı bülten abonelikten çıkış mekanizması (`/api/newsletter/unsubscribe`) ve tek tıkla ayrılma akışı tamamlandı (`tests/newsletter-unsubscribe.test.ts`).
- [ ] Ürün-bound medya yolunun gerçek S3 ortamında bucket politikası, kalıcılık ve silme/temizleme davranışını doğrula. Eski `/api/admin/upload` artık 410; dosya türü/boyut/imza kontrolleri yeni yolda test edildi.
- [x] `/api/checkout` form alanlarını istemciyle aynı kuralla (`validateCheckoutForm`) sunucuda doğruluyor; hatalı alan `field`/`fieldErrors` ile dönüyor ve formda ilgili alana bağlanıyor (`tests/checkout-integrity.test.ts`, 2026-09-28).
- [x] iyzico isteğinde alıcı `ip` artık gerçek istemci IP'si (`clientIp`, yalnız güvenilen vekil başlığından) (`tests/iyzico-client.test.ts`, 2026-10-03).
- [ ] Alıcı `identityNumber` yoksa `11111111110` gönderiliyor; kimlik numarası politikası iyzico ile netleştirilmeli.
- [x] iyzico bildirimi (webhook, `X-IYZ-SIGNATURE-V3`): tarayıcı dönmese de sipariş ödenir; sahte imza 401; tarayıcı dönüşüyle aynı anda gelirse tek kez işlenir, yanlış "geç ödeme" incelemesi açılmaz (`tests/iyzico-integration.test.ts`).
- [x] Sipariş iadesi servisi ve API'si: aynı gün iptal, değilse kalem başına iade, imza doğrulaması, çift tıklamada tek iade, stok/hediye kartı iadesi (`tests/iyzico-integration.test.ts`).
- [ ] Yönetim sipariş ekranına "Ödemeyi iade et" düğmesi (API hazır; ekran başka bir çalışmada düzenlendiği için bağlanmadı).
- [ ] Gerçek iyzico sandbox anahtarlarıyla uçtan uca deneme: ödeme, 3D, webhook, iptal ve iade.
- [x] iyzico ödeme sonucu (`checkoutForm.retrieve`) yanıtındaki `signature` (HMAC-SHA256: paymentStatus:paymentId:currency:basketId:conversationId:paidPrice:price:token) ve `conversationId` doğrulanıyor; imzasız/yanlış imzalı/başka konuşmaya ait yanıt başarısız sayılır ve güvenlik olayı olur (`tests/iyzico-client.test.ts`, 2026-10-03). Gerçek sandbox yanıtıyla henüz denenmedi.
- [x] `/odeme` Faz 2 tasarımına geçti (2026-09-28): iki adımlı akış, gömülü iyzico formu (`PaymentStep`), görünür test modu bandı, alan düzeyi doğrulama, sunucudan fiyat/stok (`useCartQuote`). Anahtar tanımlı olmadığı için gerçek iyzico sandbox formu tarayıcıda doğrulanmadı; simülatörle doğrulandı.
- [ ] Sipariş onayı (`/siparis-onay/[id]`) henüz Faz 2 tasarımına geçmedi.
- [x] `src/app/api/payment/callback/route.ts` tekrar callback'inde stok/kuponun ikinci kez değişmediği ve stok alt sınırı kanıtlandı (`tests/payment-callback-idempotency.test.ts`).

### Güvenlik kapıları (2026-10-02, ayrıntı: SECURITY.md fazları)

- [x] Hediye kartı tekrar harcama / eksi bakiye, kupon limit yarışı, stok aşırı satış, sınırsız adet, callback tutar/sepet doğrulaması, çift gönderim (`tests/security-checkout.test.ts`, `tests/payment-callback-idempotency.test.ts`).
- [x] Sunucu taraflı oturum + iptal, yönetici 2FA zorunlu, hesap kilidi, hesap varlığı sızıntısı yok, e-posta doğrulama, şifre politikası, şifremi unuttum (`tests/admin-session.test.ts`, `tests/auth-hardening.test.ts`).
- [x] `/yonetim` oturumsuz 404, CSRF, yeniden doğrulama, kişisel veri erişim kaydı (`tests/security-admin.test.ts`).
- [x] Güvenlik başlıkları + e-posta/JSON-LD kaçışı (`tests/security-headers.test.ts`), oran sınırlayıcı (`tests/security-rate-limit.test.ts`).
- [ ] Üretim ortamı: `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, Turnstile anahtarları; Cloudflare WAF/bot/oran kuralları; origin yalnız Cloudflare (OPERATIONS.md).
- [x] PostgreSQL'e geçiş: yerel gömülü Postgres 17 ve Supabase (2026-10-03); şema, RLS ve katalog Supabase'de; CI Postgres servisiyle.
- [ ] Supabase'de DDL yetkisiz ayrı uygulama rolü, yedek/geri yükleme denemesi; tutarların `Int` kuruşa taşınması.
- [ ] Vercel güvenlik duvarı (OWASP + oran kuralları) panelden açılmalı; API ile açma "yapılandırma bulunamadı" döndü.
- [ ] Vercel'de gizli değerler: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `CRON_SECRET`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, iyzico, Turnstile.
- [ ] Bağımsız sızma testi (canlıdan önce).

## Ürün medyası kabul durumu (2026-09-20)

- [x] İzole test veritabanında (Postgres şeması) taslak → gerçek kapak → aile → yayın → herkese açık medya/renk akışı.
- [x] Sahte MIME/imza, boyut sınırı, yabancı poster/medya, tekrar renk, eksik kapak/poster reddi için otomatik testler.
- [x] Genel katalog ve feed'de taslak yalıtımı için test ve izole HTTP smoke.
- [ ] 320/375/768/1024/1440 px, klavye, ekran okuyucu, azaltılmış hareket ve yavaş ağ tarayıcı kabulü.
- [ ] Kalıcı S3 kimlik bilgileriyle üretim benzeri yükleme/geri okuma/silme testi.
- [ ] Diğer P0 güvenlik ve ödeme kapıları; bu medya özelliği canlı satış onayı değildir.

## P1 — kalite tamamlanması

- [x] Yönetim sekme içerikleri (Dilim 3, 2026-10-02): on veri sekmesinde `alert/confirm`, satır içi stil ve emoji kaldırıldı; sessiz başarısızlıklar (sipariş durum PATCH'inde yanıt denetlenmiyordu, ürün vitrin hatası yutuluyordu) görünür hata oldu; hediye kartı "e-posta iletildi" yalnız gerçekten gönderildiyse yazıyor (API `emailSent`); depo fişi gerçekten sipariş başına A4 sayfa kesiyor. `npx tsc --noEmit`, `npm test`, `next build` geçti. Tarayıcıda 2FA'lı yönetici oturumuyla sekme sekme kabul henüz yapılmadı.
- [x] Siparişler ve Ürünler sekmeleri yeniden kuruldu (Dilim 4, 2026-10-03): sunucu tarafı sipariş listesi (URL'de filtre), zaman çizelgesi, CSV toplu kargo yükleme (önizleme + satır satır sonuç); ürün tablosu, satır içi fiyat/stok, 30 gün satış ve bekleyen talep, toplu yayın/taslak/vitrin/kategori, taslak kopya (stok 0, medyasız), yan panel ürün düzenleyici. `npx tsc --noEmit`, `npm test` (233/233), `.tsx` testleri, `next build` geçti. Tarayıcıda 2FA'lı yönetici oturumuyla kabul henüz yapılmadı.
- [x] PTT gönderi sistemi elle kipte (Dilim 5, 2026-10-04): gönderi kaydı, 10×10 etiket, barkod, şubeye teslim, elle hareketler, iptal; sipariş ↔ gönderi senkronu; Code 128 tablosu modül/parite testli (`tests/shipping.test.ts`, `tests/shipping-flow.test.ts`). 246/246 test, build geçti. Tarayıcıda 2FA'lı oturumla ve gerçek termal yazıcıda etiket baskısı + barkod okutma henüz denenmedi.
- [ ] PTT web servisi gerçek ortamda doğrulanmadı (sözleşme yok): `kabulEkle2` alan adları ve başarı kodu (`PTT_BASARI_KODU`), `barkodVeriSil`, `gonderiSorgu2` hareket alan adları, SOAP ad alanları (çalışma anında WSDL'den okunuyor), barkod aralığı ve kontrol hanesi kuralı resmi dokümanla karşılaştırılmalı; `PTT_ENV=test` ile bir gönderi yükle → sorgula → sil denenmeli.
- [ ] PTT hareket metni → durum eşlemesi (`ptt/status-map.ts`) anahtar kelimeye dayanıyor; gerçek PTT hareket örnekleriyle gözden geçirilmeli.
- [ ] Kurye ile adresten alım (PTT ek hizmet AA) bu dilimde yok.
- [x] `PATCH /api/admin/orders` durum geçiş sırasını, taşıyıcıyı ve takip numarası biçimini sunucuda denetliyor (`src/lib/orders/transitions.ts`; ödeme ve iade durumları panelden değişmez, Teslim edildi son durum, Kargoda takip numarası ister); tekilde 409, toplu işlemde `skipped` (`tests/order-transitions.test.ts`, `tests/admin-orders-flow.test.ts`, 2026-10-03).
- [ ] `PATCH /api/admin/returns` durum geçiş sırasını hâlâ denetlemiyor (sonuçlanmış iade yeniden değiştirilebilir).
- [x] Kargoda e-postası sonucu yanıtta (`emails.failed`) ve etkinlik kaydında (`order.email_failed`) dönüyor; panel uyarı gösteriyor, sipariş zaman çizelgesinde kırmızı satır (`tests/admin-orders-flow.test.ts`, 2026-10-03).
- [ ] `PATCH /api/admin/gift-cards`, `/api/admin/contact-messages`, `/api/admin/newsletter` ve `/api/admin/categories` kayıtları etkinlik kaydına (`recordAudit`) yazılmıyor.

- [x] Ana sayfa, katalog, sepet, favori, hesap ve ödeme için loading/empty/error/retry durumları [STATES.md](STATES.md) ile eşitlendi (`CartContext` ve `WishlistContext` için `isLoaded` durumu, ana sayfa skeleton/retry, favoriler ve çanta boş ekran flaşı önleme).
- [ ] Ürün ve kampanya içeriklerindeki materyal, üretim yeri, sınırlı seri, kargo ve iade iddialarını ticari kaynakla doğrula.
- [ ] Her görünen link, input, buton, kart eylemi ve modal için tıklama + klavye + hata testi yap; `href="#"` veya sahte başarı kalmasın.
- [ ] Ürün/sipariş/kupon işlemlerinde eşzamanlı istek ve yenileme senaryolarını test et; fiyat/stok tutarlılığını doğrula.
- [ ] Görsel optimizasyonu kapalı yapılandırmanın etkisini ölç; mobil LCP ve toplam transferi [PERFORMANCE.md](PERFORMANCE.md) bütçesine indir.
- [x] `/canta` ve `/hesabim` sahte içerikten arındırıldı (2026-09-28): uydurma SKU, sunucunun almadığı 150 TL kargo ve ücretsiz kargo eşiği, sahte Google adres önerisi, makbuzdaki uydurma şirket/Mersis satırı, herkese gösterilen "doğrulanmış hesap" rozeti kaldırıldı; hesap sekmelerindeki sessiz hatalar görünür hata + tekrar dene oldu. Çanta fiyat/stoku `/api/cart/validate` ile sunucudan okunuyor (`tests/cart-quote.test.ts`, `tests/account-lib.test.ts`).
- [x] `/odeme` sahte "Google Haritalar" adres önerisi, "BDDK/PCI-DSS" ve "taksit" gibi doğrulanmamış ödeme iddiaları ve kart rozetleri kaldırıldı (2026-09-28).
- [x] `/favorilerim` stok bilmeden beden varsayan ("M") hızlı ekleme ve rastgele bedenle "Tümünü sepete ekle" kaldırıldı; fiyat, beden ve stok `/api/products?ids=` ile güncel katalogdan okunuyor, satıştan kalkan ürün işaretleniyor (2026-09-28).
- [x] Rehber ve hizmet sayfaları sahte içerikten arındırıldı (2026-09-30): iletişim formu artık gerçekten kaydedip destek kutusuna iletiyor; sahte WhatsApp numarası kaldırıldı (yalnız `NEXT_PUBLIC_WHATSAPP_NUMBER` ile); sipariş takibi sistemde olmayan durumları (`BEKLEMEDE`, `IPTAL_EDILDI`) kullanıyordu, ortak sipariş durumlarına bağlandı; SSS'deki "sigortalı kargo", "BDDK/256-bit", "24 ay", "lüks hediye kutusu" gibi doğrulanmamış iddialar koda göre düzeltildi; bakım rehberindeki uydurma sertifika rozetleri ve stil rehberinde farklı kesimlere tekrar etiketlenen aynı fotoğraflar kaldırıldı; iki çelişen beden tablosu tek Türkiye tablosunda (`size-chart.ts`) birleşti (`tests/size-chart.test.ts`).
- [x] Hediye kartında seçilen "özel tarihte teslim" hiç uygulanmıyordu (kart ödemede hemen gidiyordu); seçenek kaldırıldı, sunucu doğrulaması eklendi (2026-09-30).
- [ ] `/api/contact` ve `/api/orders/track` için oran sınırı yok ([SECURITY.md](SECURITY.md)).
- [ ] KVKK aydınlatma metni için gerçek bir sayfa yok; iletişim formu yalnız kısa kullanım notu gösteriyor. Footer'daki gizlilik penceresindeki "uçtan uca şifreleme" ifadesi doğrulanmalı.
- [ ] `public/assets/gift-card-couture.jpg` görselinde yasaklı "MAISON" yazısı var; artık hiçbir sayfada kullanılmıyor, silinmesi kullanıcı kararı.
- [ ] Hediye kartı logosu: `public/assets/brand/pandiones-monogram.png` (şeffaf PNG) eklenince kartlarda serif "P" yerine kullanılır.
- [ ] 375 px'te header'da logo ile arama/favori ikonları üst üste biniyor (`/canta` ve `/hesabim` doğrulamasında görüldü; header'daki commit'lenmemiş değişikliklerle birlikte ele alınmalı).
- [ ] Otomatik ve manuel erişilebilirlik taraması: 320 px, %200 zoom, Tab sırası, odak kapanı, Escape, label, hata ilişkisi, azaltılmış hareket.

## Akış matrisi

| Akış | Başarı | Hata/kenar durum |
| --- | --- | --- |
| Katalog → ürün | Doğru ürün, fiyat, stok, kanonik rota | Boş kategori, bilinmeyen slug, ağ hatası |
| Ürün → sepet | Seçili bedenden tek ekleme, doğru toplam | Bedensiz, stoksuz, stok değişmiş |
| Favori → hesap | Kayıt korunur, tekrar eylem doğru | API reddi, oturum bitişi |
| Sepet → kupon → ödeme | Sunucu toplamı, doğrulanmış ödeme | Geçersiz kupon, sağlayıcı yok, iptal, çift callback |
| Hesap → iade | Yalnız kendi siparişi, gerçek durum | Başkasının siparişi, tekrarlı talep |
| Admin → mutasyon | Kaydedilmiş veri listede görünür | CUSTOMER erişimi, geçersiz giriş, sunucu hatası |
| Bülten/stok alarmı | Gerçek kayıt ve varsa gerçek bildirim | Tekrar e-posta, sağlayıcı arızası |

## Çalıştırma ve kanıt

`npm test` (`node --import tsx --test`), `npx tsc --noEmit`, `npm run build`, ilgili testler, tarayıcı akışları ve sağlayıcının sandbox testi ayrı kaydedilir. `package.json` içine birleşik `test` betiği eklenmiştir ve 92 testin tamamı otomatik olarak koşulmaktadır. P0 maddeleri kapanmadan ödeme sayfası canlı satışa hazır olarak sunulmaz. Yeni bir özellik açılırsa matrise ve ilgili sayfa belgesine eklenir.
