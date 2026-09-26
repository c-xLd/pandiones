# Dijital Hediye Kartı ve Bakiye Doğrulama Mimarisi

Kapsam: `/hediye-karti`, `/odeme` (Hediye kartı entegrasyonu), `/api/gift-cards/balance`, `/api/coupons/validate` ve veritabanı motoru.

## 1. Genel Bakış ve Amaç

Pandiones Atelier Dijital Hediye Kartı, sevdiklerine lüks ipek, dantel ve ev giyim koleksiyonundan kendi zarafet tercihlerini keşfetme özgürlüğü sunmak isteyen müşteriler için tasarlanmış uçtan uca fonksiyonel bir hediyeleşme sistemidir. [AGENTS.md](file:///c:/Users/ahmet/Documents/GitHub/pandiones/AGENTS.md) gereğince sahte/mock nesneler tamamen elenmiş, gerçek veritabanı modeli, benzersiz kriptografik kod üretimi, e-posta sertifikası iletimi ve sepet/ödeme aşamasında bakiye düşüm motoru devreye alınmıştır.

---

## 2. Arayüz ve Tasarım (`redesign-existing-projects` İlkeleri)

Sayfa `/hediye-karti` iki ana sekmeden oluşan editoryal bir çalışma alanına sahiptir:

### Sekme 1: Hediye Kartı Oluştur (Lüks Özel Edisyon)
- **Canlı 3D Taktil Kart Önizlemesi:**
  - 85.6mm x 53.98mm standart kredi kartı oranına (`aspect-ratio: 1.586 / 1`) sahip lüks sertifika yüzeyi.
  - 3 özel edisyon teması:
    - **Pandiones Noir:** Obsidian mat siyahı, altın varak tipografi ve mühür (`#161514`, `#D4AF37`).
    - **Seta Bianco:** Saf fildişi ipek, şampanya tonlarında bronz çerçeve (`#FAF7F2`, `#9A784E`).
    - **Rosa Seta:** Pudra ve antik gül kurusu romantik edisyonu (`#F6ECE8`, `#A85D56`).
  - Ön/arka yüz çevirme simülasyonu (`perspective: 1200px`, `rotateY(180deg)`).
  - Alıcı adı, gönderen adı, nominal değer ve kişisel hediye notu yazıldıkça kart yüzeyinde anlık reaktif güncelleme.
- **Tutar Belirleme:**
  - 4 prestijli sabit buton: 1.000 ₺, 2.500 ₺, 5.000 ₺, 10.000 ₺.
  - Özel tutar girişi: 500 ₺ ile 50.000 ₺ arasında esnek seçim.
- **Doğrulama & Sıfır Alert:**
  - `window.alert()` kullanımı yasaklanmıştır; tüm kontroller inline hata mesajları ve kalıcı etiketlerle yönetilir.
  - Minimum 500 ₺ tutar ve geçerli e-posta formatı denetimleri.
- **Zamanlama:**
  - "Sipariş tamamlandığında anında ilet" veya "Özel bir tarihte teslim et" seçenekleri.

### Sekme 2: Bakiye & Kart Doğrulama
- Kullanıcılar ellerindeki `PND-GC-XXXX-XXXX` kodunu girerek `/api/gift-cards/balance` uç noktası üzerinden anlık sorgu yapabilir.
- Kart geçerliyse: Mevcut kullanılabilir bakiye, başlangıç değeri, alıcı adı, geçerlilik tarihi ve doğrudan `/koleksiyon` sayfasına yönlendiren hızlı harcama butonu görüntülenir.
- Kart geçersizse veya tükenmişse açıklayıcı hata kutusu sunulur.

---

## 3. Veritabanı ve Arka Uç Sözleşmesi

### Şema Modelleri (`prisma/schema.prisma`)
- `GiftCard`: `code` (benzersiz, format: `PND-GC-XXXX-XXXX`), `initialBalance`, `currentBalance`, `currency`, `theme`, `recipientName`, `recipientEmail`, `senderName`, `giftNote`, `deliveryDate`, `expiresAt` (1 yıl / 12 ay), `isActive`, `orderId`.
- `GiftCardUsage`: `id`, `giftCardId`, `orderId`, `amount`, `usedAt`.
- `Order`: `giftCardCode`, `giftCardAmount`, `giftCardsPurchased`, `giftCardUsages`.

### Uç Noktalar ve İş Mantığı
1. `POST /api/gift-cards/balance`:
   - Kod sorgular; geçerli, aktif ve süresi dolmamış kartların güncel bakiyesini döner.
2. `POST /api/coupons/validate`:
   - Kupon kodunu hem `Coupon` hem `GiftCard` tablolarında kontrol eder.
   - Hediye kartı ise `isGiftCard: true`, uygulanacak indirim tutarını (`discountAmount = Math.min(card.currentBalance, subtotal)`) ve kartta kalacak bakiyeyi (`remainingGiftCardBalance`) hesaplar.
3. `POST /api/checkout`:
   - Hediye kartı satın alımında `GIFT_CARD_PRODUCT_ID` ('pandiones-gift-card') ürününü sağlar, sepetteki tutara göre varyantı dinamik eşleştirir.
   - Ödeme aşamasında hediye kartı sepet tutarının %100'ünü karşılıyorsa (`finalTotal === 0`):
     - İyzico kredi kartı açılmaz; sipariş veritabanında atomik `$transaction` içinde doğrudan `ODENDI` durumuna getirilir.
     - Kart bakiyesi anında eksiltilir ve `GiftCardUsage` kaydı oluşturulur.
     - Satın alınan hediye kartları aktif edilerek alıcıya lüks e-posta sertifikası gönderilir.
     - Sipariş onay e-postası gönderilir ve kullanıcı `/siparis-onay/{orderNumber}` sayfasına yönlendirilir.
   - Kısmi hediye kartı kullanımında kalan tutar banka/iyzico ile tamamlanır; callback anında bakiye düşülür.
