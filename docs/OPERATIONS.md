# Ortamlar, yayın ve işletim

## Ortam ayrımı

Yerel geliştirme, sağlayıcı sandbox ve üretim birbirinden ayrı veritabanı, ödeme anahtarı, URL ve yükleme alanı kullanır. Ortam adı kullanıcıya ve operatöre anlaşılır olmalıdır. Üretim başlatılırken zorunlu sırlar yoksa süreç başarısız olur; sessiz simülasyona geçmez.

| Değişken | Amaç | Üretim koşulu |
| --- | --- | --- |
| `DATABASE_URL` | Prisma bağlantısı | Kalıcı, yedeklenen veri kaynağı |
| `AUTH_SECRET` | Oturum imzası | Rastgele güçlü değer, sabit kod yedeği yok |
| `IYZICO_API_KEY` | Ödeme API kimliği | Canlı sağlayıcı hesabı, gizli depolama |
| `IYZICO_SECRET_KEY` | Ödeme imzası | Canlı sağlayıcı hesabı, gizli depolama |
| `IYZICO_BASE_URL` | Sağlayıcı ortamı | Üretimde doğru canlı uç nokta |
| `NEXT_PUBLIC_SITE_URL` | Callback, sitemap ve linkler | Gerçek HTTPS alan adı |
| `RESEND_API_KEY` | İşlemsel e-posta API anahtarı | Canlı e-posta gönderimi için zorunlu gizli anahtar |
| `EMAIL_FROM` | Gönderen e-posta başlığı | Doğrulanmış kurumsal alan adı (örn. Pandiones <siparis@pandiones.com>) |
| `CONTACT_INBOX_EMAIL` | İletişim formu mesajlarının gideceği kutu | Okunan bir destek kutusu; yoksa `destek@pandiones.com` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | İletişim sayfasındaki WhatsApp bağlantısı | Ülke koduyla gerçek numara (örn. 905XXXXXXXXX); boşsa WhatsApp hiçbir yerde gösterilmez |

## Yayın sırası

1. Sürüm ve ortam değişkenleri kontrol edilir; test hesabı, seed veya sandbox anahtarı üretimde bulunmaz.
2. Veritabanı yedeği alınır ve geri yükleme yolu denenir. Şema değişikliği gözden geçirilmiş migration ile uygulanır: Vercel derlemesi `vercel-build` (`prisma generate && prisma migrate deploy && next build`) çalıştırır; ilk Postgres geçişi `20261003000000_init`. `db push` kullanılmaz.
3. Tip kontrolü, build, API ve tarayıcı testleri çalıştırılır. [QA.md](QA.md) P0 kapıları kanıtla kapanır.
4. Yeni sürüm önizlemede gerçekçi ama kişisel olmayan veriyle kontrol edilir. Canlı ödeme için sağlayıcı onaylı küçük işlem ve iade/uzlaştırma prosedürü uygulanır.
5. Yayın sonrası ana rotalar, ödeme callback'i, hata oranı, stok, sipariş ve feed gözlemlenir. Geri alma eşiği önceden belirlenir.

## Gözlemlenebilirlik

Her sipariş ve ödeme için gizli olmayan korelasyon kimliği kullanılır. Ölçümler: API hata oranı/gecikmesi, ödeme başlatma/başarı/başarısızlık sayıları, belirsiz ödeme sayısı, negatif stok, başarısız e-posta, görsel yükleme hatası, istemci hatası ve Core Web Vitals. Kişisel veri veya ödeme tokenı log/analitik olayına yazılmaz. Alarmın sahibine ve yanıt süresine operasyon kararıyla isim verilir.

## Olay senaryoları

| Olay | İlk adım | Kurtarma ölçütü |
| --- | --- | --- |
| Ödeme sonucu belirsiz | Siparişi beklemede tut, sağlayıcıyla uzlaştır | Tek nihai durum, çift stok hareketi yok |
| Veritabanı erişilemiyor | Yeni sipariş alımını güvenli biçimde durdur | Geri yükleme/doğrulama sonrası tekrar aç |
| Görsel depolama kayıp | Ürün görselini güvenli boş durumla göster | Kalıcı depodan geri yükle |
| Stok eksiye indi | Etkilenen ürünü satıştan çek | Sipariş/stok mutabakatı ve düzeltme kaydı |
| Gizli anahtar sızdı | Anahtarı döndür, oturumları geçersizleştir | Yeni sırla test, erişim kayıtlarını incele |

## Veri saklama ve yedek

