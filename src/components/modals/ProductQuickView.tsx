'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function ProductQuickView() {
  const { quickViewProduct, setQuickViewProduct, addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>('M');

  if (!quickViewProduct) return null;

  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize) return;
    addToCart(quickViewProduct, selectedSize);
    setQuickViewProduct(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setQuickViewProduct(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="close-btn"
          type="button"
          aria-label="Kapat"
          onClick={() => setQuickViewProduct(null)}
        >
          ×
        </button>

        <div className="product-modal">
          <img
            src={quickViewProduct.image}
            alt={quickViewProduct.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <div className="product-detail">
            <p className="eyebrow">PANDIONES KOLEKSİYONU</p>
            <h2 className="quickview-product-name">{quickViewProduct.name}</h2>
            <p style={{ fontSize: '20px', margin: '12px 0 16px' }}>
              {money(quickViewProduct.price)}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 16px' }}>
              Renk: {quickViewProduct.color}
            </p>
            <p style={{ lineHeight: '1.7', margin: '0 0 24px' }}>
              {quickViewProduct.description}
            </p>

            <form onSubmit={handleSubmit}>
              <fieldset style={{ border: 0, padding: 0, margin: '20px 0' }}>
                <legend style={{ fontSize: '13px', marginBottom: '10px' }}>
                  Beden Seçiniz
                </legend>
                <div className="sizes">
                  {['S', 'M', 'L', 'XL'].map((size) => (
                    <label key={size}>
                      <input
                        type="radio"
                        name="size"
                        value={size}
                        checked={selectedSize === size}
                        onChange={() => setSelectedSize(size)}
                      />
                      <span>{size}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button className="primary" type="submit">
                <span>Çantaya ekle</span>
                <span>+</span>
              </button>
            </form>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link
                href={`/koleksiyon/${quickViewProduct.category}/${quickViewProduct.slug}`}
                style={{ fontSize: '13px', textDecoration: 'underline' }}
                onClick={() => setQuickViewProduct(null)}
              >
                Tüm ürün detaylarını ve kumaş özelliklerini gör ↗
              </Link>
            </div>

            <p className="demo-note" style={{ marginTop: '20px' }}>
              Orijinal koleksiyon parçası · Gerçek zamanlı stok kontrolü devrededir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
