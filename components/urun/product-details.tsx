import AddToCart from '@/components/add-to-cart';
import ProductGalleryModal from '@/components/product-gallery-modal';
import { formatPrice, type Product } from '@/lib/catalog';

export default function ProductDetails({
  product,
  gallery,
  categoryHref,
}: {
  product: Product;
  gallery: string[];
  categoryHref: string;
}) {
  return (
    <section className="product-detail-v4" aria-labelledby="product-title">
      <ProductGalleryModal images={gallery} productName={product.name} imagePosition={product.imagePosition} />
      <aside className="product-purchase-v4">
        <div className="product-purchase-v4-inner">
          <div className="product-buy-meta">
            <span>{product.categoryName}</span>
            <span>{product.color}</span>
          </div>
          <h1 id="product-title">{product.name}</h1>
          <div className="product-price-row">
            <strong>{formatPrice(product.priceKurus)}</strong>
            <span>KDV DAHİL</span>
          </div>
          <p className="product-description">{product.description}</p>
          <AddToCart productId={product.id} productName={product.name} productImage={product.image} sizes={product.sizes} />
          <div className="product-service-notes">
            <span>Güvenli ödeme</span>
            <span>Beden desteği</span>
            <span>Özenli paketleme</span>
          </div>
          <div className="product-disclosures">
            <details open>
              <summary>
                Ürün bilgisi <span>+</span>
              </summary>
              <dl>
                <div>
                  <dt>Materyal</dt>
                  <dd>{product.material}</dd>
                </div>
                <div>
                  <dt>Form</dt>
                  <dd>{product.fit}</dd>
                </div>
                <div>
                  <dt>Renk</dt>
                  <dd>{product.color}</dd>
                </div>
              </dl>
            </details>
            <details>
              <summary>
                Beden ve kalıp <span>+</span>
              </summary>
              <p>Doğru bedeni seçmek için ölçülerini ürün formuyla birlikte değerlendirebilirsin.</p>
              <a href="/beden-rehberi">Beden rehberini aç →</a>
            </details>
            <details>
              <summary>
                Teslimat ve iade <span>+</span>
              </summary>
              <p>Sipariş ve hijyen koşullarına ilişkin güncel bilgileri incele.</p>
              <a href="/teslimat-iade">Koşulları incele →</a>
            </details>
          </div>
          {gallery.length > 1 && (
            <nav className="product-view-nav" aria-label="Ürün görünümleri">
              {gallery.map((_, index) => (
                <a href={`#gorunum-${index + 1}`} key={index}>
                  0{index + 1}
                </a>
              ))}
            </nav>
          )}
        </div>
      </aside>
    </section>
  );
}
