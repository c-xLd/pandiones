# 12 — Ortamlar ve Operasyon

## Ortam matrisi

| Özellik | Local | Staging | Production |
| --- | --- | --- | --- |
| D1/R2 | Ayrı yerel/preview | Ayrı test kaynakları | Canlı, erişimi sınırlı kaynaklar |
| Veri | Test fixture | Sentetik TEST verisi | Yalnızca gerçek işletme/müşteri verisi |
| PayTR | Mock değil; contract fixture veya resmi test bağlantısı | PayTR test mode | Canlı; kontrollü test prosedürü |
| E-posta/SMS | Sink/sandbox | Test alıcı allowlist | Doğrulanmış gerçek sağlayıcı |
| Index | noindex | noindex + erişim kontrolü | index politikası route’a göre |
| Log | Debug, secret redacted | Structured | Structured, erişim/retention/alert |

Local test adapter’ı provider davranışını simüle edebilir ancak UI’ya sahte production başarısı sunmaz; integration test resmi PayTR test modunu ayrıca kapsar.

## Yapılandırma sözleşmesi

Uygulama başlangıçta ortam şemasını doğrular; gerekli değişken yoksa güvenli biçimde fail eder. Değerler örnek dosyada boş açıklama olarak bulunabilir, gerçek secret bulunmaz.

### Genel

- `APP_ENV=local|staging|production`
- `APP_BASE_URL`
- `ADMIN_BASE_URL` gerekirse
- `LOG_LEVEL`
- `PII_HASH_SECRET` — secret, privacy-safe rate/audit hashleri
- `STATUS_TOKEN_SECRET` — secret, sipariş status/guest link imzaları

### Cloudflare

- Binding: `DB` (D1)
- Binding: `MEDIA` (R2)
- `MEDIA_PUBLIC_BASE_URL` veya güvenli medya delivery route’u

### PayTR

[PayTR belgesindeki](./06_PAYTR_INTEGRATION.md) değişkenler. Key ve salt secret store; environment’lar birbirine karışmaz.

### Kimlik, bildirim, fatura ve kargo

Sağlayıcı seçilince adapter’a özel issuer/client/audience veya API key secret’ları eklenir. İsimler ADR ve env schema’ya yazılır. Fatura/kargo sandbox ve production credential’ları ayrılır. Private key’ler `\n`/encoding ile kör biçimde loglanmaz.

## Cloudflare kaynak kurulumu

1. D1 ve R2’yi local/staging/production için ayrı oluştur.
2. Sites projesinde D1 binding `DB`, R2 binding `MEDIA` olarak bağla; `.openai/hosting.json` alanlarını platform akışına göre güncelle.
3. Preview migration çalıştır; migration table/version ve invariant sorgularını doğrula.
4. Secret’ları platform secret store’a ekle; source/CI output’tan sakla.
5. Staging deploy, smoke, PayTR test ve R2 upload/serve.
6. Production change window, backup, migration, deploy, smoke ve gözlem.

Kaynak yaratma, deploy/publish, gerçek provider çağrısı ve production mutasyonu açık kullanıcı yetkisi gerektirir.

## Migration runbook

- Her migration benzersiz sıralı ad, amaç, backward compatibility, doğrulama ve recovery notu.
- Deploy öncesi backup; staging’de production benzeri hacimle süre/lock testi.
- Önce genişlet, backfill/job, uygulamayı geçir, sonra daralt. Eski sürüm rollback süresince şemayla çalışır.
- Migration başarısızsa uygulama yeni kodu açmaz. Yarım state ölçülür ve belirlenmiş iyileştirme uygulanır; production’da ad-hoc SQL yok.
- Şema ve migration history CI’de sıfırdan karşılaştırılır.

## Scheduled işler

