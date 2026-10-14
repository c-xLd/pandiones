# İçerik, ürün doğruluğu ve arama görünürlüğü

## Ürün içerik standardı

Ürün kaydı yayınlanmadan önce ad, kategori, gerçek fiyat, renk, beden bazında stok, birincil görsel, açıklama ve varsa materyal/bakım bilgisi doğrulanır. Eksik alan uydurma varsayılan değerle doldurulmaz. Ürün görseli satılan varyantı doğru temsil eder; alternatif kampanya fotoğrafı ayrı açıklanır. Üretim yeri, kumaş yüzdesi, sürdürülebilirlik, sınırlı seri, teslimat süresi ve iade şartı gibi iddialar onaylı ticari kaynağa dayanır.

Metin Türkçe, kısa ve somuttur. Ürün adı varyant farkını ayırt eder; SEO için anahtar kelime tekrarı yapılmaz. Ölçü tablosunda beden aralığı ve birim açık yazılır. Görsel alt metni ürünün görünen niteliğini anlatır; dekoratif kampanya görseli boş alt metin alabilir. Bir ürün kaldırıldığında ilgili kart, öneri, arama, feed ve sitemap tutarlı biçimde güncellenir.

## SEO sözleşmesi

Kanonik ürün yolu `/urun/[slug]`; kategori `/[kategori]`, alt kategori `/[kategori]/[altKategori]` (adresler `src/lib/routes.ts`). Eski `/koleksiyon/...` ve `/urunler/...` adresleri 2026-10-01 itibarıyla 404'tür (yönlendirme yok). Her kategori ve ürünün benzersiz başlık/açıklaması, uygun `h1` ve paylaşım görseli vardır. Silinmiş ürün 404 veya kalıcı karşılık varsa uygun yönlendirme alır; boş ürün kaydı indekslenmez. Not: 2026-10-14'ten beri kökte ve ana sayfada yükleme sınırı yoktur. Kendi `loading.tsx`'i akış başlatan sayfalarda (ör. `[kategori]`, `urun/[slug]`) `notFound()` hâlâ HTTP 200 + `noindex` döner; gizli yönetim adresleri `/bulunamadi` üzerinden gerçek 404 döner.

`src/app/sitemap.ts` ürün URL'lerini veritabanından üretir; `lastModified` değeri gerçek güncelleme tarihine dayanmalıdır. `src/app/robots.ts` yönetim, API, ödeme ve sipariş alanını taramadan dışlar; bu tek başına erişim güvenliği sağlamaz. Hesap ve kişisel sayfalar indekslenmez. `NEXT_PUBLIC_SITE_URL` doğru kamuya açık alan adı olmalıdır.

## Merchant feed

`/api/feed/google-merchant` için ürün adı, açıklama, görsel URL'si, fiyat, para birimi, stok durumu ve kanonik link aynı gerçek ürün kaydıyla eşleşir. Mevcut feed `g:availability` alanına sabit `in_stock` yazıyor; bu satışa hazır bir feed değildir. Sıfır stok veya yayın dışı ürün için doğru davranış uygulanır. Feed'in herkese açık URL'leri doğrulanır; kişisel bilgi bulunmaz.

## İçerik yayın kontrolü

- [ ] Ürün görseli ve varyant eşleşmesi doğrulandı.
- [ ] Fiyat, beden, stok ve ürün açıklaması operasyon kaynağıyla eşleşiyor.
- [ ] Ticari iddialar ve yasal bağlantılar güncel/onaylı.
- [ ] Mobil kırpma, alt metin, başlık ve meta açıklama gözden geçirildi.
- [ ] Ürün kartı, detay, arama, öneri, sitemap ve feed aynı yayını gösteriyor.
