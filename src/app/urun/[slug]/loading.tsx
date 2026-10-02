import React from 'react';
// Route stylesheet: the skeleton reuses the real page's classes, so it must load the same CSS
// (ProductDetailClient imports it too). Without it the first paint is unstyled and then jumps.
import '@/styles/pages/product.css';

/** Product detail loading placeholder: matches the initial 100svh viewport stage
 *  (header spacing, horizontal multi-shot gallery and bottom purchase panel)
 *  pixel-for-pixel so zero layout shift occurs when the product streams in. */
export default function ProductLoading() {
  return (
    <div className="product-page product-page--skeleton" aria-busy="true">
      <main id="main" className="pdp-main" data-product-page>
        <div className="pdp-stage-fold">
          <section className="pdp-hero" aria-label="Ürün yükleniyor">
            <p className="visually-hidden" role="status">Ürün yükleniyor</p>
            <div className="pdp-gallery" aria-hidden="true">
              <div className="pdp-gallery-track">
                <div className="pdp-shot skeleton-block pdp-shot--skeleton" />
                <div className="pdp-shot skeleton-block pdp-shot--skeleton" />
                <div className="pdp-shot skeleton-block pdp-shot--skeleton" />
                <div className="pdp-shot skeleton-block pdp-shot--skeleton" />
              </div>
            </div>
          </section>

          <section className="pdp-purchase-stage" aria-hidden="true">
            <div className="pdp-purchase-panel">
              {/* Desktop Bar Skeleton */}
              <div className="pdp-desktop-panel">
                <div className="pdp-bar__name">
                  <span className="skeleton-block pdp-skeleton-title" />
                </div>
                <div className="pdp-bar__choices">
                  <div className="pdp-bar__group pdp-skeleton-group">
                    <span className="skeleton-block pdp-skeleton-label" />
                    <div className="pdp-skeleton-variants">
                      <span className="skeleton-block pdp-skeleton-variant" />
                      <span className="skeleton-block pdp-skeleton-variant" />
                    </div>
                  </div>
                  <div className="pdp-bar__group pdp-skeleton-group">
                    <span className="skeleton-block pdp-skeleton-label" />
                    <div className="pdp-skeleton-sizes">
                      <span className="skeleton-block pdp-skeleton-size" />
                      <span className="skeleton-block pdp-skeleton-size" />
                      <span className="skeleton-block pdp-skeleton-size" />
                      <span className="skeleton-block pdp-skeleton-size" />
                    </div>
                  </div>
                </div>
                <div className="pdp-bar__actions">
                  <span className="skeleton-block pdp-skeleton-btn" />
                </div>
              </div>

              {/* Mobile Docked Bar Skeleton */}
              <div className="pdp-mobile-docked-panel">
                <div className="pdp-mobile-info-row">
                  <span className="skeleton-block pdp-skeleton-mobile-title" />
                  <span className="skeleton-block pdp-skeleton-mobile-price" />
                </div>
                <div className="pdp-skeleton-mobile-variants">
                  <span className="skeleton-block pdp-skeleton-variant" />
                  <span className="skeleton-block pdp-skeleton-variant" />
                </div>
                <span className="skeleton-block pdp-skeleton-mobile-btn" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