| İş | Sıklık başlangıcı | İdempotency/çıktı |
| --- | --- | --- |
| Süresi dolan stok rezervasyonu | 1–5 dk | Active→expired/released; ledger tek |
| Pending PayTR reconciliation | 5–15 dk, yaş eşiği | merchant_oid bazlı status query; alert |
| Günlük ödeme/iade mutabakatı | Günlük | Fark raporu, otomatik finans düzeltmesi yok |
| Taksit oranı güncelleme | Günlük, gösterilecekse | Tarihli cache; eskiyse UI uyarı/gizleme |
| Outbox dispatch | Sürekli/periyodik | Event ID idempotent, exponential backoff/dead letter |
| Orphan R2 cleanup | Günlük | Finalize olmayan süreli objeler |
| Düşük stok uyarı | Saatlik/günlük | Varyant+eşik dedup |
| Privacy retention | Günlük | Dry-run rapor + kontrollü silme/anonimleştirme |
| Sitemap/cache refresh | İçerik yayını event’i | Version/tag idempotent |

Her job `scheduled_job_runs` kaydı, start/end/status/count/safe error ve overlap lock taşır.

## Backup ve restore

- D1 backup sıklığı RPO/RTO kararıyla; ödeme ve sipariş döneminde daha sık gerekli olabilir.
- R2 versioning/lifecycle ve metadata-blob tutarlılık planı.
- Backup şifreleme/erişim/retention; üretim kopyası geliştirici laptopuna indirilmez.
- En az üç ayda bir staging restore drill: D1 + gerekli R2 referansları + migration + invariant kontrolleri.
- Restore sonrası PayTR callback duplicate riskine karşı payment event/idempotency tabloları birlikte geri yüklenir; provider reconciliation çalışır.

## Deploy ve rollback

### Deploy öncesi

- Onaylı commit/build artifact, clean tests, dependency/secret scan.
- Migration backup ve backward-compatibility.
- PayTR callback URL’nin mevcut sürümde erişilebilir kalması.
- Staging smoke ve change owner.

### Deploy sonrası

- `/`, kategori, ürün, sepet, checkout preflight, admin auth, D1/R2 health.
- Sitemap/robots/production index.
- Callback/status route yalnız güvenli testle; 5xx, D1 latency, outbox ve pending ödeme gözlemi.

### Rollback

- Uygulama artifact rollback; callback route çalışır.
- Feature flag ile checkout/ödeme başlatma kapatılabilir, mevcut callback’ler işlenmeye devam eder.
- Destructive DB rollback yerine forward fix/uyumlu şema.
- Belirsiz ödemeler reconciliation kuyruğuna; kullanıcıdan yeniden ödeme istenmeden önce durum çözülür.

## Operasyon runbook’ları

### PayTR callback kesintisi

1. Yeni checkout’u gerekirse maintenance/flag ile durdur; callback’i durdurma.
2. URL/HTTPS, app error, D1 ve PayTR panel “Devam Ediyor” yanıtını kontrol et.
3. Secret/URL’yi körlemesine değiştirme; deploy/config geçmişini doğrula.
4. Düzeltme sonrası tekrar callback/status query ve reconciliation.
5. Çift fulfillment/refund invariant kontrolü.

### D1/R2 arızası

- D1 yazılamıyorsa ödeme token oluşturma. Kullanıcıya yeniden denenebilir hata; mevcut callback `OK` vermeden retry alsın.
- R2 arızasında katalog metni/fallback görsel; admin upload disabled. Ürün görseli yokken yanlış görsel gösterme.

### Secret sızıntısı

- İlgili credential’ı derhal revoke/rotate, deployment ve log/cache temizliği, erişim analizi, provider ve hukuki olay süreci. Git geçmişinden yalnız dosyayı silmek yeterli değildir.

### Stok tutarsızlığı

- Etkilenen varyant satışını durdur, ledger/on_hand/reservation/order karşılaştır, otomatik silme yapma. Yetkili adjustment gerekçeli/auditli.

### İade belirsizliği

- Aynı PayTR iade çağrısını yeni key ile tekrarlama. Provider status/panel/reference ile çöz; finans review.

## Operasyon sahipliği

Canlı öncesi isim/iletişim atanır: uygulama on-call, ödeme/finans, sipariş operasyonu, güvenlik/KVKK, hukuk, içerik/SEO ve PayTR/kargo sağlayıcı destek. Runbook’ta kişisel numara yerine kontrollü ekip kanalı tercih edilir.
