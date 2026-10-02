# Sayfa sözleşmeleri

Bu belge Next.js rotalarını ve her sayfanın tamamlanma ölçütünü tanımlar. Rota adları mevcut `src/app` yapısından alınmıştır. Ortak kurallar: header/footer bağlantıları çalışır; veri isteklerinde yükleme, boş, hata ve tekrar deneme ayrıdır; mobil ve klavye kullanımı eşdeğerdir. Durum ayrıntıları [STATES.md](STATES.md) içindedir.

Ayrıntılı sayfa şartları: [mağaza](pages/STOREFRONT.md), [sepet ve ödeme](pages/CHECKOUT.md), [hesap](pages/ACCOUNT.md), [yönetim](pages/ADMIN.md).

| Rota | Kaynak | Görünür içerik ve çalışan eylemler | Özel durum |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` (sunucu, `loadCollection`), `src/app/_home/` | Gerçek kampanya bağlantıları, kategori geçişleri, ürün kartları, filtre, hızlı görünüm, favori ve sepete giden yol | Ürün yoksa kampanya kalır, ürün alanı açık boş durum gösterir; istek hatası boş listeye dönüştürülmez |
| `/yeni-gelenler` | `src/app/yeni-gelenler/page.tsx`, `components/collection/CollectionClient.tsx`, `CategoryRail.tsx` | Tüm ürünler (en yeni önce); kategori sekmeleri, filtre, sıralama, görünüm sayısı, ürün kartı, favori ve hızlı ekleme | Sıfır sonuçta filtreyi temizleme eylemi; başarısız istekte tekrar dene |
| `/[kategori]` | `src/app/[kategori]/page.tsx`, `lib/products/load-collection.ts` `findCategoryPlacement` | Ana kategori (ör. `/sutyen`): başlık, alt kategori sekmeleri, o kategorideki gerçek ürünler | Ana kategori olmayan slug 404; statik sayfa adlarıyla çakışan slug yönetimde reddedilir (`lib/routes.ts` `RESERVED_ROOT_SLUGS`) |
| `/[kategori]/[altKategori]` | `src/app/[kategori]/[altKategori]/page.tsx` | Alt kategori (ör. `/sutyen/bralet`): başlık, kardeş sekmeler (geçerli işaretli), "Hepsine bakın" üst kategoriye | Alt kategori yalnız kendi üstünün altında açılır; başka üst altında 404 |
| `/urun/[slug]` | `src/app/urun/[slug]/page.tsx`, `ProductDetailClient.tsx` | Gerçek ürün, varyant/beden/stok, galeri, ayrıntı, stil önerileri ve sepete ekleme; tek kanonik ürün adresi | Bilinmeyen ürün 404; stok yoksa satın alma kapalı ve uygun alarm seçeneği |
| `/favorilerim` | `WishlistContext`, `/api/wishlist` | Favoriyi görüntüle, kaldır, ürüne git ve uygun varyantla sepete ekle | Misafir yerel kayıt ile hesap kaydı arasındaki geçiş açık ve veri kaybı olmadan tasarlanır; boş liste mesajı |
| `/giris-yap` | Auth API'leri | Giriş ve kayıt; alan doğrulaması, parola görünürlüğü varsa çalışması, yönlendirme | Hatalı kimlik bilgisi alan dışı hata; gönderim sürerken tekrar gönderim engeli |
| `/canta` (`/sepet` yönlenir) | `CartContext`, `/api/cart/validate`, `/api/coupons/validate` | Satırlar, adet, favoriye taşıma, kupon, sunucu fiyatı/stoku ile özet ve ödemeye geçiş | Boş çanta durumu; doğrulama hatasında uyarı + tekrar dene; tükenen/stoku aşan satırda ödeme kilitli ve nedeni yazılı |
| `/hesabim` | Auth, sipariş/iade API'leri | Profil, son sipariş şeridi, iade durumları, hediye kartları, favoriler, adresler, bülten tercihi | Yetkisiz kullanıcı girişe gider; boş geçmişte anlamlı yönlendirme; yalnızca kendi kayıtları |
| `/siparislerim` | Auth (`/api/auth/me` siparişleri), `/api/returns` | Sipariş listesi ve ayrıntısı, kargo takibi, sipariş özeti, iade talebi | Yetkisiz kullanıcı girişe gider; siparişsiz hesapta boş durum; bilinmeyen `?siparis=` için bulunamadı paneli |
| `/odeme` | Sepet, kupon ve checkout API | Teslimat bilgisi, kupon doğrulama, sunucu hesaplı toplam, ödeme başlatma | Boş sepet yönlendirmesi; sağlayıcı yoksa açık hata; iptal/başarısızlıkta sepet korunur |
| `/siparis-onay/[id]` | Prisma sipariş sorgusu | Doğrulanmış ödeme sonucu, sipariş özeti, durum ve varsa takip bilgisi | Bekleyen/başarısız sipariş başarı gibi görünmez; yetkisiz erişim engellenir |
| `/beden-rehberi` | `size-chart.ts` (tek kaynak) | Türkiye beden tablosu (S/M/L/XL, TR 36–42), göğüs/bel/kalça ile beden önerisi, sütyen bant+kup hesaplayıcı ve tablosu, ölçü alma adımları | Tablo dışı ölçüde tahmin yok, "bize yaz" yolu; ürün sayfası beden modalı aynı tabloyu gösterir |
| `/stil-rehberi`, `/bakim-rehberi` | Statik sunucu sayfaları | Kesim karşılaştırması (gerçek alt kategori bağlantıları); bakım sembolleri (SVG), kumaşa göre bakım, saklama | Uydurma sertifika/rozet yok; bağlantılar yalnız var olan kategorilere |
| `/siparis-takip` | `/api/orders/track` | Numara + e-posta ile durum, yolculuk çizgisi, kargo kodu ve taşıyıcı bağlantısı, parçalar | 404 için açıklayıcı uyarı; ağ hatasında tekrar dene; tam adres gösterilmez |
| `/yardim` | `yardim/faq.ts` | Aranabilir SSS, konu filtresi (sayılı), akordeon, kısayollar | Sonuç yoksa temizle + bize yaz; yanıtlar koddaki davranışla aynı |
| `/iletisim` | `/api/contact` | Kanallar (e-posta, ayarlıysa WhatsApp), form: alan hataları, bekleme, başarı ekranı | Bildirim gitmezse hata + doğrudan e-posta yolu; başarı yalnız gerçek gönderimde |
| `/hediye-karti` | `CartContext`, `/api/gift-cards/balance` | Canlı kart önizlemesi, tasarım/tutar/alıcı/not, çantaya ekleme, bakiye sorgusu | Kart ödeme onaylanınca e-postayla gider (planlı teslim yok); geçersiz kodda açıklayıcı hata |
| `/yonetim` | Admin API'leri | Gösterge paneli (ciro grafiği, bekleyen işler, düşük stokta hızlı stok, en çok satanlar), etkinlik kaydı, Ayarlar, komut paleti (Ctrl/⌘ K), sevkiyat ve sipariş merkezi, ürün, kupon, bülten, müşteri rehberi, destek, hediye kartları, stok talepleri, iadeler | ADMIN dışında veri erişimi yok; her sekme kendi verisini yükler, yükleme/hata/boş durumu ayrı; her mutasyonda bekleme, hata, başarı ve yenilenmiş gerçek veri |
| `/bakim` | `StoreSettings` | Yalnız bakım modu açıkken (middleware 503 ile yeniden yazar); mesaj ve iletişim e-postası ayardan, `noindex` | Bakım kapalıyken ana sayfaya yönlenir |
| `not-found`, `error`, `loading` | App Router sınırları | Açıklayıcı 404, kurtarılabilir hata, veri geometrisine uygun yükleme | Ana sayfaya dönüş ve tekrar deneme çalışır |

## Ortak yüzeyler

Header: menü, kategori linkleri, arama, favoriler, hesap ve sepet. Footer: koleksiyon, hikâye bağlantısı, kılavuzlar, bülten formu, yasal metinler ve yukarı çık. Açılan panelde odak yönetimi, Escape, kapatma düğmesi ve geri dönüş odağı gerekir. Ürün kartındaki link, favori ve hızlı görünüm birbirini yanlışlıkla tetiklemez.

## Sayfa bazında teslim kontrolü

Her rota için 320/375/768/1440 px ekran görüntüsü ve klavye akışı kontrol edilir. Gerçek veriyle bir dolu, bir boş ve bir hata örneği görülür. Sayfada bulunan her linkin hedefi ve her düğmenin sonucu kaydedilir. Sayfa başlığı ve meta açıklama ürüne/kategoriye özgüdür; yanlış veya kaldırılmış ürün 404 verir. Satışa yönelik tüm metinler güncel ticari bilgiyle doğrulanır.

| `/sifremi-unuttum`, `/sifre-sifirla`, `/e-posta-dogrula` | `/api/auth/password/*`, `/api/auth/verify-email` | Şifre sıfırlama isteği, yeni şifre, hesap etkinleştirme; iskelet yükleme, hata/geçersiz bağlantı durumu | `noindex`; belirteç adres çubuğundan silinir |
| `/yonetim/giris` | `/api/auth/login`, `/api/auth/2fa/*` | Yönetici girişi + zorunlu 2FA (ilk girişte kurulum) | `/yonetim` oturumsuz 404 |
