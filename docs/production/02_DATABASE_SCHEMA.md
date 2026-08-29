# 02 — D1 Veritabanı ve R2 Medya Modeli

## Ortak kurallar

- Kimlikler tahmin edilmesi zor ULID/UUID metinleridir. Siparişin ayrıca kullanıcıya gösterilen benzersiz alfa-nümerik `order_number` alanı vardır; PayTR `merchant_oid` bunun güvenli, en fazla 64 karakterlik biçimidir.
- Tarihler UTC ISO-8601 metni veya tutarlı epoch olarak saklanır; uygulama tek yaklaşım kullanır.
- Para `INTEGER` kuruştur; para birimi ISO kodudur (`TRY`). Float fiyat yoktur.
- E-posta normalize edilir; gösterim için özgün değer gerekirse ayrı tutulur. Telefon E.164’e normalize edilir.
- Silinmesi finansal/hukuki kayıt bütünlüğünü bozacak satırlar fiziksel silinmez. Ürün ve içerik `archived_at`; PII ise saklama politikası sonunda anonimleştirme/silme iş akışı kullanır.
- Her kritik tabloda `created_at`, `updated_at`; yarış ihtimali olanlarda `version` bulunur.
- Foreign key’ler açıkça tanımlanır ve D1’de etkinleştirilir. Her foreign key ve sık filtre için indeks eklenir.

## Katalog

### `categories`

`id`, `parent_id`, `name`, `slug`, `description`, `status`, `sort_order`, `seo_title`, `seo_description`, `canonical_override`, `created_at`, `updated_at`, `archived_at`.

Kurallar: `slug` benzersiz; döngüsel parent yasak; yayımlanan kategori arşivli parent altında olamaz.

### `collections`

`id`, `name`, `slug`, `description`, `status`, `starts_at`, `ends_at`, `hero_media_id`, SEO alanları, timestamps.

### `products`

`id`, `name`, `slug`, `brand`, `short_description`, `description_html`, `material_care_html`, `fit_notes_html`, `status(draft|scheduled|published|archived)`, `published_at`, `featured_rank`, `tax_class_id`, `primary_category_id`, SEO alanları, `version`, timestamps.

Admin rich text’i sanitize edilir. `slug` benzersizdir. `featured_rank` ana sayfadaki DB tabanlı sıralamayı sağlar; varsayılan seçili ürün sorgusu ilk 4 geçerli ürünü alır.

### `product_categories`, `product_collections`

Çoktan çoğa ilişki: `(product_id, category_id|collection_id)`, `sort_order`. Birleşik primary key.

### `product_options`, `product_option_values`

Örnek seçenekler `Beden`, `Renk`; değerler `S`, `M`, `Siyah`. Alanlar: `id`, `product_id`, `name`, `display_type`, `sort_order`; değerlerde `value`, `label`, `swatch`, `sort_order`.

### `product_variants`

`id`, `product_id`, `sku`, `barcode`, `title`, `option_signature`, `status`, `weight_grams`, `requires_shipping`, `stock_tracking`, `allow_backorder=false`, `version`, timestamps.

`sku` ve `(product_id, option_signature)` benzersizdir. Varyant seçimi `variant_option_values` join tablosuyla doğrulanır.

### `prices`

`id`, `variant_id`, `currency`, `list_amount`, `sale_amount`, `starts_at`, `ends_at`, `priority`, timestamps.

Aynı varyant için çakışan aktif fiyat aralığı servis katmanında engellenir. Efektif fiyat her zaman sunucuda hesaplanır; `sale_amount <= list_amount`.

### `tax_classes`

`id`, `name`, `rate_basis_points`, `prices_include_tax`, `active`, timestamps. Canlı vergi oranı şirket/mali müşavir onayı olmadan tahmin edilmez.

## Stok

### `inventory_items`

`variant_id` PK, `on_hand`, `reserved`, `safety_stock`, `version`, `updated_at`.

Satılabilir adet: `max(0, on_hand - reserved - safety_stock)`. Negatif stok ve `reserved > on_hand` varsayılan politikada yasaktır.

### `inventory_reservations`

`id`, `variant_id`, `cart_id`, `order_id`, `quantity`, `status(active|converted|released|expired)`, `expires_at`, timestamps. Aynı sipariş/varyant aktif rezervasyonu benzersizdir.

### `inventory_movements`

Append-only: `id`, `variant_id`, `type(receipt|adjustment|reservation|release|sale|cancel_return|customer_return|damage)`, `quantity_delta`, `reference_type`, `reference_id`, `reason`, `actor_id`, `created_at`.

## Medya ve içerik

### `media_assets`

`id`, `r2_key`, `kind`, `mime_type`, `byte_size`, `width`, `height`, `sha256`, `alt_text`, `focal_x`, `focal_y`, `status`, `uploaded_by`, timestamps. `r2_key` ve `sha256` indekslenir; byte D1’e yazılmaz.

### `product_media`

