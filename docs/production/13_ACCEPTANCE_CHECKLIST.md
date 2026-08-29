# 13 — Yayına Çıkış Kabul Listesi

Her kutu bağlantılı kanıt (test run, ekran görüntüsü, log sorgusu, PayTR panel sonucu, hukuk onayı veya migration kaydı) olmadan işaretlenmez. `N/A` yalnızca gerekçe ve onaylayanla kullanılabilir.

## Veri ve mimari

- [ ] D1 `DB` ve R2 `MEDIA` local/staging/production ayrı bağlı.
- [ ] Tüm migration’lar boş DB ve staging kopyasında başarılı; backup/restore kanıtı var.
- [ ] Public katalog, fiyat, stok, home module ve sepet gerçek D1’den geliyor.
- [ ] Medya byte R2, metadata D1; orphan ve referans bütünlüğü testli.
- [ ] Runtime bundle’da mock/fixture/hard-coded ürün/fiyat/stok/sipariş yok.
- [ ] `localStorage` sepet doğruluk kaynağı değil; aktif sepet sunucuda.
- [ ] Para tam sayı kuruş; sipariş snapshot’ı ürün arşivlenince değişmiyor.

## Etkileşim ve mağaza

- [ ] Tüm link/button/form/input envanteri gerçek route/action’a bağlı; `#`/no-op yok.
- [ ] Header, mobil menü, arama, filtre/sıralama, ürün varyantı, galeri, sepet ve kupon çalışıyor.
- [ ] “Seçili Ürünler” DB’den ve desktop varsayılan 4 geçerli ürün; dikey görseller bozulmuyor.
- [ ] Checkout validation, address, shipping, zorunlu sözleşme ve opsiyonel marketing consent doğru.
- [ ] Loading/empty/disabled/success/error ve retry tüm kritik akışlarda.
- [ ] Browser back/forward, refresh, çift tıklama ve ağ kopması güvenli.
- [ ] 320/375/768/1024/1440/1920 responsive testleri; yatay taşma yok.
- [ ] Klavye, focus, screen reader, kontrast, zoom ve reduced-motion kabul edildi.

## Admin

- [ ] Admin ayrı güvenli auth, MFA/allowlist, timeout ve reauth.
- [ ] Her endpoint’te deny-by-default RBAC/object authorization testli.
- [ ] Ürün/kategori/koleksiyon/varyant/fiyat/stok/medya CRUD gerçek DB/R2 ile.
- [ ] Publish validator eksik/uydurma ürünü engelliyor; draft public değil.
- [ ] Sipariş state machine, kısmi kargo, takip ve history çalışıyor.
- [ ] Stok adjustment ledger; silent overwrite/negatif invariant yok.
- [ ] İptal/iade/refund yetki, confirmation, idempotency ve audit ile.
- [ ] Fatura ve destek akışları seçilen gerçek sağlayıcıya veya açıkça tanımlı manuel operasyona bağlı; sahte başarı/belge yok.
- [ ] Role, content publish, price, stock, order, refund, export ve settings auditli.
- [ ] Admin export PII minimizasyonu, gerekçe ve süreli erişimle.

## PayTR

- [ ] iFrame API kullanılıyor; kart alanı Pandiones DOM/server/log/analytics’e girmiyor.
- [ ] Merchant key/salt yalnız production secret store; client/source/log taraması temiz.
- [ ] Token alan/formülü güncel resmi dokümana göre server-side.
- [ ] Callback yalnız POST/form, HMAC constant-time, merchant_oid/amount/currency/test-mode kontrollü.
- [ ] Callback sonucu commit sonrası response tam `OK`; HTML/JSON/debug yok.
- [ ] Aynı callback en az 10 tekrar testinde tek payment/stock/outbox/fulfillment etkisi.
- [ ] Success/fail redirect sipariş değiştirmiyor; pending callback gecikmesini doğru gösteriyor.
- [ ] PayTR test işlemi panelde “Başarılı”; “Devam Ediyor” callback yok.
- [ ] Status query, pending reconciliation ve günlük mutabakat çalışıyor/alarm veriyor.
- [ ] Tam/kısmi refund, üst limit, çift submit ve belirsiz network sandbox testi geçti.
- [ ] Production PayTR alan adı/Bildirim URL/HTTPS/merchant ayarları iki kişi kontrolüyle doğrulandı.

## Güvenlik

