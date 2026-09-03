'use client';

import Link from 'next/link';
import { useState } from 'react';

const comfortModes = [
  {
    no: '01',
    label: 'FORM',
    title: 'Bedeni izler.',
    copy: 'Esnek yapı vücuda uyum sağlar; görünümü sakin ve dengeli tutar.',
    image: '/products/crop-siyah-main.webp',
    position: 'center 40%',
  },
  {
    no: '02',
    label: 'DOKU',
    title: 'Tene yaklaşır.',
    copy: 'Fitilli yüzey ve yumuşak dokunuş, gün boyu rahat bir his bırakır.',
    image: '/products/crop-siyah-detail.webp',
    position: 'center center',
  },
  {
    no: '03',
    label: 'HAREKET',
    title: 'Sana eşlik eder.',
    copy: 'Günün değişen temposuna ve farklı kombinlere uyum sağlayan özgür form.',
    image: '/products/crop-siyah-side.webp',
    position: 'center 45%',
  },
];

export default function ComfortSwitch() {
  const [comfort, setComfort] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setComfort((prev) => (prev + 1) % comfortModes.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setComfort((prev) => (prev - 1 + comfortModes.length) % comfortModes.length);
    }
  };

  return (
    <section className="comfort-switch" id="story" aria-labelledby="story-title">
      <div className="comfort-switch-media">
        <img
          key={comfortModes[comfort].image}
          src={comfortModes[comfort].image}
          alt={`Pandiones siyah crop, ${comfortModes[comfort].label.toLocaleLowerCase('tr-TR')} görünümü`}
          style={{ objectPosition: comfortModes[comfort].position }}
          width="600"
          height="800"
          loading="lazy"
          decoding="async"
        />
        <div className="comfort-switch-counter" aria-hidden="true">
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
        <div
          id={`comfort-panel-${comfort}`}
          role="tabpanel"
          aria-labelledby={`comfort-tab-${comfort}`}
          className="comfort-switch-copy"
        >
          <span>{comfortModes[comfort].no}</span>
          <div>
            <h3>{comfortModes[comfort].title}</h3>
            <p>{comfortModes[comfort].copy}</p>
          </div>
        </div>
        <div
          className="comfort-switch-tabs"
          role="tablist"
          aria-label="Konfor özellikleri"
          onKeyDown={handleKeyDown}
        >
          {comfortModes.map((mode, index) => (
            <button
              id={`comfort-tab-${index}`}
              role="tab"
              aria-selected={comfort === index}
              aria-controls={`comfort-panel-${index}`}
              tabIndex={comfort === index ? 0 : -1}
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
          <Link href="/fitilli-v-yaka-crop-bustiyer" prefetch={true}>
            Ürünü incele <span>→</span>
          </Link>
          <Link href="/beden-rehberi" prefetch={true}>Beden rehberi</Link>
        </div>
      </div>
    </section>
  );
}

