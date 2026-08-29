# 09 — Test, QA ve Gözlemlenebilirlik

## Ortam ve veri ilkesi

- Unit test saf factory/fixture kullanabilir. Integration/e2e yalnızca izole test D1/R2 ve PayTR test modu kullanır.
- Fixture hiçbir production build route’unda import edilmez. Kod kalite kontrolü bunu tarar.
- Staging gerçek müşteri verisi içermez; sentetik ve açıkça `TEST` etiketli ürün/siparişlerdir.
- Production smoke testi gerçek tahsilat gerektiriyorsa düşük tutarlı, önceden onaylı, kayıtlı ve hemen kontrollü iade edilen operasyon prosedürü kullanır; kullanıcı onayı olmadan çalıştırılmaz.

## Test piramidi

### Unit

- Money/rounding, efektif fiyat, indirim ve kargo kuralları.
- Ürün publish validator ve varyant çözümleme.
- Satılabilir stok, rezervasyon süresi ve state transition.
- Sipariş/payment/refund state machine.
- PayTR token/hash üretimi ve sabit zamanlı karşılaştırma adapter’ı.
- Slug, URL allowlist, PII redaction, form normalization.
- SEO metadata ve JSON-LD dönüşümü.

### D1 integration

- Migration sıfır DB’ye uygulanır ve beklenen version oluşur.
- Prepared query/repository CRUD, foreign key, unique/index davranışı.
- İki eşzamanlı checkout son ürünü birlikte satamaz.
- Kupon global/müşteri limiti yarışta aşılmaz.
- Callback tekrarında tek payment success, stok sale, outbox ve history.
- Stok reservation expire/convert/release ledger eşitliği.
- Kısmi/toplam iade limitleri ve order status.
- Admin permission + object ownership + audit aynı işlemle.

### Contract/integration

- PayTR request alan sırası/tipleri ve başarı/hata schema parse.
- Callback form content type, hash, tam `OK` response.
- R2 upload finalize; kötü MIME/magic byte/oversize/orphan.
- Mail/SMS/shipping adaptörleri karar verilince provider sandbox contract.

### E2E

En az Chromium, WebKit ve mobil viewport:

1. Ana sayfadan kategori → filtre → ürün → varyant → sepet.
2. Stok/fiyat değişikliği uyarısı ve checkout engeli.
3. Misafir checkout validation, sözleşme, PayTR test ödeme, callback, success.
4. Başarısız ödeme ve güvenli retry; çift sipariş/tahsilat yok.
5. Sipariş takip doğrulama ve kargo durumu.
6. Admin ürün oluşturma, medya, varyant/fiyat/stok, preview, publish; storefront görünür.
7. Admin sipariş hazırlama/kargo ve müşteri bildirim outbox.
8. İade talebi, admin karar, PayTR test iade.
9. Admin RBAC: destek fiyat/iade/rol değiştiremez.
10. 404, empty, offline/network retry ve error boundary.

## Etkileşim envanteri testi

Her route için otomatik/manuel tablo tutulur: kontrol etiketi, selector, hedef route/endpoint, normal/loading/disabled/success/error, klavye ve analytics. Aşağıdakiler release blocker’dır:

- `href="#"`, boş href, `javascript:`.
- Handler’sız görünen button, gönderilmeyen form, submit olmayan Enter.
- Console error/unhandled rejection.
- Placeholder/mock ürün/fiyat/stok/sipariş.
- Sahte success toast veya yalnızca localStorage değişimi.
- Link olarak div/span ve klavye ile erişilemeyen kontrol.

## Erişilebilirlik

- Otomatik axe testleri + manuel klavye/screen reader kritik akış.
- Heading/landmark, form label/error, focus görünümü/sırası, dialog focus trap/restore.
- Renk kontrastı, zoom %200–400, reflow 320 px, touch target.
- Product gallery/carousel kontrol/duyuru; autoplay varsa durdurma.
- Reduced motion’da tüm içerik ve CTA; animasyon nöbet/rahatsızlık yaratmaz.

## Görsel/responsive QA

Viewportlar en az 320, 375, 768, 1024, 1440 ve 1920 px. Dikey ürün görseli, 4 kart grid, uzun Türkçe metin, indirimli fiyat, uzun ürün adı, stok etiketi, iFrame ve admin tabloları screenshot regression ile kontrol edilir.

## Performans ve SEO QA

- Production build üzerinde Lighthouse CI eşikleri; CWV hedefleri [SEO belgesinde](./07_SEO_AND_CONTENT.md).
- Bundle analizi; WebGL/GSAP yalnızca gerekli route’larda lazy; görünmeyen animasyon pause.
- SSR HTML’de H1/title/canonical/Product JSON-LD; sitemap/robots; noindex route; redirect/404.
- Structured data görünür DB verisiyle karşılaştıran integration test.
- R2 images width/height/cache/alt ve kırık link taraması.

## Güvenlik testleri

- Auth bypass, IDOR/BOLA, rol yükseltme, CSRF/origin, session invalidation.
- Stored/reflected/DOM XSS payloadları; rich text, alt, ürün adı, arama.
- SQL injection ve sort/filter allowlist.
- Upload polyglot/double extension/oversize/SVG/EXIF.
- Open redirect, SSRF private IP/redirect, path traversal.
- Rate limit ve enumeration; callback kötü hash/replay; refund double-submit.
- Dependency, secret ve SAST taraması. Yüksek/kritik açık release blocker.

## Log, metrik ve alarmlar

### Metrik

- HTTP request count/error/latency route sınıfı; yüksek kardinalite PII label yok.
- D1 query latency/error, transaction conflict.
- Checkout prepare/token success/error; callback accepted/invalid/duplicate/latency.
- Pending payment yaş dağılımı; reconciliation farkı.
- Reservation active/expired, oversell invariant violation.
- Outbox backlog/attempt/dead-letter; e-posta/SMS başarısı.
- R2 upload reject/finalize/orphan.
- CWV gerçek kullanıcı metrikleri consent/privacy politikasına uygun.

### Alarm

- Callback başarısı düşmesi veya son başarılı callback’in gecikmesi.
- Invalid hash ani artışı.
- Pending payment SLA aşımı/mutabakat farkı.
- Negatif satılabilir stok/ledger tutarsızlığı.
- Refund failure veya aynı order’da şüpheli çoklu istek.
- Admin rol/secret ayarı/export kritik audit olayı.
- Outbox dead-letter, D1/R2 error ve 5xx artışı.

Alarm kişiselleştirilmiş sipariş verisini genel kanala koymaz; on-call runbook linki ve request/provider reference ID verir.

## Release ve geri dönüş

1. Migration preview/staging, backup/restore kanıtı.
2. Build/lint/test/security/SEO/accessibility.
3. Staging PayTR test senaryoları.
4. Feature flag ile kontrollü rollout.
5. Smoke ve metrik gözlemi.
6. Hata halinde uygulama rollback; DB migration backward-compatible olduğu için eski sürüm çalışır. Ödeme callback route’u rollback sırasında da erişilebilir kalır.

Test raporu build commit, migration version, environment ve tarih içerir.

