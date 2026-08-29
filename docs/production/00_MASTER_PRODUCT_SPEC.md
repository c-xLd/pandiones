# 00 — Ana Ürün Tanımı

## Ürün vizyonu

Pandiones; kadın iç giyim, gecelik/babydoll ve crop-büstiyer ürünlerini markanın sinematik “Living Fabric” dünyasıyla sunan, ancak katalogdan ödemeye kadar hızlı ve güvenilir çalışan Türkçe bir doğrudan satış mağazasıdır. Ana sayfa duygusal ve editoryal olabilir; ürün bulma, beden seçimi, sepet, ödeme ve sipariş yönetimi bilinçli olarak sade tutulur.

## Birincil hedefler

- Gerçek katalog, varyant, stok ve fiyat verisiyle satış yapabilmek.
- Dikey ürün görsellerini bozmayacak, mobil öncelikli ve erişilebilir alışveriş deneyimi sunmak.
- PayTR ile kart verisini sisteme almadan güvenli ödeme almak.
- Siparişi ödeme, hazırlık, kargo, teslimat, iptal ve iade yaşam döngüsü boyunca yönetmek.
- Ürün, kampanya, sayfa, SEO ve operasyon içeriğini geliştiriciye ihtiyaç duymadan admin panelinden yönetmek.
- Arama motorlarının ürünleri ve varyantları doğru anlamasını sağlamak.
- Yetkisiz işlem, stok aşımı, çift ödeme/teslim, kupon suistimali ve kişisel veri sızıntısını önlemek.

## Roller

| Rol | Yetki özeti |
| --- | --- |
| Ziyaretçi | Katalog, arama, filtre, ürün, içerik, sepet ve misafir ödeme |
| Müşteri | Ziyaretçi hakları + adresler, sipariş geçmişi, favoriler ve talepler; kimlik doğrulama kararı sonrası |
| Destek | Sipariş görüntüleme, müşteri talepleri ve izin verilen notlar; fiyat/stok/rol değiştiremez |
| Operasyon | Sipariş hazırlama, kargo, stok hareketleri ve iade kabulü |
| İçerik yöneticisi | Ürün metni, kategori, medya, sayfa, menü ve SEO; ödeme/iade yapamaz |
| Finans | Ödeme inceleme, mutabakat ve yetkili iade; katalog/rol değiştiremez |
| Yönetici | İş kuralları ve kullanıcı/rol yönetimi; kritik işlemler yine audit ve yeniden doğrulama ister |

Yetki denetimi yalnızca menüyü gizleyerek değil her sunucu işleminde yapılır.

## Kapsam

### Mağaza

- Ana sayfa; DB’den seçilen hero, koleksiyonlar, “Seçili Ürünler” ve kampanya sahneleri.
- Kategori/koleksiyon listeleme, kalıcı URL’li filtre ve sıralama.
- Arama, öneri ve sonuçsuz durum.
- Ürün detayı; gerçek galeri, varyant/beden/renk, stok, fiyat, içerik, bakım, teslimat/iade bilgisi.
- Sunucu doğrulamalı sepet, kupon ve kargo hesaplama.
- Misafir checkout; iletişim, adres, sözleşme onayları ve PayTR iFrame ödeme.
- Ödeme sonucu, sipariş sorgulama/takip ve bildirimler.
- Müşteri hesabı, favori ve adresler yalnızca güvenli kimlik doğrulama mimarisi onaylandıktan sonra.

### Yönetim

- Ürün, varyant, stok, fiyat, kategori, koleksiyon ve medya yönetimi.
- Sipariş, ödeme, kargo, iptal, iade ve mutabakat.
- Kupon/kampanya kuralları.
- Ana sayfa modülleri, menüler, yasal sayfalar ve SEO.
- Rol/yetki, audit log, sistem ayarları ve sağlık ekranı.
- CSV yalnızca doğrulanmış içe/dışa aktarma; hatalı satırlar atomik biçimde reddedilir veya açıkça raporlanır.

## Kapsam dışı ilk sürüm

- Pazar yeri senkronizasyonu, çoklu depo, çoklu para birimi, hediye kartı, abonelik, sadakat puanı, kullanıcı ürünü yorumu ve gelişmiş kişiselleştirme ayrı karar/faz ister.
- Otomatik fatura/e-Arşiv ve kargo API entegrasyonu sağlayıcı seçilmeden yapılmaz; veri modeli entegrasyona hazır tutulur.
- Sahte 3D ürün, ürün rengini değiştiren yapay filtre veya ağır animasyon checkout’a eklenmez.

