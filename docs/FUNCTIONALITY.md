# İşlev ve etkileşim sözleşmesi

## Evrensel kural

Ekranda eylem gibi görünen her öğe gerçek eylem yapar. `#` bağlantısı, yalnızca toast gösteren sahte işlem, boş handler veya görsel olarak aktif ama erişilemez buton tamamlanmış sayılmaz. Kontrolün bekleme, başarısızlık, tekrar deneme ve sonuç durumları tasarlanır. İşlemden sonra kullanıcı doğru sayfada ve doğru veriyi görür.

## Müşteri akışları

1. **Gezinme ve arama:** Menü, logo, kategori, ürün ve footer linkleri doğru rotaya gider. Arama gerçek ürün verisinde çalışır; Türkçe karakter davranışı tutarlı ve testlidir. Sonuç yok mesajı istek hatasından ayrıdır.
2. **Katalog:** Filtre/sıralama/görünüm seçimleri gerçek listeyi değiştirir ve seçili durumlarını gösterir. Ürün sayısı, fiyat ve stok kart ile detay arasında tutarlıdır. Geçersiz kategori 404 alır.
3. **Ürün:** Beden seçimi zorunlu; tükenen varyant sepete eklenemez. Miktar sıfır veya stok üstü olamaz. Galeri kontrolü, duraklatma, kılavuz, yorum ve ilgili ürün linkleri çalışır. Ürün detayındaki iki rota aynı kaynağı kullanır.
4. **Favori:** Misafir ve giriş yapmış kullanıcının kayıtları açık kuralla yönetilir. İşlem başarısızsa ikon eski haline döner ve hata görünür. Favoriden ürün detayı ve sepete geçiş doğru varyant gerektirir.
5. **Sepet:** Ekle, miktar artır/azalt, kaldır, boşalt ve ödeme yönlendirmesi çalışır. Fiyatlar ve stok ödeme öncesi sunucuda doğrulanır. Sekme yenilemesi sonrası yerel sepet korunabilir; eski fiyat asla nihai toplam olarak kabul edilmez.
6. **Hesap:** Kayıt/giriş/çıkış gerçek API sonucu ile senkronize olur. Hatalı veya süresi bitmiş oturum doğru biçimde ele alınır. Sipariş ve iade yalnızca sahibine veya yetkili yöneticiye görünür.
7. **Kupon:** Sunucu kodu, aktiflik, kullanım limiti, minimum sepet ve indirim üst sınırını yeniden denetler. Uygulama/çıkarma toplamı günceller; ağ hatası indirim başarısı olarak gösterilmez.
8. **Ödeme:** Teslimat alanları doğrulanır; sunucu ürün, varyant, miktar, stok ve kuponu yeniden okur. Sağlayıcı yapılandırması yoksa ödeme bloke edilir. Başarı yalnızca doğrulanmış callback sonrası gösterilir. Başarısızlıkta sepet ve form bilgisi kurtarılabilir kalır. Tekrarlanan callback aynı siparişi iki kez işlemez.
9. **Sipariş sonrası:** Onay sayfası yalnızca yetkili kişiye doğrulanmış sonucu gösterir. Takip kodu varsa geçerli taşıyıcı linki oluşturulur. İade talebi gerçek kayda dönüşür; durum güncellenir.
10. **Bülten ve stok alarmı:** Geçerli e-posta, tekrar kayıt, gizlilik onayı ve başarısızlık işlenir. Stok alarmı için gerçekten çalışan e-posta gönderimi kurulmadan “e-posta ile bilgilendirileceksiniz” vaadi kullanılmaz.

## Yönetim akışları

Ürün ekleme/düzenleme, görsel yükleme, stok, kupon, sipariş durumu/takip, yorum moderasyonu, iade kararı ve abone dışa aktarma işlemleri sunucuda ADMIN yetkisi ister. Yetki sadece panel gizleyerek sağlanmaz. Mutasyon sonunda liste ve istatistikler yeniden gerçek kaynaktan okunur. Silme veya geri dönüşü zor kararlar açık onay ister. Hata mesajı işlem yapılmadığını belirtir; başarı bildirimi yalnızca kaydedilmiş sonuçtan sonra verilir.

## Entegrasyon envanteri

Mevcut API klasörleri: `auth`, `products`, `wishlist`, `coupons/validate`, `checkout`, `payment/callback`, `orders/[id]`, `returns`, `newsletter`, `stock-alert`, `feed/google-merchant`, `admin/*`. Bir UI akışını değiştirirken ilgili Route Handler ve veri modelini beraber test edin. API yanıtları tutarlı hata kodu, güvenli mesaj ve uygun HTTP durum kodu döndürür.
