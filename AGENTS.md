# Pandiones ajan kuralları

Bu dosya depo kökünden tüm uygulama ve dokümanlara uygulanır. Kullanıcının güncel talimatı önceliklidir.

## Amaç

Pandiones'te görünen her sayfa, bağlantı, giriş alanı ve düğme gerçek bir işe hizmet eder. Görsel olarak tamamlanmış ama işlemeyen bir arayüz teslim etmeyin. Örnek veri, sahte ödeme, uydurma yorum/stok/sipariş ve sessiz başarısızlık canlı davranış olarak sunulamaz. Mevcut kodda bunlardan biri varsa düzeltene kadar bunu açık bir eksik olarak belirtin.

## Çalışma sırası

1. Değişen akışa göre `README.md`, `DESIGN.md`, ilgili `docs/pages/` belgesini ve API/güvenlik sözleşmesini okuyun.
2. `git status --short` ile başkasının değişikliklerini görün; bunları ezmeyin veya geri almayın.
3. İlgili sayfa, bileşen, API ve Prisma modelini birlikte izleyin. Sadece görünen UI'yi düzeltmek akışı tamamlamaz.

## Uygulama kuralları

- Yeni bağlantı gerçek rotaya; eylem gerçek handler ve sunucu sonucuna bağlanır. `href="#"`, boş `onClick`, sahte başarı bildirimi ve göstermelik disable yasaktır.
- Formlar kalıcı etiket, istemci ve sunucu doğrulaması, bekleme, hata, tekrar deneme ve başarı durumu içerir. Çift gönderimi engelleyin.
- Ürün, fiyat, indirim, stok ve sipariş toplamı istemciden güvenilir kabul edilmez; sunucu veritabanından yeniden hesaplar. İşlem tutarlılığı ve yetki kontrolü gerektiren mutasyonları atomik tasarlayın.
- Ödeme bilgileri yoksa ödeme başlatmayın; gerçekmiş gibi başarılı sipariş üretmeyin. Test modu açıkça ayrılmış ve kullanıcıya görünür olmalıdır. Üretimde test modu kapalı olmalıdır.
- Seed betiğini gerçek veritabanında çalıştırmayın. Seed yalnızca yerel geliştirme içindir ve mevcut hali yıkıcıdır.
- Stok bildirimi, bülten, iade, takip ve yorum gibi vaatler için gerçekten çalışan arka uç sonucunu doğrulayın. Sadece kayıt açılması, e-posta gönderildiği anlamına gelmez.
- Loading, empty, error ve success durumlarını her veri bağımlı bileşene ekleyin. Skeleton veri yerine geçici yüzeydir. Hata hiçbir zaman boş liste gibi gösterilmez.
- Mobil, klavye, ekran okuyucu, azaltılmış hareket ve yavaş bağlantı davranışını değişiklik kapsamına dahil edin.
- Mevcut token ve tipografiyi kullanın; yeni varyant gerekiyorsa `DESIGN.md` ile eşzamanlı güncelleyin.
- Performans için gereksiz client bileşeni, tekrar fetch, büyük bağımlılık ve optimize edilmemiş görsel eklemeyin.
- Kodda doğrulanan yüksek öncelikli açıkları `docs/SECURITY.md` ve `docs/QA.md` içinde izleyin. Belge değişikliği bu açıkları kapatmış sayılmaz.
- **Yasaklı Kelimeler ve Marka Dili (Kalıcı Bellek):** "atölye" / "atolye" / "atelier", "maison" ve "istanbul" / "İstanbul" / "İSTANBUL" sözcükleri marka metinlerinde, başlıklarda, butonlarda, mikro metinlerde ve e-postalarda **KESİNLİKLE VE ASLA KULLANILMAZ**. Bu kelimeler kalıcı olarak yasaklanmıştır.
- **Pazarlama ve Güven Rozetleri Yasağı (Kalıcı Bellek):** "Özel Pandiones Kutusu", "Sigortalı Gönderim", "30 Gün Değişim" gibi yapay e-ticaret güven rozetleri, yıldızlı sloganlar ve mikro vaatler kullanıcının açık onayı olmadan siteye **KESİNLİKLE EKLENMEZ**. Marka dili saf, sessiz ve yapay pazarlama rozetlerinden arınmış tutulmalıdır.

## Teslim ölçütü

Değişen akışın mutlu yolu, boş/hata yolu ve yetki sınırı doğrulanır. En az `npx tsc --noEmit`, ilgili testler ve `npm run build` çalıştırılır; çalışmayan kontrol veya test varsa nedenini raporlayın. Belgeleri gerçek kodla aynı değişiklikte güncelleyin. Tamamlanmamış işi tamamlandı diye işaretlemeyin. Canlı satışa açma kararı [QA.md](docs/QA.md) kapılarından sonra verilir.
