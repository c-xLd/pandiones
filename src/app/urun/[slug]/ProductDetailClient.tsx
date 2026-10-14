'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';
import ProductLowerContent from '@/components/product/ProductLowerContent';
import { requestStockAlert } from '@/components/product/StockAlertForm';
import { toGalleryFrames } from '@/lib/products/media-domain';
import { sortBySize } from '@/lib/products/sizes';
import { PHOTO_QUALITY, THUMB_QUALITY } from '@/lib/images';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/product.css';
import '@/styles/components/size-sheet.css';
import '@/styles/components/gallery-modal.css';
import '@/styles/components/product-drawer.css';

// Helper calculations matching tests/gallery-motion.test.mjs
export function galleryOffset(offset: number, distance: number, width: number) {
  return width > 0 ? ((offset + distance) % width + width) % width : 0;
}

export function galleryAutoplays(mobile: boolean, paused: boolean, hovered = false, focused = false) {
  return !mobile && !paused && !hovered && !focused;
}

export function galleryCycleWidth(itemWidths: number[], gap: number) {
  return itemWidths.reduce((total, width) => total + width, 0) + gap * itemWidths.length;
}

export function productBarState(panelBottom: number, footerTop: number, viewportHeight: number) {
  return panelBottom <= 0 && footerTop > viewportHeight ? 'visible' : 'hidden';
}


const PRODUCT_REFS: Record<string, string> = {
  'beyaz-crop': 'PN-001',
  'siyah-crop': 'PN-002',
  'askili-crop': 'PN-003',
  'pembe-fitilli-takim': 'PN-004',
  'bebek-mavisi-takim': 'PN-005',
  'pembe-tul-takim': 'PN-006',
  'beyaz-fitilli-atlet': 'PN-007',
};

