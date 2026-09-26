# Erişilebilirlik kabul standardı

Pandiones'in temel alışveriş akışı fare, klavye, dokunma ve ekran okuyucuyla tamamlanabilir olmalıdır. Hedef WCAG 2.2 AA düzeyindeki uygulanabilir ölçütleri karşılamaktır; otomatik araç sonucu tek başına uygunluk kanıtı değildir.

## Yapı ve gezinme

Her sayfada tek anlamlı `h1`, mantıklı başlık sırası, `main` bölgesi ve atlama bağlantısı bulunur. Link gerçek navigasyon, buton gerçek eylem için kullanılır. İkon düğmelerinin erişilebilir adı vardır. Görünür odak halkası arka planla yeterli kontrast verir. Menü, arama, sepet, hızlı görünüm ve kılavuz açılıp kapanırken odak yönetimi ve Escape davranışı tutarlıdır. Modal kapanınca odak tetikleyen kontrole döner.

## Form ve hata

Placeholder etiket değildir. Zorunlu alan ve biçim yardımı girişten önce anlaşılır. Hata ilgili inputa programatik bağlanır; yalnız kırmızı kenarlıkla aktarılmaz. Gönderim sonucu canlı bölgede kısa ve somut ifade edilir. Ödeme sonucu kalıcı sayfa içeriğiyle açıklanır. Bekleme sırasında düğme adı değişse bile amacı anlaşılır kalır ve iki kez işleme alınmaz.

## Ürün ve görsel

Ürün görselinin alt metni renk/kesim gibi ayırt edici özelliği anlatır. Dekoratif görsel ekran okuyucuda gereksiz tekrara neden olmaz. Stok yalnız soluk renk veya üstü çizili bedenle anlatılmaz; “Tükendi” metni vardır. Seçili beden ve favori durumu `aria-pressed` veya eşdeğer durumla duyurulur. Fiyat ve indirim matematiği metin sırasıyla anlaşılır.

## Görünüm ve hareket

320 px genişlik, %200 metin büyütme, yüksek yakınlaştırma, koyu/açık zemin kontrastı ve azaltılmış hareket testi yapılır. Dokunma hedefleri en az 44×44 CSS px hedeflenir. Otomatik galeri duraklatılabilir; azaltılmış hareket tercihinde otomatik hareket kapatılır. Skeleton ekran okuyucuya tekrar tekrar kart diye duyurulmaz.

## Manuel test rotası

1. Yalnız klavyeyle ana sayfa → katalog → ürün → beden → sepet → ödeme formuna ilerle.
2. Tab/Shift+Tab ile tüm modalleri aç/kapat; odak dışarı kaçmasın ve kapanınca geri dönsün.
3. Ekran okuyucuyla ürün adı, fiyat, stok, beden durumu ve form hatalarını dinle.
4. 320 px, %200 zoom ve azaltılmış hareketle aynı akışı tekrar et.
5. Başarısız ödeme, boş arama, stok yok ve sunucu hatası metinlerini kontrol et.

Test cihazı/tarayıcı, kullanılan yardımcı teknoloji, rota, hata ve düzeltme kaydı [TESTING.md](TESTING.md) raporuna eklenir.
