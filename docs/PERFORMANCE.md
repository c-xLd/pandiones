# Performans bütçesi

Ölçümler üretim build'inde, orta sınıf mobil cihaz profili ve yavaş 4G benzeri ağda alınır. Değerler hedef bütçedir; ölçülmeden “hızlı” denmez. En çok kullanılan `/`, `/koleksiyon`, ürün detay ve `/odeme` ayrı ölçülür.

| Metrik | Hedef | Ölçüm |
| --- | --- | --- |
| LCP | 75. yüzdelikte ≤ 2,5 sn | Gerçek kullanıcı verisi, Lighthouse laboratuvar kontrolü |
| INP | 75. yüzdelikte ≤ 200 ms | Gerçek kullanıcı verisi; filtre, sepet ve form etkileşimleri |
| CLS | 75. yüzdelikte ≤ 0,1 | Görsel, font, skeleton ve ödeme alanı kaymaları |
| TTFB | Uygun coğrafyada ≤ 800 ms hedef | Sunucu/DB/API zamanlaması |
| Sayfa etkileşimi | Ana eylem ilk yüklemede çalışır | Mobil klavye ve dokunma denemesi |

## Uygulama kuralları

- İlk görünür büyük görsele doğru `width`/`height` veya `aspect-ratio`, uygun `sizes` ve öncelik verin; ekran altı görselleri lazy yükleyin. `next.config.mjs` şu anda görsel optimizasyonunu `unoptimized: true` yapıyor: kaynak boyutlarını, formatı ve bu kararın etkisini ölçmeden performans tamamlandı saymayın.
- Ürün galerisi ve kampanya görsellerinde modern format ve uygun çözünürlük kullanın. Aynı büyük dosyayı küçük kartta indirmeyin. Görsel URL'si bozuksa hata yüzeyi gösterin.
- Fontları yalnız kullanılan ağırlıklarda yükleyin; `font-display: swap` ve ölçü uyumu ile kaymayı azaltın. Logo fontunu tüm siteye taşımayın.
- Öncelikle sunucuda veri getirilebilen sayfaları sunucu bileşeni tutun; istemci JS'ini gerçekten etkileşim gereken bölüme sınırlandırın. Tek veri için birden çok istek, render sırasında pahalı sıralama ve gereksiz polling eklemeyin.
- Filtre ve aramada giriş gecikmesini düşük tutun. Uzun katalog listesinde sayfalama veya kademeli yükleme planlayın; bir kerede bütün görselleri yüklemeyin.
- Hareketli galeri `transform` ile akıcı çalışmalı; görünmüyorsa veya azaltılmış hareket seçiliyse animasyonu durdurun. Scroll listener kullanılıyorsa pasif, sınırlandırılmış ve temizlenen biçimde olmalıdır.
- API sorgularında ihtiyaç duyulan alanları seçin, indeks ve sorgu süresini ölçün. N+1 sorgu ve siparişte ürün başına tekrarlı ağ/DB maliyetini kontrol edin.
- CDN/cache yalnız herkese açık, fiyat/stok tutarlılığı yönetilen içerikte kullanılır; hesap, sepet ve ödeme verisi yanlış kullanıcıya cache'lenmez.

## Ölçüm kaydı

Her önemli sürümde tarih, commit, ortam, cihaz profili, dört ana rota için LCP/INP/CLS, transfer boyutu ve en büyük darboğaz kaydedilir. Regresyon varsa düzeltme veya bilinçli istisna açıklaması olmadan yayın yapılmaz.