export default function ProductDetailClient({ product, relatedProducts }: { product: Product; relatedProducts: Product[] }) {
  const { addToCart, setActiveGuide, showToast, setIsBagOpen } = useCart();
  const { toggleWishlist, isFavorite } = useWishlist();

  // Price & References
  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  // Shown only when a real reference exists for this product (no shared placeholder number).
  const productRef = PRODUCT_REFS[product.slug] || PRODUCT_REFS[product.id] || '';
  // Colour variants are real sibling products (own page, own photo); the current one first.
  const colorVariants = [
    { id: product.id, slug: product.slug, color: product.color, image: product.image, current: true },
    ...(product.siblingColors ?? [])
      .filter((sibling) => sibling.id !== product.id && sibling.image)
      .map((sibling) => ({ id: sibling.id, slug: sibling.slug, color: sibling.color, image: sibling.image, current: false })),
  ];
  const productCategoryLabel = product.category === 'ev-giyim' || product.category === 'sleep' ? 'EV GİYİM' : 'İÇ GİYİM';
  const isFav = isFavorite(product.id);
  const baseShots = toGalleryFrames(product).map((frame, index) => ({
    id: `shot-${index + 1}`,
    src: frame.src,
    posterSrc: frame.posterSrc,
    kind: frame.kind,
    alt: frame.alt || product.name,
    label: String(index + 1).padStart(2, '0'),
    className: index === 0 ? 'pdp-shot pdp-shot-primary' : 'pdp-shot pdp-shot-detail',
  }));

  // Sizes are shared between the full panel and compact purchase dock.
  // Sizes come from the product's real variants (wearing order). Sold-out sizes stay visible but cannot be chosen;
  // the first size in stock is preselected, none when everything is sold out.
  const sizeOptions = sortBySize(product.variants ?? []).map((variant) => ({ size: variant.size, stock: variant.stock }));
  const firstInStock = sizeOptions.find((option) => option.stock > 0)?.size ?? '';
  const [selectedSize, setSelectedSize] = useState<string>(firstInStock);
  const canAdd = sizeOptions.some((option) => option.size === selectedSize && option.stock > 0);

  // Interactive Product Info Panel Tab
  const [infoTab, setInfoTab] = useState<'details' | 'fabric' | 'care' | 'shipping'>('details');

  // Interactive Garment Spotlight for Siyah Crop & PDP
  const [spotlightImage, setSpotlightImage] = useState<string>(product.image);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  useEffect(() => {
    setSpotlightImage(product.image);
    setActiveHotspot(null);
  }, [product.image, product.slug]);

  // Apply product-page class to body and title
  useEffect(() => {
    document.body.classList.add('product-page', 'js-enabled');
    document.body.dataset.productId = product.slug;
    return () => {
      document.body.classList.remove('product-page');
      // Keep js-enabled for other pages too
      delete document.body.dataset.productId;
    };
  }, [product.slug]);

  // Product purchase panel refs and motion states
  const productPanelRef = useRef<HTMLElement | null>(null);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isPanelHidden, setIsPanelHidden] = useState<boolean>(false);

  // Dynamically synchronize panel height with layout to ensure 0 gap and 0 overlap
  useEffect(() => {
    const panel = productPanelRef.current;
    if (!panel) return;

    // The panel's height animates when it compacts on scroll. Only the full, settled height is
    // written, so the fold above never follows the animation or the compact size.
    const inner = panel.querySelector<HTMLElement>('.pdp-purchase-panel');
    let animating = false;

    const syncHeight = () => {
      if (animating || panel.classList.contains('is-compact')) return;
      const h = panel.offsetHeight;
      if (h > 0) {
        document.documentElement.style.setProperty('--pdp-panel-h', `${h}px`);
      }
    };

    const onTransitionRun = (e: TransitionEvent) => {
      if (e.target === inner && e.propertyName === 'height') animating = true;
    };
    const onTransitionDone = (e: TransitionEvent) => {
      if (e.target !== inner || e.propertyName !== 'height') return;
      animating = false;
      syncHeight();
    };
    inner?.addEventListener('transitionrun', onTransitionRun);
    inner?.addEventListener('transitionend', onTransitionDone);
    inner?.addEventListener('transitioncancel', onTransitionDone);

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(panel);
    return () => {
      ro.disconnect();
      inner?.removeEventListener('transitionrun', onTransitionRun);
      inner?.removeEventListener('transitionend', onTransitionDone);
      inner?.removeEventListener('transitioncancel', onTransitionDone);
    };
  }, []);

  // Scroll listener for subtle elevation shadow and collection section exit animation
  useEffect(() => {
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        setIsScrolled(scrollY > 120);

        // Hide panel when reaching the collection section ("Koleksiyondan") or bottom
        const relatedSection = document.querySelector('.pdp-lower-related');
        const footer = document.querySelector('footer');

        let shouldHide = false;
        if (relatedSection) {
          const rect = relatedSection.getBoundingClientRect();
          if (rect.top <= window.innerHeight - 30) {
            shouldHide = true;
          }
        } else if (footer) {
          const footerRect = footer.getBoundingClientRect();
          if (footerRect.top <= window.innerHeight) {
            shouldHide = true;
          }
        }
        setIsPanelHidden(shouldHide);
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Continuous Motion Gallery State & Refs
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);

  const [paused, setPaused] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [currentIndexState, setCurrentIndexState] = useState<number>(0);
  const [isSizeSheetOpen, setIsSizeSheetOpen] = useState<boolean>(false);
  const indicatorThumbRef = useRef<HTMLSpanElement | null>(null);
  const currentIndexRef = useRef<number>(0);

  // Luxury Editorial Gallery Modal State (Emil Kowalski + TasteSkill)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeModalIndex, setActiveModalIndex] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  // Exit animation phase: the overlay plays its short exit before it unmounts.
  const [isModalClosing, setIsModalClosing] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);
  const modalOpenerRef = useRef<HTMLElement | null>(null);
  const modalFeedRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openZoom = useCallback((_src: string, _alt: string, idx?: number) => {
    const targetIdx = idx !== undefined ? idx : 0;
    modalOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveModalIndex(targetIdx);
    setIsZoomed(false);
    setIsModalClosing(false);
    setIsModalOpen(true);
    setTimeout(() => {
      slideRefs.current[targetIdx]?.scrollIntoView({ behavior: 'auto', block: 'center' });
      thumbRefs.current[targetIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 15);
  }, []);

  const closeZoom = useCallback(() => {
    setIsZoomed(false);
    const finish = () => {
      setIsModalOpen(false);
      setIsModalClosing(false);
      // Back to whatever opened the gallery.
      modalOpenerRef.current?.focus({ preventScroll: true });
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    setIsModalClosing(true);
    window.setTimeout(finish, 180);
  }, []);

  const scrollToSlide = useCallback((index: number) => {
    setIsZoomed(false);
    setActiveModalIndex(index);
    slideRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    thumbRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (isZoomed) {
      setIsZoomed(false);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const wrap = e.currentTarget.parentElement;
      wrap?.style.setProperty('--zoom-x', `${x}%`);
      wrap?.style.setProperty('--zoom-y', `${y}%`);
      setIsZoomed(true);
    }
  }, [isZoomed]);

  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const img = e.currentTarget.querySelector('img');
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    e.currentTarget.style.setProperty('--zoom-x', `${x}%`);
    e.currentTarget.style.setProperty('--zoom-y', `${y}%`);
  }, [isZoomed]);

  // Dialog focus: move in on open, keep Tab inside while open (focus returns in closeZoom).
  useEffect(() => {
    if (!isModalOpen) return;
    modalCloseRef.current?.focus({ preventScroll: true });
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const items = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), video[controls], [tabindex="0"]'),
      ).filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [isModalOpen]);

  // Lock body scroll and handle keyboard navigation when modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          closeZoom();
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setIsZoomed(false);
        setActiveModalIndex((prev) => {
          const next = Math.min(prev + 1, baseShots.length - 1);
          slideRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          thumbRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsZoomed(false);
        setActiveModalIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          slideRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          thumbRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, isZoomed, closeZoom, baseShots.length]);

  // Synchronize active thumbnail as user scrolls through slides in modal
  useEffect(() => {
    if (!isModalOpen) return;
    const feed = modalFeedRef.current;
    if (!feed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Number(entry.target.getAttribute('data-slide-index'));
            if (!isNaN(index)) {
              setActiveModalIndex(index);
              thumbRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        });
      },
      {
        root: feed,
        threshold: 0.5,
      }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [isModalOpen]);

  // Motion engine implementation from dist/gallery-motion.js
  useEffect(() => {
    const gallery = galleryRef.current;
    const track = trackRef.current;
    if (!gallery || !track) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 900px)');

    setIsMobile(mobile.matches);
    let isPaused = reduced.matches;
    setPaused(isPaused);

    // Initial base shots (original DOM nodes before clones)
    const originalShots = Array.from(track.querySelectorAll<HTMLElement>('[data-flow-original="true"]'));
    if (originalShots.length === 0) return;

    originalShots.forEach((shot, index) => {
      shot.dataset.flowIndex = String(index);
      shot.tabIndex = -1;
      const img = shot.querySelector('img');
      if (img) img.draggable = false;
    });

    // Remove any previously appended clones
    track.querySelectorAll('[data-flow-clone="true"]').forEach((c) => c.remove());

    // Append 3 sets of clones for continuous seamless scrolling
    for (let copy = 0; copy < 3; copy += 1) {
      originalShots.forEach((shot) => {
        const clone = shot.cloneNode(true) as HTMLElement;
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
        clone.setAttribute('aria-hidden', 'true');
        clone.dataset.flowClone = 'true';
        clone.querySelector('video')?.removeAttribute('controls');
        clone.querySelector('video')?.removeAttribute('src');
        track.append(clone);
      });
    }

    let offset = 0;
    let cycleWidth = 0;
    let frame = 0;
    let lastTime = 0;
    let drag: { id: number; x: number; start: number } | null = null;
    let moved = false;
    let visible = true;
    let hovered = false;
    let focused = false;
    let inspectedIndex: number | null = null;
    // The pointer is often already over the gallery when the page opens (it was on the card that
    // was clicked). Hover only pauses the flow after a short grace, so the gallery starts at once.
    const hoverGraceUntil = performance.now() + 1500;

    function currentIndex() {
      if (mobile.matches) {
        return Math.min(
          originalShots.length - 1,
          Math.max(0, Math.round(track!.scrollLeft / (track!.clientWidth || 1)))
        );
      }
      return cycleWidth ? Math.floor(offset / (cycleWidth / originalShots.length)) % originalShots.length : 0;
    }

    function render() {
      if (!track) return;
      if (mobile.matches) {
        track.style.transform = 'none';
        const maxScroll = (track.scrollWidth - track.clientWidth) || 1;
        const progress = Math.max(0, Math.min(1, track.scrollLeft / maxScroll));
        const translateXPercent = progress * (originalShots.length - 1) * 100;
        if (indicatorThumbRef.current) {
          indicatorThumbRef.current.style.transform = `translateX(${translateXPercent}%)`;
        }
        const idx = currentIndex();
        if (idx !== currentIndexRef.current) {
          currentIndexRef.current = idx;
          setCurrentIndexState(idx);
        }
      } else {
        track.style.transform = `translate3d(${-offset}px,0,0)`;
        const idx = currentIndex();
        if (idx !== currentIndexRef.current) {
          currentIndexRef.current = idx;
          setCurrentIndexState(idx);
        }
      }
      if (countRef.current) {
        countRef.current.textContent = `${(currentIndexRef.current ?? 0) + 1} / ${originalShots.length}`;
      }
    }

    function measure() {
      if (!track) return;
      const styles = getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const nextWidth = galleryCycleWidth(
        originalShots.map((shot) => shot.getBoundingClientRect().width),
        gap
      );
      offset = cycleWidth ? (offset / cycleWidth) * nextWidth : 0;
      cycleWidth = nextWidth;
      render();
    }

    // Pointer events on gallery
    const onPointerEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && performance.now() > hoverGraceUntil) {
        hovered = true;
        lastTime = 0;
      }
    };
    const onPointerLeave = () => {
      hovered = false;
      lastTime = 0;
    };
    const onFocusIn = () => {
      focused = true;
      lastTime = 0;
    };
    const onFocusOut = (e: FocusEvent) => {
      focused = gallery.contains(e.relatedTarget as Node);
      lastTime = 0;
    };

    gallery.addEventListener('pointerenter', onPointerEnter);
    gallery.addEventListener('pointerleave', onPointerLeave);
    gallery.addEventListener('focusin', onFocusIn);
    gallery.addEventListener('focusout', onFocusOut);

    const onPointerOver = (e: Event) => {
      const shot = (e.target as HTMLElement).closest('[data-flow-index]') as HTMLElement | null;
      if (shot) inspectedIndex = Number(shot.dataset.flowIndex);
    };
    track.addEventListener('pointerover', onPointerOver);

    const onReducedChange = () => {
      isPaused = reduced.matches;
      setPaused(isPaused);
      lastTime = 0;
    };
    reduced.addEventListener('change', onReducedChange);

    const onMobileChange = () => {
      setIsMobile(mobile.matches);
      offset = 0;
      inspectedIndex = null;
      track.scrollLeft = 0;
      drag = null;
      measure();
    };
    mobile.addEventListener('change', onMobileChange);

    const onScroll = () => {
      if (mobile.matches) render();
    };
    track.addEventListener('scroll', onScroll, { passive: true });

    // Step direction
    const step = (direction: number) => {
      if (mobile.matches) {
        const nextIdx = Math.max(0, Math.min(originalShots.length - 1, currentIndex() + direction));
        track.scrollTo({
          left: nextIdx * track.clientWidth,
          behavior: reduced.matches ? 'instant' : 'smooth',
        });
        return;
      }
      offset = galleryOffset(offset, (direction * cycleWidth) / originalShots.length, cycleWidth);
      render();
    };

    const prevBtn = gallery.querySelector('[data-pdp-prev]');
    const nextBtn = gallery.querySelector('[data-pdp-next]');
    const onPrevClick = () => step(-1);
    const onNextClick = () => step(1);

    prevBtn?.addEventListener('click', onPrevClick);
    nextBtn?.addEventListener('click', onNextClick);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        step(e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    gallery.addEventListener('keydown', onKeyDown);

    // Pointer drag
    const onPointerDown = (e: PointerEvent) => {
      if (!track.contains(e.target as Node) || e.button !== 0) return;
      moved = false;
      drag = { id: e.pointerId, x: e.clientX, start: e.clientX };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (mobile.matches) {
        if (Math.abs(e.clientX - drag.start) > 6) moved = true;
        return;
      }
      if (Math.abs(e.clientX - drag.start) > 6) {
        moved = true;
        if (!gallery.hasPointerCapture(e.pointerId)) gallery.setPointerCapture(e.pointerId);
      }
      if (moved) {
        offset = galleryOffset(offset, drag.x - e.clientX, cycleWidth);
        render();
      }
      drag.x = e.clientX;
    };

    const release = () => {
      drag = null;
      lastTime = 0;
    };

    gallery.addEventListener('pointerdown', onPointerDown);
    gallery.addEventListener('pointermove', onPointerMove);
    gallery.addEventListener('pointerup', release);
    gallery.addEventListener('pointercancel', release);
    gallery.addEventListener('lostpointercapture', release);
    gallery.addEventListener('pointerleave', () => {
      if (!moved) release();
    });

    const onTrackClick = (e: MouseEvent) => {
      const shot = (e.target as HTMLElement).closest('[data-flow-index]') as HTMLElement | null;
      if (shot && !moved) {
        const idx = Number(shot.dataset.flowIndex);
        const original = originalShots[idx]?.querySelector('img');
        if (original) openZoom(original.src, original.alt, idx);
      }
    };
    track.addEventListener('click', onTrackClick);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(gallery);

    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      lastTime = 0;
    });
    intersectionObserver.observe(gallery);

    function tick(time: number) {
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : 0;
      lastTime = time;
      if (
        galleryAutoplays(mobile.matches, isPaused, hovered, focused) &&
        !originalShots.some((shot) => { const video = shot.querySelector('video'); return video && !video.paused; }) &&
        !drag &&
        visible &&
        !document.hidden &&
        !document.querySelector('dialog[open]')
      ) {
        offset = galleryOffset(offset, elapsed * 0.032, cycleWidth);
        render();
      }
      frame = requestAnimationFrame(tick);
    }

    const onPageHide = () => {
      originalShots.forEach((shot) => shot.querySelector('video')?.pause());
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onPageShow = () => {
      if (!frame) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    const onVisibility = () => { if (document.hidden) originalShots.forEach((shot) => shot.querySelector('video')?.pause()); };
    document.addEventListener('visibilitychange', onVisibility);

    measure();
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      gallery.removeEventListener('pointerenter', onPointerEnter);
      gallery.removeEventListener('pointerleave', onPointerLeave);
      gallery.removeEventListener('focusin', onFocusIn);
      gallery.removeEventListener('focusout', onFocusOut);
      track.removeEventListener('pointerover', onPointerOver);
      reduced.removeEventListener('change', onReducedChange);
      mobile.removeEventListener('change', onMobileChange);
      track.removeEventListener('scroll', onScroll);
      prevBtn?.removeEventListener('click', onPrevClick);
      nextBtn?.removeEventListener('click', onNextClick);
      gallery.removeEventListener('keydown', onKeyDown);
      gallery.removeEventListener('pointerdown', onPointerDown);
      gallery.removeEventListener('pointermove', onPointerMove);
      gallery.removeEventListener('pointerup', release);
      gallery.removeEventListener('pointercancel', release);
      gallery.removeEventListener('lostpointercapture', release);
      track.removeEventListener('click', onTrackClick);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [openZoom]);

  // Handle Add to Cart — with isAdding feedback
  const [isAdding, setIsAdding] = useState(false);
  const addingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    addToCart(product, selectedSize, 1);
    showToast(`${product.name} çantana eklendi.`);
    setIsAdding(true);
    if (addingTimerRef.current) clearTimeout(addingTimerRef.current);
    addingTimerRef.current = setTimeout(() => setIsAdding(false), 1800);
    setIsBagOpen(true);
  };

  // Scroll reveal — product information + related sections
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('.pdp-reveal');
    if (!targets.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) {
      targets.forEach((t) => t.classList.add('pdp-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('pdp-revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  const materialText =
    product.material ||
    (product.category === 'ic-giyim' || product.category === 'lingerie'
      ? 'Dantel ve hassas yüzeyleri korumak için elde veya hassas programda, düşük ısıda bakım önerilir. Ürün etiketini takip et.'
      : 'Saten yüzeyi korumak için düşük ısı, hassas program ve benzer renklerle bakım önerilir. Ürün etiketini takip et.');

  return (
    <div className="product-page" data-product-id={product.slug}>
      <main id="main" className="pdp-main" data-product-page>
        {/* ==================== 1. PDP HERO & FLOW GALLERY + PURCHASE PANEL (FIRST VIEWPORT STAGE) ==================== */}
        <div className="pdp-stage-fold">
          <section className="pdp-hero" aria-labelledby="pdp-title">
            <div className="pdp-gallery" id="pdp-gallery" ref={galleryRef} tabIndex={0} aria-label="Ürün galerisi">
              <div className="pdp-gallery-track" ref={trackRef}>
                {baseShots.map((shot, idx) => (
                  shot.kind === 'VIDEO' ? <div key={shot.id} className={`${shot.className} pdp-shot-video`} data-flow-original="true" aria-label={shot.alt}>
                    <video src={shot.src} poster={shot.posterSrc} preload="none" playsInline controls aria-label={shot.alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', background: '#e9e7e3' }} />
                  </div> : <button
                    key={shot.id}
                    className={shot.className}
                    type="button"
                    data-pdp-expand
                    data-flow-original="true"
                    aria-label={`${shot.label} görselini büyüt`}
                    onClick={() => openZoom(shot.src, shot.alt, idx)}
                  >
                    {/* The gallery frames are tall and narrow; photos (portrait or landscape) are cropped into
                        them, so the visible crop needs about twice the frame width of source pixels.
                        Only the primary shot is the page LCP and loads eagerly; the rest are lazy. */}
                    <Image
                      id={shot.id === 'shot-primary' ? 'pdp-image-primary' : 'pdp-image-secondary'}
                      src={shot.src}
                      alt={shot.alt}
                      width={1086}
                      height={1448}
                      sizes="(max-width: 900px) 200vw, 1040px"
                      quality={PHOTO_QUALITY}
                      priority={idx === 0}
                      loading={idx === 0 ? undefined : 'lazy'}
                      draggable={false}
                    />
                  </button>
                ))}
              </div>

              {/* Gallery action buttons (Favorite, Pause, Expand) */}
              <div className="pdp-gallery-actions" role="group" aria-label="Görsel işlemleri">
                <button
                  className={`pdp-favorite${isFav ? ' pdp-favorite--active' : ''}`}
                  type="button"
                  aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                  aria-pressed={isFav ? 'true' : 'false'}
                  onClick={() => toggleWishlist(product)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="pdp-heart-icon">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="pdp-flow-pause"
                  hidden={isMobile}
                  aria-label={paused ? 'Galeri akışını başlat' : 'Galeri akışını duraklat'}
                  aria-pressed={paused ? 'true' : 'false'}
                  onClick={() => setPaused((p) => !p)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {paused ? <path d="m8 5 11 7-11 7Z" /> : <path d="M8 5v14M16 5v14" />}
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Görseli büyüt"
                  onClick={() => {
                    const shot = baseShots[currentIndexState] || baseShots[0];
                    if (shot) openZoom(shot.kind === 'VIDEO' ? shot.posterSrc || shot.src : shot.src, shot.alt, currentIndexState);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
                  </svg>
                </button>
              </div>

              {/* Stradivarius-Style Mobile Gallery Progress Indicator */}
              {isMobile && baseShots.length > 1 && (
                <div className="pdp-indicator-track" aria-hidden="true">
                  <span
                    ref={indicatorThumbRef}
                    className="pdp-indicator-thumb"
                    style={{
                      width: `${100 / baseShots.length}%`,
                      transform: `translateX(${currentIndexState * 100}%)`,
                    }}
                  />
                </div>
              )}

              {!isMobile && (
                <>
                  <div className="pdp-motion-line" aria-hidden="true">
                    <span></span>
                  </div>
                  <span className="pdp-gesture">KAYDIRARAK KEŞFET</span>
                </>
              )}
            </div>
          </section>

          {/* ── Purchase bar: identity · colour variants · size · actions. Shrinks (animated) once the page scrolls. ── */}
          <section
            className={`pdp-purchase-stage${isScrolled ? ' has-shadow is-compact' : ''}${isPanelHidden ? ' is-hidden' : ''}`}
            ref={productPanelRef}
            aria-label="Ürün ve satın alma bilgileri"
          >
            <div className="pdp-purchase-panel">

              {/* ── DESKTOP BAR (hidden at 900px and below) ── */}
              <div className="pdp-desktop-panel">
                <h1 id="pdp-title" className="pdp-bar__name">{product.name}</h1>

                {/* Choices: colour and size in one row, each with its label on the left. */}
                <div className="pdp-bar__choices">
                  {colorVariants.length > 0 ? (
                    <nav className="pdp-bar__group" aria-label="Renk seçenekleri">
                      <span className="pdp-bar__label" aria-hidden="true">Renk</span>
                      <ul className="pdp-bar__variants">
                        {colorVariants.map((variant) => (
                          <li key={variant.id}>
                            {variant.current ? (
                              <span className="pdp-variant is-current" aria-current="true" title={variant.color}>
                                <Image src={variant.image} alt="" width={96} height={128} sizes="80px" quality={THUMB_QUALITY} />
                                <span className="pdp-variant__name">{variant.color}</span>
                              </span>
                            ) : (
                              <Link href={`/urun/${variant.slug}`} className="pdp-variant" title={variant.color} aria-label={`${variant.color} rengini incele`}>
                                <Image src={variant.image} alt="" width={96} height={128} sizes="80px" quality={THUMB_QUALITY} />
                                <span className="pdp-variant__name">{variant.color}</span>
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </nav>
                  ) : null}

                  <fieldset className="pdp-bar__group pdp-sizes">
                    <legend className="sr-only">Beden</legend>
                    <span className="pdp-bar__label" aria-hidden="true">Beden</span>
                    <div className="pdp-size-grid" role="group">
                      {sizeOptions.map(({ size, stock }) => (
                        <label
                          key={size}
                          className={`${selectedSize === size ? 'is-selected' : ''}${stock <= 0 ? ' is-soldout' : ''}`}
                          title={stock <= 0 ? `${size} tükendi, gelince haber verelim` : undefined}
                          onClick={stock <= 0 ? () => requestStockAlert(size) : undefined}
                        >
                          <input
                            type="radio"
                            name="product-size-main"
                            value={size}
                            checked={selectedSize === size}
                            disabled={stock <= 0}
                            onChange={() => setSelectedSize(size)}
                            aria-label={stock <= 0 ? `${size}, tükendi` : size}
                          />
                          <span>{size}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="pdp-guide-btn"
                      onClick={() => setActiveGuide('size')}
                      aria-haspopup="dialog"
                    >
                      Beden rehberi
                    </button>
                  </fieldset>
                </div>

                <div className="pdp-bar__actions">
                  <button
                    className="pdp-purchase-favorite"
                    type="button"
                    aria-label={isFav ? `${product.name} favorilerden çıkar` : `${product.name} favorilere ekle`}
                    aria-pressed={isFav}
                    onClick={() => toggleWishlist(product)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <form id="add-form" className="pdp-action-form" onSubmit={handleAddToCart} noValidate>
                    <button className="btn btn--primary btn--block btn--split pdp-add-btn" type="submit" disabled={isAdding || !canAdd}>
                      <span>{isAdding ? 'Eklendi' : !firstInStock ? 'Tükendi' : !canAdd ? 'Beden seçin' : 'Çantaya ekle'}</span>
                      {isAdding ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                      ) : (
                        <span className="pdp-add-btn__price" id="pdp-price">{money(product.price)}</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* ── MOBILE DOCKED PANEL (900px and below) ── */}
              <div className="pdp-mobile-docked-panel">
                <div className="pdp-mobile-info-row">
                  <h1 className="pdp-mobile-title">{product.name}</h1>
                  <span className="pdp-mobile-price">{money(product.price)}</span>
                </div>
                {colorVariants.length > 0 ? (
                  <nav className="pdp-mobile-variants" aria-label="Renk seçenekleri">
                    <ul>
                      {colorVariants.map((variant) => (
                        <li key={variant.id}>
                          {variant.current ? (
                            <span className="pdp-variant is-current" aria-current="true">
                              <Image src={variant.image} alt="" width={72} height={96} sizes="72px" quality={THUMB_QUALITY} />
                              <span className="sr-only">{variant.color}</span>
                            </span>
                          ) : (
                            <Link href={`/urun/${variant.slug}`} className="pdp-variant" aria-label={`${variant.color} rengini incele`}>
                              <Image src={variant.image} alt="" width={72} height={96} sizes="72px" quality={THUMB_QUALITY} />
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--block pdp-mobile-select-size-btn"
                  onClick={() => setIsSizeSheetOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isSizeSheetOpen}
                >
                  <span>{!firstInStock ? 'Tükendi — bedenlere bak' : selectedSize ? `Beden ${selectedSize} — değiştir / ekle` : 'Beden seç'}</span>
                </button>
              </div>

            </div>
          </section>
        </div>
        <ProductLowerContent
          product={product}
          relatedProducts={relatedProducts}
        />
      </main>

      {/* ── LUXURY EDITORIAL GALLERY MODAL (Emil Kowalski + TasteSkill) ── */}
      {isModalOpen && (
        <div
          ref={modalRef}
          className={`pdp-modal-overlay${isModalClosing ? ' is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} detaylı görsel galerisi`}
        >
          {/* Floating Top-Right Controls */}
          <div className="pdp-modal-floating-actions">
            {/* Zoom Toggle Button */}
            <button
              type="button"
              className={`pdp-modal-action-btn pdp-modal-zoom-btn${isZoomed ? ' is-active' : ''}`}
              onClick={() => {
                const wrap = slideRefs.current[activeModalIndex]?.querySelector<HTMLElement>('.pdp-modal-image-wrap');
                wrap?.style.setProperty('--zoom-x', '50%');
                wrap?.style.setProperty('--zoom-y', '50%');
                setIsZoomed((z) => !z);
              }}
              aria-label={isZoomed ? 'Uzaklaştır' : 'Büyüt'}
              aria-pressed={isZoomed}
              title={isZoomed ? 'Uzaklaştır' : 'Büyüt'}
            >
              {/* Contextual icon swap: both drawn, the active one scales/fades/blurs in. */}
              <span className="pdp-modal-icon-swap" aria-hidden="true">
                <svg viewBox="0 0 24 24" className={`pdp-modal-icon${isZoomed ? '' : ' is-shown'}`}>
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <svg viewBox="0 0 24 24" className={`pdp-modal-icon${isZoomed ? ' is-shown' : ''}`}>
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              ref={modalCloseRef}
              className="pdp-modal-action-btn pdp-modal-close-btn"
              onClick={closeZoom}
              aria-label="Galeriyi kapat"
              title="Kapat (Esc)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Floating Bottom Info Pill */}
          <div className="pdp-modal-floating-pill" aria-live="polite">
            <span className="pdp-modal-pill-hint">
              {isZoomed ? 'Hareket ettirerek incele' : (
                <>
                  <span className="pdp-modal-hint--pointer">Büyütmek için tıkla</span>
                  <span className="pdp-modal-hint--touch">Büyütmek için dokun</span>
                </>
              )}
            </span>
            <span className="pdp-modal-pill-sep" aria-hidden="true" />
            <span className="pdp-modal-pill-count">
              {String(activeModalIndex + 1).padStart(2, '0')} / {String(baseShots.length).padStart(2, '0')}
            </span>
          </div>

          {/* Main Layout: Left Thumbnail Rail + Full-viewport Center Stage */}
          <div className="pdp-modal-body">
            {/* LEFT: Mini Görseller (Thumbnail Rail) */}
            <nav className="pdp-modal-thumbs" aria-label="Galeri küçük resimleri">
              {baseShots.map((shot, idx) => (
                <button
                  key={shot.id}
                  ref={(el) => { thumbRefs.current[idx] = el; }}
                  type="button"
                  className={`pdp-modal-thumb${activeModalIndex === idx ? ' is-active' : ''}`}
                  style={{ '--i': idx } as React.CSSProperties}
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Görsel ${idx + 1}'e git`}
                  aria-current={activeModalIndex === idx ? 'true' : undefined}
                >
                    {shot.kind === 'VIDEO' && !shot.posterSrc ? null : (
                    <Image
                      src={(shot.kind === 'VIDEO' ? shot.posterSrc : shot.src) as string}
                      alt=""
                      width={224}
                      height={298}
                      sizes="112px"
                      quality={THUMB_QUALITY}
                      loading="lazy"
                    />
                  )}
                </button>
              ))}
            </nav>

            {/* CENTER: Tam Ortada Görsel (Vertical Scroll Snap Feed, 100vh) */}
            <div className="pdp-modal-stage" ref={modalFeedRef}>
              {baseShots.map((shot, idx) => (
                <div
                  key={shot.id}
                  ref={(el) => { slideRefs.current[idx] = el; }}
                  className={`pdp-modal-slide${activeModalIndex === idx ? ' is-visible' : ''}`}
                  data-slide-index={idx}
                >
                  <div
                    className={`pdp-modal-image-wrap${isZoomed && activeModalIndex === idx ? ' is-zoomed' : ''}`}
                    onMouseMove={handleImageMouseMove}
                  >
                    {shot.kind === 'VIDEO' ? <video
                      src={shot.src}
                      poster={shot.posterSrc}
                      controls
                      playsInline
                      preload="none"
                      aria-label={shot.alt}
                      className="pdp-modal-image"
                    /> : <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={1086}
                      height={1448}
                      sizes="100vw"
                      quality={PHOTO_QUALITY}
                      loading={idx === activeModalIndex ? 'eager' : 'lazy'}
                      className="pdp-modal-image"
                      draggable={false}
                      onClick={handleImageClick}
                    />}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtle floating navigation arrows */}
            {activeModalIndex > 0 && (
              <button
                type="button"
                className="pdp-modal-arrow pdp-modal-arrow--prev"
                onClick={() => scrollToSlide(activeModalIndex - 1)}
                aria-label="Önceki görsel"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {activeModalIndex < baseShots.length - 1 && (
              <button
                type="button"
                className="pdp-modal-arrow pdp-modal-arrow--next"
                onClick={() => scrollToSlide(activeModalIndex + 1)}
                aria-label="Sonraki görsel"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MOBILE SIZE SELECTION BOTTOM SHEET (Stradivarius / Inditex Style) ── */}
      {isSizeSheetOpen && (
        <div
          className="pdp-size-sheet-backdrop"
          onClick={() => setIsSizeSheetOpen(false)}
          role="presentation"
        >
          <div
            className="pdp-size-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdp-size-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber Notch */}
            <div className="pdp-size-sheet-grabber" aria-hidden="true" />

            {/* Header */}
            <div className="pdp-size-sheet-header">
              <div className="pdp-size-sheet-title-group">
                <h2 id="pdp-size-sheet-title" className="pdp-size-sheet-heading">Beden Seçin</h2>
                <button
                  type="button"
                  className="pdp-size-sheet-guide-btn"
                  onClick={() => {
                    setIsSizeSheetOpen(false);
                    setActiveGuide('size');
                  }}
                >
                  Beden Rehberi
                </button>
              </div>
              <button
                type="button"
                className="pdp-size-sheet-close-btn"
                onClick={() => setIsSizeSheetOpen(false)}
                aria-label="Kapat"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mini Product Preview */}
            <div className="pdp-size-sheet-product-snippet">
              <img
                src={product.image}
                alt={product.name}
                width={56}
                height={74}
                className="pdp-size-sheet-thumb"
              />
              <div className="pdp-size-sheet-product-meta">
                <span className="pdp-size-sheet-prod-name">{product.name}</span>
                <span className="pdp-size-sheet-prod-price">{money(product.price)}</span>
                {productRef ? <span className="pdp-size-sheet-prod-ref">REF. {productRef}</span> : null}
              </div>
            </div>

            {/* Size Options List */}
            <div className="pdp-size-sheet-options" role="radiogroup" aria-label="Beden listesi">
              {sizeOptions.map(({ size, stock }) => {
                const isSelected = selectedSize === size;
                const soldOut = stock <= 0;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={soldOut || undefined}
                    className={`pdp-size-sheet-option${isSelected ? ' is-active' : ''}${soldOut ? ' is-soldout' : ''}`}
                    onClick={() => {
                      if (soldOut) {
                        setIsSizeSheetOpen(false);
                        requestStockAlert(size);
                        return;
                      }
                      setSelectedSize(size);
                      addToCart(product, size, 1);
                      showToast(`${product.name} (${size}) çantana eklendi.`);
                      setIsSizeSheetOpen(false);
                      setIsBagOpen(true);
                    }}
                  >
                    <div className="pdp-size-sheet-option-left">
                      <span className="pdp-size-sheet-option-label">{size}</span>
                      <span className="pdp-size-sheet-option-stock">
                        {soldOut ? 'Tükendi' : stock <= 3 ? `Son ${stock} adet` : 'Stokta'}
                      </span>
                    </div>
                    <span className="pdp-size-sheet-option-badge">
                      {soldOut ? 'Gelince haber ver' : isSelected ? 'Eklendi ✓' : 'Seç ve Ekle +'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Safe area spacer */}
            <div className="pdp-size-sheet-safe-spacer" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
