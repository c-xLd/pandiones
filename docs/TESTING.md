# Test stratejisi ve kabul kanıtı

Bu belge hangi testin neyi ispatlayacağını tanımlar. Test yazılmış olması çalıştığı anlamına gelmez; komut, ortam ve sonuç ayrı kaydedilir.

## Test katmanları

| Katman | Konu | Örnek kanıt |
| --- | --- | --- |
| Tip/build | Derleme ve statik hata | `npx tsc --noEmit`, `npm run build` çıkış kodu |
| Birim | Fiyat/kupon, stok sınırı, galeri, durum geçişi | Girdi/çıktı ve kenar durumları |
| API sözleşmesi | Yetki, doğrulama, statü, veri şekli | Misafir/CUSTOMER/ADMIN istek matrisi |
| Entegrasyon | Prisma işlem bütünlüğü ve sağlayıcı sandbox | Çift callback, iptal, ağ hatası, uzlaştırma |
| Tarayıcı | Gerçek tıklama, form, link, mobil ve klavye | Rota bazlı kayıt ve ekran görüntüsü |
| Performans | LCP/INP/CLS ve transfer | Üretim build'i, cihaz/ağ profili, tarih |

## Öncelikli senaryolar

1. Ürün yok, kategori boş, arama sonucu yok ve API hatası birbirinden farklı görünür.
2. Beden seçmeden, tükenmiş bedenden ve stok üstü adetten sepete/ödemeye gidilemez.
3. Kuponun istemci alt toplamı veya indirim tutarı değiştirilse de sunucu doğru tutarı kullanır.
4. Aynı ödeme callback'i iki kez gelince ikinci stok/kupon hareketi olmaz.
5. Ödeme başarısız/iptal/belirsiz sonuçlarında onay sayfası başarı göstermez.
6. Başkasının sipariş numarası, sipariş API'si ve iade ID'si özel veri döndürmez.
7. CUSTOMER tüm admin rotalarında reddedilir; özellikle `/api/admin/returns` GET/PATCH.
8. Bozuk görsel, yavaş ağ, 500 yanıtı ve sayfa yenilemesinde kullanıcı kurtarılabilir durumda kalır.
9. Modal/çekmece klavye odağı, Escape, Tab ve tetikleyiciye dönüşle test edilir.
10. 320/375/768/1440 px, %200 metin büyütme ve azaltılmış hareket tercihinde temel akış tamamlanır.

## Test verisi politikası

Otomatik test verisi izole ve silinebilir test veritabanında oluşturulur. `prisma/seed.ts` gerçek ortamda çalıştırılmaz. Testte sahte sağlayıcı kullanılabilir; bu yalnız test sürecinde açıkça adlandırılır ve canlı davranışa kaçmaz. Test hesapları üretim metriklerine veya gerçek müşterilere karışmaz. Kişisel veri kopyası test ortamına taşınmaz.

## Çalıştırma durumu

`package.json` içinde birleşik `test` betiği yoktur. `tests/preview-config.test.mjs` Node test çalıştırıcısıyla uyumludur; TSX testleri için çalıştırıcı ve bağımlılık ayrıca netleştirilmelidir. Sırf test komutu eksik diye “tüm testler geçti” denmez. Her PR/sürüm kaydında hangi testin çalıştığı, çıkış kodu ve kapsanmayan risk belirtilir.

## Kabul raporu şablonu

```text
Sürüm / commit:
Ortam ve veritabanı:
Çalışan komutlar ve sonuçları:
Test edilen rotalar ve roller:
Ödeme sandbox işlemi ve callback tekrarı:
Mobil/klavye/ekran okuyucu sonucu:
Performans ölçümü:
Açık P0/P1 maddeleri:
Yayın kararı ve sorumlusu:
```