## İş kuralları

- Para alanları tam sayı kuruş olarak saklanır; `TRY` ilk ve tek canlı para birimidir.
- Sipariş satırları ürün adını, SKU’yu, seçimi, fiyatı, vergi bilgisini ve görsel referansını sipariş anındaki haliyle snapshot olarak saklar.
- Yayındaki ürün en az bir aktif varyanta, fiyat kaydına, kapak görseline ve geçerli kategoriye sahip olmalıdır.
- Stok hiçbir zaman istemci sayısına göre düşmez. Rezerve edilebilir adet sunucuda atomik kontrol edilir.
- Varsayılan stok politikası: ödeme oturumu oluşturulurken 30 dakikalık rezervasyon; başarılı callback’te satışa dönüşür; başarısız/zaman aşımı halinde serbest bırakılır.
- Aynı kupon aynı siparişe bir kez uygulanır; kullanım limitleri transaction içinde kontrol edilir.
- Sipariş durumu ile ödeme durumu ayrı alanlardır. “Ödendi” olmak “kargolandı” olmak değildir.
- Admin fiyat/stok/ödeme/iade değişiklikleri aktör, zaman, önce/sonra ve gerekçe ile kaydedilir.
- Ana sayfadaki “Seçili Ürünler” DB sorgusuyla yönetilir; masaüstünde varsayılan 4 ürün gösterir ve üç karta sabitlenmez.

## Temel kullanıcı akışı

1. Kullanıcı gerçek kategori veya ana sayfa bağlantısından ürüne gider.
2. Ürün sayfası güncel yayımlanmış veriyi sunucudan getirir.
3. Kullanıcı geçerli bir varyant seçmeden sepete ekleyemez; seçim hatası alanın yanında açıklanır.
4. Sunucu fiyatı ve stok uygunluğunu kontrol ederek sepeti günceller.
5. Checkout’ta iletişim, teslimat adresi, kargo ve zorunlu ön bilgilendirme/sözleşme onayları tamamlanır.
6. Sunucu toplamı yeniden hesaplar, stok rezervasyonu ve benzersiz sipariş numarası oluşturur.
7. Sunucu PayTR token’ı alır; kullanıcı PayTR iFrame içinde öder.
8. Yönlendirme sayfası yalnızca “sonuç bekleniyor” gösterebilir. Sipariş, doğrulanmış PayTR callback’i transaction içinde işlediğinde ödenir veya başarısız olur.
9. Operasyon siparişi hazırlar, kargo bilgisi girer ve kullanıcıya bildirim gider.
10. İptal/iade talebi ürün hijyen koşulları ve hukuki politika uyarınca değerlendirilir; PayTR iadesi yalnızca yetkili, kayıtlı ve idempotent sunucu işlemiyle yapılır.

## Deneyim kuralları

- Her etkileşim normal, hover/focus, disabled, loading, success ve error durumuna sahip olur.
- Yükleme sırasında çift gönderim engellenir; yeniden deneme güvenlidir.
- Asıl navigasyon gerçek `<a href>` bağlantılarıyla kurulur. Buton yalnızca işlem için kullanılır.
- Filtre/sıralama URL’de temsil edilir; geri/ileri, paylaşım ve SSR çalışır.
- Modal/drawer klavye odağını yönetir; Escape ile kapanır; form hataları ekran okuyucuya bildirilir.
- Minimum WCAG 2.2 AA hedeflenir. `prefers-reduced-motion` ve `save-data` saygı görür.
- Ürün görselleri dikey en-boy oranını korur; `object-fit: cover` kırpmasının güvenli odağı admin tarafından ayarlanabilir.

## Başarı ölçütleri

- Teknik: ödeme callback başarı oranı, callback gecikmesi, hata oranı, stok tutarsızlığı, LCP/INP/CLS, erişilebilirlik ve indekslenebilir URL oranı.
- Ticari: ürün görüntüleme → sepete ekleme → checkout → başarılı ödeme hunisi; terk oranı; ortalama sepet; arama sonuçsuz oranı; iade ve başarısız ödeme nedenleri.
- Güven: destek talebi çözüm süresi, yanlış stok/fiyat olayı, çift tahsilat/çift iade sayısı ve veri güvenliği olayı.

