# Yönetim paneli sözleşmesi

Kapsam: `/yonetim` ve `/api/admin/*`. Yönetim UI'si rol kontrolünün tek katmanı değildir; her Route Handler aynı yetkiyi kendi içinde denetler.

## Yapı (2026-10-02)

`src/app/yonetim/page.tsx` yalnız kabuktur: kenar çubuğu grupları (Genel, Satış, Katalog, Müşteri, Mağaza; `_lib/tabs.ts`), üst çubuk, başlık ve komut paleti. Her sekme kendi dosyasındadır (`_tabs/OrdersTab`, `ProductsTab`, `CategoriesTab`, `CouponsTab`, `GiftCardsTab`, `ReturnsTab`, `WaitlistTab`, `CustomersTab`, `MessagesTab`, `NewsletterTab`; `_components/DashboardTab`, `SettingsTab`, `ActivityTab`, `SecurityTab`) ve kendi verisini yükler; eski tek dosya (2279 satır) bölündü. `?tab=` geri/ileri ile senkron, eski `?tab=stats` gösterge paneline açılır. Kenar çubuğu rozetleri `/api/admin/stats` sayılarındandır.

Görsel dil (`src/styles/pages/admin-shell.css`): sıcak kâğıt zemin + sabit hafif doku, koyu "ada" kenar çubuğu, göz başlığı (eyebrow) + büyük Cormorant sayfa başlığı, çift çerçeveli kartlar (renkli tepsi + kâğıt çekirdek, eşmerkezli `--radius-xl`/`--radius-xl-inner`, `--shadow-float`), iç içe ikonlu hap düğmeler, ince çizgi ikonlar (`AdminIcon`). Hareket yalnız `transform`/`opacity`, `--ease-drawer`; azaltılmış harekette kapalı. 1024 px altında kenar çubuğu çekmece olur, 768 px altında kartlar tek sütun.

- **Gösterge paneli:** son 30 gün ciro (önceki 30 güne göre değişim), tek seri alan grafiği (30 gün / 12 ay; imleç + ipucu, ok tuşlarıyla gezinme, ekran okuyucu için tablo), sipariş ve ortalama sepet kartları, bekleyen işler (ilgili sekmeye gider), düşük stokta satır içi stok kaydetme (mevcut `PATCH /api/admin/products`), en çok satanlar, son siparişler. Ciro yalnız ödenmiş siparişler, ödeme gününe göre (`src/lib/admin/dashboard.ts`, `tests/admin-dashboard.test.ts`).
- **Ayarlar:** altı bölüm (Mağaza, İletişim ve sosyal medya, Kargo, Duyuru ve bakım, Arama motorları, Stok); kalıcı etiketler, istemcide ve sunucuda aynı doğrulama (`validateSettings`), alan hataları ve ilk hatalı alana odak, yalnız değişiklik varken etkin kaydet/vazgeç çubuğu, kaydedilmemiş değişiklikte sayfadan çıkış uyarısı, eşzamanlı düzenlemede 409. Kayıt sitede hemen uygulanır.
- **Etkinlik kaydı:** tür filtresi, zaman çizelgesi, alan bazında önce → sonra, "Daha eski kayıtlar".
- **Komut paleti:** Ctrl/⌘ K; bölümlere git, sipariş/ürün/müşteri ara (`/api/admin/search`), ok tuşları + Enter, Esc ile kapanır ve odak geri döner.
- **Oturum süresi:** yönetici oturumu en fazla 8 saat, 30 dakika işlemsizlikte kapanır (sunucu denetler). `SessionGuard` panel kullanıldıkça süreyi yeniler; bitişe 2 dakika kala geri sayımlı uyarı açılır ("Oturumu sürdür" / "Çıkış yap"; 8 saat dolarken yalnız çıkış). Bitişten önce sunucuya yeniden sorar (başka sekme yenilemişse çıkış yapmaz). Kapanınca giriş ekranı nedenini yazar. Şifre unutulursa: `npm run admin:reset-password`.
- Oturum doğrulanırken metin yerine panelin kendi iskeleti (`AdminShellSkeleton`) çizilir; sekme içi yüklemeler de iskelettir (`TabLoading`).
- Giriş kapısı: boş alanlar (önceden doldurulmuş kimlik bilgisi kaldırıldı), bekleme ve hata durumu; müşteri hesabıyla gelene yetkisi olmadığı söylenir.