`product_id`, `variant_id nullable`, `media_id`, `role(cover|gallery|hover|size_guide)`, `sort_order`. Ürün/varyant/rol/sıra birleşimi benzersizdir.

### `content_pages`, `navigation_menus`, `navigation_items`, `home_modules`

- Sayfa: slug, title, sanitized body, status, version, legal document type/version ve SEO alanları.
- Menü öğesi yalnızca doğrulanmış internal path veya izinli HTTPS external URL tutar; parent/sort order içerir.
- Ana sayfa modülü: `type`, `title`, `payload_json`, `status`, `starts_at`, `ends_at`, `sort_order`, `version`. JSON Zod discriminated union ile doğrulanır; ürün referansları gerçekten yayımlanabilir olmalıdır.

## Müşteri, oturum ve sepet

### `customers`

`id`, `identity_provider`, `identity_subject`, `email`, `email_verified_at`, `phone`, `first_name`, `last_name`, `marketing_email_consent_at`, `marketing_sms_consent_at`, `status`, timestamps, `anonymized_at`.

Kimlik sağlayıcısı kararı öncesinde misafir sipariş müşteri hesabı oluşturmak zorunda değildir.

### `addresses`

`id`, `customer_id`, `label`, `recipient_name`, `phone`, `country_code`, `city`, `district`, `postal_code`, `address_line`, `is_default_*`, timestamps. Checkout sırasında siparişe snapshot kopyalanır.

### `carts`, `cart_items`

- Cart: `id`, `customer_id nullable`, `anonymous_token_hash`, `currency`, `status(active|converted|abandoned|expired)`, `expires_at`, `version`, timestamps.
- Item: `id`, `cart_id`, `variant_id`, `quantity`, timestamps; `(cart_id, variant_id)` benzersiz.

Sepette fiyat snapshot’ı karar vermek için kullanılmaz; her okuma/checkout güncel fiyat ve stokla doğrulanır.

### `favorites`

`customer_id`, `product_id`, `created_at`; birleşik primary key. Üyeliksiz favori ilk sürümde sunucu hesabına bağlı olmadığı için zorunlu değildir.

## Promosyon ve kargo

### `coupons`

`id`, `code_normalized`, `status`, `discount_type(percent|fixed|free_shipping)`, `value`, `currency`, `min_subtotal`, `max_discount`, `starts_at`, `ends_at`, `global_limit`, `per_customer_limit`, `first_order_only`, `version`, timestamps.

### `coupon_targets`, `coupon_redemptions`

Hedef ürün/kategori/koleksiyon; kullanım ise `coupon_id`, `order_id`, `customer_id/email_hash`, `amount`, `status`, timestamps. Limit kontrolü checkout transaction’ında yapılır.

### `shipping_methods`, `shipping_rules`

Yöntem adı, etkinlik, tahmini süre metni; kurallar şehir/bölge, minimum sepet, ücret ve ücretsiz kargo eşiği taşır. Checkout’ta seçilen değer siparişe snapshot edilir.

## Sipariş, ödeme ve iade

### `orders`

`id`, `order_number`, `customer_id nullable`, `email`, `phone`, `currency`, `subtotal`, `discount_total`, `shipping_total`, `tax_total`, `grand_total`, `order_status`, `payment_status`, `fulfillment_status`, `coupon_id`, `shipping_method_id`, fatura/teslimat adres snapshot JSON’ları, gerektikçe kişi/şirket fatura bilgisi snapshot’ı, `terms_version`, `pre_info_version`, `privacy_notice_version`, `placed_at`, `version`, timestamps.

Durumlar ayrı state machine’lerle değiştirilir; serbest metin update yasaktır.

### `order_items`

`id`, `order_id`, `product_id nullable`, `variant_id nullable`, `sku`, `product_name`, `variant_name`, `unit_list_amount`, `unit_sale_amount`, `quantity`, `discount_total`, `tax_total`, `line_total`, `media_snapshot_url`, `metadata_json`. Ürün arşivlense bile kayıt korunur.

### `order_status_history`

Append-only: `order_id`, `from_status`, `to_status`, `reason`, `actor_type`, `actor_id`, `created_at`.

### `payment_attempts`

`id`, `order_id`, `provider=paytr`, `merchant_oid`, `status(created|token_ready|pending|succeeded|failed|expired|cancelled)`, `requested_amount`, `paid_amount`, `currency`, `test_mode`, `token_expires_at`, `failure_code`, `failure_message_safe`, `provider_payment_type`, `version`, timestamps. `merchant_oid` benzersiz.

PayTR token’ı gerekiyorsa kısa ömürlü ve şifreli/uygun cache’te tutulur; uzun süreli D1 loguna gereksiz yere yazılmaz.

### `payment_events`

Append-only/idempotent: `id`, `provider`, `merchant_oid`, `event_fingerprint`, `status`, `payment_amount`, `total_amount`, `currency`, `test_mode`, `hash_valid`, `processing_result`, `received_at`, `processed_at`. Ham payload kişisel/sır veri açısından filtrelenmeden saklanmaz. `(provider, event_fingerprint)` benzersiz.

