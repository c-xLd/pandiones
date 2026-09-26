# Sepet, ödeme ve sipariş sonucu

Kapsam: ortak sepet çekmecesi, `/odeme`, `/siparis-onay/[id]` ve ödeme API'leri. Bu belge hedef deneyimi anlatır; mevcut kodun güvenlik açıkları [SECURITY.md](../SECURITY.md) içindedir.

## Sepet çekmecesi

Her satır gerçek ürün, seçili beden, adet, anlık gösterim fiyatı ve kaldırma eylemi içerir. Artırma/azaltma sınırları anlaşılırdır. Boş sepette koleksiyona bağlantı vardır. Öneri ürününü sepete ekleme geçerli beden ve stok doğrulaması olmadan tamamlanmış sayılmaz. Yerel sepet taslaktır; ödeme ekranındaki nihai fiyat sunucu doğrulamasından gelir.

## Ödeme formu

Ad, e-posta, telefon, şehir, ilçe, adres ve isteğe bağlı not alanlarının kalıcı etiketleri ve açık zorunlulukları vardır. E-posta/telefon biçimi, boş alan ve uzunluk hem istemci hem sunucuda denetlenir. Kupon uygulanınca ve kaldırılınca sunucunun hesapladığı indirim/tutar görünür. Gönderim sırasında düğme bekleme durumuna geçer ve ikinci istek açmaz. Sağlayıcı yoksa ödeme başlamaz; kullanıcı formu ve sepetini kaybetmez. Üçüncü taraf ödeme yüzeyi yüklenemezse açık hata ve güvenli geri dönüş vardır.

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
