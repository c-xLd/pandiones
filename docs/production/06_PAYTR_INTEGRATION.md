# 06 — PayTR Ödeme Entegrasyonu

## Mimari karar

Varsayılan entegrasyon PayTR iFrame API’dir. Token server-side alınır ve ödeme formu PayTR alan adındaki iFrame içinde açılır. Pandiones kart numarası, CVV, son kullanma tarihi veya 3D Secure parolası toplamaz, iletmez, loglamaz ve saklamaz.

PayTR Direct API’ye geçiş ayrı güvenlik/PCI ve iş kararı gerektirir; bu belge onu yetkilendirmez.

## Ortam değişkenleri

- `PAYTR_MERCHANT_ID`
- `PAYTR_MERCHANT_KEY` — secret
- `PAYTR_MERCHANT_SALT` — secret
- `PAYTR_TEST_MODE` — staging’de `1`, production canlı işlemlerde kontrollü `0`
- `PAYTR_DEBUG_ON` — yalnızca testte; production `0`
- `PAYTR_OK_URL`
- `PAYTR_FAIL_URL`
- `PAYTR_CALLBACK_URL`
- `PAYTR_TIMEOUT_MINUTES` — iş kuralıyla uyumlu, varsayılan 30

Secret’lar `NEXT_PUBLIC_` ile başlamaz. Admin ekranı key/salt değerini göstermez. HTTPS doğrulaması hiçbir üretim çağrısında kapatılmaz.

## 1. adım — sipariş ve iFrame token

`POST /api/checkout/prepare` sunucuda:

1. Sepet, adres, kargo, zorunlu onaylar, güncel fiyat/kupon/stok doğrulanır.
2. D1 transaction’ında benzersiz order/order items, stok rezervasyonu ve `payment_attempt` oluşturulur.
3. `merchant_oid` her ödeme denemesi için benzersiz, alfa-nümerik ve en fazla 64 karakter olur. Aynı order retry’si yeni attempt/oid alır.
4. `payment_amount` sunucunun hesapladığı genel toplamın kuruş değeridir. İstemciden gelen toplam kullanılmaz.
5. `user_basket`, sipariş snapshot’ından PayTR formatında ve base64 olarak oluşturulur.
6. `email`, `user_name`, `user_address`, `user_phone`, güvenilir proxy zincirinden doğrulanan `user_ip`, `currency=TL`, taksit ve timeout politikaları hazırlanır.
7. PayTR’nin dokümanındaki alan sırası kullanılarak HMAC-SHA256 token sunucuda üretilir ve `https://www.paytr.com/odeme/api/get-token` adresine server-side POST edilir.
8. Token cevabı allowlist şemasıyla parse edilir. Başarılı attempt `token_ready/pending`; hata güvenli kodla `failed` veya retryable state olur.
9. İstemci yalnızca token ile `https://www.paytr.com/odeme/guvenli/{token}` iFrame’ini açar. Token analytics/log URL’lerine sızdırılmaz.

PayTR tutarı 100 ile çarpılmış tam sayı ister; sistem zaten kuruş tuttuğu için float çarpma yapılmaz.

## 2. adım — Bildirim URL

Route: `POST /api/payments/paytr/callback`. PayTR panelinde tam HTTPS URL tanımlanır.

İşleme sırası:

1. Yalnızca POST, form-encoded, küçük body ve beklenen alan adları.
2. `merchant_oid`, `status`, `total_amount`, `hash` zorunlu; tip/uzunluk allowlist kontrolü.
3. Beklenen hash: `Base64(HMAC_SHA256(merchant_oid + merchant_salt + status + total_amount, merchant_key))`; byte değerleri sabit zamanlı karşılaştırılır.
4. Hash geçersizse hiçbir sipariş/ödeme/stok değişmez ve `OK` dönülmez. Security event request ID ile, sır/PII olmadan kaydedilir.
5. D1’den `merchant_oid` ile attempt ve order bulunur. Session/cookie kullanılmaz.
6. Callback fingerprint/event kaydı ve attempt koşullu update’i idempotency sağlar. Terminal attempt için yeni yan etki üretmeden yalnızca `OK` dönülür.
7. `payment_amount`, beklenen order amount ve currency/test_mode kontrol edilir. Taksit vade farkı nedeniyle PayTR `total_amount` daha yüksek olabilir; `requested_amount`, `payment_amount` ve fiili `paid_amount=total_amount` ayrı kaydedilir. Kabul/muhasebe kuralı finans tarafından onaylanır.
8. `status=success`: payment succeeded, order paid/confirmed, reservation converted, status history ve outbox aynı transaction’da.
9. `status=failed`: failure code/safe message kaydı, payment failed; başka başarılı attempt yoksa order state ve rezervasyon politikaya göre release. Aynı order için başarılı attempt varsa geri alınmaz.
10. Commit başarılı olduktan sonra yanıt body’si tam olarak `OK`, `text/plain`; öncesi/sonrası HTML/JSON/whitespace/debug yoktur.

Callback içinde e-posta/SMS çağrısı beklenmez; outbox daha sonra gönderir. DB commit başarısızsa `OK` dönülmez ki PayTR tekrar deneyebilsin.