Üretim verisi Supabase PostgreSQL'de, yüklenen görseller Supabase Storage `media` kovasındadır; `public/uploads` yalnız yerel geliştirmede kullanılır. Yedek sıklığı, saklama süresi, şifreleme, erişim, geri yükleme denemesi ve silme talebi süreçleri tanımlanır. Bülten ve stok alarmı için e-posta sağlayıcısı yoksa kullanıcıya gönderim sözü verilmez. Operasyonel süreçler [DATA.md](DATA.md) ve [SECURITY.md](SECURITY.md) ile birlikte ele alınır.

## iyzico kurulumu (2026-10-03)

1. Sandbox: https://sandbox-merchant.iyzipay.com hesabından API ve gizli anahtar; `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`. Üretim derlemesi sandbox adresiyle ödeme başlatmaz; canlıda `https://api.iyzipay.com` ve canlı anahtarlar.
2. Bildirim (webhook): iyzico panel → Ayarlar → Firma Ayarları → Firma Bildirimleri, adres `https://<alan-adı>/api/payment/webhook` (HTTPS zorunlu). İmza başlığı `X-IYZ-SIGNATURE-V3`; hesapta imzalı bildirim kapalıysa entegrasyon@iyzico.com'dan açtırılır. `*.vercel.app` adresi Vercel giriş koruması arkasındaysa bildirim 401 alır: özel alan adı ya da koruma muafiyeti gerekir.
3. Test kartları: https://docs.iyzico.com/ek-bilgiler/test-kartlari (3D şifresi sandbox'ta `123456`).
4. İade: Yönetim panelinden (API hazır: `POST /api/admin/payments/refund`). Aynı gün ödemeler iptal edilir; gün sonu alınmışsa her ürün kalemi ayrı iade edilir. `REFUND_FAILED`/`REFUND_PARTIAL` görülürse iyzico panelinden tamamlanır.
5. Sipariş akışı: başlatma yanıtı (`conversationId:token`), sonuç (`paymentStatus:…:token`) ve iptal/iade (`paymentId:price:currency:conversationId`) yanıtlarının imzası doğrulanır; alıcı IP'si gerçek istemci IP'sidir; kimlik numarası verilmezse iyzico'nun kabul ettiği `11111111110` gönderilir.

## PTT Kargo (Dilim 5, 2026-10-04)

- **Bugün (sözleşme yok):** panel elle kipte çalışır. Siparişte "Gönderi oluştur" → 10×10 cm etiket (gönderen, alıcı, desi/koli, sipariş referansı Code 128 barkodu) → paket şubeye → şubenin fişindeki PTT barkodu panele girilir → "Şubeye teslim ettim" (sipariş Kargoda, müşteriye e-posta) → dağıtım / teslim / teslim edilemedi / iade hareketleri PTT takip sayfasına bakılarak elle girilir. Etiket için **Ayarlar → Kargo**'da gönderici adı, telefon, adres, ilçe, il tamamlanmalı.
- **Sözleşme sonrası:** PTT il müdürlüğünden müşteri numarası ve web servis şifresi alınır, Vercel'de tanımlanır: `PTT_MUSTERI_ID`, `PTT_SIFRE`; isteğe bağlı `PTT_KULLANICI` (verilmezse `PttWs`), `PTT_ENV=test` (yalnız test; üretimde reddedilir), `PTT_KABUL_URL` / `PTT_TAKIP_URL` (varsayılanlar: `pttws.ptt.gov.tr` PttVeriYukleme / GonderiTakipV2), `PTT_BASARI_KODU` (kabulEkle2 başarı kodu, varsayılan `1`). Tanımlanınca panel API kipine geçer: barkod girildiğinde alıcı bilgileri `kabulEkle2` ile PTT'ye yüklenir, iptal `barkodVeriSil`, hareketler `gonderiSorgu2`. Barkodlar PTT'nin sözleşmeyle verdiği aralıktan girilir (kod barkod üretmez).
- **Önce test:** sözleşmeyle gelen resmi doküman alan adları, başarı kodu ve barkod kuralıyla karşılaştırılmalı; `PTT_ENV=test` ile önizleme ortamında bir gönderi yüklenip silinmeli ve takibi sorgulanmalıdır (QA.md açık madde).
- **Takip görevi:** `/api/cron/shipments` günde bir (`vercel.json`, Hobby planı); `CRON_SECRET` ister. Elle kipte hiçbir şey yapmaz. Panelde ayrıca `POST /api/admin/shipments/track` (yalnız API kipinde).
- **Veritabanı:** `prisma/migrations/20261004000000_shipping` (Shipment, ShipmentEvent, StoreSettings gönderici alanları; yalnız ekleme, RLS açık). `vercel-build` dağıtımda `prisma migrate deploy` ile otomatik uygular.

## Ortam değişkenleri — güvenlik (2026-10-02)

