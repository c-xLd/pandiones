# Pandiones Üretim Belgeleri

Bu klasör, Pandiones mağazasını görsel prototipten gerçek satış yapan üretim sistemine dönüştürmek için tek doğruluk kaynağıdır. Belgeler birlikte uygulanır; içlerinden biri atlanarak sistem “tamamlandı” sayılamaz.

## Değişmez kurallar

1. Çalışan uygulamada mock, örnek, rastgele veya kod içine gömülü ürün/fiyat/stok/sipariş verisi bulunmaz.
2. Mağaza verisi Cloudflare D1’den, ürün ve içerik dosyaları R2’den gelir. Test fixture’ları yalnızca izole test ortamında kullanılabilir.
3. Görünen her link gerçek bir route’a, her buton gerçek bir işleme, her form doğrulanmış bir sunucu işlemine bağlanır. İşlevi hazır olmayan kontrol kullanıcıya gösterilmez.
4. Fiyat, indirim, kargo, vergi, stok ve sipariş toplamı istemciden kabul edilmez; sunucuda güncel veriden yeniden hesaplanır.
5. Kart verisi Pandiones sunucusuna girmez veya kaydedilmez. Ödeme için varsayılan çözüm PayTR iFrame API’dir.
6. Ödeme başarı sayfası siparişi “ödendi” yapmaz. Tek doğruluk kaynağı, hash’i doğrulanmış ve idempotent işlenen PayTR Bildirim URL çağrısıdır.
7. Admin işlemleri yetki kontrolü ve değiştirilemez denetim kaydı olmadan tamamlanamaz.
8. SEO metinleri, fiyat ve stok işaretlemeleri ekrandaki gerçek içerikle aynı kaynaktan üretilir.
9. Kişisel veriler en az veri ilkesiyle tutulur; loglara sır, kart verisi veya gereksiz kişisel veri yazılmaz.
10. Mobil, klavye, ekran okuyucu, düşük hareket tercihi, yükleniyor/boş/hata/başarı durumları kabul kriteridir.

## Okuma ve uygulama sırası

1. [00 — Ana ürün tanımı](./00_MASTER_PRODUCT_SPEC.md)
2. [01 — Mimari](./01_ARCHITECTURE.md)
3. [02 — Veritabanı](./02_DATABASE_SCHEMA.md)
4. [03 — API ve sunucu işlemleri](./03_API_AND_SERVER_ACTIONS.md)
5. [04 — Mağaza işlevleri](./04_STOREFRONT_FUNCTIONAL_SPEC.md)
6. [05 — Admin paneli](./05_ADMIN_PANEL.md)
7. [06 — PayTR](./06_PAYTR_INTEGRATION.md)
8. [07 — SEO ve içerik](./07_SEO_AND_CONTENT.md)
9. [08 — Güvenlik, KVKK ve mevzuat](./08_SECURITY_PRIVACY_COMPLIANCE.md)
10. [09 — Test, kalite ve gözlemlenebilirlik](./09_TESTING_QA_OBSERVABILITY.md)
11. [10 — Uygulama yol haritası](./10_IMPLEMENTATION_ROADMAP.md)
12. [11 — Kodlama ajanı ana talimatı](./11_AGENT_EXECUTION_PROMPT.md)
13. [12 — Ortamlar ve operasyon](./12_ENV_AND_OPERATIONS.md)
14. [13 — Yayına çıkış kabul listesi](./13_ACCEPTANCE_CHECKLIST.md)

## Karar kapıları

Aşağıdaki bilgiler sahibi tarafından sağlanmadan ilgili özellik canlıya alınmaz:

- Ticari unvan, MERSİS/vergi bilgileri, adres, destek iletişim bilgileri ve hukuken onaylı sözleşme metinleri.
- PayTR mağaza kimliği, anahtar ve salt; PayTR panelinde canlı alan adı ve Bildirim URL ayarı.
- Kargo firması, ücret kuralları, teslimat taahhütleri ve gerekiyorsa entegrasyon bilgileri.
- E-posta/SMS sağlayıcısı ve gönderici doğrulamaları.
- Müşteri kimlik doğrulama sağlayıcısı kararı. İlk sürüm güvenli misafir ödeme ile çıkabilir; desteklenmeyen özel parola sistemi kurulmaz.
- İade/hijyen politikasının hukuk danışmanı tarafından onayı. İç giyimde istisna yalnızca koruyucu ambalaj/mühür açılmış olması gibi mevzuattaki koşullar sağlandığında uygulanır; sitede mutlak “iade yoktur” ifadesi kullanılmaz.

## Tamamlanma tanımı

Bir faz ancak kodu, D1 migration’ı, yetki kontrolü, hata durumları, erişilebilirlik, testleri, log/ölçüm noktaları ve ilgili belge güncellemesi birlikte tamamlandığında biter. “Görünüyor”, “tıklanıyor” veya yalnızca mutlu yolun çalışması yeterli değildir.

