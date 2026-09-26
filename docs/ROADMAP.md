# Ürün genişleme yol haritası

Bu sıra bir takvim veya tamamlandı beyanı değildir. Her aşama önceki aşamanın kanıtına dayanır. Yeni özellik, ödeme ve kişisel veri açıklarını gizlemek için yayınlanmaz.

## Aşama 0 — güvenilir satış temeli

**Çıktı:** Gerçek ürün ve ödeme verisiyle güvenli sipariş. `AUTH_SECRET` zorunlu; sipariş sahipliği ve admin iade yetkisi kapalı; checkout sunucu hesaplı; callback idempotent; stok negatif olamaz; mock ödeme üretimde çalışmaz. Tüm P0 maddeleri [QA.md](QA.md) içinde kapanır.

**Kabul:** Misafir/CUSTOMER/ADMIN yetki matrisi, iki eşzamanlı son stok siparişi, tekrar callback, sağlayıcı ret/iptal ve anahtar eksikliği testleri geçer. Onay sayfası yalnız doğrulanmış ödemeyi gösterir.

## Aşama 1 — tutarlı mağaza deneyimi

**Çıktı:** Tüm rotalarda gerçek loading/empty/error/retry durumları; tamamlanan link, input ve buton envanteri; mobil ve klavye akışı; ürün görsel optimizasyonu. Ürün listesi sayfalama/kademeli yükleme ile büyüyebilir. Favori senkronizasyonu, sepet fiyat yenilemesi ve stoksuz varyant davranışı belirgindir.

**Kabul:** [PAGES.md](PAGES.md), [STATES.md](STATES.md), [ACCESSIBILITY.md](ACCESSIBILITY.md) ve [PERFORMANCE.md](PERFORMANCE.md) matrisleri gerçek tarayıcıda kanıtlanır.

## Aşama 2 — operasyon ve içerik

**Çıktı:** Kalıcı görsel depolama, migration ve yedek/geri yükleme, yönetim değişiklik izi, e-posta sağlayıcısı ve abonelikten çıkış, stok alarmı gönderimi, doğru Merchant feed. Ürün materyal/üretim/teslimat iddiaları onay akışından geçer.

**Kabul:** Operatör bir ürünü oluşturup yayınlayabilir, siparişi işleyebilir, iadeyi yetkili olarak sonuçlandırabilir; tüm değişiklikler denetlenebilir. Arızalı e-posta/ödeme/depolama senaryosu [OPERATIONS.md](OPERATIONS.md) ile kurtarılır.

## Aşama 3 — ölçülü büyüme

**Olası işler:** Ürün varyantına özgü fotoğraflar, gelişmiş ölçü kılavuzu, müşteri için güvenli sipariş takibi, gerçek değerlendirme doğrulaması, arama kalitesi, yönetimde toplu stok güncelleme. Her öneri kullanıcı değeri, veri kaynağı, erişilebilirlik, performans maliyeti ve operasyon sahibiyle değerlendirilir. Onaylanmamış fikir UI'de boş buton olarak yer almaz.

## İş seçme kuralı

Her iş kartı şu alanları taşır: kullanıcı problemi, mevcut kanıt, etkilenen rotalar/API/modeller, boş/hata davranışı, güvenlik sınırı, kabul testi, ölçüm ve geri dönüş. Uygulama tamamlanınca ilgili Markdown ve test kanıtı aynı değişiklikte güncellenir.
