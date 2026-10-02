# Sepet, ödeme ve sipariş sonucu

Kapsam: ortak sepet çekmecesi, `/odeme`, `/siparis-onay/[id]` ve ödeme API'leri. Bu belge hedef deneyimi anlatır; mevcut kodun güvenlik açıkları [SECURITY.md](../SECURITY.md) içindedir.

## Sepet çekmecesi

Her satır gerçek ürün, seçili beden, adet, anlık gösterim fiyatı ve kaldırma eylemi içerir. Artırma/azaltma sınırları anlaşılırdır. Boş sepette koleksiyona bağlantı vardır. Öneri ürününü sepete ekleme geçerli beden ve stok doğrulaması olmadan tamamlanmış sayılmaz. Yerel sepet taslaktır; ödeme ekranındaki nihai fiyat sunucu doğrulamasından gelir.

## Çanta sayfası (`/canta`)

`/sepet` bu sayfaya yönlenir. Açık editoryal düzen: solda ürün satırları (2:3 görsel, ad, renk/beden, birim ve satır fiyatı, adet, "Favorilere taşı", "Kaldır"), sağda yapışkan sipariş özeti; 900 px altında özet akışın sonuna iner ve toplam + "Ödemeye geç" alt çubukta kalır. Stiller `src/styles/pages/cart.css`.

- **Fiyat ve stok:** Sayfa yüklenince ve adet değişince (debounce) `POST /api/cart/validate` çağrılır. Route salt okunurdur ve `src/lib/cart/quote.ts` ile her satır için yayındaki ürünün güncel fiyatını ve beden stokunu döner (`ok`, `price-changed`, `insufficient-stock`, `sold-out`, `unavailable`). Değişen fiyat `CartContext.syncPrices` ile yerel sepete yazılır ve satırda not olarak gösterilir; böylece çekmece ve `/odeme` aynı tutarı gösterir. Stok sınırında `+` kapanır; tükenen/satıştan kalkan/stoku aşan satır varken ödeme düğmesi nedenini göstererek kilitlenir. Doğrulama isteği başarısızsa uyarı ve "Tekrar dene" görünür; ödeme adımı zaten sunucuda yeniden hesapladığı için geçiş engellenmez. Hediye kartı satırları doğrulanmaz.
- **Kupon:** `POST /api/coupons/validate` ile doğrulanır; hata alana bağlıdır. Çanta değişince uygulanan kod düşer. Ödemeye geçiş `?coupon=KOD` taşır ve `/odeme` kodu mevcut kupon akışıyla yeniden doğrular; sipariş oluşturma indirimi yine sunucuda hesaplar.
- **Teslimat:** Sunucu kargo ücreti almaz; çanta, çekmece ve ödeme "Ücretsiz" gösterir. Ücretsiz kargo eşiği veya ilerleme çubuğu yoktur. Ücret eklenecekse önce `/api/checkout` ve iyzico tutarı değiştirilir, sonra arayüz.

## Ödeme sayfası (`/odeme`)

Çanta ile aynı editoryal çerçeve: başlıkta parça sayısı ve toplam, adım göstergesi (`CheckoutStepper`), solda form, sağda yapışkan özet (900 px altında özet formdan önce gelir). Stiller `src/styles/pages/checkout.css`.

- **Adım 1 — teslimat:** İletişim (ad, e-posta, cep telefonu) ve adres (il, ilçe, açık adres, isteğe bağlı not) `FormField` ile kalıcı etiketli; oturum açık kullanıcıda profil ve varsayılan kayıtlı adres ön doldurulur, kayıtlı adresler `SavedAddressPicker` radyo grubuyla seçilir. `validateCheckoutForm` hem istemcide hem `/api/checkout` içinde çalışır; sunucu hatalı alanı `field`/`fieldErrors` ile döner ve odak o alana gider. Adres önerisi servisi yoktur.
- **Fiyat ve stok:** `useCartQuote` (`src/lib/cart/useCartQuote.ts`) çanta sayfasıyla aynı doğrulamayı yapar; değişen fiyat yerel sepete yazılır, satın alınamayan satır varken gönderim kapalıdır ve "Çantayı düzenle" bağlantısı gösterilir. Doğrulama isteği başarısızsa uyarı + "Tekrar dene"; tutar yine sipariş oluşturulurken sunucuda hesaplanır.
- **Kupon:** `CouponForm`; `?coupon=` parametresi fiyatlar doğrulandıktan sonra bir kez uygulanır. Ara toplam değişirse kod düşer ve yeniden uygulanması istenir. Ödeme adımında kupon değiştirilemez.
- **Adım 2 — ödeme:** `/api/checkout` `checkoutFormContent` döndürürse iyzico formu sayfaya gömülür (`PaymentStep`); `isTestMode` doğruysa "Test modu — gerçek ödeme alınmaz." bandı görünür. "Bilgileri düzenle" forma döner, odak gönder düğmesine gider; tekrar gönderim yeni ödeme formu çizer. Yalnız `paymentPageUrl` varsa yönlendirme yapılır.
- **Metin:** Doğrulanmamış ödeme iddiası (lisans, sertifika, taksit) ve kart rozeti yazılmaz; yalnız kart bilgisinin iyzico formuna girildiği ve Pandiones'in saklamadığı söylenir.

## Durum makinesi

```text
Sepet hazır → doğrulama → ödeme bekliyor
                           ├─ sağlayıcı onayı → ödenmiş → onay sayfası
                           ├─ ret/iptal → başarısız → ödeme formuna dönüş
                           └─ sonuç belirsiz → beklemede → sorgulama/uzlaştırma
```

“Ödenmiş” durumu yalnız doğrulanmış sağlayıcı sonucuyla verilir. Tekrarlanan callback veya sayfa yenilemesi stok ve kuponu ikinci kez değiştirmez. Ödeme başarısızsa ürünler yerel sepetten silinmez. Sonuç belirsizse kullanıcıya kesin başarı/başarısızlık söylenmez; sipariş durumunu kontrol edebileceği güvenli bir yol verilir.

## Sipariş onayı

Sayfa yalnız yetkili kullanıcıya ait, ödeme durumu `SUCCESS` olan sipariş için başarı mesajı gösterir. Misafir sipariş erişimi gerekiyorsa tahmin edilemeyen, süreli ve tek amaca yönelik bağlantı tasarlanır; yalnız sipariş numarası yetki değildir. Onay özeti gerçek ürün/adet/fiyat/adres ve son durumdan gelir. Takip kodu varsa “hareketleri gör” eylemi gerçek taşıyıcı hedefine bağlı link olur; link yoksa metin tıklanabilir görünmez. Geçersiz ID 404, bekleyen ödeme bekleme, başarısız ödeme başarısızlık sayfası alır.

## Kabul senaryoları

- Geçersiz beden, sıfır/negatif adet, değişmiş fiyat ve bitmiş stok sunucuda reddedilir.
- İstemcinin gönderdiği indirim tutarı değiştirilse bile nihai tutar değişmez.
- Çift tıklama ve yinelenen callback tek sipariş/tek stok azaltımı üretir.
- Başkasının sipariş numarası adres, telefon veya kalemleri açmaz.
- Sağlayıcı arızası ve kullanıcı iptalinde form/sepet kurtarılır.
