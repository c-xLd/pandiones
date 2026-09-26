# Yönetim paneli sözleşmesi

Kapsam: `/yonetim` ve `/api/admin/*`. Yönetim UI'si rol kontrolünün tek katmanı değildir; her Route Handler aynı yetkiyi kendi içinde denetler.

## Sekmeler ve işlemler

| Sekme | Gösterilen veri | Çalışan eylem | Doğrulama |
| --- | --- | --- | --- |
| İstatistik | Gerçek sipariş/ciro/sayı | Tarih veya kapsam varsa yenile | Ödenmemiş sipariş ciroya girmez |
| Sipariş | Durum, kalem, takip | Durum ve takip güncelle, dışa aktar | İzinli durum geçişi; geçerli taşıyıcı/kod |
| Ürün | Taslak/yayın durumu, sıralı medya, renk ailesi, fiyat ve beden stoğu | Taslak oluştur/düzenle, görsel/video yükle, kapak/sıra/renk bağla, yayınla, CSV | Pozitif fiyat, negatif olmayan stok, gerçek kapak ve video posteri |
| Kupon | Kod, indirim, limit, aktiflik | Oluştur, sil veya kapat | İndirim oranı/tutarı ve kullanım limiti sınırı |
| Bülten | Gerçek aboneler | Listele, dışa aktar, sil | Kişisel veriye ADMIN erişimi |
| Yorum | Ürün, puan, metin | Moderasyon/silme | İşlem kaydı ve gerekçe politikasına uyum |
| İade | Sipariş, gerekçe, durum | Onayla/reddet, not ekle | ADMIN kontrolü ve izinli geçiş |

## Etkileşim standardı

Ürün düzenleyicisi önce taslak oluşturur. Medya yükleme taslak ID'si alındıktan sonra açılır; JPEG/PNG/WebP için 10 MB, MP4/WebM için 50 MB sınırı ve aynı ürüne ait görsel poster şartı arayüzde görünür. Başarısız kaydetme/yükleme formu açık ve düzenlenebilir bırakır. Yayınlama ayrı eylemdir; medya ve zorunlu alanlar eksikse sunucu reddeder. Renk ailesinde aynı kategoride normalize edilmiş tekrar renk bağlanamaz. Eski `/api/admin/upload` kullanılmaz; ürün-bound medya rotası kullanılır.

Her sekmede tablo yükleniyor, boş, hata ve başarı durumları ayrıdır. Filtre/sıralama varsa gerçek satırları değiştirir. CSV yalnız ekranda yetkili kullanıcının görmeye hakkı olan alanları içerir; formül enjeksiyonuna karşı metin hücreleri güvenli dışa aktarılır. Görsel yükleme kabul edilen tür ve maksimum boyutu seçmeden önce gösterir. Uzun işlem sırasında düğme işlem adını belirtir ve çift tıklama engellenir. Mutasyon sonrasında veri yeniden okunur; güncellenmemiş satır başarı gibi görünmez.

## Operasyonel iz

Ürün fiyatı, stok, sipariş durumu, kupon ve iade kararı için kim, ne zaman, neyi değiştirdi kaydı hedeflenir. Mevcut şemada genel bir audit modeli yoktur; kurulmadan ayrıntılı denetim izi var denmez. Toplu işlem veya silme eklendiğinde geri dönüş ve onay akışı ayrıca tasarlanır. Yerel `public/uploads` depolamasının üretim kalıcılığı doğrulanır.

## Yetki kabulü

Oturumsuz istek, CUSTOMER ve ADMIN ile tüm GET/POST/PATCH/DELETE rotaları denenir. `src/app/api/admin/returns/route.ts` mevcut durumda yetkisiz erişim açığıdır; [SECURITY.md](../SECURITY.md) kapanmadan panel canlı yönetim için hazır değildir. Erişim reddi veriyi veya kaydın varlığını sızdırmaz.
