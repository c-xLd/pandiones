# 01 — Üretim Mimarisi

## Mevcut ve hedef yapı

Mevcut uygulama Vinext/Next.js, React, TypeScript ve Cloudflare Sites üzerinde kalır. Hedef mimari:

```text
Tarayıcı
  ├─ Server-rendered mağaza sayfaları
  ├─ Erişilebilir client bileşenleri
  └─ PayTR iFrame (kart alanı PayTR alan adında)
        │
Vinext route handlers / server actions
  ├─ Zod girdi doğrulama
  ├─ Kimlik + rol/yetki denetimi
  ├─ İş kuralları + idempotency
  ├─ D1: ilişkisel veri ve transaction'lar
  ├─ R2: ürün/içerik dosyaları
  ├─ PayTR server-to-server API
  └─ E-posta/SMS/kargo adaptörleri
```

## Platform kaynakları

- Cloudflare D1 binding adı: `DB`.
- Cloudflare R2 binding adı: `MEDIA`.
- `.openai/hosting.json` içindeki `d1` ve `r2` alanları ilgili kaynaklar oluşturulunca bağlanır; şu an `null` olması veri katmanının henüz hazır olmadığı anlamına gelir.
- Şema kaynağı `db/schema.ts`, migration’lar `db/migrations/` altında tutulur. Her şema değişikliği ileri migration, geri alma/iyileştirme notu ve doğrulama sorgusu içerir.
- Üretim sırları yalnızca platform secret store’da bulunur; repository, istemci bundle’ı, D1 veya loga yazılmaz.

## Kod sınırları

```text
app/                         route, layout, metadata, route handler
components/storefront/       mağaza UI
components/admin/            yönetim UI
components/ui/               erişilebilir primitive'ler
lib/domain/                  saf iş kuralları ve state machine'ler
lib/db/                      sorgular, repository'ler, transaction yardımcıları
lib/auth/                    identity adapter, session, authorization
lib/payments/paytr/           token, hash, callback, status, refund adapter
lib/media/                   R2 upload/serve/metadata
lib/validation/              ortak Zod şemaları
lib/observability/           structured log, metric, trace id
db/schema.ts                 şema tanımı
db/migrations/               sıralı migration dosyaları
tests/                       unit, integration, e2e, security
```

UI bileşenleri doğrudan D1/PayTR çağırmaz. Route/server action, domain servisini; domain servisi repository ve entegrasyon adaptörlerini çağırır. PayTR’ye özel alanlar domain’in her yerine yayılmaz.

## Render ve veri alma

- Ana sayfa, kategori, ürün ve içerik sayfaları SEO için server-rendered olur.
- `Product`, `Offer`, breadcrumb ve metadata aynı sunucu sorgusunun sonucundan üretilir.
- Admin listelerinde TanStack Table; karmaşık formlarda React Hook Form + Zod; ağ durumu gereken istemci işlemlerinde TanStack Query kullanılabilir.
- Sepet için önce imzalı anonim cart cookie + sunucu D1 kaydı tercih edilir. Zustand gerekiyorsa yalnızca geçici UI durumu tutar; fiyat/stok doğruluğunun kaynağı olamaz.
- Cache anahtarı yayımlanmış ürün/kategori sürümünü içerir. Fiyat, stok veya yayın durumu değişince ilgili tag/path invalidation yapılır.
- Sepet/checkout/sipariş/admin/kişisel sayfalar paylaşımlı cache’e girmez.

## Kimlik doğrulama karar kapısı

Cloudflare Sites’in yerleşik workspace kimliği kamuya açık müşteri üyeliği olarak varsayılmaz. Uygulamadan önce platformun güncel public auth desteği doğrulanır.

- İlk üretim sürümü güvenli misafir checkout ile çalışabilir.
- Müşteri hesabı gerekiyorsa doğrulanmış e-posta magic-link/OTP veya uyumlu yönetilen OIDC sağlayıcısı bir `IdentityProvider` adaptörü üzerinden eklenir.
- Kendi parola depolama sistemi onaylı bir güvenlik tasarımı olmadan yazılmaz.
- Admin, genel müşteri kimliğinden ayrı tutulur; kurumsal/workspace erişimi, allowlist, MFA ve kısa oturum uygulanır.
- Her korumalı kaynağın sahibi/rolü sunucuda denetlenir; tahmin edilebilir ID tek başına erişim vermez.

## Tutarlılık ve eşzamanlılık

- Checkout atomic işlemi: sepeti yeniden fiyatlandır → uygun stokları koşullu güncelleme ile rezerve et → sipariş snapshot’ı → ödeme denemesi kaydı → commit. Güncel D1 runtime’ının atomik batch/transaction olanağı kullanılır; desteklenmeyen etkileşimli transaction varsayılmaz.
- PayTR token ağ çağrısı transaction açıkken tutulmaz. Önce `payment_pending` siparişi oluşturulur, sonra token alınır; hata halinde deneme kayıtlanır ve kullanıcı güvenle yeniden deneyebilir.
- Callback transaction’ı: payment attempt kilitle/koşullu güncelle → event tekrarını kontrol et → hash/tutar/sipariş kontrolü → ödeme ve sipariş state transition → stok rezervasyonunu satışa çevir veya bırak → outbox kaydı → commit → düz `OK`.
- E-posta, SMS ve ağır yan etkiler callback’i geciktirmez; transaction içindeki outbox kaydından worker/sonraki işleyici tarafından gönderilir.
- Kritik mutation’lar `version` veya koşullu update ile kayıp güncellemeyi önler.

## Entegrasyon adaptörleri

| Arayüz | İlk sağlayıcı | Kural |
| --- | --- | --- |
| `PaymentGateway` | PayTR iFrame | Kart verisi yok; callback gerçeğin kaynağı |
| `MediaStore` | R2 | Metadata D1, byte R2; doğrulanmış yükleme |
| `Mailer` | Karar bekliyor | Outbox, idempotency ve template sürümü |
| `SmsSender` | Karar bekliyor | Yalnızca gerekli bildirim/onaylı pazarlama |
| `ShippingProvider` | İlk aşamada manuel | Sonradan API’ye geçebilecek tek arayüz |
| `InvoiceProvider` | Karar bekliyor | e-Arşiv/e-Fatura sağlayıcısı seçilene kadar kayıt ve manuel belge akışı |
| `IdentityProvider` | Karar bekliyor | Public auth desteği doğrulanmadan üyelik yok |

## Hata modeli

Kullanıcıya güvenli, Türkçe ve eyleme dönük mesaj; loga detay ve correlation ID yazılır. API hata gövdesi:

```json
{
  "error": {
    "code": "STOCK_CHANGED",
    "message": "Sepetinizdeki bir ürünün stoğu değişti.",
    "fieldErrors": { "items.0.quantity": "En fazla 1 adet alınabilir." },
    "requestId": "..."
  }
}
```

Stack trace, SQL, sır, kişisel veri veya PayTR ham yanıtı kullanıcıya dönmez.

## Teknik kalite kapıları

- TypeScript strict, lint, build, unit, integration ve kritik e2e testleri geçer.
- D1 sorguları prepared statement kullanır; string birleştirmeli SQL yoktur.
- Her `prepare` tek SQL statement içerir.
- R2 yükleme uzantı/MIME/magic byte/boyut kontrolünden geçer ve rastgele anahtarla saklanır.
- Üçüncü taraf scriptleri en aza indirilir ve CSP’de açıkça allowlist edilir.
- Mevcut `app/page.tsx` içindeki sabit ürünler ve tarayıcı `localStorage` sepeti, ilgili DB fazında tamamen kaldırılır.
