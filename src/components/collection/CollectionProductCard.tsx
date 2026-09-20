'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { selectCardMedia, type CardFrame } from '@/lib/products/media-domain';

let activeCardVideo: HTMLVideoElement | null = null;

export function shouldAutoplayCardVideo(reducedMotion: boolean, interaction: 'hover' | 'tap'): boolean {
  return interaction === 'hover' && !reducedMotion;
}

const money = (price: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price);
const detailHref = (product: Product) => `/koleksiyon/${product.category}/${product.slug}`;
const roleLabel = (role?: string) => role === 'MODEL' ? 'Manken çekimi' : role === 'DETAIL' ? 'Detay çekimi' : 'Düz çekim';

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

  const wishlist = <button type="button" className={`wishlist-heart-btn ${isFavorite ? 'is-active' : ''}`} onClick={() => onWishlist(product.id)} aria-label={isFavorite ? `${product.name} favorilerden çıkar` : `${product.name} favorilere ekle`}>
    <svg viewBox="0 0 24 24" aria-hidden="true" className="heart-svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
  </button>;

  const video = videoMedia && <div className={`collection-card-video ${videoPlaying ? 'is-playing' : ''}`}>
    <video ref={videoRef} src={videoMedia.url} poster={videoMedia.posterUrl || undefined} preload="none" muted playsInline loop aria-label={videoMedia.alt || `${product.name} videosu`} />
    <button type="button" className="collection-card-video-button" onClick={() => videoPlaying ? stopVideo() : void playVideo()} aria-label={videoPlaying ? `${product.name} videosunu durdur` : `${product.name} videosunu oynat`}>{videoPlaying ? 'Durdur' : 'Videoyu oynat'}</button>
  </div>;

  const colorLinks = siblings.length > 0 && <div className="collection-card-colors" aria-label="Diğer renkler"><span>Diğer renkler</span>{siblings.map((sibling) => <Link key={sibling.id} className="collection-color-link" href={`/koleksiyon/${sibling.category}/${sibling.slug}`}>{sibling.color}</Link>)}</div>;

  if (layout === '2') return <article className="collection-piece collection-piece--duo" onMouseEnter={onHoverStart} onMouseLeave={stopVideo}>
    <div className={`collection-duo-spread ${secondary ? '' : 'collection-duo-spread--single'}`}>
      <div className="collection-duo-panel collection-duo-panel--primary"><Link href={href} className="collection-duo-link" aria-label={`${product.name} incele`}><Frame frame={cover} product={product} className="collection-duo-img" /></Link><span className="collection-duo-badge">01 / {roleLabel(product.media?.find((media) => media.isCover)?.role)}</span>{wishlist}{video}</div>
      {secondary && <div className="collection-duo-panel collection-duo-panel--secondary"><Link href={href} className="collection-duo-link" aria-label={`${product.name} ikinci görünümünü incele`}><Frame frame={secondary} product={product} className="collection-duo-img" /></Link><span className="collection-duo-badge">02 / {roleLabel(product.media?.find((media) => media.url === secondary.src)?.role)}</span></div>}
    </div>
    <div className="collection-piece-caption collection-piece-caption--duo"><div className="caption-left"><span className="caption-kicker">{product.category === 'ev-giyim' ? 'EV GİYİM' : 'İÇ GİYİM'} · {product.color}</span><h2 className="caption-title"><Link href={href}>{product.name}</Link></h2>{product.description && <p className="caption-desc">{product.description}</p>}{colorLinks}</div><div className="caption-right"><span className="caption-price">{money(product.price)}</span><div className="caption-sizes-list"><span className="sizes-title">Bedenler:</span>{sizes.map((size) => <button key={size} type="button" className="caption-size-chip" disabled={addingId === `${product.id}-${size}`} onClick={() => onQuickAdd(product.id, size)} aria-label={`${product.name} ${size} bedeni çantaya ekle`}>{size}</button>)}</div><Link href={href} className="caption-cta-link">Ürünü İncele <span aria-hidden="true">→</span></Link></div></div>
  </article>;

  return <article className="collection-piece" onMouseEnter={onHoverStart} onMouseLeave={stopVideo}>
    <div className="collection-piece-gallery">{wishlist}<Link href={href} className="collection-piece-image" aria-label={`${product.name} detay sayfasına git`}><Frame frame={cover} product={product} className="piece-img piece-img--primary" />{secondary && <Frame frame={secondary} product={product} className="piece-img piece-img--secondary" />}</Link>{video}{sizes.length > 0 && <div className="collection-hover-sizes" aria-label="Hızlı beden ekle"><span className="hover-sizes-kicker">Hızlı Ekle:</span><div className="hover-sizes-row">{sizes.map((size) => <button key={size} type="button" className="hover-size-pill" disabled={addingId === `${product.id}-${size}`} onClick={() => onQuickAdd(product.id, size)} aria-label={`${product.name} ${size} bedenini sepete ekle`}>{size}</button>)}</div></div>}</div>
    <div className="collection-piece-caption"><div className="caption-text-group"><span className="piece-category">{product.category === 'ev-giyim' ? 'EV GİYİM' : 'İÇ GİYİM'}</span><h2 className="piece-name"><Link href={href}>{product.name}</Link></h2><span className="piece-color">{product.color}</span>{colorLinks}</div><div className="piece-meta"><span className="piece-price">{money(product.price)}</span><Link className="piece-detail-link" href={href}>İncele <span aria-hidden="true">↗</span></Link></div></div>
  </article>;
}
