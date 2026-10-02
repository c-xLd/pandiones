# Dijital hediye kartı

Kapsam: `/hediye-karti`, `/odeme` (kod kullanımı), `/api/gift-cards/balance`, `/api/coupons/validate`, `/api/checkout`, `/api/payment/callback` ve `src/lib/gift-cards/`.

## Sayfa (`src/app/hediye-karti/`)

| Dosya | Görev |
| --- | --- |
| `page.tsx` | Sunucu sayfası ve metadata. Giriş sahnesi (üç tasarımın kademeli kart yığını, ürün e-postası değil yalnız görsel), "Nasıl ulaşır" adımları, kart hazırlama ve bakiye bölümleri |
| `GiftCardFace.tsx` | Kartın ön yüzü: logo yazısı, tutar, alıcı/gönderen, monogram, folyo parıltısı. Tema değişiminde parıltı yeniden oynar |
| `GiftCardPreview.tsx` | Canlı önizleme; fareyle eğilir, "Notu göster" ile arka yüze döner (notu ve 12 ay bilgisini gösterir) |
| `GiftCardBuilder.tsx` | Form: tasarım (Fildişi / Noir / Pudra), tutar (1.000 / 2.500 / 5.000 / 10.000 ₺ veya başka tutar), alıcı adı ve e-postası, gönderen, not (≤200, öneri düğmeleri). Hata alanına bağlı ve ilk hatalı alana odaklanır; eklenince çanta açılır ve satır içi onay görünür |
| `BalanceCheck.tsx` | `PND-GC-XXXX-XXXX` biçim denetimi, bekleme, 404 (tekrar dene yok) / ağ-sunucu hatası (tekrar dene), sonuç: kalan, başlangıç, kullanılan, son kullanma ve bakiye çubuğu |

Stil `src/styles/pages/gift-card.css` (`giftcard` bloğu; hesaptaki cüzdan kartı `account.css` `.gift-card` ile karışmasın diye ayrı ad). Tokenlar: `--gift-rose-surface/-ink/-accent`, `--radius-xl`, `--radius-xl-inner`, `--text-card`. Kaydırma girişi `components/ui/Reveal.tsx`. Azaltılmış harekette kart dağıtımı, süzülme, parıltı ve eğilme kapanır; 767 px altında yığın tek düz karta iner.

**Logo:** `public/assets/brand/pandiones-monogram.png` (şeffaf zeminli PNG) varsa kartlardaki monogram bu dosyadan, tasarımın vurgu rengiyle (CSS mask) çizilir; dosya yoksa serif "P" kullanılır. Kontrol derleme/istek anında sunucuda `existsSync` ile yapılır.

`public/assets/gift-card-couture.jpg` artık kullanılmıyor: görselde yasaklı "MAISON" yazısı ve onaysız ambalaj/kurdele vaadi var.

## Kurallar (`src/lib/gift-cards/purchase.ts`)

İstemci ve `/api/checkout` aynı doğrulayıcıyı kullanır: tutar tam sayı, 500–50.000 ₺, 50 ₺ ve katları; tema `couture | noir | rose`; alıcı adı 2–80, geçerli alıcı e-postası; gönderen ≤80; not ≤200. Hatalı satırda checkout `400 {error: "Hediye kartı: …"}` döner. Ürün adı sunucuda kurulur.

Teslim zamanı seçilemez: kart, ödeme onaylandığında (`/api/payment/callback`, tamamen kartla ödenen siparişte `/api/checkout`) etkinleşir ve alıcıya e-postayla gönderilir. `deliveryDate` alanı her zaman `now` yazılır.

## Veri ve uç noktalar

- `GiftCard`: `code` (`PND-GC-XXXX-XXXX`, belirsiz karakterler hariç), `initialBalance`, `currentBalance`, `theme`, alıcı/gönderen, `giftNote`, `expiresAt` (oluşturmadan itibaren 12 ay), `isActive`, `orderId`. `GiftCardUsage`: her harcama kaydı.
- `POST /api/gift-cards/balance`: aktif ve süresi dolmamış kartın bakiyesi; aksi halde 404.
- `POST /api/coupons/validate`: kod kupon değilse hediye kartı olarak denenir; indirim `min(bakiye, ara toplam)`.
- `POST /api/checkout`: kartla tamamen ödenen siparişte iyzico açılmaz, sipariş atomik işlemde `ODENDI` olur ve bakiye düşer; kısmi kullanımda kalan tutar iyzico ile ödenir, bakiye callback'te düşer.
- Hediye kartı e-postası (`generateGiftCardDeliveryEmail`) alıcı, gönderen ve notu HTML'e kaçışlı yazar.

## Doğrulama

- `tests/gift-card-purchase.test.ts`: tutar sınırları/adımı, tema, alıcı, not.
- `tests/gift-card-flow.test.ts`: checkout'ta kart satırı, pasif kartın ödeme sonrası etkinleşmesi.
- Tarayıcıda: boş gönderimde iki alan hatası ve odak; 1.234 ₺ adım hatası; 1.500 ₺ Noir kart çantaya `deliveryDate: now` ile eklenir; bakiye sorgusu biçim hatası, 404 ve geçerli kod.
