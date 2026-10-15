'use client';

import React, { useEffect, useRef, useState } from 'react';
import PriceTag from '@/components/product/PriceTag';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { selectCardMedia, type CardFrame } from '@/lib/products/media-domain';
import { sortBySize } from '@/lib/products/sizes';
import { PHOTO_QUALITY } from '@/lib/images';

let activeCardVideo: HTMLVideoElement | null = null;

export function shouldAutoplayCardVideo(reducedMotion: boolean, interaction: 'hover' | 'tap'): boolean {
  return interaction === 'hover' && !reducedMotion;
}

const money = (price: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price);

/** Default "az kaldı" threshold; the live value comes from Yönetim → Ayarlar → Düşük stok eşiği. */
export const DEFAULT_LOW_STOCK = 3;

const detailHref = (product: Product) => `/urun/${product.slug}`;

function getColorHex(colorName: string): string {
  const c = colorName.toLowerCase();
  if (c.includes('siyah')) return '#18181b';
  if (c.includes('fildişi') || c.includes('fildisi') || c.includes('krem') || c.includes('ekru')) return '#f5f2eb';
  if (c.includes('şampanya') || c.includes('sampanya') || c.includes('bej')) return '#e6dfd3';
  if (c.includes('beyaz')) return '#ffffff';
  if (c.includes('pembe') || c.includes('rose') || c.includes('pudra')) return '#e8b8be';
  if (c.includes('mavi') || c.includes('indigo') || c.includes('gece')) return '#3d526e';
  if (c.includes('kahve') || c.includes('çikolata') || c.includes('mocha')) return '#543d2b';
  if (c.includes('bordo') || c.includes('kırmızı')) return '#661c24';
  if (c.includes('yeşil') || c.includes('adaçayı')) return '#4a5d4e';
  return '#d4d4d8';
}

/** Responsive sizes per grid layout matching collection-responsive.css column breakpoints.
 *  Duo cards are full width on mobile and 50vw on larger screens.
 *  4-column cards are 50vw on mobile (<=900px) and 25vw on desktop.
 *  6-column cards scale from 50vw on mobile down to 17vw on desktop. */
const FRAME_SIZES: Record<'2' | '4' | '6', string> = {
  '2': '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 50vw',
  '4': '(max-width: 600px) 50vw, (max-width: 900px) 50vw, 25vw',
  '6': '(max-width: 600px) 50vw, (max-width: 900px) 33vw, (max-width: 1200px) 25vw, 17vw',
};

function Frame({ frame, product, className, layout, priority = false }: {
  frame: CardFrame;
  product: Product;
  className: string;
  layout: '2' | '4' | '6';
  priority?: boolean;
}) {
  const src = frame.kind === 'VIDEO' ? frame.posterSrc : frame.src;
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={frame.alt || product.name}
      width={1086}
      height={1448}
      sizes={FRAME_SIZES[layout]}
      quality={PHOTO_QUALITY}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      className={className}
    />
  );
}