### `refunds`

`id`, `order_id`, `payment_attempt_id`, `provider_ref`, `amount`, `reason`, `status(requested|approved|submitted|succeeded|failed|cancelled)`, `idempotency_key`, `requested_by`, `approved_by`, timestamps. Toplam başarılı+bekleyen iade tahsilatı aşamaz.

### `return_requests`, `return_items`

Talep nedeni, açıklama, durum, hijyen mührü/ambalaj beyanı, operasyon kararı, kanıt medya referansı; satır bazında adet, çözüm (`refund|reject|exchange_manual`) ve kabul tutarı. Hukuki karar otomatik verilmez; politika ve yetki uygulanır.

### `shipments`, `shipment_items`

Kargo firması, takip no, takip URL’si, durum, shipped/delivered timestamps; hangi order item’dan kaç adet içerdiği. Takip URL’si sağlayıcı allowlist’inden üretilir.

### `invoices`

`id`, `order_id`, `provider`, `provider_document_id`, `invoice_number`, `status(pending|issued|failed|cancelled)`, `issued_at`, `document_media_id nullable`, `failure_code`, `version`, timestamps. Vergi/TCKN/VKN gibi alanlar yalnızca gerçekten gerekliyse, checkout aydınlatması ve saklama politikasıyla order billing snapshot’ında tutulur; log ve genel admin listesine yazılmaz.

### `support_tickets`, `support_messages`

Siparişle opsiyonel ilişkili destek kaydı: `id`, `order_id`, doğrulanmış iletişim referansı, konu, kategori, durum, öncelik, atanan admin, timestamps. Mesajlarda aktör, sanitized body, izinli attachment media ve created_at. Spam form body’si loglanmaz; hassas bilgi serbest metinde toplanmaması için uyarı/filtre bulunur.

### `consent_records`

Append-only: `subject_type`, `subject_id/email_hash`, `purpose`, `action(granted|withdrawn)`, `policy_version`, `source`, `proof_reference`, `created_at`. Sipariş için zorunlu sözleşme kabulleri ile opsiyonel pazarlama/çerez rızaları aynı amaç altında birleştirilmez.

## Yönetim, güvenlik ve operasyon

### `admin_identities`, `roles`, `permissions`, `role_permissions`, `admin_roles`

Admin sağlayıcı subject’i, durum ve son giriş; izinler `catalog.write`, `inventory.adjust`, `orders.fulfill`, `payments.refund`, `content.publish`, `admin.manage` gibi atomik kodlardır. Kritik finans işlemi için gerekirse çift onay kuralı uygulanır.

### `audit_logs`

Append-only: `id`, `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_redacted_json`, `after_redacted_json`, `reason`, `ip_hash`, `request_id`, `created_at`. Sır ve gereksiz PII redakte edilir.

### `idempotency_keys`

`scope`, `key_hash`, `request_hash`, `status`, `response_code`, `response_body_redacted`, `resource_id`, `expires_at`; `(scope,key_hash)` benzersiz. Aynı key farklı payload ile gelirse conflict.

### `outbox_events`

`id`, `type`, `aggregate_type`, `aggregate_id`, `payload_redacted_json`, `status`, `attempts`, `next_attempt_at`, `last_error_safe`, timestamps. Sipariş e-postası, stok uyarısı ve entegrasyon görevleri transaction sonrası buradan yürür.

### `system_settings`, `feature_flags`, `scheduled_job_runs`

Tipli, şeması doğrulanmış ve secret içermeyen ayarlar; kontrollü özellik bayrakları; mutabakat/rezervasyon temizliği/taksit oranı gibi işlerin çalışma kayıtları.

## Zorunlu indeks örnekleri

- `products(status, published_at)`, `products(primary_category_id, status)`, `products(featured_rank)`.
- `product_variants(product_id, status)`, `prices(variant_id, starts_at, ends_at)`.
- `inventory_reservations(status, expires_at)`.
- `orders(order_number) UNIQUE`, `orders(email, created_at)`, `orders(order_status, created_at)`.
- `payment_attempts(merchant_oid) UNIQUE`, `payment_attempts(order_id, created_at)`.
- `shipments(tracking_number)`, `outbox_events(status, next_attempt_at)`.
- `audit_logs(entity_type, entity_id, created_at)`, `audit_logs(actor_id, created_at)`.

## Migration ve veri başlangıcı

- Üretim migration’ı otomatik örnek ürün oluşturmaz.
- Yalnızca zorunlu sistem izinleri, rol kodları ve güvenli varsayılan tip kayıtları seed edilebilir.
- Gerçek ürünler admin panelinden veya doğrulanmış bir defalık import ile girilir; import kaynağı, zamanı ve sonucu audit loga yazılır.
- Her migration önce preview/staging D1’de, yedek/restore planıyla test edilir. Destructive migration iki aşamalıdır: önce yeni alan ve backfill, sonra bağımlılık kaldırma, en son eski alan kaldırma.
