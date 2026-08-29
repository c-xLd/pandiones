# 08 — Güvenlik, Gizlilik ve Uyum

## Güvenlik tabanı

Hedef OWASP ASVS 5.0 Level 2’dir; ödeme, admin ve kişisel veri akışları için tehdit modeli ayrıca tutulur. Bu belge hukuki danışmanlık değildir. Canlı metin, vergi, tüketici ve kayıt yükümlülükleri şirketin hukuk/mali danışmanı tarafından onaylanır.

## Başlıca varlıklar ve tehditler

| Varlık | Tehdit | Temel kontrol |
| --- | --- | --- |
| Sipariş/tahsilat | Sahte callback, tutar değiştirme, tekrar | PayTR HMAC, server total, idempotency, state machine |
| Stok | Yarış, oversell, çift release | D1 transaction, koşullu update, reservation ledger |
| Admin | Hesap ele geçirme, aşırı yetki | Ayrı auth, MFA, RBAC, reauth, audit |
| PII | IDOR, log/backup sızıntısı | Sahiplik, minimizasyon, redaction, saklama/silme |
| Medya | Zararlı dosya, stored XSS, R2 abuse | Tür/boyut/magic-byte, sanitize, random key, CSP |
| Kupon/iade | Business logic abuse | Transaction limitleri, idempotency, approval/audit |
| Site | XSS/CSRF/SQLi/SSRF | Encode/sanitize, CSRF/origin, prepared SQL, URL allowlist |

## Kimlik, oturum ve yetki

- Public müşteri auth sağlayıcısı mimari karar kapısıdır; desteklenmeyen el yapımı parola sistemi yok.
- Admin MFA zorunlu; rol/finans işlemlerinde yakın zamanda doğrulama. Hesap keşfini önleyen genel hata mesajları ve rate limit.
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax` veya ihtiyaca göre Strict, dar Path/Domain, rotation; token `localStorage`da tutulmaz.
- Giriş/rol değişiminde session fixation engellenir; logout ve askıya alma aktif sessionları iptal eder.
- Deny-by-default RBAC ve object-level authorization. ID/route bilmek erişim sağlamaz.
- Kritik eylemde bir kişinin talep ve onayı aynı olamayacak biçimde çift kontrol opsiyonu.

## Web ve API kontrolleri

- Tüm girdiler sunucuda tip, uzunluk, format, enum ve business rule allowlist ile doğrulanır.
- D1 yalnızca bound prepared statement; kullanıcı kontrollü column/order parçası yok.
- React output encoding korunur. Rich text server-side sanitize; `dangerouslySetInnerHTML` yalnızca güvenilir sanitize sonucuyla merkezi bileşende.
- State-changing same-origin route’larda CSRF token ve/veya güçlü Origin/Referer + SameSite. PayTR callback CSRF dışıdır, HMAC ile korunur.
- CORS varsayılan same-origin; wildcard credential yok.
- JSON/form body, upload, pagination ve sorgu karmaşıklığı limitleri.
- SSRF: kullanıcı URL’sine sunucudan keyfi fetch yok. External URL allowlist, HTTPS, redirect/IP yeniden doğrulama; private/link-local/metadata adresleri engellenir.
- Redirect hedefleri relative/same-origin veya sabit allowlist.
- Hata ekranı stack/SQL/provider secret içermez.

## Güvenlik başlıkları

Production HTTPS zorunlu:

- `Strict-Transport-Security` uygun preload kararı sonrası.
- Nonce/hash tabanlı `Content-Security-Policy`; `default-src 'self'`; PayTR frame/script/connect kaynakları resmi gereksinim kadar allowlist; `frame-ancestors 'none'` veya gerekli admin/site politikası.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin` veya daha katı.
- `Permissions-Policy` kamera/mikrofon/konum gibi gereksiz izinleri kapatır.
- `frame-ancestors` ana siteyi clickjacking’den korur; PayTR iFrame yüklemek `frame-src` ile ayrıdır.

CSP önce report-only gözlemlenir, sonra enforce edilir. `unsafe-eval` production’da yok; geniş `unsafe-inline` kalıcı çözüm değildir.

## Secret ve kriptografi

- PayTR key/salt, auth, mail/SMS secret yalnızca secret store ve server runtime.
- Secret rotasyon runbook’u; eski secret geçiş süresi minimum. Repo geçmişinde secret taraması.
- Hash karşılaştırmaları sabit zamanlı; güvenlik token’ları CSPRNG ile en az 128 bit entropi, DB’de hash’li ve süreli.
- Uygulama şifreleme anahtarını şifreli veriyle aynı yerde düz saklamaz.
- Kart verisi hiçbir koşulda log/DB/analytics/support ekranında bulunmaz.

## Dosya yükleme ve R2

- İzinli format, maksimum byte/pixel, uzantı+Content-Type+magic byte; decompression bomb ve metadata riski.
- Dosya adı kullanıcıdan alınmaz; rastgele R2 key. Response `Content-Type`, `Content-Disposition`, cache ve nosniff doğru.
- Görseller güvenilir decoder ile yeniden encode edilebilir; EXIF/konum metadata kaldırılır.
- SVG ve HTML varsayılan yasak. Gerekirse ayrı sanitizer ve farklı origin.
- Upload tamamlanmadan public değil; orphan cleanup job. Admin alt metni XSS-safe düz metin.

## Rate limit, bot ve suistimal

