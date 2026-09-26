'use client';

import React from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

type Props = {
  product: Product;
  relatedProducts: Product[];
  onOpenTerms: () => void;
};

const CROP_STORY_IMAGES: Record<string, string> = {
  'siyah-crop': '/assets/siyah-crop/2.png',
  'beyaz-crop': '/assets/beyaz-crop/2.png',
  'askili-crop': '/assets/askili-crop/2.jpeg',
};

export default function ProductLowerContent({ product, relatedProducts, onOpenTerms }: Props) {
  const { isFavorite, toggleWishlist } = useWishlist();
  const { addToCart, showToast, setIsBagOpen } = useCart();

  const related = relatedProducts.filter((item) => item.id !== product.id).slice(0, 3);
  const hasFabricCare = Boolean(product.material?.trim() || product.care?.trim());
  const storyImage = product.images?.find((image) => image && image !== product.image)
    || CROP_STORY_IMAGES[product.slug]
    || product.image;
  const money = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

  const defaultSizes = ['S', 'M', 'L', 'XL'];

  return (
    <div className="pdp-lower">
      {/* ── ABOUT SECTION ── */}
      <section className="pdp-lower-about" aria-labelledby="pdp-about-title">
        <div className="pdp-lower-inner">
          <div className="pdp-lower-story-media">
            <img
              className="pdp-lower-story-image"
              src={storyImage}
              alt={`${product.name} ürün görünümü`}
              width={900}
              height={1125}
              loading="lazy"
            />
          </div>
          <div className="pdp-lower-about-copy">
            <span className="pdp-lower-story-eyebrow">PANDIONES / ÜRÜN DETAYI</span>
            <h2 id="pdp-about-title">Ürün hakkında</h2>
            <p className="pdp-lower-description">{product.description}</p>
            {product.details?.trim() && <p className="pdp-lower-details">{product.details}</p>}
          </div>
        </div>
      </section>

      {/* ── NOTES & DISCLOSURES SECTION ── */}
      <section className="pdp-lower-notes" aria-labelledby="pdp-notes-title">
        <div className="pdp-lower-inner">
          <h2 id="pdp-notes-title">Bilmen gerekenler</h2>
          <div className="pdp-lower-disclosures">
            {hasFabricCare && (
              <details>
                <summary>Kumaş ve bakım</summary>
                <div className="pdp-lower-disclosure-body">
                  {product.material?.trim() && <p>{product.material}</p>}
                  {product.care?.trim() && <p>{product.care}</p>}
                </div>
              </details>
            )}
            <details>
              <summary>Teslimat</summary>
              <div className="pdp-lower-disclosure-body">
                <p>Sipariş ve teslimat koşullarını satış koşullarında inceleyebilirsin.</p>
              </div>
            </details>
            <details>
              <summary>Değişim ve iade</summary>
              <div className="pdp-lower-disclosure-body">
                <p>İade ve değişim talepleri ürünün durumuna göre değerlendirilir. Ayrıntılar satış koşullarındadır.</p>
              </div>
            </details>
            <button type="button" className="pdp-lower-terms" onClick={onOpenTerms}>
              Satış koşullarını incele
            </button>
          </div>
        </div>
      </section>

      {/* ── KOLEKSİYONDAN (COLLECTION RELATED CARDS) ── */}
      {related.length > 0 && (
        <section className="pdp-lower-related" aria-labelledby="pdp-related-title">
          <div className="pdp-lower-inner">
            <div className="pdp-related-header">
              <span className="pdp-related-eyebrow">PANDIONES ÖZEL SEÇKİLERİ</span>
              <h2 id="pdp-related-title">Koleksiyondan</h2>
            </div>

            <ul className="pdp-lower-related-grid" data-count={related.length}>
              {related.map((item) => {
                const isFav = isFavorite(item.id);
                const itemSizes = item.variants?.length
                  ? item.variants.map((v) => v.size)
                  : defaultSizes;

                return (
                  <li key={item.id}>
                    <article className="pdp-related-card">
                      {/* Image Frame with Quick-Add Drawer and Wishlist Heart */}
                      <div className="pdp-related-media">
                        <Link
                          href={`/koleksiyon/${item.category}/${item.slug}`}
                          className="pdp-related-img-link"
                          aria-label={`${item.name} detaylarını gör`}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            width={720}
                            height={960}
                            loading="lazy"
                            className="pdp-related-img-primary"
                          />
                          {item.images?.[1] && (
                            <img
                              src={item.images[1]}
                              alt={`${item.name} görünüm`}
                              width={720}
                              height={960}
                              loading="lazy"
                              className="pdp-related-img-secondary"
                            />
                          )}
                        </Link>

                        {/* Floating Wishlist Heart */}
                        <button
                          type="button"
                          className={`pdp-related-fav-btn${isFav ? ' is-active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(item);
                          }}
                          aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>

                        {/* Floating Quick Size Selector Bar on Hover */}
                        <div className="pdp-related-quick-bar" aria-label="Hızlı beden seçimi">
                          <span className="pdp-related-quick-title">HIZLI EKLE</span>
                          <div className="pdp-related-quick-pills">
                            {itemSizes.map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                className="pdp-related-quick-pill"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart(item, sz, 1);
                                  showToast(`${item.name} (${sz}) çantana eklendi.`);
                                  setIsBagOpen(true);
                                }}
                                aria-label={`${sz} beden sepete ekle`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Meta: Title, Price, and Available Sizes Row */}
                      <div className="pdp-related-info">
                        <div className="pdp-related-info-header">
                          <h3 className="pdp-related-name">
                            <Link href={`/koleksiyon/${item.category}/${item.slug}`}>
                              {item.name}
                            </Link>
                          </h3>
                          <span className="pdp-related-price">{money(item.price)}</span>
                        </div>

                        {/* Available Sizes Pill Row */}
                        <div className="pdp-related-sizes-row">
                          <span className="pdp-related-sizes-label">Beden:</span>
                          <div className="pdp-related-size-chips">
                            {itemSizes.map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                className="pdp-related-size-chip"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart(item, sz, 1);
                                  showToast(`${item.name} (${sz}) çantana eklendi.`);
                                  setIsBagOpen(true);
                                }}
                                title={`${sz} beden hızlı ekle`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
