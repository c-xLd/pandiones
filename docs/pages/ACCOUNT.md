# Hesap, favoriler, yorum ve iade

Kapsam: `/giris-yap`, `/hesabim`, `/favorilerim`, yorum formu ve iade talebi.

## Giriş ve kayıt

Giriş ve kayıt tek ekranda ayrı durumlar olarak görünür. Alanlar kalıcı etiketlidir; parola kuralları gönderimden önce görülebilir. Hatalı bilgi genel hata verir, kullanıcıyı belirsiz döngüye sokmaz. Başarılı giriş hedeflenen sayfaya güvenli biçimde döner; açık yönlendirme URL'si kabul edilmez. Giriş yapmış kullanıcı aynı formda kalmaz. Bekleme sırasında tekrar gönderim kilitlenir; ağ hatasında alanlar korunur. Test/seed hesapları arayüzde gösterilmez. `?redirect=` yalnız site içi yol kabul eder (`src/lib/auth/safe-redirect.ts`); header'daki hesap bağlantısı bulunulan sayfayı bu parametreyle taşır.

## Hesabım

Oturum doğrulanana kadar özel veri gösterilmez. Sayfa Apple tasarım ilkelerine ve editoryal Pandiones kimliğine uygun, klavye erişilebilirliği ve doğrudan dokunmatik basma fiziği (`.apple-press`) içeren sekmeli bir mimariyle sunulur (`#siparisler`, `#favoriler`, `#iadeler`, `#profil`, `#adresler`, `#tercihler`):
- **Siparişlerim:** Siparişler durumu sunucuda sahiplikle filtrelenir; numara, tarih, durum rozeti, kupon/indirim dökümü, teslimat adresi ve ürün bağlantıları bulunur. 4 adımlı görsel sipariş ilerleme çubuğu ve kargo firmasına özel (Yurtiçi, MNG, Aras, Kolay Gelsin) canlı kargo takip bağlantısı sağlanır. Sipariş özeti için yazıcı dostu çıktı alınabilir.
- **Favorilerim:** `user.wishlists` ilişkisi üzerinden kayıtlı ürünler, fiyat, stok durumu ve mevcut beden seçenekleriyle listelenir. Tek tıkla ürün sayfasına gidilebilir veya favorilerden çıkarılabilir.
- **İade Taleplerim:** Kullanıcının tüm iade talepleri, incelenme durumları (`BEKLIYOR`, `ONAYLANDI`, `REDDEDILDI`) ve mağaza/atölye notlarıyla listelenir. 6502 sayılı kanun iç giyim hijyen bandı kuralı net biçimde hatırlatılır. İade talebi Escape tuşu veya arka plan tıklamasıyla kapanabilen erişilebilir bir modal üzerinden açılır.
- **Profil & Güvenlik:** İsim ve telefon `PATCH /api/auth/profile` üzerinden güncellenir; e-posta adresi doğrulanmış hesap rozetiyle salt okunurdur. Şifre değişimi `PATCH /api/auth/password` üzerinden mevcut şifre doğrulaması (bcrypt), minimum uzunluk ve eşleşme kontrolleriyle gerçekleştirilir.
- **Kayıtlı Adresler:** Kullanıcılar yeni teslimat adresi ekleyebilir (`POST /api/auth/addresses`), başlık çipleri (`Ev`, `İş`, `Yazlık`, `Stüdyo`, `Diğer`) ile kategorize edebilir, Google Haritalar akıllı arama önerisiyle (ör. Keçeyolu, Nişantaşı) cadde/ilçe/il bilgilerini tek tıkla otomatik doldurabilir. Her kayıtlı adres kartında doğrudan turn-by-turn **"Navigasyon Başlat ↗"** (`google.com/maps/dir/?api=1&destination=...`) ve **"Haritada Gör ↗"** (`google.com/maps/search/?api=1&query=...`) bağlantıları, varsayılan adres rozeti, panoya kopyalama ve silme/düzenleme aksiyonları bulunur.
- **İletişim Tercihleri:** Kullanıcının e-bülten üyeliği `GET & POST /api/newsletter/account` üzerinden doğrudan yönetilebilir; KVKK güvencesi açıkça belirtilir.

## Favoriler

Favorilerim sayfası (`/favorilerim`) Apple tasarım ilkelerine uygun editoryal bir galeri olarak sunulur:
- Kategori bazlı filtreleme çipleri (`Tümü`, `İç Giyim`, `Ev Giyim`) ve anlık ürün sayısı rozetleri.
- Fiyat ve özellik sıralaması (`Fiyat: Düşükten Yükseğe`, `Fiyat: Yüksekten Düşüğe`).
- Doğrudan ürün kartı üzerinden anlık beden seçimi (`S`, `M`, `L`, vb.) ve 1-tıkla **"Sepete Ekle"** aksiyonu.
- **"Tümünü Sepete Ekle"** toplu sepete aktarma desteği.
- Ürün detay çekmecesi ve taktil geri bildirim toast bildirimleri.

## Yorumlar

Yorum sayısı ve ortalama yalnız gerçek yorumlardan hesaplanır. Doğrulanmış satın alma etiketi ancak satın alma kanıtı varsa kullanılır. Yorum gönderimi metin uzunluğu, geçerli puan, spam ve kötüye kullanım kurallarını sunucuda denetler. Başarı mesajı yalnız kayıt oluşunca gösterilir; moderasyon uygulanıyorsa görünme zamanı açıkça belirtilir. Boş yorum listesi yapay puanla doldurulmaz.

## Kabul senaryoları

- Misafir, CUSTOMER ve ADMIN görünümü ayrı kontrol edilir.
- Başkasının sipariş/iade/favori kaydına doğrudan URL veya API ile erişim reddedilir.
- Oturum süresi bittiğinde özel içerik temizlenir ve giriş yolu sunulur.
- Yorum sayısı sıfır, tek yorum ve çok yorum için puan hesabı doğrulanır.
- Her formda yükleme, alan hatası, sunucu hatası ve başarı durumu vardır.