- Login/OTP, arama, iletişim, kupon, sepet ve checkout route bazlı limit.
- IP tek başına kalıcı kimlik değildir; privacy-safe hash ve kısa retention.
- Checkout/kupon/iade için velocity ve anomali ölçümü. Hatalı callback hash, admin rol/finans, export ve çoklu başarısız giriş alarm üretir.
- CAPTCHA yalnızca risk tabanlı ve privacy/accessibility değerlendirmesiyle; herkese zorunlu ilk çözüm değil.

## Loglama ve audit

- JSON structured log: timestamp, severity, event code, requestId, route, status, duration, actor/resource pseudonymous ID.
- Redact: authorization/cookie, PayTR key/salt/token/hash, e-posta/telefon/adres, OTP, order status token, form body.
- Admin audit append-only; katalog yayın, stok, sipariş geçişi, iade, rol, export, yasal metin ve ayar değişikliği.
- Kullanıcıya correlation ID gösterilebilir; log erişimi rol ve saklama süresiyle sınırlı.

## KVKK ve çerez

- Kişisel Veri İşleme Envanteri: veri kategorisi, kişi grubu, amaç, hukuki sebep, kaynak, alıcı/aktarım, saklama, teknik/idari tedbir ve sorumlu.
- Veri elde edilirken KVKK aydınlatma: veri sorumlusu, amaç, aktarım, yöntem/hukuki sebep ve haklar. Aydınlatma ile açık rıza ayrı süreçtir.
- Siparişin ifası için gerekli veri pazarlama rızasına bağlanmaz. Pazarlama e-posta/SMS izinleri ayrı, seçilmemiş ve ispatlanabilir; geri alma kolay.
- Zorunlu olmayan analitik/reklam çerezleri açık tercih öncesi yüklenmez. “Kabul et” kadar kolay “Reddet” ve kategori bazlı yönetim; tercih değiştirilebilir.
- Yalnızca gerekli cart/session/security cookie’leri hukuki dayanak ve süreleriyle çerez tablosunda belgelenir.
- İlgili kişi erişim/düzeltme/silme talepleri kimlik doğrulama, ticket ve yasal saklama istisnası ile işlenir.
- VERBİS yükümlülüğü şirket kriterlerine göre hukuk danışmanı tarafından değerlendirilir; istisna KVKK’nın diğer yükümlülüklerini kaldırmaz.

## Türkiye e-ticaret/tüketici gereksinimleri

- ETBİS kaydı ve alan adı bildirimi canlı satış öncesi şirketçe doğrulanır.
- Footer/iletişimde ticari unvan, MERSİS/vergi, açık adres, telefon/e-posta gibi gerekli bilgiler hukuk onaylı sunulur.
- Ödeme öncesi ürün temel nitelikleri, satıcı bilgileri, vergiler dahil toplam, tüm ek/kargo maliyetleri, teslimat ve cayma/hak arama yolları açıkça gösterilir; kullanılan sürüm siparişe bağlanır ve kalıcı veri saklayıcıyla kullanıcıya gönderilir.
- İlave ücret seçenekleri varsayılan seçili olmaz.
- İç giyimde cayma istisnası mutlak değildir: resmi bilgilendirmede koruyucu ambalaj/bant/mühür/paket açılmış ve iadesi hijyen açısından uygun olmayan ürün koşulu vardır. Ürün ambalaj operasyonu ve metin bununla tutarlı olmalı; hukuk onayı zorunludur.
- Teslimat, iptal ve iade süreleri sistem job’ları/uyarılarıyla takip edilir; mevzuat değişikliği launch ve periyodik uyum gözden geçirmesine girer.

## Saklama ve silme

Hukuk/mali müşavir tablo bazlı süreleri onaylar. Teknik politika:

- Amaç sona erince PII silinir/anonimleştirilir; finansal sipariş toplamı ve zorunlu kayıtlar kimlikten ayrıştırılarak yasal süre kadar korunur.
- Terk sepet, upload temp, OTP/session, raw security log ve analytics için kısa açık süre.
- Backup kopyaları silme programına dahil; restore sonrası silme tombstone/job tekrar uygulanır.
- Üretim verisi yerel geliştirmeye kopyalanmaz; gerekiyorsa geri döndürülemez anonim dataset.

## Olay müdahalesi

1. Tespit ve severity.
2. Erişimi/secret’ı sınırla; delili bütünlüğüyle koru.
3. Etkilenen veri, kullanıcı, süre ve sağlayıcıyı belirle.
4. Hukuki bildirim sürelerini danışmanla değerlendir.
5. Güvenli düzeltme, rotasyon ve recovery.
6. Kullanıcı/otorite iletişimi onaylı kanaldan.
7. Postmortem, test ve kontrol güncellemesi.

## Resmî/otoritatif kaynaklar

- [OWASP ASVS 5.0 ve Cheat Sheet eşlemesi](https://cheatsheetseries.owasp.org/IndexASVS.html)
- [KVKK Çerez Uygulamaları Hakkında Rehber](https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber)
- [KVKK Veri Sorumluları Sicili Yönetmeliği](https://www.kvkk.gov.tr/Icerik/5442/VERI-SORUMLULARI-SICILI-HAKKINDA-YONETMELIK)
- [Ticaret Bakanlığı ETBİS bilgisi](https://ticaret.gov.tr/ic-ticaret/bilgi-sistemleri/elektronik-ticaret-bilgi-sistemi-etbis-ve-e-ticaret-bilgi-platformu)
- [Ticaret Bakanlığı Mesafeli Sözleşmeler bilgilendirmesi](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme)