- [ ] OWASP ASVS L2 kontrolü ve tehdit modeli tamam; kritik/yüksek bulgu yok.
- [ ] Zod server validation, prepared SQL, CSRF/origin, rate limit ve idempotency testleri.
- [ ] XSS/rich text, IDOR, role escalation, SQLi, SSRF, open redirect ve upload testleri.
- [ ] Session cookie/rotation/invalidation güvenli; auth token localStorage’da değil.
- [ ] CSP enforce ve yalnız gerekli PayTR/asset allowlist; HSTS/nosniff/referrer/permissions başlıkları.
- [ ] Log redaction; secret, token, cookie, kart veya PII form body yok.
- [ ] Dependency, SAST, secret scan clean; rotation/incident runbook prova edildi.
- [ ] D1/R2/backup erişimleri least privilege ve kayıtlı.

## KVKK, tüketici ve işletme

- [ ] Ticari unvan, MERSİS/vergi, adres ve iletişim bilgileri hukukça onaylı/görünür.
- [ ] ETBİS alan adı ve işletme kayıt yükümlülüğü tamam/doğrulandı.
- [ ] Veri işleme envanteri, retention ve ilgili kişi başvuru süreci onaylı.
- [ ] KVKK aydınlatma ve açık rıza ayrı; pazarlama izinleri opsiyonel/kapalı/geri alınabilir.
- [ ] Zorunlu olmayan çerezler consent öncesi yüklenmiyor; eşit reddet ve tercih yönetimi var.
- [ ] Ön Bilgilendirme ve Mesafeli Satış Sözleşmesi ödeme öncesi açık; sürüm/satın alma kanıtı/order bağlantısı var.
- [ ] Ürün, vergi dahil toplam, kargo/ek masraf, teslimat, cayma/hak arama bilgileri ödeme öncesi.
- [ ] İç giyim hijyen/iade metni ambalaj-mühür operasyonuyla tutarlı ve hukuk onaylı; mutlak yanıltıcı “iade yok” yok.
- [ ] Sözleşme/sipariş teyidi kalıcı veri saklayıcıyla gönderiliyor.

## SEO ve performans

- [ ] SSR title/description/H1/canonical benzersiz; `lang=tr`.
- [ ] Sitemap yalnız 200/indexable canonical gerçek URL; robots doğru; staging noindex, production değil.
- [ ] Ürünler kategori linkleriyle crawl edilebilir; yalnız search’e bağlı değil.
- [ ] Product/ProductGroup/Offer/Breadcrumb/Organization JSON-LD görünür DB verisiyle aynı ve validator clean.
- [ ] Search/cart/checkout/account/admin noindex; 404/410/301 semantik ve redirect chain yok.
- [ ] OG images absolute/200; alt metin ve dikey responsive görseller doğru.
- [ ] CWV 75p hedefleri ve Lighthouse bütçeleri geçti; WebGL fallback/LCP/CTA engellemiyor.
- [ ] Search Console doğrulama/sitemap; Merchant Center kararı ve feed tutarlılık planı.

## Test ve operasyon

- [ ] Lint, strict typecheck, build, unit, D1 integration, contract ve kritik e2e green.
- [ ] Chromium/WebKit/mobile; console error/unhandled rejection/kırık asset yok.
- [ ] Callback/refund/stock/kupon eşzamanlılık testleri geçti.
- [ ] Alarm: callback, pending, reconciliation, stock invariant, refund, outbox, 5xx.
- [ ] Outbox retry/dead letter ve kullanıcı bildirimi provider sandbox/production smoke.
- [ ] D1 backup + R2 plan + staging restore drill ve ölçülen RPO/RTO.
- [ ] Deploy, feature flag, checkout kill switch, callback sürekliliği ve rollback provası.
- [ ] On-call, finans, operasyon, güvenlik/KVKK, hukuk ve içerik sahipleri atandı.

## Son onay

- [ ] Ürün sahibi: gerçek katalog, fiyat, stok, UX ve tüm görünen kontroller.
- [ ] Finans: PayTR, mutabakat, iade ve vergi/toplam gösterimi.
- [ ] Operasyon: stok, hazırlama, kargo, iptal/iade.
- [ ] Güvenlik/KVKK: ASVS, PII, consent, retention, olay müdahalesi.
- [ ] Hukuk: mesafeli satış, ön bilgilendirme, hijyen istisnası, şirket/ETBİS.
- [ ] Teknik sorumlu: migration, test, gözlem, backup, deploy/rollback.

Tüm zorunlu maddeler kanıtlanmadan ödeme özelliği production’da açılmaz.
