import React from 'react';

/** Shown while the collection streams in. Same geometry as the real page (title, rail, toolbar,
 *  grid) and at least one screen tall, so swapping it for the products moves nothing (CLS). */
export default function CollectionLoading() {
  return (
    <main className="collection-page-main collection-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">Koleksiyon yükleniyor</p>
      <div className="collection-skeleton__head" aria-hidden="true">
        <span className="skeleton-block collection-skeleton__crumb" />
        <span className="skeleton-block collection-skeleton__title" />
      </div>
      <div className="collection-skeleton__toolbar" aria-hidden="true">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
      <div className="collection-skeleton__grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="collection-skeleton__card">
            <span className="skeleton-block collection-skeleton__media" />
            <span className="skeleton-block collection-skeleton__line" />
            <span className="skeleton-block collection-skeleton__line collection-skeleton__line--short" />
          </div>
        ))}
      </div>
    </main>
  );
}