export default function CollectionProductCard({ product, layout, isFavorite, addingId, onWishlist, onQuickAdd, priority = false, lowStockThreshold = DEFAULT_LOW_STOCK }: {
  product: Product;
  /** At or below this real stock count a size is marked "az kaldı" (0 turns the mark off). */
  lowStockThreshold?: number;
  layout: '2' | '4' | '6';
  /** Above-the-fold cards load their cover eagerly with high priority (LCP). */
  priority?: boolean;
  isFavorite: boolean;
  addingId: string | null;
  onWishlist(productId: string): void;
  onQuickAdd(productId: string, size: string): void;
}) {
  const { cover, secondary } = selectCardMedia(product);
  const allFrames = secondary ? [cover, secondary] : [cover];
  const videoMedia = product.media?.find((media) => media.kind === 'VIDEO' && media.posterUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const href = detailHref(product);
  const variants = sortBySize(product.variants ?? []);
  const sizes = variants.filter((variant) => variant.stock > 0).map((variant) => variant.size);
  const siblings = (product.siblingColors ?? []).filter((sibling) => sibling.id !== product.id && sibling.image);

  function stopVideo() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    if (activeCardVideo === video) activeCardVideo = null;
    setVideoPlaying(false);
  }

  async function playVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (activeCardVideo && activeCardVideo !== video) {
      activeCardVideo.pause();
      activeCardVideo.dispatchEvent(new Event('card-video-stop'));
    }
    try {
      await video.play();
      activeCardVideo = video;
      setVideoPlaying(true);
    } catch {
      setVideoPlaying(false);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onVisibility = () => { if (document.hidden) stopVideo(); };
    const onOtherCard = () => stopVideo();
    document.addEventListener('visibilitychange', onVisibility);
    video.addEventListener('card-video-stop', onOtherCard);
    return () => {
      video.pause();
      if (activeCardVideo === video) activeCardVideo = null;
      document.removeEventListener('visibilitychange', onVisibility);
      video.removeEventListener('card-video-stop', onOtherCard);
    };
  }, [videoMedia?.id]);

  // Hover shows the second view only for a real mouse; a tap on a phone emulates mouseenter too.
  function onHoverStart() {
    if (typeof window === 'undefined') return;
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hover) return;
    if (secondary) setImageIndex(1);
    if (!videoMedia) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (shouldAutoplayCardVideo(reducedMotion, 'hover')) void playVideo();
  }

  function onHoverEnd() {
    setImageIndex(0);
    stopVideo();
  }

  const showFrame = (step: 1 | -1) =>
    setImageIndex((i) => (i + step + allFrames.length) % allFrames.length);

  /* ── Swipe (touch): a mostly horizontal move of 40px+ changes the view and swallows the tap ── */
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    swiped.current = false;
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || allFrames.length < 2) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    swiped.current = true;
    showFrame(dx < 0 ? 1 : -1);
  }

  // A swipe ends with a click on the image link; that click must not open the product.
  function onImageClick(event: React.MouseEvent) {
    if (!swiped.current) return;
    event.preventDefault();
    swiped.current = false;
  }

  const wishlist = (
    <button
      type="button"
      className={`wishlist-heart-btn ${isFavorite ? 'is-active' : ''}`}
      onClick={() => onWishlist(product.id)}
      aria-label={isFavorite ? `${product.name} favorilerden çıkar` : `${product.name} favorilere ekle`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="heart-svg">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );

  /* Quick add (4/6 grid): every size in order; sold-out sizes stay visible but disabled,
     and a real stock at or below the threshold is marked (gold dot + text), never invented. */
  const justAdded = Boolean(addingId?.startsWith(`${product.id}-`));
  const hasLowStock = variants.some((variant) => variant.stock > 0 && variant.stock <= lowStockThreshold);
  const quickAdd = sizes.length > 0 && (
    <div className={`collection-hover-sizes${layout === '6' ? ' collection-hover-sizes--six' : ''}`} role="group" aria-label={`${product.name} hızlı beden ekle`}>
      <div className="hover-sizes-head" aria-hidden="true">
        <span className="hover-sizes-kicker">Hızlı ekle</span>
        <span className={`hover-sizes-hint${justAdded ? ' is-added' : ''}`}>
          {justAdded ? 'Çantaya eklendi' : hasLowStock ? (
            <><span className="hover-low-dot" /> az kaldı</>
          ) : 'Beden seçin'}
        </span>
      </div>
      <div className="hover-sizes-row">
        {variants.map((variant, index) => {
          const soldOut = variant.stock <= 0;
          const low = !soldOut && variant.stock <= lowStockThreshold;
          const added = addingId === `${product.id}-${variant.size}`;
          const label = soldOut
            ? `${product.name} ${variant.size} bedeni tükendi`
            : added
              ? `${product.name} ${variant.size} bedeni çantaya eklendi`
              : `${product.name} ${variant.size} bedenini çantaya ekle${low ? `, son ${variant.stock} adet` : ''}`;
          return (
            <button
              key={variant.size}
              type="button"
              className={`hover-size-pill${soldOut ? ' is-soldout' : ''}${low ? ' is-low' : ''}${added ? ' is-added' : ''}`}
              style={{ '--i': index } as React.CSSProperties}
              disabled={soldOut || added}
              onClick={() => onQuickAdd(product.id, variant.size)}
              aria-label={label}
            >
              <span className="hover-size-label">
                {added ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : variant.size}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const video = videoMedia && (
    <div className={`collection-card-video ${videoPlaying ? 'is-playing' : ''}`}>
      <video
        ref={videoRef}
        src={videoMedia.url}
        poster={videoMedia.posterUrl || undefined}
        preload="none"
        muted
        playsInline
        loop
        aria-label={videoMedia.alt || `${product.name} videosu`}
      />
      <button
        type="button"
        className="collection-card-video-button"
        onClick={() => videoPlaying ? stopVideo() : void playVideo()}
        aria-label={videoPlaying ? `${product.name} videosunu durdur` : `${product.name} videosunu oynat`}
      >
        {videoPlaying ? 'Durdur' : 'Videoyu oynat'}
      </button>
    </div>
  );

  const sizeButton = (size: string, className: string) => {
    const added = addingId === `${product.id}-${size}`;
    return (
      <button
        key={size}
        type="button"
        className={`${className}${added ? ' is-added' : ''}`}
        disabled={added}
        onClick={() => onQuickAdd(product.id, size)}
        aria-label={added ? `${product.name} ${size} bedeni çantaya eklendi` : `${product.name} ${size} bedenini çantaya ekle`}
      >
        {added ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : size}
      </button>
    );
  };

  const colorLinks = siblings.length > 0 && (
    <div className="collection-card-colors" aria-label="Diğer renk seçenekleri">
      <span className="colors-lead">Renkler:</span>
      <div className="collection-swatches-track">
        {siblings.map((sibling) => (
          <Link
            key={sibling.id}
            className="collection-color-link"
            href={`/urun/${sibling.slug}`}
            title={`${sibling.color} rengini incele`}
            aria-label={`${sibling.color} rengi`}
          >
            <span
              className="collection-swatch-circle"
              style={{ backgroundColor: getColorHex(sibling.color) }}
              aria-hidden="true"
            />
            <span className="collection-color-text">{sibling.color}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  /* ── 2'Lİ GRID (DUO) ── */
  if (layout === '2') {
    return (
      <article className="collection-piece collection-piece--duo" onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}>
        <div className={`collection-duo-spread ${secondary ? '' : 'collection-duo-spread--single'}`}>
          <div className="collection-duo-panel collection-duo-panel--primary">
            <Link href={href} className="collection-duo-link" aria-label={`${product.name} incele`}>
              <Frame frame={cover} product={product} className="collection-duo-img" layout={layout} priority={priority} />
            </Link>
            {wishlist}
            {video}
          </div>
          {secondary ? (
            <div className="collection-duo-panel collection-duo-panel--secondary">
              <Link href={href} className="collection-duo-link" aria-label={`${product.name} ikinci görünümünü incele`}>
                <Frame frame={secondary} product={product} className="collection-duo-img" layout={layout} />
              </Link>
            </div>
          ) : (
            // No second real view yet: a quiet surface holds the place; it fills once one is added.
            <div className="collection-duo-panel collection-duo-panel--empty" aria-hidden="true" />
          )}
        </div>
        <div className="collection-piece-caption collection-piece-caption--duo">
          <div className="caption-left">
            <span className="caption-kicker">{product.category === 'ev-giyim' ? 'EV GİYİM' : 'İÇ GİYİM'} · {product.color}</span>
            <h2 className="caption-title"><Link href={href}>{product.name}</Link></h2>
            {product.description && <p className="caption-desc">{product.description}</p>}
            {colorLinks}
          </div>
          <div className="caption-right">
            <PriceTag className="caption-price" price={product.price} compareAtPrice={product.compareAtPrice} />
            <div className="caption-sizes-list">
              <span className="sizes-title">Bedenler:</span>
              {sizes.map((size) => sizeButton(size, 'caption-size-chip'))}
            </div>
            <Link href={href} className="caption-cta-link" aria-label={`${product.name} detaylarını incele`}>
              <span>Ürünü İncele</span>
              <span className="piece-detail-arrow-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </article>
    );
  }

  /* ── 4'LÜ VE 6'LI GRID ── */
  return (
    <article className="collection-piece" onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}>
      <div
        className={`collection-piece-gallery${secondary ? ' has-views' : ''}`}
        onTouchStart={secondary ? onTouchStart : undefined}
        onTouchEnd={secondary ? onTouchEnd : undefined}
      >
        {wishlist}
        <Link href={href} className="collection-piece-image" aria-label={`${product.name} detay sayfasına git`} onClick={onImageClick}>
          {allFrames.map((frame, i) => (
            <Frame
              key={i}
              frame={frame}
              product={product}
              className={`piece-img ${i === 0 ? 'piece-img--primary' : 'piece-img--secondary'}${imageIndex === i ? ' is-active' : ''}`}
              layout={layout}
              priority={priority && i === 0}
            />
          ))}
        </Link>
        {video}
        {quickAdd}
      </div>
      <div className="collection-piece-caption">
        <div className="caption-text-group">
          <span className="piece-category">{product.category === 'ev-giyim' ? 'EV GİYİM' : 'İÇ GİYİM'}</span>
          <h2 className="piece-name"><Link href={href}>{product.name}</Link></h2>
          <span className="piece-color">{product.color}</span>
          {colorLinks}
        </div>
        <div className="piece-meta">
          <PriceTag className="piece-price" price={product.price} compareAtPrice={product.compareAtPrice} />
        </div>
      </div>
    </article>
  );
}
