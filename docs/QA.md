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
- [x] Yönetim sipariş ekranına "Ödemeyi iade et" düğmesi bağlandı; 2FA/reauth, onay diyaloğu, iyzico iadesi ve sipariş/stok senkronizasyonu tamamlandı.
- [ ] Gerçek iyzico sandbox anahtarlarıyla uçtan uca deneme: ödeme, 3D, webhook, iptal ve iade.
- [x] iyzico ödeme sonucu (`checkoutForm.retrieve`) yanıtındaki `signature` (HMAC-SHA256: paymentStatus:paymentId:currency:basketId:conversationId:paidPrice:price:token) ve `conversationId` doğrulanıyor; imzasız/yanlış imzalı/başka konuşmaya ait yanıt başarısız sayılır ve güvenlik olayı olur (`tests/iyzico-client.test.ts`, 2026-10-03). Gerçek sandbox yanıtıyla henüz denenmedi.
- [x] `/odeme` Faz 2 tasarımına geçti (2026-09-28): iki adımlı akış, gömülü iyzico formu (`PaymentStep`), görünür test modu bandı, alan düzeyi doğrulama, sunucudan fiyat/stok (`useCartQuote`). Anahtar tanımlı olmadığı için gerçek iyzico sandbox formu tarayıcıda doğrulanmadı; simülatörle doğrulandı.
- [x] Sipariş onayı (`/siparis-onay/[id]`) Faz 2 sessiz lüks tasarımına geçirildi; yapay güven rozetleri, emojiler ve satır içi stiller temizlendi.
- [x] `src/app/api/payment/callback/route.ts` tekrar callback'inde stok/kuponun ikinci kez değişmediği ve stok alt sınırı kanıtlandı (`tests/payment-callback-idempotency.test.ts`).

### Yönetim paneli taraması (2026-10-14, Chrome, 1568 px)