- `CRON_SECRET` (≥32 rastgele karakter): `/api/cron/expire-orders` için; Vercel Cron bunu `Authorization: Bearer` olarak gönderir. Yoksa uç nokta 401 döner ve bekleyen siparişlerin rezervasyonu süresi dolsa da geri verilmez.
- `PAYMENT_MODE=simulator`: yalnız yerel geliştirme; üretimde tanımlanmaz (tanımlansa da `NODE_ENV=production` simülatörü kapatır).
- `NEXT_PUBLIC_SITE_URL`: ödeme dönüşü ve e-posta bağlantıları buradan kurulur (istek Host başlığına güvenilmez); üretimde zorunlu.

## Güvenlik kurulumu — canlıdan önce (2026-10-02)

Ortam değişkenleri (üretim):
- `AUTH_SECRET` — zorunlu, en az 32 rastgele karakter (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Değiştirilirse tüm oturumlar ve imzalı bağlantılar geçersizleşir.
- `CRON_SECRET` — zorunlu (≥32 karakter); `/api/cron/expire-orders`, `/api/cron/cleanup`, `/api/cron/reconcile` — Hobby planı nedeniyle üçü de günlük (`vercel.json`). Süresi dolan bekleyen siparişler ayrıca her ödeme isteğinin başında serbest bırakılır, böylece terk edilen ödeme stoğu bir sonraki alıcıyı bekletmez. Özel alan adı bağlanınca 10 dakikalık iade Supabase `pg_cron` + `pg_net` ile (sır Supabase Vault'ta) eklenebilir; `*.vercel.app` adresleri Vercel giriş koruması arkasında olduğu için dışarıdan cron çağrısı şu an 401 alır.
- `TRUSTED_PROXY` — boş ya da `vercel`: istemci IP'si Vercel'in yazdığı `x-real-ip`'den; `cloudflare`: Cloudflare önde ve origin yalnız Cloudflare'i kabul ediyorsa `cf-connecting-ip`. İstemcinin kendi gönderdiği IP başlıkları yok sayılır.
- `DATABASE_URL` — Supabase pooler (6543, `?pgbouncer=true&connection_limit=1`), `DIRECT_URL` — doğrudan bağlantı (5432, yalnız migration).
- `MEDIA_S3_ENDPOINT`, `MEDIA_S3_REGION`, `MEDIA_S3_BUCKET`, `MEDIA_PUBLIC_BASE_URL` — Supabase Storage (Vercel'de tanımlı); `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY` — Supabase → Storage → S3 access keys.
- `NEXT_PUBLIC_SITE_URL` — zorunlu; e-posta ve ödeme dönüş bağlantıları.
- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile.
- `ADMIN_ALLOWED_IPS` — isteğe bağlı, virgülle ayrılmış.
- `SECURITY_ALERT_EMAIL` — isteğe bağlı; kritik güvenlik olayları.
- Üretimde **tanımlanmaz:** `PAYMENT_MODE`, `PWNED_CHECK`, `RATE_LIMIT` (yalnız yerel/test).

Cloudflare (alan adı Cloudflare'de, proxy açık):
1. SSL/TLS "Full (strict)", Always Use HTTPS, HSTS (uygulama da gönderir).
2. WAF → Managed Rules (Cloudflare + OWASP Core) açık; Bot Fight Mode (ya da Super Bot Fight Mode) açık.
3. Rate limiting kuralları: `/api/auth/*` IP başına 10/dk, `/api/checkout` 20/dk, `/api/orders/track`, `/api/coupons/validate`, `/api/gift-cards/balance` 10/dk → Block 10 dk.
4. `/yonetim*` için Türkiye dışı istekte "Managed Challenge" (ya da Cloudflare Access ile e-posta doğrulaması).
5. DDoS L3/4/7 koruması varsayılan açıktır; "Under Attack" modu saldırı anında açılır.
6. Origin yalnız Cloudflare'den gelen trafiği kabul etmeli (Vercel'de Firewall → IP allowlist ya da Cloudflare Authenticated Origin Pulls); aksi halde `CF-Connecting-IP` taklit edilebilir.

Veritabanı (2026-10-03): Supabase `pandiones` projesi (eu-central-1, Postgres 17). `20261003000000_init` uygulandı ve `_prisma_migrations`'a kaydedildi (sağlama değeri depodaki dosyayla aynı; `.gitattributes` geçiş dosyalarını LF'de tutar). Katalog yüklendi (52 kategori, 12 ürün, 49 beden, 39 görsel). Bütün tablolarda RLS açık ve politika yok; `rls_auto_enable()` yalnız sahip rolünce çalıştırılabilir. Açık kalan: uygulama için DDL yetkisiz ayrı rol (şu an bağlantı `postgres` rolüyle), günlük yedeğin Supabase planında doğrulanması ve aylık geri yükleme denemesi, Supabase ağ kısıtlaması.
