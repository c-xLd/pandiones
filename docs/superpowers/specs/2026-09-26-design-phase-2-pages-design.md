# Tasarım Faz 2 — sayfa rafinesi ve durumlar

Tarih: 2026-09-26 · Dal: `design/phase-2-pages` · Önceki: Faz 1 (checkpoint `b9c6c70`)

## Amaç

Faz 1'de kurulan tasarım sistemini (tokenlar, `.btn`, `.field`) müşteri ve yönetim sayfalarına taşımak; sayfaları tutarlı, erişilebilir ve durumları eksiksiz hale getirmek. Görsel yön korunur ("rafine et"). İş mantığı değişmez; sahte davranış bulunursa kullanıcı kararıyla kaldırılır. Dilim 1'de kullanıcı kararıyla iki davranış değişir: iyzico formunun gösterim modu (redirect → gömülü responsive) ve test modu bayrağı.

Başarı ölçütü (sayfa başına):
- Sayfanın kendi inline `style={{}}` sayısı yalnız çalışma zamanında hesaplanan değerlere (ör. dinamik genişlik, arka plan görseli) iner.
- Formlar `.field` / `.form-alert` kullanır; her kontrolün kalıcı etiketi, uygun `autoComplete`'i, alan düzeyinde hata bağlantısı (`aria-invalid`, `aria-describedby`) vardır; gönderim `aria-busy` ile beklemeye geçer ve çift gönderim açmaz.
- STATES.md'deki loading / empty / error+tekrar dene / submitting / success durumları görünür ve metinle anlaşılır.
- Tıklanabilir her şey `button`/`a`; klavyeyle kullanılabilir; açılan katmanlarda `role="dialog"`, odak yönetimi ve Escape.
- `npx tsc --noEmit`, `npm test`, izole build (`PANDIONES_LAN_PREVIEW=1 npx next build`) geçer; tarayıcıda 375 ve 1440 px'te mutlu yol, boş/hata yolu ve yetki sınırı kontrol edilir.

## Sıra (dönüşüm önce)

