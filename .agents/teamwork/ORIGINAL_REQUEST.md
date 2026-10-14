# Original User Request

## 2026-10-14T16:44:36Z

Pandiones (Next.js 15 App Router, React 19, Prisma + PostgreSQL, Vercel'de `https://pandiones.vercel.app`) canlı e-ticaret sitesini hızlandırın: görseller hızlı açılsın, CSS/HTML/JS üretimde küçültülmüş ve gereksiz yükten arınmış olsun, önbellek doğru çalışsın, SEO üretim seviyesine gelsin, Google Merchant Center ürün akışı eklensin — ve bunların hepsi yönetim panelinden (`/yonetim`) kontrol edilebilsin. Kullanıcının ifadesiyle: "tüm işleri yap işte aklına ne gelirse".

Working directory: c:\Users\ahmet\Documents\GitHub\pandiones
Integrity mode: development

Zorunlu okuma: depo kökündeki `AGENTS.md` (bağlayıcı kurallar), `README.md`, `DESIGN.md`, `docs/SECURITY.md`, `docs/QA.md`, `docs/pages/ADMIN.md`, `docs/API.md`, `docs/DATA.md`. Çalışma ağacında commit edilmemiş başka değişiklikler var; bunları ezmeyin veya geri almayın.

## Requirements

### R1. Hız ve görsel teslimi
Vitrin sayfaları (ana sayfa, kategori/alt kategori, ürün detay, yeni gelenler, sepet/ödeme) mobilde hızlı açılmalı. Görseller uygun boyut ve modern formatta, doğru öncelikle (ilk ekrandaki görsel öncelikli, diğerleri tembel) yüklenmeli; yerleşim kayması olmamalı. Üretim çıktısında CSS/JS/HTML küçültülmüş olmalı; gereksiz istemci JS'i, kullanılmayan CSS ve gereksiz font yükü azaltılmalı.

### R2. Önbellek
Statik varlıklar, görseller ve vitrin verisi uygun önbellek politikalarıyla sunulmalı; ürün/fiyat/stok değiştiğinde ilgili sayfalar bayat kalmamalı (yönetimdeki değişiklik vitrine kısa sürede yansımalı). Kişiye özel ve yönetim yanıtları asla paylaşılan önbelleğe girmemeli. Stok, fiyat ve sipariş toplamı yine sunucuda veritabanından hesaplanmalı.

### R3. SEO
Her indekslenebilir sayfada doğru başlık, açıklama, canonical, Open Graph/Twitter etiketleri; ürünlerde `Product`/`Offer`, kategorilerde `BreadcrumbList`, sitede `Organization`/`WebSite` yapılandırılmış verisi; güncel `sitemap.xml` ve `robots.txt`. Yönetim, hesap, sepet, ödeme ve benzeri özel sayfalar indekslenmemeli. Taslak ürünler hiçbir SEO çıktısında (sitemap, feed, yapılandırılmış veri) görünmemeli.

### R4. Google Merchant Center ürün akışı
Merchant Center'ın periyodik olarak çektiği, Google ürün şartnamesine uygun bir XML ürün akışı (yalnızca yayındaki ürünler; renk/beden varyantları `item_group_id` ile; gerçek fiyat, indirimli fiyat, stok durumu, görsel, marka, GTIN/MPN varsa, kargo/vergi bilgisi). Mevcut `/api/feed/google-merchant` rotası varsa incelenip bu şartnameye getirilmeli. Uydurma değer üretilmemeli; zorunlu bilgisi eksik ürün akışa girmemeli ve panelde nedeniyle raporlanmalı.

### R5. Yönetim panelinden kontrol
`/yonetim` içinde, yalnızca yetkili yöneticinin erişebildiği, veritabanında kalıcı ayarlar:
- Site geneli SEO: varsayılan başlık/açıklama, OG görseli, sitenin indekslenmesini aç/kapat (robots).
- Sayfa / kategori / ürün bazında SEO başlığı, açıklama, canonical, noindex.
- Google Merchant akışı: aç/kapat, marka, kargo/vergi bilgisi, ürün bazında hariç tutma, akış URL'i ve son durum.
- Görsel kalite / format ayarları.
- Önbelleği temizleme / yeniden oluşturma (ürün, kategori, ana sayfa) — gerçek sonuç döner.
- Performans ve SEO sağlık raporu: eksik meta, eksik alt metni, aşırı büyük görseller, akışa giremeyen ürünler ve nedenleri.
- Analitik / doğrulama etiketleri: Google Search Console doğrulama, GA4 ölçüm kimliği, Merchant doğrulama. GA4 yalnızca kimlik girildiğinde yüklenmeli ve ilk açılış hızını bozmamalı; KVKK/çerez gereklilikleri `docs/SECURITY.md` ile uyumlu ele alınmalı.
Her form: kalıcı etiket, istemci + sunucu doğrulaması, bekleme/hata/tekrar deneme/başarı durumu, çift gönderim engeli. Ayar değişikliği denetim günlüğüne yazılmalı ve vitrine yansımalı.

### R6. Teslim ve dağıtım
Tüm kontroller yeşilse ekip değişiklikleri commit edip mevcut dalı push etmeli ve Vercel üretimine dağıtmalı (`vercel-build` migration'ları `prisma migrate deploy` ile uygular). Seed betiği hiçbir koşulda gerçek veritabanında çalıştırılmamalı; migration'lar yıkıcı olmamalı (mevcut veri korunmalı). Dağıtımdan sonra canlı sitede doğrulama yapılmalı.

### R7. Asla mock veri yok — gerçekten çalışan site
Kullanıcının ifadesiyle: "asla mock veri olmayacak, çalışan bir sitem olmalı". Hiçbir sayfa, panel, rapor, akış veya etiket örnek/sahte/sabit kodlanmış veri göstermez; her değer gerçek veritabanından veya gerçek ayardan gelir. Panelde görünen her düğme ve form gerçek sunucu işlemi yapar ve gerçek sonucu gösterir; sahte başarı bildirimi, göstermelik düğme, `href="#"` yasaktır. Veri yoksa dürüst boş durum, hata varsa hata gösterilir. İş bitince her özellik gerçek tarayıcıda (Chrome DevTools) uçtan uca kontrol edilir.

## Acceptance Criteria

### Ölçüm (yerel üretim derlemesi, `npm run build && npm start`)
- [ ] Ana sayfa, bir kategori sayfası ve bir ürün sayfasında mobil Lighthouse: Performans ≥ 90, SEO ≥ 95, Erişilebilirlik ≥ 90. Değişiklik öncesi ve sonrası skorlar raporda tablo olarak verilir.
- [ ] Bu üç sayfada CLS ≤ 0.1 ve LCP görseli öncelikli yükleniyor.

### SEO ve akış
- [ ] `sitemap.xml` yalnızca yayındaki ürün ve kategorileri içerir; `robots.txt` panelden indeksleme kapatıldığında tüm siteyi engeller, açıldığında özel yolları engeller.
- [ ] Ürün sayfası JSON-LD'si geçerli `Product` + `Offer` içerir; fiyat ve stok veritabanıyla birebir eşleşir (otomatik test).
- [ ] Merchant XML akışı geçerli XML'dir, Google zorunlu alanlarını içerir, taslak/hariç tutulan/eksik bilgili ürünleri içermez, akış kapatıldığında 404 döner (otomatik test).
- [ ] Panelde girilen SEO başlığı/açıklaması/noindex ilgili sayfanın HTML çıktısına yansır (otomatik test).

### Yönetim ve güvenlik
- [ ] Tüm yeni yönetim API'leri oturumsuz ve yönetici olmayan isteği reddeder (otomatik test); mutasyonlar mevcut CSRF ve yeniden doğrulama kurallarına uyar.
- [ ] Önbellek temizleme düğmesi gerçekten vitrini yeniler: bir ürün fiyatı değiştirilip temizleme yapıldığında vitrin yeni fiyatı gösterir (otomatik veya belgelenmiş canlı doğrulama).
- [ ] Kişiye özel ve `/api/admin/*` yanıtları `private`/`no-store` döner (otomatik test).

### Kalite kapıları
- [ ] `npx tsc --noEmit` 0 hata, `npm test` tamamı yeşil (mevcut 267 test + yeni testler), `npm run build` başarılı.
- [ ] `tests/brand-compliance.test.ts` yeşil: yasaklı kelime ("atölye", "atolye", "atelier", "maison", "istanbul" türevleri) ve yapay güven rozeti yok; meta/OG/feed metinleri dahil.
- [ ] `docs/` (SEO, önbellek, Merchant, yönetim ayarları, API) gerçek kodla aynı değişiklikte güncellenir; doğrulanmayan her şey raporda açıkça eksik olarak belirtilir.
- [ ] Canlıya dağıtımdan sonra `https://pandiones.vercel.app` üzerinde ana sayfa, sitemap, robots, Merchant akışı ve `/yonetim` ayar sayfası çalışır durumda doğrulanır.

### Mock yok ve tarayıcı doğrulaması
- [ ] Kod taramasında yeni eklenen kodda örnek/sahte/sabit kodlanmış veri, boş `onClick`, sahte başarı bildirimi veya `href="#"` yoktur (bağımsız denetçi kontrolü + mevcut uyum testi).
- [ ] Her R5 ayarı gerçek tarayıcıda (Chrome DevTools) uçtan uca denenir: panelden değiştir → kaydet → sayfayı yenile, değerin kalıcı olduğunu gör → vitrinin HTML/sitemap/robots/feed çıktısında etkisini gör → eski değere geri al. Her adımın ekran görüntüsü ve ağ isteği sonucu (HTTP durum kodu) raporda yer alır.
- [ ] Vitrin akışları gerçek tarayıcıda kontrol edilir: ana sayfa, kategori, ürün detay, sepete ekleme, sepet, ödeme sayfasına geçiş — konsolda hata yok, kırık görsel yok, başarısız ağ isteği yok. Hem yerel üretim derlemesinde hem canlıda yapılır.
- [ ] Hata ve boş durumlar tarayıcıda gösterilir: geçersiz form girdisi sunucu hatasını gösterir; verisi olmayan rapor dürüst boş durum gösterir.