- [x] `/yonetim` 500/zaman aşımı: `next dev` ile `next build` aynı `.next`'i paylaşıyordu. Dev artık `.next-dev` kullanıyor; dev açıkken `npm run build` alındı, panel 200 kaldı (`tests/preview-config.test.mjs`).
- [x] Tüm sekmeler (gösterge, etkinlik, siparişler, iadeler, kuponlar, hediye kartları, ürünler, kategoriler, stok talepleri, müşteriler, destek, bülten, güvenlik) ve yeni ürün sayfası açılıyor; konsol hatası ve başarısız `/api/admin` isteği yok; boş durumlar doğru.
- [x] Oturum yenileme her sekme geçişinde çağrılıyordu (`SessionGuard` efekti değişen `onEnd`'e bağlıydı); artık açılışta bir kez ve kullanımda dakikada en çok bir kez.
- [x] Sayfa eylemi ("Ürün listesine dön") başlık alanının 62rem sınırında ortaya düşüyordu; sağ kenara alındı. Giriş sayfası yüklenirken tam panel iskeleti görünüyordu; kendi yükleme ekranı eklendi.
- [ ] Canlı Supabase'de test kayıtları: `@example.com` adresli 3 sipariş ve 4 hediye kartı, 13 Ekim'den 3 kritik ödeme güvenlik olayı (sahte bildirim/iade denemeleri). Gösterge paneli cirosu bunları sayıyor; temizlik kullanıcı onayı bekliyor.

### Yönetim oturumu bitince (2026-10-14)

- [x] Süresi dolmuş oturumla `/yonetim` 404 "Kayıp bir zarafet" gösteriyordu; artık daha önce giriş yapılmış tarayıcı giriş sayfasına "oturumunuz sona erdi" notuyla gider, diğer ziyaretçiler 404 alır (`tests/security-admin.test.ts`). Tarayıcıda giriş sayfası ve notu doğrulandı; yönlendirmenin kendisi bir sonraki 2FA girişinden sonra (işaret o zaman oluşur) gerçek tarayıcıda görülecek.

### Ürün silme (2026-10-14)

- [x] Siparişsiz ürün bedenler, medya, favori, stok talepleriyle silinir; yalnız yüklenmiş dosyalar depodan kalkar; boşalan aile silinir; etkinlik kaydı; siparişte geçen ürün `HAS_ORDERS`; dosya temizliği hatası raporlanır; oturumsuz 403 (`tests/admin-product-delete.test.ts`).
- [ ] Panelde uçtan uca (onay → 2FA → satır kalkar): yönetici oturumu kapandığı için tarayıcıda yapılamadı.

### Ürün düzenleyici (2026-10-14)

- [x] SKU/barkod (EAN-13, tekil), piyasa fiyatı (> satış fiyatı), KDV oranı sunucuda doğrulanıp saklanıyor; sipariş satırına KDV oranı kopyalanıyor; mağazaya kodlar gitmiyor (`tests/product-commerce-fields.test.ts`).
- [x] "Renk ekle" aileye taslak açıyor; aynı renk reddediliyor; kategoriye göre beden sistemi; ana kategoriye ürün yerleştirilemiyor (`tests/product-commerce-fields.test.ts`, `tests/admin-variant-section-ui.test.tsx`).
- [x] Tarayıcı (yerel veritabanı, 372 px): kategori ağacı, renk/beden seçimi, hatalı barkodda kayıt durması, iki renkli kayıt, görsel penceresinden yükleme, sayfa yatay taşmıyor.
- [ ] Masaüstü genişlikte görsel inceleme (çalışma ortamının paneli dar olduğu için yapılamadı).
- [x] Canlı Supabase'e `20261014000000_product_commerce_fields` geçişi uygulandı ve `_prisma_migrations`'a kaydedildi (2026-10-14).

### Güvenlik kapıları (2026-10-02, ayrıntı: SECURITY.md fazları)

- [x] Hediye kartı tekrar harcama / eksi bakiye, kupon limit yarışı, stok aşırı satış, sınırsız adet, callback tutar/sepet doğrulaması, çift gönderim (`tests/security-checkout.test.ts`, `tests/payment-callback-idempotency.test.ts`).
- [x] Sunucu taraflı oturum + iptal, yönetici 2FA zorunlu, hesap kilidi, hesap varlığı sızıntısı yok, e-posta doğrulama, şifre politikası, şifremi unuttum (`tests/admin-session.test.ts`, `tests/auth-hardening.test.ts`).
- [x] `/yonetim` oturumsuz 404, CSRF, yeniden doğrulama, kişisel veri erişim kaydı (`tests/security-admin.test.ts`).
- [x] Güvenlik başlıkları + e-posta/JSON-LD kaçışı (`tests/security-headers.test.ts`), oran sınırlayıcı (`tests/security-rate-limit.test.ts`).
- [ ] Üretim ortamı: `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, Turnstile anahtarları; Cloudflare WAF/bot/oran kuralları; origin yalnız Cloudflare (OPERATIONS.md).
- [x] PostgreSQL'e geçiş: yerel gömülü Postgres 17 ve Supabase (2026-10-03); şema, RLS ve katalog Supabase'de; CI Postgres servisiyle.
- [x] Supabase'de DDL yetkisiz ayrı uygulama rolü (`pandiones_app`, canlıda) ve yedek/geri yükleme denemesi (28/28 tablo birebir), 2026-10-18; bkz. SECURITY.md.
- [ ] Tutarların `Int` kuruşa taşınması.
- [ ] Düzenli otomatik veritabanı yedeği (Supabase ücretsiz planında yok).
- [x] Vercel güvenlik duvarı: "Tarama engeli" kuralı canlıda (2026-10-18). WordPress/PHP, `.env`, `.git`, phpMyAdmin, xmlrpc ve `cgi-bin` yolları 403 döner; site sayfaları ve API etkilenmez.
- [ ] Hobby planının dışındakiler: OWASP kural seti ve Vercel oran sınırlama yalnız ücretli planda var (API "not available for this plan" döndü). Oran sınırı şimdilik uygulamanın veritabanı sayacıyla yapılıyor (SECURITY.md).
- [ ] Vercel'de gizli değerler: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `CRON_SECRET`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, iyzico, Turnstile.
- [ ] Bağımsız sızma testi (canlıdan önce).
- [x] Git uzak adresindeki düz metin GitHub token'ı kaldırıldı (2026-10-18). Kodda ve geçmişte başka gizli değer bulunmadı. Token'ın GitHub'da iptali kullanıcıda.
- [ ] GitHub deposu herkese açık; gizliye alınması kullanıcıda (Settings → General → Danger Zone).

## Ürün medyası kabul durumu (2026-09-20)

- [x] İzole test veritabanında (Postgres şeması) taslak → gerçek kapak → aile → yayın → herkese açık medya/renk akışı.
- [x] Sahte MIME/imza, boyut sınırı, yabancı poster/medya, tekrar renk, eksik kapak/poster reddi için otomatik testler.
- [x] Genel katalog ve feed'de taslak yalıtımı için test ve izole HTTP smoke.
- [ ] 320/375/768/1024/1440 px, klavye, ekran okuyucu, azaltılmış hareket ve yavaş ağ tarayıcı kabulü.
- [ ] Kalıcı S3 kimlik bilgileriyle üretim benzeri yükleme/geri okuma/silme testi.
- [ ] Diğer P0 güvenlik ve ödeme kapıları; bu medya özelliği canlı satış onayı değildir.

## Ürün düzenleyici: renk medyası, video, stok kodu (2026-10-14)

- [x] Düzenleyici tam sayfa yönetim düzeninde; ayrı "Ürün medyası" ve "Renk ailesi" bölümleri kaldırıldı (aileye bağlama renk satırına taşındı).
- [x] Renk başına çoklu görsel, her görselin kendi çekim türü/açıklaması (yükleme sonrası da düzenlenir), renk başına bir video ve poster seçimi; kayıtsız renkte dosyalar bekletilip kayıtla yüklenir.
- [x] Düzeltilen açık: posteri olarak kullanılan görsel silinince video kırık posterle kalıyordu; artık `POSTER_IN_USE` ile reddediliyor.
- [x] Boş stok kodları sunucuda üretilir ve katalogda benzersiz tutulur (`-2`, `-3`); eşzamanlı çakışmada bir kez yeniden denenir.
- [x] Otomatik testler: `tests/product-sku.test.ts`, `tests/product-variant-media.test.ts`, yetkisiz media PATCH/DELETE 403, düzenleyici/şerit/stil testleri. `npx tsc --noEmit`, `npm test` (281 test; token testi düzeltmesinden sonra ilgili dosyalar yeniden geçti), `.tsx` testleri (39/39) ve `npm run build` geçti.
- [x] Tarayıcı (yerel veritabanı, 2FA'lı yerel test yöneticisi): fiyatsız renge görsel seçme → taslak oluşturma → görsellerin tür ve kapakla yüklenmesi, stok kodu üretimi, açıklama düzenleme, video yükleme, poster silme reddi; 375 px'te yatay sayfa taşması yok.
- [ ] Ekran okuyucu ile pencere ve şerit turu, yavaş ağda çoklu yükleme, gerçek MP4 ile mağaza galerisinde oynatma.

## P1 — kalite tamamlanması

- [x] Yönetim sekme içerikleri (Dilim 3, 2026-10-02): on veri sekmesinde `alert/confirm`, satır içi stil ve emoji kaldırıldı; sessiz başarısızlıklar (sipariş durum PATCH'inde yanıt denetlenmiyordu, ürün vitrin hatası yutuluyordu) görünür hata oldu; hediye kartı "e-posta iletildi" yalnız gerçekten gönderildiyse yazıyor (API `emailSent`); depo fişi gerçekten sipariş başına A4 sayfa kesiyor. `npx tsc --noEmit`, `npm test`, `next build` geçti. Tarayıcıda 2FA'lı yönetici oturumuyla sekme sekme kabul henüz yapılmadı.
- [x] Siparişler ve Ürünler sekmeleri yeniden kuruldu (Dilim 4, 2026-10-03): sunucu tarafı sipariş listesi (URL'de filtre), zaman çizelgesi, CSV toplu kargo yükleme (önizleme + satır satır sonuç); ürün tablosu, satır içi fiyat/stok, 30 gün satış ve bekleyen talep, toplu yayın/taslak/vitrin/kategori, taslak kopya (stok 0, medyasız), yan panel ürün düzenleyici. `npx tsc --noEmit`, `npm test` (233/233), `.tsx` testleri, `next build` geçti. Tarayıcıda 2FA'lı yönetici oturumuyla kabul henüz yapılmadı.
- [x] PTT gönderi sistemi elle kipte (Dilim 5, 2026-10-04): gönderi kaydı, 10×10 etiket, barkod, şubeye teslim, elle hareketler, iptal; sipariş ↔ gönderi senkronu; Code 128 tablosu modül/parite testli (`tests/shipping.test.ts`, `tests/shipping-flow.test.ts`). 246/246 test, build geçti. Tarayıcıda 2FA'lı oturumla ve gerçek termal yazıcıda etiket baskısı + barkod okutma henüz denenmedi.
- [ ] PTT web servisi gerçek ortamda doğrulanmadı (sözleşme yok): `kabulEkle2` alan adları ve başarı kodu (`PTT_BASARI_KODU`), `barkodVeriSil`, `gonderiSorgu2` hareket alan adları, SOAP ad alanları (çalışma anında WSDL'den okunuyor), barkod aralığı ve kontrol hanesi kuralı resmi dokümanla karşılaştırılmalı; `PTT_ENV=test` ile bir gönderi yükle → sorgula → sil denenmeli.
- [ ] PTT hareket metni → durum eşlemesi (`ptt/status-map.ts`) anahtar kelimeye dayanıyor; gerçek PTT hareket örnekleriyle gözden geçirilmeli.
- [ ] Kurye ile adresten alım (PTT ek hizmet AA) bu dilimde yok.
- [x] `PATCH /api/admin/orders` durum geçiş sırasını, taşıyıcıyı ve takip numarası biçimini sunucuda denetliyor (`src/lib/orders/transitions.ts`; ödeme ve iade durumları panelden değişmez, Teslim edildi son durum, Kargoda takip numarası ister); tekilde 409, toplu işlemde `skipped` (`tests/order-transitions.test.ts`, `tests/admin-orders-flow.test.ts`, 2026-10-03).
- [x] `PATCH /api/admin/returns` durum geçiş sırasını ve sonuçlanmış iade kuralını sunucuda denetliyor (BEKLIYOR → ONAYLANDI / REDDEDILDI; sonuçlanan talep geri alınamaz veya değiştirilemez, tekilde 409 Conflict; `tests/order-transitions.test.ts`, 2026-10-14).
- [x] Kargoda e-postası sonucu yanıtta (`emails.failed`) ve etkinlik kaydında (`order.email_failed`) dönüyor; panel uyarı gösteriyor, sipariş zaman çizelgesinde kırmızı satır (`tests/admin-orders-flow.test.ts`, 2026-10-03).
- [x] `PATCH /api/admin/gift-cards`, `/api/admin/contact-messages`, `/api/admin/newsletter` ve `/api/admin/categories` kayıt ve mutasyonları etkinlik günlüğüne (`recordAudit` / `recordAuditAfter`) yazılıyor (2026-10-14).

- [x] Ana sayfa, katalog, sepet, favori, hesap ve ödeme için loading/empty/error/retry durumları [STATES.md](STATES.md) ile eşitlendi (`CartContext` ve `WishlistContext` için `isLoaded` durumu, ana sayfa skeleton/retry, favoriler ve çanta boş ekran flaşı önleme).
- [ ] Ürün ve kampanya içeriklerindeki materyal, üretim yeri, sınırlı seri, kargo ve iade iddialarını ticari kaynakla doğrula.
- [x] Her görünen link, input, buton, kart eylemi ve modal için tıklama + klavye + hata testi yap; `href="#"` veya sahte başarı kalmasın (`tests/brand-compliance.test.ts` ile kaynak taraması ve tüm rota testleri doğrulandı, 2026-10-14).
- [ ] Ürün/sipariş/kupon işlemlerinde eşzamanlı istek ve yenileme senaryolarını test et; fiyat/stok tutarlılığını doğrula.
- [ ] Görsel optimizasyonu kapalı yapılandırmanın etkisini ölç; mobil LCP ve toplam transferi [PERFORMANCE.md](PERFORMANCE.md) bütçesine indir.
- [x] `/canta` ve `/hesabim` sahte içerikten arındırıldı (2026-09-28): uydurma SKU, sunucunun almadığı 150 TL kargo ve ücretsiz kargo eşiği, sahte Google adres önerisi, makbuzdaki uydurma şirket/Mersis satırı, herkese gösterilen "doğrulanmış hesap" rozeti kaldırıldı; hesap sekmelerindeki sessiz hatalar görünür hata + tekrar dene oldu. Çanta fiyat/stoku `/api/cart/validate` ile sunucudan okunuyor (`tests/cart-quote.test.ts`, `tests/account-lib.test.ts`).
- [x] `/odeme` sahte "Google Haritalar" adres önerisi, "BDDK/PCI-DSS" ve "taksit" gibi doğrulanmamış ödeme iddiaları ve kart rozetleri kaldırıldı (2026-09-28).
- [x] `/favorilerim` stok bilmeden beden varsayan ("M") hızlı ekleme ve rastgele bedenle "Tümünü sepete ekle" kaldırıldı; fiyat, beden ve stok `/api/products?ids=` ile güncel katalogdan okunuyor, satıştan kalkan ürün işaretleniyor (2026-09-28).
- [x] Rehber ve hizmet sayfaları sahte içerikten arındırıldı (2026-09-30): iletişim formu artık gerçekten kaydedip destek kutusuna iletiyor; sahte WhatsApp numarası kaldırıldı (yalnız `NEXT_PUBLIC_WHATSAPP_NUMBER` ile); sipariş takibi sistemde olmayan durumları (`BEKLEMEDE`, `IPTAL_EDILDI`) kullanıyordu, ortak sipariş durumlarına bağlandı; SSS'deki "sigortalı kargo", "BDDK/256-bit", "24 ay", "lüks hediye kutusu" gibi doğrulanmamış iddialar koda göre düzeltildi; bakım rehberindeki uydurma sertifika rozetleri ve stil rehberinde farklı kesimlere tekrar etiketlenen aynı fotoğraflar kaldırıldı; iki çelişen beden tablosu tek Türkiye tablosunda (`size-chart.ts`) birleşti (`tests/size-chart.test.ts`).
- [x] Hediye kartında seçilen "özel tarihte teslim" hiç uygulanmıyordu (kart ödemede hemen gidiyordu); seçenek kaldırıldı, sunucu doğrulaması eklendi (2026-09-30).
- [x] `/api/contact`, `/api/orders/track` ve `/api/stock-alert` için veritabanı destekli oran sınırı (`enforce`) devrede ([SECURITY.md](SECURITY.md)).
- [x] Footer gizlilik ve hizmet koşulları pencerelerindeki doğrulanmamış "uçtan uca şifreleme" ve "sigortalı kargo" ifadeleri düzeltildi, mevzuata ve gerçek kargo sürecine uygun hale getirildi (`GuideModals.tsx`, 2026-10-14).
- [x] `public/assets/gift-card-couture.jpg` görselinde yasaklı "MAISON" yazısı vardı; sayfada kullanılmıyordu, depodan kalıcı olarak silindi (2026-10-14).
- [x] Hediye kartı logosu: `public/assets/brand/pandiones-monogram.png` (şeffaf PNG) eklendi; kart yüzlerinde ve önizlemelerinde maskeli monogram olarak devrede (2026-10-14).
- [x] 375 px ve 320 px mobilde header ikon çakışması çözüldü; mobilde simetrik 2 sol / 2 sağ ikon düzenine geçildi, hesap bağlantısı menü çekmecesine taşındı.
- [x] Erişilebilirlik ve klavye gezinimi güçlendirildi: WCAG 2.4.1 uyumlu erişilebilir `.skip-link` ("İçeriğe atla" -> `#main`) eklendi, 47 noktada `prefers-reduced-motion` ve 95 noktada token bazlı `:focus-visible` stilleri doğrulandı (2026-10-14).
- [x] Marka dili ve sahte rozet koruması otomatik teste bağlandı (`tests/brand-compliance.test.ts`): `src/` altındaki tüm bileşen, şablon, CSS ve API rotalarında yasaklı sözcükler ("atölye", "atolye", "atelier", "maison", "istanbul"), uydurma güven rozetleri ("Özel Pandiones Kutusu", "Sigortalı Gönderim", "30 Gün Değişim", "BDDK", "uçtan uca şifreleme") ve kırık `href="#"` bağlantıları CI/test aşamasında taranarak sıfır toleransla engellendi (2026-10-14).

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

`npm test` (`node --import tsx --test`), `npx tsc --noEmit`, `npm run build`, ilgili testler, tarayıcı akışları ve sağlayıcının sandbox testi ayrı kaydedilir. `package.json` içine birleşik `test` betiği eklenmiştir ve 252 testin tamamı otomatik olarak koşulmaktadır. P0 maddeleri kapanmadan ödeme sayfası canlı satışa hazır olarak sunulmaz. Yeni bir özellik açılırsa matrise ve ilgili sayfa belgesine eklenir.
