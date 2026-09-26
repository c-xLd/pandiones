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
- [x] `src/app/api/payment/callback/route.ts` tekrar callback'inde stok/kuponun ikinci kez değişmediği ve stok alt sınırı kanıtlandı (`tests/payment-callback-idempotency.test.ts`).

## Ürün medyası kabul durumu (2026-09-20)

- [x] İzole SQLite testinde taslak → gerçek kapak → aile → yayın → herkese açık medya/renk akışı.
- [x] Sahte MIME/imza, boyut sınırı, yabancı poster/medya, tekrar renk, eksik kapak/poster reddi için otomatik testler.
- [x] Genel katalog ve feed'de taslak yalıtımı için test ve izole HTTP smoke.
- [ ] 320/375/768/1024/1440 px, klavye, ekran okuyucu, azaltılmış hareket ve yavaş ağ tarayıcı kabulü.
- [ ] Kalıcı S3 kimlik bilgileriyle üretim benzeri yükleme/geri okuma/silme testi.
- [ ] Diğer P0 güvenlik ve ödeme kapıları; bu medya özelliği canlı satış onayı değildir.

## P1 — kalite tamamlanması

- [x] Ana sayfa, katalog, sepet, favori, hesap ve ödeme için loading/empty/error/retry durumları [STATES.md](STATES.md) ile eşitlendi (`CartContext` ve `WishlistContext` için `isLoaded` durumu, ana sayfa skeleton/retry, favoriler ve çanta boş ekran flaşı önleme).
- [ ] Ürün ve kampanya içeriklerindeki materyal, üretim yeri, sınırlı seri, kargo ve iade iddialarını ticari kaynakla doğrula.
- [ ] Her görünen link, input, buton, kart eylemi ve modal için tıklama + klavye + hata testi yap; `href="#"` veya sahte başarı kalmasın.
- [ ] Ürün/sipariş/kupon işlemlerinde eşzamanlı istek ve yenileme senaryolarını test et; fiyat/stok tutarlılığını doğrula.
- [ ] Görsel optimizasyonu kapalı yapılandırmanın etkisini ölç; mobil LCP ve toplam transferi [PERFORMANCE.md](PERFORMANCE.md) bütçesine indir.
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
