import React from 'react';
import '@/styles/pages/favorites.css';

/** Wishlist Loading Skeleton: matches the header and grid geometry 1:1. */
export default function FavorilerimLoading() {
  return (
    <main id="main" className="favorites-page" aria-busy="true">
      <header className="favorites-head">
        <p className="favorites-eyebrow">Kaydedilenler</p>
        <h1 className="favorites-title">Favorilerim</h1>
      </header>

      <ul className="favorites-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="favorite-tile favorite-tile--skeleton">
            <span className="favorite-tile__media skeleton-block" />
            <span className="skeleton-block favorite-tile__skeleton-line" />
            <span className="skeleton-block favorite-tile__skeleton-line favorite-tile__skeleton-line--short" />
          </li>
        ))}
      </ul>
    </main>
  );
}
