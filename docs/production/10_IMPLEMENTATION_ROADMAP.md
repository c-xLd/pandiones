# 10 — Uygulama Yol Haritası

## Çalışma yöntemi

Fazlar sırayla ilerler. Her fazın sonunda çalışan dikey dilim, test, migration, güvenlik/erişilebilirlik ve belge güncellemesi bulunur. Gelecek fazın sahte butonunu/ekranını erkenden koymak yasaktır.

## Faz 0 — Kararlar ve envanter

- Mevcut kod, sabit `products`, `localStorage` sepet, route/etkileşim ve asset envanteri.
- Şirket/yasal, kargo, PayTR, e-posta/SMS ve auth karar kapılarının sahipleri/tarihleri.
- Production/staging alan adları, veri yerleşimi, retention ve sorumlular.
- Mevcut 4 gerçek ürün görseli/ürün bilgisinin import alan eşlemesi; eksik fiyat, stok, SKU, beden, materyal gerçek sahibinden alınır.

Çıkış: karar kaydı ve hiçbir gerçek alanın uydurulmayacağı onayı.

## Faz 1 — Platform ve temel güvenlik

- D1 `DB`, R2 `MEDIA` oluştur/bağla; local/staging/prod ayrımı.
- `db/schema.ts`, migration runner ve ilk şema.
- Config validation, secret store, request ID, structured log/redaction.
- Güvenlik başlıkları/CSP report-only, error boundary, health endpoint.
- CI: lint, typecheck, build, unit, migration test, secret/dependency scan.

Çıkış: boş DB’den migration; D1/R2 health; repo/istemci/logda secret yok.

## Faz 2 — Admin kimliği, RBAC ve audit

- Platform güncel auth desteğini doğrula; ayrı admin identity + MFA/allowlist.
- Rol/permission seed; server middleware/authorization.
- Admin kabuğu, session timeout, reauth; audit service.

Çıkış: izin matrisi testleri; yetkisiz route/API reddi; rol değişimi audit.

## Faz 3 — Katalog, medya, fiyat ve stok admini

- Product/category/collection/variant/price/tax/inventory/media repository ve servisleri.
- R2 doğrulanmış upload/finalize, görsel metadata ve focal point.
- Admin list/edit/publish/preview; stok adjustment ledger.
- Gerçek ürünleri doğrulanmış admin/import akışıyla gir. Production seed/mock yok.

Çıkış: admin’de girilen gerçek ürün D1/R2’den preview olur; eksik ürün yayımlanamaz.

## Faz 4 — Public katalog ve ana sayfa

- SSR ana sayfa, kategori/koleksiyon, ürün, arama/filtre/sıralama.
- DB tabanlı 4 öğeli Seçili Ürünler; dikey kart oranları.
- Mevcut sinematik tasarımı data-driven ve fallback/reduced-motion hale getir.
- Metadata, canonical, sitemap, robots, breadcrumb/Product JSON-LD.
- Sabit ürün array’lerini tamamen kaldır.

Çıkış: public sayfada ürün/fiyat/stok yalnızca D1; kırık link/işlevsiz kontrol yok; SEO/accessibility/performance test.

## Faz 5 — Sunucu sepeti ve promosyon

- Anonim cart cookie hash + D1 cart/items.
- Add/update/remove, mini cart, sepet sayfası, sunucu yeniden fiyatlama.
- Shipping rules/quote, kupon ve yarış/limit transaction’ları.
- `localStorage` sepeti tamamen kaldır; yalnızca geçici UI state varsa doğruluk kaynağı değildir.

Çıkış: browser yenileme/cihaz state kuralları; stok/fiyat değişimi; kupon yarış testleri.

## Faz 6 — Checkout, sözleşme ve stok rezervasyonu

- Gerçek iletişim/adres/kargo formu; RHF+Zod ve server validation.
- Yasal içerik sürümleme; ön bilgilendirme ve sözleşme snapshot/version.
- Sipariş/order items, status history, reservations, payment attempt.
- Güvenli status token ve pending sonuç ekranı.