1. `/odeme` + `/siparis-onay/[id]` (+ `OrderPrintButton`)
2. `/giris-yap` + `/hesabim` (3.5k satır → `src/app/hesabim/_components/` sekme bileşenleri). Giriş sayfası `?redirect=` destekler: yalnız `/` ile başlayan, `//` veya `/\` ile başlamayan site içi yol kabul edilir (açık yönlendirme yok); aksi halde bugünkü varsayılan hedef.
   Dilim 2 alt dilimleri (kullanıcı kararı): **2a** giriş + `?redirect`; **2b** hesabım iskeleti (başlık, sekmeler, ortak stil `pages/account.css`) + Profil + Tercihler; **2c** Siparişler + sipariş özeti penceresi + iade penceresi; **2d** Adresler + adres penceresi; **2e** Cüzdan, Favoriler, İadeler.
   Dilim 2'de kaldırılan/düzeltilen sahte içerik (kullanıcı kararı "hepsini düzelt"): giriş sayfasındaki "HIZLI TEST HESAPLARI" (görünür test şifreleri) kaldırılır; "Doğrulanmış Hesap" rozeti kaldırılır; makbuz penceresi "Sipariş özeti" olur — uydurma belge no, şirket/Mersis/vergi dairesi satırı ve mühür kaldırılır, yalnız gerçek sipariş verisi yazdırılır; adres penceresindeki sahte Google araması kaldırılır; bilinmeyen kargo firmasında takip numarası düz metin olur (Google araması linki yok); "Ücretsiz (Özel İkram)" ve tarih kontrolsüz "iade süresi" gibi doğrulanmamış vaatler nötr metne iner. Ödeme sayfası (Dilim 1, Görev 6–7) kullanıcı isteğiyle ertelendi.
3. `/favorilerim`, `/siparis-takip`, `/iletisim`
4. `/yonetim` + `CategoryManager`

`/hediye-karti` paralel bir çalışmada değişiyor; o çalışma bitince ayrıca ele alınır. Her dilim ayrı plan maddesi ve ayrı commit'tir.

## Ortak yapı

- Sayfa CSS'i `src/styles/pages/<sayfa>.css`; `globals.css` import listesine eklenir. Yalnız token kullanır (`tests/design-tokens.test.ts`).
- Paylaşılan kalıplar `src/styles/components/` altında primitif olur, en az iki sayfada tekrar ettiği anda:
  - `.status-panel` — ortalanmış durum ekranı: ikon, eyebrow, başlık, açıklama, eylem satırı (yetkisiz / bekliyor / başarısız / boş).
  - `.notice` — bilgi/uyarı/başarı/hata kutusu (`.form-alert` ile aynı renk dili; form dışı bilgi için).
  - `.choice-card` — seçilebilir kart (radyo grubu): seçili, odak, devre dışı durumları.
  - `.chip` — küçük etiket/rozet (ödeme kartı logoları, durum etiketleri).
- `print-hide` yardımcı sınıfı ve yazdırma kuralları `base/base.css`'e taşınır.
- Değişmeyen: API çağrıları, durum makinesi, doğrulama kuralları (sunucu), yetki kontrolleri.

## Dilim 1 ayrıntısı

### `/odeme`
- **Sahte adres arama kaldırılır** (kullanıcı kararı): `GOOGLE_PLACES_CATALOG`, arama kutusu, açılır liste ve "powered by Google" metni silinir. Adres; kayıtlı adres seçimi veya alanlara yazılarak girilir.
- **Test modu görünür olur** (kullanıcı kararı): checkout API yanıtına `isTestMode` eklenir — simülatör (`isMock`) **veya** iyzico base URL'i sandbox ise `true`. Ödeme adımında kalıcı `.notice--warning`: "Test modu — gerçek ödeme alınmaz." (Varsayılan base URL sandbox olduğundan, canlıda `IYZICO_BASE_URL` unutulursa da bant görünür.)
- **iyzico Ödeme Formu sayfaya gömülür — Responsive modu** (kullanıcı kararı, docs.iyzico.com → Ödeme Formu → CF Entegrasyonu): form doğrulanıp gönderilince sol kolon 2. adıma döner. Adımda teslimat özeti + "Bilgileri düzenle", test modu bandı ve `<div id="iyzipay-checkout-form" class="responsive">` bulunur; `checkoutFormContent` script'i ayrı bir kapta çalıştırılır (script'ler yeniden oluşturularak), yeniden ödeme için önceki `window.iyziInit` temizlenir. Sipariş özeti sağda kalır. Özel 3DS modalı kaldırılır. `checkoutFormContent` yoksa `paymentPageUrl`'e yönlendirme yedek yol olarak kalır. Adım başlığına odak taşınır (`tabIndex=-1`).
- **Simülatör dürüstleşir:** `src/lib/payment/iyzico.ts` içindeki geliştirme simülatörü sahte kart/SMS bilgisini göstermez; "Geliştirme simülasyonu — kart bilgisi istenmez, tahsilat yapılmaz." der ve sitenin `.btn`/`.notice` sınıflarını kullanır (inline stil yok). Form hedefi ve gönderdiği alanlar değişmez.
- Adım göstergesi sınıflara taşınır, etkin adım `aria-current="step"`.
- Kayıtlı adresler `fieldset` + `legend` içinde `.choice-card` radyo grubu; klavye ile seçilebilir.
- İletişim ve adres alanları `.field`; `autoComplete` (`name`, `email`, `tel`, `address-level1`, `address-level2`, `street-address`); gönderimde istemci doğrulaması boş/biçim hatasını ilgili alana yazar, ilk hatalı alana odaklanır. Sunucu doğrulaması değişmez.
- Form hatası `.form-alert--error` + `role="alert"`.
- Kupon/hediye kartı: etiketli input, Enter ile uygula, `.btn--secondary` düğme (`aria-busy`), hata `aria-describedby` ile bağlı ve `aria-live`; uygulanan kupon `.notice--success`, "Kaldır" gerçek düğme.
- Ödeme bilgi kutusu `.notice`, kart logoları `.chip`; özet satırı renkleri tokenlara (`--success`).
- Suspense fallback: `role="status"`, ödeme düzeninin geometrisini koruyan iskelet.

### `/siparis-onay/[id]`
- Yetkisiz / bekliyor / başarısız ekranları `.status-panel`. Giriş bağlantısı `?redirect=/siparis-onay/<id>` taşır; giriş sayfası bunu Dilim 2'de destekler (şimdilik parametre yok sayılır, davranış bozulmaz).
- Başarı ekranının makbuz, teslimat, kalem listesi ve toplam bölümleri sınıflara taşınır; ödeme onay rozeti `.notice--success`.
- Kargo takip numarası düz metin olarak kalır (gerçek taşıyıcı linki yok; tıklanabilir görünmez).
- `OrderPrintButton` → `btn btn--secondary btn--sm`.

## Riskler

- Paralel ajan aynı çalışma klasöründe; dilim başına commit ve dosya başlamadan `git status` kontrolü.
- iyzico CF script'i sağlayıcıdan gelir; gömülü modun gerçek sandbox'ta denenmesi iyzico Sandbox anahtarı gerektirir (kullanıcı `.env`'e girer). Anahtar yoksa yalnız simülatör yolu doğrulanır ve bu raporda açıkça belirtilir.
- Gömülü mod, gerçek anahtarla çalışan akışı yönlendirmeden sayfa içi forma çevirir: bu bilinçli davranış değişikliğidir (kullanıcı onaylı).
- Görsel değişiklikler bilinçlidir; hesaplanan stil parmak izi yalnız taşıma sonrası "aynı kalmalı" denetimi için kullanılır.
