# Güvenlik ve mahremiyet incelemesi

Bu belge uygulamaya yönelik somut kontrolleri listeler; bir güvenlik sertifikası değildir. Aşağıdaki “görülen durumlar” kod incelemesine dayanır ve düzeltilene kadar açık risk sayılır.

## Kodda görülen yüksek öncelikli durumlar

| Konum | Görülen davranış | Gerekli düzeltme |
| --- | --- | --- |
| `src/lib/auth.ts` | (DÜZELTİLDİ - 2026-09-23) Üretimde `AUTH_SECRET` zorunlu kılındı, oturum payload'una `exp` zaman aşımı eklendi, veritabanı aktiflik kontrolü ve misafir sipariş erişim token'ı üretimi getirildi (`tests/auth-hardening.test.ts`) | Tamamlandı |
| `src/app/api/orders/[id]/route.ts` | (DÜZELTİLDİ - 2026-09-23) IDOR kapatıldı; sipariş sahibi, ADMIN rolü veya imzalı süreli misafir token'ı (`verifyOrderGuestToken`) zorunlu kılındı (`tests/order-authorization.test.ts`) | Tamamlandı |
| `src/app/siparis-onay/[id]/page.tsx` | (DÜZELTİLDİ - 2026-09-23) Yetkisiz erişimde 403 engeli, bulunmayan siparişte `notFound()`, bekleyen/başarısız ödemede ise başarı başlığı yerine ödeme tekrar deneme ekranı gösterildi | Tamamlandı |
| `src/app/api/admin/returns/route.ts` | (DÜZELTİLDİ - 2026-09-23) GET ve PATCH metodlarına sunucu taraflı ADMIN rol doğrulaması eklendi (`tests/admin-returns-auth.test.ts`) | Tamamlandı |
| `src/app/api/admin/upload/route.ts` | Eski yükleme ADMIN için 410 döner; yeni ürün-bound medya yolu doğrulanır | Canlı S3 kimlik bilgileri, bucket politikası ve uçtan uca yükleme ayrıca doğrulanmalı |
| `src/app/api/checkout/route.ts` | (DÜZELTİLDİ - 2026-09-23) İstemciden gelen indirim kaldırıldı; kupon/sepet sunucuda doğrulanıp hesaplanıyor, varyant stok kontrolü eklendi (`tests/checkout-integrity.test.ts`) | Tamamlandı |
| `src/app/api/payment/callback/route.ts` | (DÜZELTİLDİ - 2026-09-23) İdempotent durum kontrolü eklendi; mükerrer callback'te stok/kupon ikinci kez değişmez, varyant stoğunda sıfır alt sınırı (`Math.max(0, ...)`) uygulandı (`tests/payment-callback-idempotency.test.ts`) | Tamamlandı |
| `src/app/api/products/[id]/reviews/route.ts` | (DÜZELTİLDİ - 2026-09-23) Giriş zorunluluğu getirildi, satın alma geçmişi olan müşterilere 'Doğrulanmış Alıcı' rozeti bağlandı, sıfır yorumda ortalama puan `null` dönüyor (`tests/product-reviews.test.ts`) | Tamamlandı |

## Kimlik ve yetki modeli

Müşteri yalnız kendi hesabını, favorisini, siparişini ve iadesini görür. Yönetici tüm yönetim rotalarında server tarafında ADMIN kontrolünden geçer. Rol bilgisi imzalı çerezde olsa da uzun süreli oturumda kullanıcı silinmesi/rol değişimi için güncel kayıt doğrulanır. Oturum çerezi `HttpOnly`, üretimde `Secure`, uygun `SameSite` ve kısa/yenilenebilir süre kullanır. Parola sıfırlama, oturumdan çıkış ve hesap kapatma akışları eklenirse belirgin güvenlik sınırlarıyla tasarlanır.

## Girdi, ödeme ve dosya güvenliği

Yeni ürün medya yolu JPEG/PNG/WebP ≤10 MB ve MP4/WebM ≤50 MB ile sınırlıdır; MIME, dosya imzası ve gerçek byte sayısı depolamadan önce denetlenir. Sunucu rastgele `products/<uuid>.<ext>` anahtarı üretir. Video posteri aynı ürünün doğrulanmış görseli olmalıdır; yabancı medya ID'si reddedilir. Geliştirmede yerel dosya, üretimde yalnız yapılandırılmış S3-uyumlu kalıcı depolama kullanılır; yapılandırma yoksa yükleme açık hatayla durur. Bu özellik diğer P0 oturum/ödeme açıklarını kapatmaz.

Sunucu her string için uzunluk ve biçim, her sayı için sonlu/pozitif sınır, her enum için izinli değer denetler. Kullanıcı metni HTML olarak basılmaz. Dosya yüklemesi uzantıya güvenmez; MIME ve dosya imzası doğrular, tehlikeli türleri reddeder, boyut ve kota uygular. Ödeme tokenı yalnız sağlayıcı doğrulamasından sonra işlenir. Sağlayıcı callback'inde `conversationId`, token, tutar, para birimi ve beklenen sipariş birbiriyle eşleştirilir. Kart verisi uygulamada saklanmaz.

## Mahremiyet ve kayıtlar

Adres, telefon, e-posta, sipariş ve ödeme yanıtı kişisel veridir. Üretim loglarında gereksiz tam değerler ve ödeme ham yanıtları bulunmaz; erişim ihtiyaca göre kısıtlanır. Saklama, silme, dışa aktarma ve abonelikten çıkış akışları ürün politikası ve geçerli hukukla doğrulanır. Bu belge hukuki metin yerine geçmez. Gizlilik ve kullanım koşulları UI'de açılıyorsa gerçek güncel metne bağlanır.

## Güvenlik kabul testi

Misafir, CUSTOMER ve ADMIN hesaplarıyla rota matrisi çalıştırılır. Başkasının sipariş numarası, sipariş ID'si, iade ID'si ve ürün yükleme isteği denenir. Oturum anahtarı eksik üretim başlangıcı başarısız olur. Tekrarlanan callback stok/kuponu ikinci kez değiştirmez. Her bulgu [QA.md](QA.md) içinde kapanış kanıtıyla işaretlenir.