Çıkış: ödeme sağlayıcısı olmadan `payment_pending` sipariş deterministik; çift submit tek sonuç; reservation expiry.

## Faz 7 — PayTR iFrame, callback ve mutabakat

- Güncel resmi dokümanı yeniden kontrol; server token/HMAC/iFrame.
- Public HTTPS callback: hash, amount/order, idempotency, exact `OK`.
- Success/fail redirect state; retry ve timeout.
- Status query, scheduled reconciliation, alert.
- PayTR test matrisi ve panel kanıtı.

Çıkış: callback tekrarında tek sipariş/stok/bildirim; PayTR panel test işlemi başarılı; secret taraması temiz.

## Faz 8 — Sipariş operasyonu, kargo ve bildirim

- Admin order state machine, packing, partial shipment, manual provider tracking.
- Outbox worker, gerçek mail sağlayıcı seçimi, template sürümü ve delivery kaydı.
- Misafir e-posta OTP/imzalı link sipariş takibi.
- Destek ticket kuyruğu ve iletişim formu; sağlayıcı seçilirse idempotent fatura adapter’ı, seçilmezse doğrulanmış manuel belge akışı.

Çıkış: ödeme → hazırlık → kargo → teslim uçtan uca; başarısız bildirim güvenli retry.

## Faz 9 — İptal, iade ve PayTR refund

- Müşteri talep formu; hijyen/ambalaj koşulları ve hukuk onaylı politika.
- Operasyon karar, finans approval/reauth, kısmi/tam refund.
- Refund idempotency, status query/belirsiz sonuç, order/payment state.

Çıkış: toplam iade tahsilatı aşamaz; çift submit yok; audit ve PayTR sandbox test.

## Faz 10 — CMS, SEO ve growth

- Home module/menu/yasal sayfa/redirect/SEO editörü ve publish/rollback.
- Organization return/shipping markup, Search Console, Merchant Center feed kararı.
- Consent manager sonrası privacy-safe analytics ve e-commerce event deduplication.

Çıkış: görünür politika/structured data aynı; cookie tercihleri test; production noindex kontrolü.

## Faz 11 — Müşteri hesabı (opsiyonel karar kapısı)

- Public auth/platform sağlayıcısı onayı.
- Magic-link/OTP/OIDC adapter, session ve account ownership.
- Sipariş geçmişi, adres/favori, privacy request.
- Misafir siparişini doğrulanmış hesaba güvenli bağlama.

Çıkış: auth/IDOR/session testleri. Sağlayıcı hazır değilse mağaza misafir checkout ile tam çalışmaya devam eder.

## Faz 12 — Canlıya hazırlık ve hardening

- ASVS L2 kontrol, pentest, accessibility manuel test, load/soak ve CWV.
- KVKK/ETBİS/mesafeli sözleşme/şirket bilgileri hukuk onayı.
- D1 backup/restore drill, R2 lifecycle, secret rotation ve incident runbook.
- PayTR live credentials/panel URL ve kontrollü canlı test.
- Feature flag rollout, alarm/on-call ve rollback provası.

Çıkış: [13 — Kabul listesi](./13_ACCEPTANCE_CHECKLIST.md) tamamen kanıtlı; açık kritik/yüksek bulgu yok.

## Bağımlılık ve paralellik

- Tasarım iyileştirmesi katalog şemasıyla paralel yapılabilir, ancak DB entegrasyonu tamamlanmadan “bitti” sayılmaz.
- SEO modeli katalogla; audit RBAC ile; outbox checkout ile birlikte başlatılır.
- PayTR, order/reservation state machine tamamlanmadan bağlanmaz.
- Refund, başarılı ödeme modeli ve admin reauth/audit olmadan başlamaz.
- Customer account, güvenli public auth kararı olmadan başlamaz.

## Her pull request/uygulama dilimi için Done

- İlgili requirement ID veya belge bölümü.
- Kod + migration + test + observability.
- Loading/empty/error/success ve responsive/a11y.
- Auth/authorization/CSRF/idempotency değerlendirmesi.
- Mock/dead control yok.
- Doküman/ADR ve manuel doğrulama kanıtı.
