'use client';

import { useEffect, useRef, useState } from 'react';
import EditorialDropReel from '@/components/editorial-drop-reel';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

const comfortModes = [
  {
    no: '01',
    label: 'FORM',
    title: 'Bedeni izler.',
    copy: 'Esnek yapı vücuda uyum sağlar; görünümü sakin ve dengeli tutar.',
    image: '/products/crop-siyah-main.png',
    position: 'center 40%',
  },
  {
    no: '02',
    label: 'DOKU',
    title: 'Tene yaklaşır.',
    copy: 'Fitilli yüzey ve yumuşak dokunuş, gün boyu rahat bir his bırakır.',
    image: '/products/crop-siyah-detail.png',
    position: 'center center',
  },
  {
    no: '03',
    label: 'HAREKET',
    title: 'Sana eşlik eder.',
    copy: 'Günün değişen temposuna ve farklı kombinlere uyum sağlayan özgür form.',
    image: '/products/crop-siyah-side.png',
    position: 'center 45%',
  },
];

const worlds = [
  { no: '01', name: 'TAKIMLAR', note: 'Dantelli ve destekli favoriler', className: 'world-intimates', href: '/kategori/ic-giyim' },
  { no: '02', name: 'GECELİK', note: 'Tül, dantel ve feminen detaylar', className: 'world-night', href: '/kategori/gecelik' },
  { no: '03', name: 'CROP', note: 'Günlük stile uyum sağlayan formlar', className: 'world-crop', href: '/kategori/crop-bustiyer' },
  { no: '04', name: 'YENİ', note: 'Koleksiyona yeni eklenenler', className: 'world-lounge', href: '/koleksiyon/yeni' },
];

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const [mood, setMood] = useState<'soft' | 'bold'>('soft');
  const [comfort, setComfort] = useState(0);

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

  const chooseMood = (next: 'soft' | 'bold') => {
    setMood(next);
    window.localStorage.setItem('pandiones-mood', next);
  };

  return (
    <main className={`site-shell mood-${mood}`}>
      <SiteHeader />

      {/* Hero Section */}
      <section className="hero" id="top" aria-labelledby="hero-title" ref={heroRef}>
        <div className="hero-gallery" aria-hidden="true">
          <figure className="hero-frame hero-frame-pink">
            <img src="/products/cizgili-dantelli-takim.jpg" alt="" />
            <figcaption>02 / DANTEL</figcaption>
          </figure>
          <figure className="hero-frame hero-frame-crop">
            <img src="/products/gri-crop-bustiyer.jpg" alt="" />
            <figcaption>03 / CROP</figcaption>
          </figure>
          <figure className="hero-frame hero-frame-black">
            <img src="/products/simli-bustiyer-takim.jpg" alt="" />
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
          <a className="primary-cta" href="/koleksiyon">
            <span>Koleksiyonu keşfet</span>
            <span aria-hidden="true">↗</span>
          </a>
          <p className="scene-label">
            ÜÇ FARKLI HİS
            <br />
            TEK BİR PANDIONES
          </p>
        </div>
        <div className="hero-marquee" aria-hidden="true">
          <div>
            <span>İÇ GİYİM</span>
            <i>✦</i>
            <span>CROP</span>
            <i>✦</i>
            <span>GECELİK</span>
            <i>✦</i>
            <span>İÇ GİYİM</span>
            <i>✦</i>
            <span>CROP</span>
            <i>✦</i>
            <span>GECELİK</span>
            <i>✦</i>
          </div>
        </div>
        <a className="scroll-cue" href="#story" aria-label="Hikâyeye ilerle">
          <span>Kaydır</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      {/* Comfort Series Story */}
      <section className="comfort-switch" id="story" aria-labelledby="story-title">
        <div className="comfort-switch-media">
          <img
            key={comfortModes[comfort].image}
            src={comfortModes[comfort].image}
            alt={`Pandiones siyah crop, ${comfortModes[comfort].label.toLocaleLowerCase('tr-TR')} görünümü`}
            style={{ objectPosition: comfortModes[comfort].position }}
          />
          <div className="comfort-switch-counter">
            <span>0{comfort + 1}</span>
            <i />
            <span>03</span>
          </div>
          <p>PANDIONES / COMFORT SERIES</p>
        </div>
        <div className="comfort-switch-panel">
          <div className="comfort-switch-meta">
            <span>RAHATLIĞIN ÜÇ HALİ</span>
            <span>2026</span>
          </div>
          <h2 id="story-title">
            Rahatlığına
            <br />
            göre <i>tasarlandı.</i>
          </h2>
          <div className="comfort-switch-copy">
            <span>{comfortModes[comfort].no}</span>
            <div>
              <h3>{comfortModes[comfort].title}</h3>
              <p>{comfortModes[comfort].copy}</p>
            </div>
          </div>
          <div className="comfort-switch-tabs" role="tablist" aria-label="Konfor özellikleri">
            {comfortModes.map((mode, index) => (
              <button
                role="tab"
                aria-selected={comfort === index}
                className={comfort === index ? 'active' : ''}
                type="button"
                onClick={() => setComfort(index)}
                key={mode.label}
              >
                <span>{mode.no}</span>
                {mode.label}
              </button>
            ))}
          </div>
          <div className="comfort-switch-actions">
            <a href="/urun/fitilli-v-yaka-crop-bustiyer">
              Ürünü incele <span>↗</span>
            </a>
            <a href="/beden-rehberi">Beden rehberi</a>
          </div>
        </div>
      </section>

      {/* Mood Transformation Switcher */}
      <section className="mood-section" aria-labelledby="mood-title">
        <div className="mood-orbit" aria-hidden="true">
          <span />
          <span />
        </div>
        <p className="section-kicker">BİR BEDEN / İKİ HİS</p>
        <h2 id="mood-title">
          Bugün nasıl
          <br />
          <i>hissetmek</i> istersin?
        </h2>
        <div className="mood-switch" role="group" aria-label="Koleksiyon ruhunu seç">
          <button
            className={mood === 'soft' ? 'active' : ''}
            type="button"
            onClick={() => chooseMood('soft')}
            aria-pressed={mood === 'soft'}
          >
            GÜNLÜK <span>01</span>
          </button>
          <button
            className={mood === 'bold' ? 'active' : ''}
            type="button"
            onClick={() => chooseMood('bold')}
            aria-pressed={mood === 'bold'}
          >
            İDDİALI <span>02</span>
          </button>
        </div>
        <p className="mood-copy">
          {mood === 'soft'
            ? 'Kaşkorse dokular, pedli crop’lar ve gün boyu rahatlık.'
            : 'Dantel, tül ve ışıltılı detaylarla güçlü bir görünüm.'}
        </p>
      </section>

      {/* THE DROP // Editorial Reel (SEÇİLİ ÜRÜNLER) */}
      <EditorialDropReel />

      {/* Product Portal Spotlight */}
      <section className="portal" aria-labelledby="portal-title">
        <div className="portal-copy">
          <p className="section-kicker">ÜRÜN PORTRESİ / 01</p>
          <h2 id="portal-title">
            Gecenin
            <br />
            <i>ışıltısı.</i>
          </h2>
          <p>
            Simli baskısı, balenli yapısı ve destekli formuyla güçlü görünümü rahatlıkla buluşturan iki parçalı takım.
          </p>
          <a href="/urun/simli-destekli-bustiyer-takim">
            Ürünü keşfet <span>↗</span>
          </a>
        </div>
        <div className="portal-image">
          <div className="portal-halo" aria-hidden="true" />
          <img
            src="/products/simli-bustiyer-takim.jpg"
            alt="Pandiones simli destekli büstiyer sütyen takımının ürün görünümü"
          />
        </div>
        <dl className="portal-specs">
          <div>
            <dt>01 / MATERYAL</dt>
            <dd>Poliamid karışımı</dd>
          </div>
          <div>
            <dt>02 / DESTEK</dt>
            <dd>Balenli ve destekli</dd>
          </div>
          <div>
            <dt>03 / TAKIM</dt>
            <dd>İki parçalı set</dd>
          </div>
          <div>
            <dt>04 / RENK</dt>
            <dd>
              <span className="swatch bone" /> Siyah
            </dd>
          </div>
        </dl>
      </section>

      {/* Category Worlds */}
      <section className="worlds" id="worlds" aria-labelledby="worlds-title">
        <header>
          <p className="section-kicker">RUHUNU SEÇ</p>
          <h2 id="worlds-title">
            KOLEKSİYON
            <br />
            <i>DÜNYALARI</i>
          </h2>
        </header>
        <div className="world-grid">
          {worlds.map((world) => (
            <a href={world.href} className={`world-card ${world.className}`} key={world.name}>
              <span>{world.no}</span>
              <div>
                <h3>{world.name}</h3>
                <p>{world.note}</p>
              </div>
              <b aria-hidden="true">↗</b>
            </a>
          ))}
        </div>
      </section>

      {/* Full-Bleed Manifesto */}
      <section className="manifesto" aria-label="Pandiones manifestosu">
        <img src="/fabric-wide.png" alt="Katmanlı saten ve tül kumaş kompozisyonu" />
        <div>
          <p>HER HALİNE EŞLİK EDER</p>
          <h2>
            Rahatlık
            <br />
            <i>özgüvendir.</i>
          </h2>
          <a href="/koleksiyon">Koleksiyonu keşfet ↗</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