**Sekme içerikleri (Dilim 3, 2026-10-02):** on veri sekmesi (siparişler, ürünler, kategoriler, kuponlar, hediye kartları, iadeler, stok talepleri, müşteriler, destek, bülten) kabukla aynı dile taşındı (`src/styles/pages/admin-content.css`, kurallar DESIGN.md "Yönetim …" satırlarında). İşlevler aynıdır; değişen davranış:

- `alert()`/`confirm()` yok: sonuç sekme üstünde canlı bölgeli bildirimle (`_components/TabNotice`), silme/dondurma/toplu durum gibi eylemler onay penceresiyle (`_components/ConfirmDialog`) yapılır; hata pencerede kalır.
- Her istek `_lib/request.ts` üzerinden: sunucu hatası ve bağlantı kopması görünür mesajdır, hiçbir istek sessizce başarısız olmaz. Hassas işlemler `adminFetch` ile 2FA yeniden doğrulamasını korur.
- Formlar `Dialog` içinde kalıcı etiket, istemci doğrulaması (kuponda sunucuyla aynı `validateCouponInput`), bekleme metni ve çift gönderim engeliyle çalışır.
- Kaydedilen satır sunucunun döndürdüğü kayıtla güncellenir (sipariş PATCH'i güncel siparişleri döndürür); listeyi baştan yüklemek gerekmez.
- Sipariş satırında tek "sonraki adım" düğmesi (Hazırlamaya al → Kargoya ver → Teslim edildi); takip numarası yoksa "Kargoya ver" kargo penceresini açar. Serbest durum seçimi sipariş ayrıntısındadır. "Kaydet ve kargoya ver" yalnız ödenmiş/hazırlanan siparişte görünür.
- WhatsApp takip mesajı ("kargoya verilmiştir") yalnız takip numarası olan siparişte sunulur.
- Depo fişi yazdırılırken yalnız fişler basılır ve her sipariş ayrı A4 sayfasına düşer (önceden sayfa kesmesi yoktu).
- Ürün kartında beden stoğu yalnız değer değiştiğinde kaydedilir; kayıt durumu ve hata alanın yanında görünür. Kategori filtresi ürünlerdeki gerçek kategorilerden üretilir.
- Kupon durumu tarih ve kotadan hesaplanır (Geçerli, Başlamadı, Süresi doldu, Kota doldu, Kapalı); önceden pasif kupon da yeşil "Aktif" görünüyordu.
- Hediye kartı oluşturma, e-postanın gerçekten gönderilip gönderilmediğini bildirir (API `emailSent` döndürür); gönderilemezse kodun elle iletilmesi istenir.
- İade reddinde gerekçe düzenlenebilir ve müşterinin gördüğü söylenir.
- Uydurma/pazarlama metinleri kaldırıldı ("VIP", "lüks teslimat", rakip marka adı, emoji etiketler).

## Sekmeler ve işlemler

| Sekme | Gösterilen veri | Çalışan eylem | Doğrulama |
| --- | --- | --- | --- |
| İstatistik | Gerçek sipariş/ciro/AOV/sayı | Tarih veya kapsam varsa yenile | Ödenmemiş sipariş ciroya girmez |
| Sipariş & Sevkiyat | Durum, kalem, takip, ödeme hareketleri, yönetici notu | Öncelikli yeni gelen siparişler alanı, aylara göre filtre ve tablo ayrımı, sayfalama (10–100), arama, kargo/tarih filtresi, tek tıkla durum stepper'ı, hızlı kargo kodu girişi, canlı kargo takip linki & WhatsApp bildirim kısayolu, yönetici notu, detay çekmecesi, tekil ve toplu A4 depo fişi yazdır, CSV | Durum değeri listede olmalı (geçiş sırası ve taşıyıcı/kod biçimi sunucuda denetlenmiyor, QA.md); Kargoda'da takip numaralı siparişe kargo e-postası; ödeme kayıtları |
| Ürün | Taslak/yayın durumu, sıralı medya, renk ailesi, fiyat, beden stoğu, vitrin durumu | Taslak oluştur/düzenle, görsel/video yükle, kapak/sıra/renk bağla, yayınla, vitrin (featured) toggle, CSV | Pozitif fiyat, negatif olmayan stok, gerçek kapak ve video posteri |
| Kategori | Hiyerarşik kategori ağacı | Kategori ekle, düzenle, sırala, sil | Slug benzersizliği, alt kategori tutarlılığı |
| Hediye Kartı | Kod, bakiye, alıcı, tema, kullanım dökümü | Hediye kartı tanımla, dondur/aç, kullanım geçmişi incele | Geçerli bakiye ve e-posta; e-posta gönderim sonucu bildirilir |
| Destek Masası | İletişim mesajları, ilgili sipariş, konu, durum | Yanıtlandı işaretle, mailto ile yanıtla, sil | Yalnızca yetkili ADMIN erişimi |
| Müşteriler | Kayıtlı üyeler, LTV, sipariş toplamı, adresler | Arama, profil dökümü, CSV dışa aktar | KVKK güvenli dışa aktarma |
| Stok Talepleri | Beden bekleme listesi (Waitlist) yoğunluk özeti | Talep incele, talep kaydı sil | Stok 0'dan yukarı çıkınca bekleyenlere e-posta (`tests/stock-alert-trigger.test.ts`) |
| Kupon | Kod, indirim, limit, geçerlilik, durum | Oluştur, sil (kapatma API'si yok) | İndirim oranı/tutarı ve kullanım limiti sınırı |
| İade | Sipariş, gerekçe, durum | Onayla/reddet, müşteriye görünen gerekçe | ADMIN kontrolü; durum değeri listede olmalı (geçiş sırası denetlenmiyor) |
| Bülten | Gerçek aboneler | Listele, panoya kopyala, sil | Kişisel veriye ADMIN erişimi |

## Etkileşim standardı

Sekmeler arası geçişte `?tab=` parametresi senkronize edilir; sayfa yenilendiğinde aktif sekme korunur. Her sekme: yükleme iskeleti → hata + "Tekrar dene" (asla boş liste gibi değil) → boş durum metni → veri.

Siparişler (`?tab=orders`):
- **Durum kutuları:** Hazırlanacak (`ODENDI`), Kargoya verilecek (`HAZIRLANIYOR`), Kargoda, Takip numarası eksik. Tıklamak filtreyi açar/kapatır (`aria-pressed`).
- **Öncelikli liste:** ödenmiş ve hazırlanmayı bekleyen siparişler tablonun üstünde; "Hazırlamaya al", "Detay", depo fişi. "Gizle/Göster" `aria-expanded` ile.
- **Filtreler:** durum segmenti, kargo firması, ay, zaman aralığı (24 saat / 7 gün / 30 gün), arama (sipariş no, müşteri, telefon, şehir, takip no, ürün). Tablo aylara göre ayrılır; sayfa başına 10–100 satır.
- **Kargo:** takip numarası rozet + kopyala + firma takip sayfası (yalnız bilinen firmalarda) + düzenle; numara yoksa "Takip no" kargo penceresini açar.
- **Toplu işlem:** satır seçilince alttaki çubuk: depo fişi, Hazırlanıyor, Kargoda, Teslim edildi (onaylı), seçimi kaldır. CSV seçiliyse seçilenleri, değilse tümünü indirir.
- **Sipariş ayrıntısı:** sağdan açılan pencere; durum, kargo, yönetici notu (yalnız panel ve depo fişinde görünür), ürünler ve tutar dökümü, ödeme kayıtları.

Hediye kartı sekmesinde yöneticinin tanımladığı kart alıcıya e-postayla gönderilir; her kartın hangi siparişlerde ne kadar harcandığı `GiftCardUsage` geçmişinden gösterilir.

Stok talepleri (`WaitlistTab`) bekleyen "Gelince haber ver" taleplerini ürün ve bedene göre gruplar; en çok talep edilen üstte. Tek tek kayıtlar ikinci görünümdedir.

## Yetki kabulü

Oturumsuz istek, CUSTOMER ve ADMIN ile tüm GET/POST/PATCH/DELETE rotaları `tests/` paketinde denetlenmektedir. Tüm API rotaları `getCurrentUser(request)` üzerinden sunucu tarafında rol kontrolü yapar; yetkisiz çağrılarda 403 döner ve veri sızdırmaz. `tests/admin-gift-cards.test.ts`, `tests/admin-contact-messages.test.ts`, `tests/admin-returns-auth.test.ts` ve `tests/admin-stats-accuracy.test.ts` ile tüm yönetim rotalarının güvenliği ve ciro doğruluğu kanıtlanmıştır.
