'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { selectCardMedia, type CardFrame } from '@/lib/products/media-domain';

let activeCardVideo: HTMLVideoElement | null = null;

export function shouldAutoplayCardVideo(reducedMotion: boolean, interaction: 'hover' | 'tap'): boolean {
  return interaction === 'hover' && !reducedMotion;
}

const money = (price: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price);

const detailHref = (product: Product) => `/koleksiyon/${product.category}/${product.slug}`;

const roleLabel = (role?: string) =>
  role === 'MODEL' ? 'Manken Çekimi' : role === 'DETAIL' ? 'Doku & Detay' : 'Atelier';

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

function Frame({ frame, product, className }: { frame: CardFrame; product: Product; className: string }) {
  const src = frame.kind === 'VIDEO' ? frame.posterSrc : frame.src;
  if (!src) return null;
  return <img src={src} alt={frame.alt || product.name} width={1086} height={1448} loading="lazy" className={className} />;
}

export default function CollectionProductCard({ product, layout, isFavorite, addingId, onWishlist, onQuickAdd }: {
  product: Product;
  layout: '2' | '4' | '6';
  isFavorite: boolean;
  addingId: string | null;
  onWishlist(productId: string): void;
  onQuickAdd(productId: string, size: string): void;
}) {
  const { cover, secondary } = selectCardMedia(product);
  const videoMedia = product.media?.find((media) => media.kind === 'VIDEO' && media.posterUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const href = detailHref(product);
  const sizes = (product.variants ?? []).filter((variant) => variant.stock > 0).map((variant) => variant.size);
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

  function onHoverStart() {
    if (typeof window === 'undefined' || !videoMedia) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hover && shouldAutoplayCardVideo(reducedMotion, 'hover')) void playVideo();
  }

  const coverRole = product.media?.find((media) => media.isCover)?.role;

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

  const colorLinks = siblings.length > 0 && (
    <div className="collection-card-colors" aria-label="Diğer renk seçenekleri">
      <span className="colors-lead">Renkler:</span>
      <div className="collection-swatches-track">
        {siblings.map((sibling) => (
          <Link
            key={sibling.id}
            className="collection-color-link"
            href={`/koleksiyon/${sibling.category}/${sibling.slug}`}
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
      <article className="collection-piece collection-piece--duo" onMouseEnter={onHoverStart} onMouseLeave={stopVideo}>
        <div className={`collection-duo-spread ${secondary ? '' : 'collection-duo-spread--single'}`}>
          <div className="collection-duo-panel collection-duo-panel--primary">
            <Link href={href} className="collection-duo-link" aria-label={`${product.name} incele`}>
              <Frame frame={cover} product={product} className="collection-duo-img" />
            </Link>
            <span className="collection-duo-badge">01 / {roleLabel(coverRole)}</span>
            {wishlist}
            {video}
          </div>
          {secondary && (
            <div className="collection-duo-panel collection-duo-panel--secondary">
              <Link href={href} className="collection-duo-link" aria-label={`${product.name} ikinci görünümünü incele`}>
                <Frame frame={secondary} product={product} className="collection-duo-img" />
              </Link>
              <span className="collection-duo-badge">02 / {roleLabel(product.media?.find((media) => media.url === secondary.src)?.role)}</span>
            </div>
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
            <span className="caption-price">{money(product.price)}</span>
            <div className="caption-sizes-list">
              <span className="sizes-title">Bedenler:</span>
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="caption-size-chip"
                  disabled={addingId === `${product.id}-${size}`}
                  onClick={() => onQuickAdd(product.id, size)}
                  aria-label={`${product.name} ${size} bedeni çantaya ekle`}
                >
                  {size}
                </button>
              ))}
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
    <article className="collection-piece" onMouseEnter={onHoverStart} onMouseLeave={stopVideo}>
      <div className="collection-piece-gallery">
        <span className="collection-piece-badge" aria-hidden="true">
          {roleLabel(coverRole)}
        </span>
        {wishlist}
        <Link href={href} className="collection-piece-image" aria-label={`${product.name} detay sayfasına git`}>
          <Frame frame={cover} product={product} className="piece-img piece-img--primary" />
          {secondary && <Frame frame={secondary} product={product} className="piece-img piece-img--secondary" />}
        </Link>
        {video}
        {sizes.length > 0 && (
          <div className="collection-hover-sizes" aria-label="Hızlı beden ekle">
            <span className="hover-sizes-kicker">Hızlı Ekle:</span>
            <div className="hover-sizes-row">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="hover-size-pill"
                  disabled={addingId === `${product.id}-${size}`}
                  onClick={() => onQuickAdd(product.id, size)}
                  aria-label={`${product.name} ${size} bedenini sepete ekle`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="collection-piece-caption">
        <div className="caption-text-group">
          <span className="piece-category">{product.category === 'ev-giyim' ? 'EV GİYİM' : 'İÇ GİYİM'}</span>
          <h2 className="piece-name"><Link href={href}>{product.name}</Link></h2>
          <span className="piece-color">{product.color}</span>
          {colorLinks}
        </div>
        <div className="piece-meta">
          <span className="piece-price">{money(product.price)}</span>
          <Link className="piece-detail-link" href={href} aria-label={`${product.name} incele`}>
            <span>İncele</span>
            <span className="piece-detail-arrow-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7V16" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
