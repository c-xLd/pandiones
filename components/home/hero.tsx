'use client';

import { useEffect, useRef } from 'react';

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const updatePointer = (event: PointerEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        hero.style.setProperty('--hero-x', String((event.clientX - bounds.left) / bounds.width - 0.5));
        hero.style.setProperty('--hero-y', String((event.clientY - bounds.top) / bounds.height - 0.5));
      });
    };
    const resetPointer = () => {
      hero.style.setProperty('--hero-x', '0');
      hero.style.setProperty('--hero-y', '0');
    };
    const updateScroll = () => hero.style.setProperty('--hero-scroll', String(Math.min(window.scrollY / window.innerHeight, 1)));
    hero.addEventListener('pointermove', updatePointer);
    hero.addEventListener('pointerleave', resetPointer);
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
    return () => {
      window.cancelAnimationFrame(frame);
      hero.removeEventListener('pointermove', updatePointer);
      hero.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('scroll', updateScroll);
    };
  }, []);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title" ref={heroRef}>
      <div className="hero-gallery" aria-hidden="true">
        <figure className="hero-frame hero-frame-pink">
          <img src="/products/cizgili-dantelli-takim.jpg" alt="" loading="eager" decoding="async" />
          <figcaption>02 / DANTEL</figcaption>
        </figure>
        <figure className="hero-frame hero-frame-crop">
          <img src="/products/gri-crop-bustiyer.jpg" alt="" loading="eager" decoding="async" />
          <figcaption>03 / CROP</figcaption>
        </figure>
        <figure className="hero-frame hero-frame-black">
          <img src="/products/simli-bustiyer-takim.jpg" alt="" loading="eager" decoding="async" />
          <figcaption>01 / SİMLİ TAKIM</figcaption>
        </figure>
      </div>
      <div className="hero-grain" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow">
          <span>YENİ KOLEKSİYON / 2026</span>
          <span>İÇ GİYİM · CROP · GECELİK</span>
        </p>
        <h1 id="hero-title">
          <span>GÜÇ VE</span>
          <span className="title-indent">ZARAFET</span>
        </h1>
        <div className="hero-manifesto">
          <strong>Kendin gibi.</strong>
          <p>
            Gündüzden geceye,
            <br />
            her anına eşlik eder.
          </p>
        </div>
      </div>
      <div className="hero-footer">
        <p>
          RAHATLIĞIN
          <br />
          SENİN TARZIN
        </p>
        <Link className="primary-cta" href="/koleksiyon" prefetch={true}>
          <span>Koleksiyonu keşfet</span>
          <span aria-hidden="true">→</span>
        </Link>
        <p className="scene-label">
          ÜÇ FARKLI HİS
          <br />
          TEK BİR PANDIONES
        </p>
      </div>
      <div className="hero-marquee" aria-hidden="true">
        <div>
          <span>İÇ GİYİM</span>
          <i>✤</i>
          <span>CROP</span>
          <i>✤</i>
          <span>GECELİK</span>
          <i>✤</i>
          <span>İÇ GİYİM</span>
          <i>✤</i>
          <span>CROP</span>
          <i>✤</i>
          <span>GECELİK</span>
          <i>✤</i>
        </div>
      </div>
      <a className="scroll-cue" href="#story" aria-label="Hikâyeye ilerle">
        <span>Kaydır</span>
        <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
