# Veri ve entegrasyon ilkeleri

## Kaynak sahipliği

Prisma şeması `prisma/schema.prisma` içindedir. `Product` ve `Variant` ürün/stok, `Order` ve `OrderItem` sipariş, `PaymentTransaction` ödeme, `User` hesap, `WishlistItem` favori, `Coupon` indirim, `Review` yorum, `Newsletter` abonelik, `ReturnRequest` iade ve `StockAlert` alarm kaydı tutar. Müşteriye sunulan sayısal veya kişisel bilgi bu kaynaktan veya doğrulanmış entegrasyondan gelir. İstemcideki sabit metin yalnızca editoryal içerik olabilir; materyal, üretim yeri, stok ve teslimat iddiaları gerçek kayıtla doğrulanır.

## Ürün medyası ve renk ailesi

Satılabilir her renk ayrı `Product` kaydıdır. Aynı model renkleri isteğe bağlı `ProductFamily` ile bağlanır; aynı kategoride normalize edilmiş renk tekrarına izin verilmez. `ProductMedia` ürünün doğrulanmış sıralı karelerini ve tek kapağını tutar. `Product.image`, eski tüketiciler için kapak veya video poster URL'sidir; medyasız eski ürünlerde tek kare olarak kalır. Yeni ürün `DRAFT` başlar, yayın kontrolünden önce herkese açık sorgulara girmez. Mevcut kayıtlar migration'da `PUBLISHED` korunur. Şema geçişi additive migration ile yapılır; üretimde yıkıcı `db:push` veya seed uygulanmaz.

## Mock ve seed sınırı

- `prisma/seed.ts` örnek ürün, kullanıcı, kupon, yorum ve sipariş üretir; **geliştirme içindir ve kayıtları siler**. Üretim verisi olarak kullanılamaz. Gerçek ürünler yönetim akışından veya doğrulanmış aktarım sürecinden girilir.
- `src/lib/payment/iyzico.ts` anahtar yoksa `MOCK_IYZICO_...` tokenı ve simülatör üretir. Mevcut davranış canlı satış koşulunu karşılamaz. Üretimde fail closed yapılmalı; test/sandbox açık ve izole yapılandırılmalı, simüle sonuç gerçek satış raporlarına girmemelidir.
- Formlardaki placeholder örnek girdidir; otomatik gerçek değer veya başarılı işlem kanıtı değildir.
- Kod içindeki kampanya yazıları ve görselleri ticari iddia içerebilir. İçerik sahibi onayı olmadan “saf ipek”, “İstanbul atölyesi”, “sınırlı seri” gibi kesin ifadeler yayınlanmaz.

## Sunucu doğrulaması

Siparişte ürün id/slug, varyant, stok ve pozitif tam sayı miktarı sunucudan doğrulanır. Fiyat, kupon ve kargo ücreti sunucuda hesaplanır; istemcinin `discountAmount` veya toplam değeri otorite değildir. Stok azaltma, kupon kullanım sayacı ve ödeme durum geçişi işlem bütünlüğüyle ele alınır. Çift tıklama ve yinelenen callback için idempotency anahtarı gerekir. Sipariş numarası benzersiz ve tahmin edilebilir erişim yetkisi olarak kullanılmaz.

Kimlik ve yetki her API rotasında kontrol edilir. Sipariş, favori, iade ve yönetim verisinde satır düzeyinde sahiplik doğrulanır. Hata yanıtları parola, token, ödeme sağlayıcı ham cevabı veya kişisel bilgiyi sızdırmaz. Çerezler güvenli bayraklar ve uygun süreyle ayarlanır; mutasyonlarda CSRF riskleri değerlendirilir. Görsel yükleme MIME, boyut, dosya adı ve depolama yetkisiyle kısıtlanır.

## Veri ömrü ve operasyon

Üretimde SQLite kullanımı, eşzamanlı sipariş, kalıcı disk ve yedekleme gereksinimleri için ayrıca değerlendirilmelidir. Veri taşıma migration ile yapılır; `db:push --accept-data-loss` üretim yöntemi değildir. Yedekleme, geri yükleme denemesi, ortam değişkenleri, dosya yüklemelerinin kalıcılığı ve gözlemlenebilirlik yayın öncesi belgelenir. Canlı anahtarlar yalnızca gizli ortam değişkenlerinde bulunur.

Merchant feed stok durumunu gerçek varyant stokundan üretir. Bülten veya stok alarmı e-posta gönderecekse gönderim sağlayıcısı, tekrar deneme, başarısızlık kaydı ve abonelikten çıkış mekanizması gerekir. Ödeme sağlayıcısı, e-posta ve taşıyıcı entegrasyonlarında ağ kesintisi açık hata ve yeniden deneme yolu üretir.
