# Ortamlar, yayın ve işletim

## Ortam ayrımı

Yerel geliştirme, sağlayıcı sandbox ve üretim birbirinden ayrı veritabanı, ödeme anahtarı, URL ve yükleme alanı kullanır. Ortam adı kullanıcıya ve operatöre anlaşılır olmalıdır. Üretim başlatılırken zorunlu sırlar yoksa süreç başarısız olur; sessiz simülasyona geçmez.

| Değişken | Amaç | Üretim koşulu |
| --- | --- | --- |
| `DATABASE_URL` | Prisma bağlantısı | Kalıcı, yedeklenen veri kaynağı |
| `AUTH_SECRET` | Oturum imzası | Rastgele güçlü değer, sabit kod yedeği yok |
| `IYZICO_API_KEY` | Ödeme API kimliği | Canlı sağlayıcı hesabı, gizli depolama |
| `IYZICO_SECRET_KEY` | Ödeme imzası | Canlı sağlayıcı hesabı, gizli depolama |
| `IYZICO_BASE_URL` | Sağlayıcı ortamı | Üretimde doğru canlı uç nokta |
| `NEXT_PUBLIC_SITE_URL` | Callback, sitemap ve linkler | Gerçek HTTPS alan adı |
| `RESEND_API_KEY` | İşlemsel e-posta API anahtarı | Canlı e-posta gönderimi için zorunlu gizli anahtar |
| `EMAIL_FROM` | Gönderen e-posta başlığı | Doğrulanmış kurumsal alan adı (örn. Pandiones <siparis@pandiones.com>) |

## Yayın sırası

1. Sürüm ve ortam değişkenleri kontrol edilir; test hesabı, seed veya sandbox anahtarı üretimde bulunmaz.
2. Veritabanı yedeği alınır ve geri yükleme yolu denenir. Şema değişikliği gözden geçirilmiş migration ile uygulanır; `db:push --accept-data-loss` kullanılmaz.
3. Tip kontrolü, build, API ve tarayıcı testleri çalıştırılır. [QA.md](QA.md) P0 kapıları kanıtla kapanır.
4. Yeni sürüm önizlemede gerçekçi ama kişisel olmayan veriyle kontrol edilir. Canlı ödeme için sağlayıcı onaylı küçük işlem ve iade/uzlaştırma prosedürü uygulanır.
5. Yayın sonrası ana rotalar, ödeme callback'i, hata oranı, stok, sipariş ve feed gözlemlenir. Geri alma eşiği önceden belirlenir.

## Gözlemlenebilirlik

Her sipariş ve ödeme için gizli olmayan korelasyon kimliği kullanılır. Ölçümler: API hata oranı/gecikmesi, ödeme başlatma/başarı/başarısızlık sayıları, belirsiz ödeme sayısı, negatif stok, başarısız e-posta, görsel yükleme hatası, istemci hatası ve Core Web Vitals. Kişisel veri veya ödeme tokenı log/analitik olayına yazılmaz. Alarmın sahibine ve yanıt süresine operasyon kararıyla isim verilir.

## Olay senaryoları

| Olay | İlk adım | Kurtarma ölçütü |
| --- | --- | --- |
| Ödeme sonucu belirsiz | Siparişi beklemede tut, sağlayıcıyla uzlaştır | Tek nihai durum, çift stok hareketi yok |
| Veritabanı erişilemiyor | Yeni sipariş alımını güvenli biçimde durdur | Geri yükleme/doğrulama sonrası tekrar aç |
| Görsel depolama kayıp | Ürün görselini güvenli boş durumla göster | Kalıcı depodan geri yükle |
| Stok eksiye indi | Etkilenen ürünü satıştan çek | Sipariş/stok mutabakatı ve düzeltme kaydı |
| Gizli anahtar sızdı | Anahtarı döndür, oturumları geçersizleştir | Yeni sırla test, erişim kayıtlarını incele |

## Veri saklama ve yedek

Üretimde SQLite ve `public/uploads` kullanımının dağıtım ortamında kalıcı olup olmadığı doğrulanmadan yayın yapılmaz. Yedek sıklığı, saklama süresi, şifreleme, erişim, geri yükleme denemesi ve silme talebi süreçleri tanımlanır. Bülten ve stok alarmı için e-posta sağlayıcısı yoksa kullanıcıya gönderim sözü verilmez. Operasyonel süreçler [DATA.md](DATA.md) ve [SECURITY.md](SECURITY.md) ile birlikte ele alınır.
