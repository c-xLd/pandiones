import { useState } from 'react';

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

export default function ComfortSwitch() {
  const [comfort, setComfort] = useState(0);

  return (
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
            Ürünü incele <span>→</span>
          </a>
          <a href="/beden-rehberi">Beden rehberi</a>
        </div>
      </div>
    </section>
  );
}
