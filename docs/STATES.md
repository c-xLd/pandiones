# Arayüz durumları ve placeholder standardı

Her veri bağımlı yüzey şu durumları ayrı işler: `idle`, `loading`, `success-with-data`, `success-empty`, `error`, `submitting`, `submitted`. Bütün durumların metni ve eylemi kullanıcıya anlaşılır olmalıdır. Hata sıfır sonuç, gecikme de başarı gibi sunulmaz.

## Sayfa ve bileşen matrisi

| Yüzey | Yüklenirken | Boşken | Hata ve kurtarma |
| --- | --- | --- | --- |
| Ana sayfa ürün seçkisi | Kart ölçülerine yakın sabit skeleton; kampanya görseli yer tutucu oranı | “Şu anda ürün bulunmuyor” ve koleksiyon/geri dönüş | “Ürünler yüklenemedi” + tekrar dene |
| Katalog | Filtre/sıralama alanı kullanılabilir, kart iskeleti; sayı yerine geçici metin | Filtreyi temizle ve kategori değiştirme | Mevcut seçim korunur, tekrar dene |
| Ürün detay | Görsel oranı ve satın alma alanı rezerve edilir | Silinmiş ürün 404; stok yoksa beden/CTA durumu açık | Veri alınamazsa geri dön/yeniden dene |
| Arama | Giriş kullanılabilir; sonuç alanında küçük iskelet | Arama terimine göre açıklayıcı sıfır sonuç | Terim korunur, tekrar dene |
| Sepet/favori | Yerel veri okunana kadar yanlış boş ekran flaşı yok | Ürün keşfine gerçek bağlantı | Senkronizasyon hatası ve geri alma |
| Hesap/sipariş | Kimlik doğrulaması bitene kadar özel bilgi gösterilmez | Sipariş yok açıklaması | Tekrar dene; yetkisizse giriş |
| Ödeme | Özet ve ödeme hazırlığı için ölçüsü sabit alan | Boş sepet için koleksiyona git | Form/sepet korunur, sağlayıcı hatası açık |
| Yönetim | Sekme bazında tablo iskeleti | Kayıt yok mesajı | Kaydedilmedi bilgisi + tekrar dene |

## Skeleton ve placeholder ayrımı

Skeleton yalnızca yükleme sırasında görünür. Gerçek kartın yaklaşık en/boy oranını koruyarak CLS azaltır; içinde sahte fiyat, stok, değerlendirme veya tıklanabilir kontrol olmaz. `aria-busy` kapsayıcıda; ekran okuyucuya kısa “Yükleniyor” durumu yeterlidir. Shimmer varsa `prefers-reduced-motion` altında kapatılır. Üst düzey `src/app/loading.tsx` genel yedektir; sayfa özelinde veri alanının geometrisini yansıtan yükleme durumu gerekir.

Input placeholder'ı örnek biçim göstermek içindir. Her inputun görünür label'ı, gerekli/isteğe bağlı bilgisi ve gerektiğinde yardım metni bulunur. Hata mesajı `aria-describedby` ile alana bağlanır. Doğrulama yalnızca blur sonrası değil, gönderim sırasında da çalışır. Hassas alanlar otomatik tamamlamayı uygun şekilde belirtir.

## Eylem geri bildirimi

Gönderim sırasında düğme “Kaydediliyor”, “Ödeme başlatılıyor” gibi somut metin taşır; aynı işlem ikinci kez başlatılamaz. Uzun işlemde ilerleme veya bekleme nedeni gösterilir. Başarı sadece sunucu onayından sonra gösterilir. Hata metni neyin kaydedilmediğini ve kullanıcının ne yapabileceğini söyler. Modal kapanması işlem iptaliyse hiçbir veri yazılmaz. Toast tek geri bildirim aracı olmamalı; kritik sonuç sayfada kalıcı olarak görünmelidir.

## Görsel başarısızlığı

Ürün görseli yüklenemezse sessiz boş kutu veya yanlış ürün görseli gösterilmez. Nötr çerçeve, ürün adı ve yönetilebilir hata durumu kullanılır. Kampanya görselinin alt metni ve kırpması mobil/masaüstünde ayrı gözden geçirilir.
