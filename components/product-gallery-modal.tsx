'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Maximize2, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ProductGalleryModalProps = {
  images: string[];
  productName: string;
  imagePosition?: string;
};

export default function ProductGalleryModal({ images, productName, imagePosition }: ProductGalleryModalProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState('50% 50%');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openAt = (index: number, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setActive(index);
    setZoom(1);
    setOpen(true);
    requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: index * scrollerRef.current.clientHeight }));
  };

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const goTo = useCallback((index: number) => {
    const next = Math.max(0, Math.min(images.length - 1, index));
    setZoom(1);
    scrollerRef.current?.scrollTo({ top: next * scrollerRef.current.clientHeight, behavior: 'smooth' });
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('lightbox-open');
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); goTo(active + 1); }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); goTo(active - 1); }
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(3, value + .5));
      if (event.key === '-') setZoom((value) => Math.max(1, value - .5));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('lightbox-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, active, close, goTo]);

  const handleScroll = () => {
    const node = scrollerRef.current;
    if (!node) return;
    const next = Math.max(0, Math.min(images.length - 1, Math.round(node.scrollTop / node.clientHeight)));
    if (next !== active) { setActive(next); setZoom(1); }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (zoom === 1) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return <>
    <div className={`product-gallery-v4 ${images.length === 1 ? 'product-gallery-v4--single' : ''}`}>
      {images.map((image, index) => <figure id={`gorunum-${index + 1}`} key={image} className={index === 0 ? 'product-gallery-v4-lead' : ''}>
        <button className="product-gallery-trigger" type="button" onClick={(event) => openAt(index, event.currentTarget)} aria-label={`${productName}, görünüm ${index + 1} tam ekran incele`}>
          <img src={image} alt={`${productName}, ${index === 0 ? 'ana ürün görünümü' : `detay görünümü ${index + 1}`}`} style={index === 0 ? { objectPosition: imagePosition } : undefined} />
          <figcaption><span>0{index + 1}</span><span>{index === 0 ? 'ANA GÖRÜNÜM' : index === images.length - 1 ? 'DOKU DETAYI' : 'FORM'}</span></figcaption>
          <span className="product-gallery-zoom-hint"><Maximize2 aria-hidden="true" /> İncele</span>
        </button>
      </figure>)}
    </div>
    {open && <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`${productName} görsel galerisi`}>
      <header className="product-lightbox-header"><span className="wordmark">PANDIONES</span><div><span>{productName}</span><b>0{active + 1} / 0{images.length}</b></div><Button ref={closeRef} className="product-lightbox-close" variant="ghost" size="icon" type="button" onClick={close} aria-label="Galeriyi kapat"><X aria-hidden="true" /></Button></header>
      <nav className="product-lightbox-thumbs" aria-label="Görsel seçimi">{images.map((image, index) => <button type="button" className={active === index ? 'active' : ''} onClick={() => goTo(index)} aria-label={`Görünüm ${index + 1}`} aria-current={active === index ? 'true' : undefined} key={image}><img src={image} alt="" /><span>0{index + 1}</span></button>)}</nav>
      <div className="product-lightbox-scroll" ref={scrollerRef} onScroll={handleScroll}>
        {images.map((image, index) => <figure key={image} onPointerMove={handlePointerMove} onDoubleClick={() => setZoom((value) => value === 1 ? 2 : 1)}>
          <img src={image} alt={`${productName}, tam ekran görünüm ${index + 1}`} style={{ objectPosition: index === 0 ? imagePosition : undefined, transform: `scale(${active === index ? zoom : 1})`, transformOrigin: origin }} />
          <figcaption><span>0{index + 1}</span><span>{index === 0 ? 'ANA GÖRÜNÜM' : index === images.length - 1 ? 'DOKU DETAYI' : 'FORM'}</span></figcaption>
        </figure>)}
      </div>
      <div className="product-lightbox-controls"><Button variant="ghost" size="icon" type="button" onClick={() => setZoom((value) => Math.max(1, value - .5))} disabled={zoom === 1} aria-label="Uzaklaştır"><Minus aria-hidden="true" /></Button><span>{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon" type="button" onClick={() => setZoom((value) => Math.min(3, value + .5))} disabled={zoom === 3} aria-label="Yakınlaştır"><Plus aria-hidden="true" /></Button></div>
      {active < images.length - 1 && <button className="product-lightbox-next" type="button" onClick={() => goTo(active + 1)}>Sonraki görünüm <ChevronDown aria-hidden="true" /></button>}
      <p className="product-lightbox-help">Kaydırarak değiştir · Çift tıklayarak yakınlaştır</p>
    </div>}
  </>;
}
