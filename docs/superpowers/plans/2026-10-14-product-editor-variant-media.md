# Ürün düzenleyici: varyant medyası, video ve stok kodu — plan

Tarih: 2026-10-14 · Dal: `design/phase-2-pages` · Kapsam: `/yonetim/urunler/yeni` ve `/yonetim/urunler/[id]` (aynı `ProductEditorForm`)

## Hedef

1. Düzenleyiciyi tam sayfa yönetim paneli düzenine (AdminShell + Ayarlar'daki kaydet çubuğu) oturtmak; yan panel (sheet) kalıntılarını temizlemek.
2. "03 Ürün medyası" ve "04 Renk ailesi" bölümlerini kaldırmak; medya ve aile işlemleri varyant (renk) bölümünde yaşar.
3. Her renge çoklu görsel yükleme ve **her görsel için ayrı çekim türü** (Düz çekim / Manken / Detay) seçimi.
4. Her renge **en çok 1 video** (poster o rengin görsellerinden).
5. Her varyanta ürünle ilişkili stok kodu: addan türetilir, boş kalan kodları **sunucu** üretir ve benzersizliği sunucu sağlar.

## Verilen kararlar

| Konu | Karar |
| --- | --- |
| Stok kodu | `PAN-<AD 8>-<RENK 4>-<BEDEN>` korunur. Boş kod kaydedilirken sunucuda üretilir; çakışmada `-2`, `-3`… eklenir. Elle girilen kod olduğu gibi kalır, çakışırsa hata. Ad değişince mevcut kodlar değişmez; yalnız "Kodları yeniden oluştur" ile değişir. Migration yok. |
| Video | Renk (ürün) başına 1 video. Sunucu ikincisini reddeder. |
| Aile bağlama | "Mevcut ürünü bağla" renk ekleme satırına taşınır; aileden çıkarma renk çiplerinde kalır. |

## Kodda doğrulanan mevcut durum

- `ProductEditor.tsx` (825 satır): bilgiler + `VariantMatrixSection` (02), medya formu (03, yalnız **geçerli** renk), renk ailesi (04), sağda önizleme + yayın.
- `MediaPickerDialog.tsx`: yalnız görsel; çekim türü **kuyruğun tamamı için tek** seçim; alt metin otomatik; video, silme, sıra, tür düzeltme yok. Docblock videoyu "Ürün medyası" bölümüne yönlendiriyor — bölüm kalkınca video eklemenin yolu kalmaz.
- `attachMedia`: rol ve alt zorunlu, video için aynı ürüne ait `posterMediaId` zorunlu; video sayısı sınırsız.
- `PATCH /api/admin/products/[id]/media`: yalnız `cover` ve `order`. Rol veya alt değiştirmek mümkün değil.
- **Hata (düzeltilecek):** `deleteMedia` bir görseli silerken o görseli poster olarak kullanan videoyu kontrol etmiyor; video kırık `posterUrl` ile kalıyor (`product-editor-service.ts:355`).
- `ProductEditor` default export (yan panel `Dialog`) hiçbir yerde kullanılmıyor; `adm-sheet__panel`, `01/02/03` numaraları ondan kalma.
- Stok kodu: `suggestSku` yalnız istemcide, yalnız "Boş stok kodlarını doldur" ile; sunucu boş kodu `null` bırakıyor, çakışmada `DUPLICATE_CODE` döndürüyor.
- Yeni (kaydedilmemiş) renkte görsel düğmesi devre dışı; yeni ürün sayfasında kullanıcı önce "Taslak oluştur"a basmak zorunda ve bunu sayfa söylemiyor.

## Tasarım planı

Yeni görsel dil kurulmaz; mevcut `adm-*` token ve bileşenleri kullanılır (`DESIGN.md` §Yönetim). Cesaret tek yerde: **renk grubunun medya şeridi**. Geri kalan sessiz.

### Düzen (≥1100 px)

```
┌ AdminShell başlık: Katalog / Ürünler · "Yeni ürün" · [Ürün listesine dön] ─────────────┐
│ ┌ main (minmax 0, 1fr) ─────────────────────────────┐ ┌ rail 320px, sticky ───────────┐ │
│ │ Ürün bilgileri                                     │ │ Önizleme 2:3 (kapak)          │ │
│ │  ad · kategori / açıklama / detay / materyal·bakım │ │ renk noktalarıyla geçiş       │ │
│ ├────────────────────────────────────────────────────┤ │ ad · fiyat                    │ │
│ │ Renkler ve bedenler                                │ ├───────────────────────────────┤ │
│ │  [renk skalası][renk adı][Renk ekle] Mevcut ürünü  │ │ Yayın durumu  Taslak          │ │
│ │  bağla · çipler ×  /  beden çoklu seçim            │ │ Eksikler (renk adıyla):       │ │
│ │  araçlar: tüm bedenlere stok · kodları oluştur     │ │  · Siyah: kapak görseli yok   │ │
│ │ ┌ Siyah  Taslak  fiyat · piyasa · KDV  ───────────┐ │ │ [Yayınla]                     │ │
│ │ │ MEDYA ŞERİDİ ▢▢▢▢ [+ Görsel] [▶ Video]  4 görsel│ │ └───────────────────────────────┘ │
│ │ │ beden │ barkod │ stok │ stok kodu │ ⌫           │ │                                   │
│ │ └────────────────────────────────────────────────┘ │                                   │
│ │ ┌ Ekru ... (aynı)                                 ┐ │                                   │
│ └────────────────────────────────────────────────────┘                                   │
└ adm-savebar (yalnız değişiklik varken): "Kaydedilmemiş değişiklikler var" [Vazgeç][Kaydet]┘
```

- 1100 px altında rail ana sütunun altına iner (önizleme küçülür, yayın kutusu tam genişlik).
- 768 px altında beden tablosu satırları karta döner (`.adm-products-table` deseni); medya şeridi yatay kaydırılır, ok tuşlarıyla gezilir.
- Bölüm başlıklarındaki `01/02` numaraları kalkar: artık iki bölüm var ve sıra zorunlu değil.
- Kaydet düğmesi formun dibinden `adm-savebar`'a taşınır (Ayarlar ile aynı davranış, aynı metinler). "Vazgeç" son kayıtlı hâle döndürür. Sayfadan çıkışta kaydedilmemiş değişiklik uyarısı (`beforeunload` + iç bağlantılar için `useConfirm`).
- Yeni ürün sayfasında savebar her zaman görünür ve birincil düğme "Taslak oluştur" der.

### Medya şeridi (renk grubu içinde)

- Grup başlık satırının altında, beden satırlarının üstünde tek satır: o rengin medyası **sırasıyla** küçük 2:3 kareler. Her karede çekim türü kısaltması (Düz / Manken / Detay) ve kapakta altın kenar + "Kapak" etiketi (renk tek başına bilgi taşımaz). Videoda oynat simgesi ve süre yok (bilmiyoruz; uydurulmaz).
- Sonda iki kutu: `+ Görsel` ve `Video ekle` (video varsa kutu videonun kendisidir). Şeridin sağında özet: "4 görsel · 1 video" ya da "Kapak yok" uyarısı (`--warning-surface`).
- Herhangi bir kareye ya da kutuya tıklamak **Renk medyası** penceresini açar; kare tıklanırsa o öğe odaklı açılır.
- Kaydedilmemiş renkte şerit yerine tek satır: "Bu renk kaydedildiğinde görsel ekleyebilirsiniz." + **"Kaydet ve görsel ekle"** düğmesi (formu kaydeder, başarılıysa o rengin penceresini açar; hata varsa ilk hatalı alana odaklanır, pencere açılmaz).
- Tablodaki eski tek "Görsel" sütunu ve `rowSpan`'li görsel hücresi kalkar.

### Renk medyası penceresi (`MediaPickerDialog` yeniden yazılır → `VariantMediaDialog`)

`Dialog` + `.adm-dialog`, `size="lg"`. Başlık: "Siyah — medya". İki bölge, sekme yok:

1. **Yüklü medya** (ızgara, sıralı): her öğede küçük görsel, **çekim türü seçimi** (anında kaydeder, `Kaydediliyor/Kaydedildi` canlı bölgede), alt metin alanı (odak kaybında/Enter'da kaydeder, Escape geri alır — `InlineNumber` davranışı), "Kapak yap", sola/sağa taşı (ikon düğme, `aria-label` öğe adıyla), Sil (satır içi iki adım). Videoda ek olarak **poster seçimi** (o rengin görsellerinden).
2. **Yükle**: sürükle-bırak / seç alanı, çoklu görsel. Kuyrukta **her dosyanın kendi** çekim türü seçimi (varsayılan: önceki dosyanın seçimi; ilk dosya Manken) ve önizleme küçük görseli (`URL.createObjectURL`, kapanışta `revokeObjectURL`). Alt metin otomatik önerilir (`<ad> – <renk>, <tür> <n>`), yüklemeden önce düzenlenebilir. Dosya başına durum: Bekliyor / Yükleniyor / Yüklendi / hata + "Tekrar dene".
   - Video: ayrı satır "Video (en çok 1, MP4/WebM, 50 MB)". Video varsa satır "Bu rengin videosu var; yenisini eklemek için önce silin." der ve seçim kapalıdır. Görsel yoksa: "Video posteri için önce en az bir görsel yükleyin." Poster varsayılanı kapak görseli.
- Boş durum: "Bu renge henüz görsel yüklenmedi. Görselleri buraya sürükleyin ya da seçin." Yükleme hatası boş liste gibi gösterilmez (`TabLoadError` + Tekrar dene).
- Yükleme sürerken pencere kapanmaz; Escape yüklemeyi iptal etmez, yalnız bitince kapatır (mevcut davranış korunur).
- Pencere kapanınca grubun şeridi tek istekle tazelenir (yalnız o renk; kaydedilmemiş tablo değişiklikleri korunur — mevcut `refreshColorMedia`).

### Stok kodu arayüzü

- Stok kodu hücresi boşsa yer tutucu olarak önerilen kod gösterilir (`placeholder`, soluk) ve altında ipucu yok; kaydedilince sunucunun ürettiği gerçek kod gelir.
- Araç satırındaki düğme: "Kodları yeniden oluştur" — tüm hücreleri **ad/renk/bedene göre** yeniden önerir (elle girilenler dâhil), uygulamadan önce `useConfirm` ile kaç kodun değişeceğini söyler. Kaydedilene kadar geri alınabilir (Vazgeç).
- Stok kodu sütun başlığında yardım: "Boş bırakırsanız kaydederken oluşturulur."

### Aile bağlama (renk satırında)

- "Renk ekle"nin yanında ikincil bağlantı düğmesi: **Mevcut ürünü bağla**. `Combobox`: aynı kategorideki, bu ailede olmayan ürünler (ad + renk + durum). Seçince onay: "Saten Gecelik – Bordo bu modelin rengi olarak bağlansın mı? Fiyatı, stoğu ve görselleri kendi kaydında kalır." Ürünün ailesi yoksa önce ürün adıyla aile oluşturulur, bu ürün ve seçilen ürün bağlanır. Renk çakışması / kategori çakışması sunucudan gelen mesajla gösterilir.
- Kaydedilmemiş yeni üründe düğme kapalı ve ipucu: "Önce taslağı oluşturun."

## Uygulama adımları

Her adım TDD: önce test, sonra kod. Başkalarının değişikliklerine dokunulmaz; dosyalar zaten bu dalda değişmiş durumda, üzerine eklenir.

### 1. Sunucu: medya meta, video sınırı, poster güvenliği
- `src/lib/admin/product-editor-service.ts`
  - `updateMediaMeta({ productId, mediaId, role?, alt? })`: rol `FLATLAY|MODEL|DETAIL`, alt 1–240 karakter, medya bu ürüne ait olmalı.
  - `setVideoPoster({ productId, videoId, posterMediaId })`: poster aynı ürünün görseli; video kapaksa `Product.image` güncellenir.
  - `attachMedia`: ürünün zaten videosu varsa `VIDEO_LIMIT`.
  - `deleteMedia`: silinen görsel bir videonun posteriyse `POSTER_IN_USE` (mesaj: "Bu görsel videonun posteri. Önce videonun posterini değiştirin ya da videoyu silin.").
- `src/lib/admin/product-editor-http.ts`: yeni kodların Türkçe mesajı ve 409/400 durumları.
- `src/app/api/admin/products/[id]/media/route.ts`: `PATCH` için `action: 'meta' | 'poster'`; gövde `readJson` ile boyut sınırlı okunur (diğer rotalardaki gibi). Yetki: mevcut `ADMIN` kontrolü, `getCurrentUser(request)`.
- Testler: `tests/product-media-flow.test.ts` (meta, poster, video sınırı, poster silme reddi, başka ürünün medyasına erişim reddi).

### 2. Sunucu: stok kodu üretimi
- `src/lib/products/sku.ts` (yeni, saf + tx yardımcı): `suggestSku` buraya taşınır (`variant-model.ts` yeniden dışa aktarır); `uniqueSku(base, taken)` → `base`, `base-2`, …; uzunluk 40'ı aşarsa taban kısaltılır.
- `product-editor-service.ts` ürün oluştur/güncelle işlemi içinde: `sku` boş gelen her varyant için taban önerilir, aynı `startsWith` ile veritabanındaki kodlar (bu ürünün kendi varyantları hariç) ve aynı istekteki kodlar alınır, ilk boş ek seçilir. Eşzamanlı kayıtta `P2002` yakalanırsa işlem bir kez yeniden denenir; ikinci kez de çakışırsa `DUPLICATE_CODE`.
- `colors` rotası (`addColorVariant`) yeni rengin bedenlerini kodlu oluşturur.
- Mevcut "varyant `sku` göndermezse kodu korur" davranışı korunur (eski istemciler).
- Testler: `tests/product-commerce-fields.test.ts` + yeni `tests/product-sku.test.ts` (Türkçe harfler, uzunluk, çakışma eki, elle girilen kodun korunması, eşzamanlı çakışmada yeniden deneme).

### 3. İstemci modeli
- `src/app/yonetim/_lib/variant-model.ts`: `ColorGroup`'a `media: MediaSummary[]` (id, kind, role, url, posterUrl, isCover, alt); `image` buradan türetilir. `regenerateSkus(groups, name)` (hepsini) ve mevcut `fillEmptySkus` yerine yer tutucu için `skuPlaceholder`. Snapshot medyayı içermez (medya anında kaydedilir, "kaydedilmemiş" sayılmaz).
- Test: `tests/variant-model.test.ts`.

### 4. Bileşenler
- `VariantMediaStrip.tsx` (yeni): şerit, boş/kaydedilmemiş/uyarı durumları.
- `VariantMediaDialog.tsx` (yeni, `MediaPickerDialog.tsx` yerine; eski dosya silinir): yukarıdaki pencere.
- `VariantMatrixSection.tsx`: görsel sütunu kalkar, şerit eklenir; "Mevcut ürünü bağla"; "Kodları yeniden oluştur"; stok kodu yer tutucusu; `onSaveAndOpenMedia(group)`.
- `ProductEditor.tsx`: medya ve aile bölümleri, upload/`mutateMedia`/`linkFamily`/`createAndLinkFamily` state'i ve default export (yan panel) kaldırılır; iki sütunlu düzen, `adm-savebar`, Vazgeç, çıkış uyarısı; yayın kutusundaki eksikler **renk adıyla** (geçerli ürün için) ve diğer renkler için "kendi sayfasından yayınlanır" bağlantısı.
- `src/app/yonetim/urunler/yeni/page.tsx` ve `[id]/page.tsx`: `lead` metni güncellenir ("Temel bilgileri, renkleri ve bedenleri girin. Görseller renk kaydedilince eklenir."); düzenleme sayfasında `lead` içindeki `·` ayraçlı metin sadeleşir.
- Testler: `tests/admin-variant-section-ui.test.tsx`, `tests/admin-product-editor-ui.test.tsx` (medya/aile bölümünün olmadığı, şerit, kaydet-ve-aç, savebar, Vazgeç), yeni `tests/admin-variant-media-dialog.test.tsx` (tür başına dosya, alt düzenleme, video kapalı durumları, hata ve tekrar dene, çift gönderim engeli).

### 5. Stil
- `src/styles/pages/admin-product-editor.css`: `.adm-editor__layout` iki sütun + sticky rail, `.adm-vx__strip`, `.adm-vmedia` (pencere), kart düzeni 768 px altı; kullanılmayan `.adm-editor__media`, `.adm-editor__upload`, `.adm-media-picker__*`, `.adm-vx__media*` kuralları silinir. Yalnız mevcut token'lar. `prefers-reduced-motion` altında şerit kaydırması `smooth` değil.
- `tests/admin-product-editor-style.test.ts` güncellenir.

### 6. Belgeler (aynı değişiklikte)
- `DESIGN.md`: "Varyant tablosu" ve "Ürün düzenleyici" satırları; yeni "Varyant medya şeridi" ve "Renk medyası penceresi" satırları.
- `docs/pages/ADMIN.md` §Ürün düzenleyici (satır 77–81) yeniden yazılır.
- `docs/API.md`: media `PATCH` eylemleri, yeni hata kodları, boş `sku` → sunucu üretir.
- `docs/QA.md`: poster silme hatası kapatıldı olarak, video sınırı ve stok kodu senaryoları.

## Doğrulama

- `npx tsc --noEmit`, `npm test` (ilgili dosyalar + tümü), `npm run build`.
- Tarayıcıda (`preview_start`, yerel geliştirme veritabanı; seed gerçek veritabanında çalıştırılmaz):
  - Mutlu yol: yeni ürün → iki renk, üç beden → Taslak oluştur → kodlar dolu gelir → "Kaydet ve görsel ekle" yerine kaydedilmiş renkte şerit → üç görsel farklı türlerle → biri kapak → video + poster → sıra değiştir → yayınla.
  - Boş/hata: kategori yükleme hatası, büyük dosya, yanlış tür, ikinci video, poster görselini silme, ağ hatasında tekrar dene, aynı elle kodu iki varyanta yazma.
  - Yetki: oturumsuz/yetkisiz `PATCH media` 403; başka ürünün `mediaId`'si 404.
  - 375 px, klavye ile tüm şerit ve pencere, ekran okuyucu canlı bölgeleri, karanlık mod yok (yönetim açık temada).

## Kapsam dışı / riskler

- Ad değişince mevcut stok kodları değişmez (karar gereği); kullanıcı "Kodları yeniden oluştur" kullanmalı. Bu, ADMIN.md'de yazılır.
- Medya anında kaydedilir; tablo kaydı ise savebar ile. İki farklı kayıt modeli kullanıcıya pencerede "Değişiklikler hemen kaydedilir" ipucuyla söylenir.
- Diğer renklerin metni (açıklama, materyal) kendi sayfasında düzenlenmeye devam eder.
