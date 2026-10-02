'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import StatusPanel from '@/components/ui/StatusPanel';
import { formatTRY } from '@/lib/format/money';
import { categoryLabel, productHref } from './lib';

type WishlistEntry = {
  id?: string;
  product?: {
    id: string;
    slug: string;
    name: string;
    price: number;
    image?: string | null;
    category?: string | null;
    variants?: Array<{ size: string; stock: number }>;
  } | null;
};

type FavoritesTabProps = {
  wishlists: WishlistEntry[];
  onChanged: () => Promise<void>;
};

export default function FavoritesTab({ wishlists, onChanged }: FavoritesTabProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const entries = wishlists.filter((w) => w.product);

  const remove = async (productId: string) => {
    if (removingId) return;
    setRemovingId(productId);
    setError(null);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await onChanged();
    } catch {
      setError({ id: productId, message: 'Favorilerden çıkarılamadı. Tekrar deneyin.' });
    } finally {
      setRemovingId(null);
    }
  };

  if (entries.length === 0) {
    return (
      <StatusPanel
        headingLevel={2}
        title="Favori listeniz boş"
        actions={<Link href="/yeni-gelenler" className="btn btn--primary">Yeni gelenlere git</Link>}
      >
        <p>Ürün sayfalarındaki kalp simgesiyle kaydettiğiniz parçalar, stok bilgisiyle burada görünür.</p>
      </StatusPanel>
    );
  }

  return (
    <>
      <div className="account-section-head account-section-head--row">
        <p className="account-section-desc">
          <span className="account-num">{entries.length}</span> parça kayıtlı.
        </p>
        <Link href="/favorilerim" className="btn btn--link">Favoriler sayfasında aç</Link>
      </div>

      <ul className="favorite-grid">
        {entries.map((entry, index) => {
          const product = entry.product!;
          const sizes = (product.variants ?? []).filter((v) => v.stock > 0).map((v) => v.size);
          const href = productHref(product.slug);
          const category = categoryLabel(product.category);
          return (
            <li key={entry.id ?? product.id} className="favorite-card account-reveal" style={{ '--i': index } as React.CSSProperties}>
              <div className="favorite-card__media">
                {product.image ? (
                  <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 44vw" />
                ) : null}
                <button
                  type="button"
                  className="favorite-card__remove"
                  aria-label={`${product.name} favorilerden çıkar`}
                  aria-busy={removingId === product.id || undefined}
                  disabled={removingId === product.id}
                  onClick={() => remove(product.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <div className="favorite-card__body">
                {category ? <p className="account-label">{category}</p> : null}
                <h3 className="piece-name">
                  {href ? <Link href={href}>{product.name}</Link> : product.name}
                </h3>
                <p className="price">{formatTRY(product.price)}</p>
                <p className={`favorite-card__stock${sizes.length ? '' : ' is-out'}`}>
                  {sizes.length ? `Mevcut bedenler: ${sizes.join(', ')}` : 'Tükendi'}
                </p>
                {error?.id === product.id ? <p className="field__error" role="alert">{error.message}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