## Redirect sayfaları

- `merchant_ok_url` yalnızca kullanıcı bilgilendirmesidir; siparişi onaylamaz.
- `merchant_fail_url` yalnızca kullanıcı bilgilendirmesidir; siparişi tek başına iptal etmez.
- Her iki sayfa D1 durumunu güvenli public status token ile okur. Pending ise sınırlı polling ve “doğrulanıyor” durumu.
- URL’de e-posta, tutar veya PII olmaz. Order numarası tek başına detay erişimi vermez.

## Durum makineleri

```text
payment_attempt:
created -> token_ready -> pending -> succeeded
                           |-----> failed
                           |-----> expired

order.payment_status:
unpaid -> pending -> paid -> partially_refunded -> refunded
                     |----> failed (yalnızca başarılı attempt yoksa)
```

Terminal durumlar serbestçe geri alınmaz. Provider event sıralaması bozulursa domain kuralları daha güçlü durumu korur ve inceleme alarmı üretir.

## Status query ve mutabakat

- Callback uzun süre gelmeyen pending işlemler, kullanıcı butonu/admin eylemi veya scheduled reconciliation ile PayTR Durum Sorgu API’den kontrol edilir.
- Durum sorgu token’ı da server-side merchant key/salt ile üretilir; yanıt allowlist parse edilir.
- Sorgu sonucu otomatik state değiştiriyorsa callback ile aynı idempotent domain servisini kullanır ve kaynağı `paytr_status_query` olarak auditler.
- Günlük mutabakat: D1 başarılı tahsilat/iade toplamı ile PayTR rapor/özet sonuçları karşılaştırılır; fark finans kuyruğuna düşer, sessizce düzeltilmez.

## İade API

1. Yalnızca teslim/iptal/iade politikası ve rolü izin veriyorsa admin önizleme yapılır.
2. Sunucu kalan iade edilebilir tutarı başarılı tahsilat ve önceki bekleyen/başarılı iadelerden hesaplar.
3. `return_amount` kuruş hassasiyetinde ve PayTR’nin beklediği formatta server-side hazırlanır; `merchant_oid` orijinal işlemle eşleşir.
4. Benzersiz idempotency key ve refund satırı API çağrısından önce kaydedilir.
5. PayTR iade hash’i dokümandaki güncel formülle server-side oluşturulur. Key/salt loglanmaz.
6. Kesin başarı/başarısızlık kaydedilir. Ağ sonucu belirsizse aynı iadeyi yeniden göndermeden önce durum sorgu/sağlayıcı kaydıyla çözülür.
7. Refund state, order payment status, order history ve outbox transaction ile güncellenir.

Üretim iadesi kullanıcı açıkça yetkilendirmeden veya admin yetkili onay akışı tamamlanmadan test amaçlı çalıştırılmaz.

## Taksit

- İlk sürümde `no_installment`/`max_installment` iş politikası admin tarafından belirlenir; hukuki/kategori kısıtları tahmin edilmez.
- Taksit oranları UI’da önceden gösterilecekse PayTR oran sorgusu günlük scheduled job ile alınır; dokümana göre oranlar günlük değişebilir. Eski veri “güncellik zamanı” olmadan gösterilmez.
- Checkout iFrame’indeki nihai seçenek PayTR’ye aittir. Site tahmini taksit bilgisini garanti olarak sunmaz.

## Test matrisi

- Token başarı/başarısızlık/timeout ve PayTR bozuk JSON.
- Başarılı callback, başarısız callback’in tüm güvenli hata grupları.
- Geçersiz hash, eksik alan, yanlış method, büyük body.
- Aynı callback 2–10 kez; yalnızca bir stok satışı, sipariş onayı ve bildirim.
- Redirect callback’ten önce/sonra; kullanıcıya doğru pending/paid/failed.
- Tutar, currency, test mode ve `merchant_oid` uyuşmazlığı.
- Aynı order için başarısız attempt sonrası yeni attempt ve başarı.
- Callback anında D1 hata/timeout; PayTR retry ile kurtarma.
- Tam/kısmi iade, üst limit, çift submit, belirsiz ağ hatası.
- Status query ve günlük reconciliation farkı.

Canlıya geçiş için PayTR panelinde test işlem “Başarılı” görünmeli; “Devam Ediyor” callback’in `OK` alamadığını gösterir.

## Resmî kaynaklar

- [PayTR iFrame API genel akış](https://dev.paytr.com/iframe-api)
- [PayTR iFrame API 1. adım](https://dev.paytr.com/iframe-api/iframe-api-1-adim)
- [PayTR iFrame API 2. adım ve Bildirim URL](https://dev.paytr.com/iframe-api/iframe-api-2-adim)
- [PayTR Durum Sorgu API](https://dev.paytr.com/durum-sorgu)
- [PayTR İade API](https://dev.paytr.com/iade-api)
- [PayTR taksit oranları sorgulama](https://dev.paytr.com/direkt-api/taksit-sorgulama)

Uygulama sırasında bu sayfaların güncel alan/formül/endpoint bilgisi yeniden kontrol edilir; kopyalanmış eski örnek kod kaynak kabul edilmez.

