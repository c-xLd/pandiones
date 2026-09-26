# API envanteri ve sözleşme hedefi

Bu tablo `src/app/api/**/route.ts` dosyalarının mevcut yöntemlerini gösterir. “Hedef” sütunu uygulanmış olduğu anlamına gelmez. Örnek isteklerdeki alanlar değişirse UI, test ve bu belge birlikte güncellenir.

| Rota | Yöntem | Bugünkü amaç | Yetki ve hedef doğrulama |
| --- | --- | --- | --- |
| `/api/products` | GET | Kategori/arama ile ürün listeleme | Herkese açık; sayfalama, görünür ürün ve sınırlı alanlar |
| `/api/products/[id]` | GET | ID veya slug ile ürün | Herkese açık; bulunamazsa 404 |
| `/api/products/[id]/reviews` | GET, POST | Yorum listeleme/ekleme | POST için gerçek satın alma doğrulaması ve kötüye kullanım sınırı |
| `/api/auth/register` | POST | Hesap açma ve oturum | Güçlü doğrulama, oran sınırı, benzersiz e-posta |
| `/api/auth/login` | POST | Oturum açma | Oran sınırı, güvenli çerez ve süre sonu |
| `/api/auth/me` | GET | Aktif kullanıcı | Asgari kişisel veri |
| `/api/auth/logout` | POST | Çerez silme | CSRF ve oturum geçersizleştirme stratejisi |
| `/api/wishlist` | GET, POST | Favori listeleme/değiştirme | Sahiplik; misafir cevabı gerçek kalıcılık olarak sunulmaz |
| `/api/coupons/validate` | POST | Kupon önizleme | İstemci `subtotal` güvenilmez; gerçek sepetten hesap |
| `/api/checkout` | POST | Sipariş ve ödeme oturumu | Sunucu fiyat/stok/kupon doğrulaması; idempotency |
| `/api/payment/callback` | POST | Sağlayıcı sonucunu işleme | Token/işlem eşleştirme; tekrar callback güvenliği |
| `/api/orders/[id]` | GET | Sipariş özeti | Sahiplik veya güvenli misafir erişimi zorunlu |
| `/api/returns` | POST | İade talebi | Sipariş sahipliği, tekrar talep ve uygunluk denetimi |
| `/api/newsletter` | POST | Bülten kaydı | E-posta doğrulama, izin kaydı, abonelikten çıkış |
| `/api/stock-alert` | POST | Stok alarmı kaydı | Ürün/beden doğrulama, tekrar kayıt, gerçek gönderim |
| `/api/feed/google-merchant` | GET | XML ürün akışı | Gerçek stok/fiyat ve kanonik URL |
| `/api/admin/stats` | GET | Yönetim metrikleri | ADMIN |
| `/api/admin/orders` | GET, PATCH | Sipariş ve takip yönetimi | ADMIN; geçerli durum geçişi |
| `/api/admin/products` | GET, POST, PATCH | Ürün/stok/fiyat yönetimi | ADMIN; alan ve sınır doğrulama |
| `/api/admin/coupons` | GET, POST, DELETE | Kupon yönetimi | ADMIN; indirim/limit doğrulama |
| `/api/admin/newsletter` | GET, DELETE | Abone listeleme/silme | ADMIN; kişisel veri erişim kaydı |
| `/api/admin/reviews` | GET, DELETE | Yorum moderasyonu | ADMIN; denetlenebilir karar |
| `/api/admin/returns` | GET, PATCH | İade yönetimi | ADMIN kontrolü eklenmeli |
| `/api/admin/upload` | POST | Eski yol, ADMIN için 410 | Yeni yükleme yalnız ürüne bağlı `/media` rotasından |
| `/api/admin/products/[id]` | GET, PATCH | Yönetici ürün detayını okuma ve taslağı düzenleme | ADMIN; alan/beden doğrulama |
| `/api/admin/products/[id]/media` | POST, PATCH, DELETE | Dosya yükleme, kapak/sıra ve silme | ADMIN; ürün sahipliği, imza/MIME/byte sınırı, poster |
| `/api/admin/products/[id]/publish` | POST | Doğrulanmış taslağı yayınlama | ADMIN; tek gerçek kapak, geçerli fiyat/kategori/beden |
| `/api/admin/product-families` | GET, POST, PATCH | Renk ailesi listeleme/oluşturma/bağlama | ADMIN; aynı kategori, normalize edilmiş tekil renk |

Genel `/api/products` ve `/api/products/[id]` yalnız `PUBLISHED` ürünleri döner; medya `position` sırasıyla, kardeş renkler yalnız yayınlanmış aynı aile üyeleri olarak gelir. Taslak detay 404 döner ve Merchant feed'e girmez. Yeni ürün POST yanıtı `DRAFT` ve boş kanonik görselle başlar. Medya POST multipart `file`, `role`, `alt`, `isCover` ve video için `posterMediaId` alır; PATCH `{action:"cover"|"order",mediaId,position?}`, DELETE `{mediaId}` alır. Mutasyonlar güncel ürünü içerir. İzinli görseller JPEG/PNG/WebP ≤10 MB, videolar MP4/WebM ≤50 MB'dır.

## Ortak yanıt kuralları

- Başarı yanıtı gerçek kalıcı sonucu ve gerekiyorsa güncel kaydı taşır. Başarısız işlem `success: true` döndürmez.
- `400` alan/biçim hatası, `401` oturum gerekli, `403` yetki yok, `404` gizliliği bozmayan bulunamadı, `409` çakışma/stok değişimi, `429` oran sınırı, `5xx` sunucu/sağlayıcı arızası için kullanılır.
- Hata gövdesinde sabit kod ve kullanıcıya uygun kısa mesaj bulunur; gizli token, ham ödeme cevabı, yığın izi ve başka müşterinin verisi bulunmaz.
- Mutasyon yanıtı önbelleğe alınmaz. GET önbelleği yalnız herkese açık ve güvenle eskiyebilen veride kullanılır.
- Tarih UTC olarak saklanır, kullanıcıya uygun yerel biçimde gösterilir. Para tutarı kuruş tamsayısı veya güvenli decimal ile işlenir; Float yuvarlama kararları açıkça test edilir.

## Sözleşme testleri

Her rota için geçerli istek, eksik alan, yanlış tip, oturumsuz kullanıcı, yanlış rol, başkasının kaydı, bulunmayan kayıt ve DB/sağlayıcı hatası denenir. Mutasyonlarda tekrar gönderim ve paralel istek ayrıca test edilir. [TESTING.md](TESTING.md) yürütme matrisini tanımlar.
