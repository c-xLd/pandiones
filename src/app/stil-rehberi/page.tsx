'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface StyleItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
  coverage: string;
  link: string;
  image: string;
}

const BRA_STYLES: StyleItem[] = [
  {
    id: 'bralet',
    name: 'Bralet',
    tagline: 'Zahmetsiz Hafiflik & Doğal Form',
    description: 'Balensiz ve hafif yapısıyla vücudu kısıtlamadan saran, gün boyu tenle bütünleşen İtalyan danteli tasarımı.',
    bestFor: 'Açık yakalar, dökümlü gömlekler ve ev konforu.',
    coverage: 'Hafif / Doğal',
    link: '/koleksiyon/sutyen',
    image: '/assets/campaign-portrait.jpeg',
  },
  {
    id: 'push-up',
    name: 'Push-Up & Destekli',
    tagline: 'Kusursuz Dekolte & Hacim',
    description: 'Özel kademeli dolgusu sayesinde göğsü nazikçe yukarı ve merkeze doğru toparlayarak çarpıcı bir dekolte yaratır.',
    bestFor: 'Derin V yakalar, özel davet elbiseleri ve yapısal kıyafetler.',
    coverage: 'Orta Destekli / Dolgulu',
    link: '/koleksiyon/sutyen',
    image: '/assets/campaign-hero.jpeg',
  },
  {
    id: 'balensiz',
    name: 'Balensiz Sütyen',
    tagline: 'Sıfır Baskı & Saf Rahatlık',
    description: 'Tel ve metal balen içermeyen, göğsün kendi doğal kıvrımını koruyan ultra hafif nefes alan yapı.',
    bestFor: 'Gün boyu yoğun tempo, seyahatler ve hassas ciltler.',
    coverage: 'Doğal Destek',
    link: '/koleksiyon/sutyen',
    image: '/assets/campaign-seated.jpeg',
  },
  {
    id: 'dikissiz',
    name: 'Dikişsiz & Telsiz',
    tagline: 'Kıyafet Altında Tam Görünmezlik',
    description: 'Lazer kesim kenarlar ve pürüzsüz mikro kumaş dokusuyla en dar ve ince kıyafetlerin altından dahi iz yapmaz.',
    bestFor: 'Beyaz tişörtler, saten elbiseler ve dar trikolar.',
    coverage: 'Pürüzsüz / Görünmez',
    link: '/koleksiyon/sutyen',
    image: '/assets/beyaz-crop/1.png',
  },
  {
    id: 'straplez',
    name: 'Straplez & Balkonet',
    tagline: 'Açık Omuzlar İçin Güvenli Tutuş',
    description: 'Çıkarılabilir askıları ve iç kısımdaki hipoalerjenik silikon kaymaz bantlarıyla omuzları özgür bırakan mimari kalıp.',
    bestFor: 'Straplez elbiseler, halter yaka ve düşük omuzlu bluzlar.',
    coverage: 'Güçlü Tutuş / Askısız',
    link: '/koleksiyon/sutyen',
    image: '/assets/campaign-portrait.jpeg',
  },
  {
    id: 'ucgen',
    name: 'Üçgen Sütyen',
    tagline: 'Minimalist Çizgiler & Sofistike Duruş',
    description: 'Klasik üçgen kupların narin tül veya ipeksi satenle harmanlandığı, fazlalıklardan arındırılmış saf zarafet.',
    bestFor: 'Derin gömlek dekolteleri ve transparan katmanlar.',
    coverage: 'Minimal',
    link: '/koleksiyon/sutyen',
    image: '/assets/campaign-hero.jpeg',
  },
];

const PANTY_STYLES: StyleItem[] = [
  {
    id: 'brazilian',
    name: 'Brezilya (Brazilian)',
    tagline: 'Dengeli Dekolte & Yüksek Konfor',
    description: 'Klasik slip ile tanga arasında kusursuz bir denge sunan, kalçayı estetik şekilde açıkta bırakan V kesim.',
    bestFor: 'Her kıyafet altında çekici ve konforlu günlük kullanım.',
    coverage: 'Orta',
    link: '/koleksiyon/kulot',
    image: '/assets/campaign-hero.jpeg',
  },
  {
    id: 'tanga',
    name: 'Tanga & String',
    tagline: 'Sıfır Çizgi & Minimal Form',
    description: 'Arka kısımda neredeyse hiç kumaş bırakmayan, dar pantolon ve elbiselerde çizgi riskini tamamen ortadan kaldıran stil.',
    bestFor: 'Taytlar, saten etekler ve açık renkli pantolonlar.',
    coverage: 'Minimal',
    link: '/koleksiyon/kulot',
    image: '/assets/campaign-portrait.jpeg',
  },
  {
    id: 'slip',
    name: 'Slip & Klasik',
    tagline: 'Zamansız Kalıp & Tam Kavrama',
    description: 'Kalçayı tam saran, beli sıkmayan ve doğal pamuk lifleriyle nefes alan zamansız konfor ikonu.',
    bestFor: 'Günlük kullanım ve dinlenme saatleri.',
    coverage: 'Tam',
    link: '/koleksiyon/kulot',
    image: '/assets/campaign-seated.jpeg',
  },
  {
    id: 'lazer-kesim',
    name: 'Dikişsiz Lazer Kesim',
    tagline: 'Tende Sıfır Temas Hissi',
    description: 'Dikişsiz termal yapıştırma teknolojisi sayesinde ikinci bir ten gibi vücuda oturan, kaymayan mikrofiber doku.',
    bestFor: 'En ince abiyeler ve açık renk kumaşlar.',
    coverage: 'Orta / Görünmez',
    link: '/koleksiyon/kulot',
    image: '/assets/campaign-hero.jpeg',
  },
  {
    id: 'yuksek-bel',
    name: 'Yüksek Bel Külot',
    tagline: 'Retro Zarafet & Hafif Toparlama',
    description: 'Göbek deliğine kadar uzanan zarif dantel veya saten panelleriyle beli nazikçe saran şık silüet.',
    bestFor: 'Yüksek bel pantolonlar ve vintage esintili kombinler.',
    coverage: 'Yüksek / Toparlayıcı',
    link: '/koleksiyon/kulot',
    image: '/assets/campaign-portrait.jpeg',
  },
];

export default function StilRehberiPage() {
  const [categoryTab, setCategoryTab] = useState<'bras' | 'panties'>('bras');

  const currentList = categoryTab === 'bras' ? BRA_STYLES : PANTY_STYLES;

  return (
    <main id="main" className="padded-main guide-page">
      {/* ── Breadcrumb ── */}
      <div className="guide-breadcrumb">
        <nav aria-label="Ekmek kırıntısı">
          <Link href="/" className="apple-press">Ana Sayfa</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>Stil Rehberi</span>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="guide-hero hero-entrance">
        <p className="guide-eyebrow">PANDIONES STİL KILAVUZU</p>
        <h1 className="guide-title">
          İç Giyim Stil Rehberi
        </h1>
        <p className="guide-subtitle">
          Hangi kesimin dekoltenize, günün ritmine veya kıyafetinize en uygun olduğunu keşfedin. 
          Kesimlerin anatomisini ve sundukları konforu inceleyin.
        </p>

        {/* Category Switcher Tabs */}
        <div className="guide-tab-bar" style={{ marginTop: '32px' }} role="tablist" aria-label="Stil kategorileri">
          <button
            type="button"
            role="tab"
            aria-selected={categoryTab === 'bras'}
            className={`guide-tab apple-press ${categoryTab === 'bras' ? 'is-active' : ''}`}
            onClick={() => setCategoryTab('bras')}
          >
            Sütyen Stilleri
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={categoryTab === 'panties'}
            className={`guide-tab apple-press ${categoryTab === 'panties' ? 'is-active' : ''}`}
            onClick={() => setCategoryTab('panties')}
          >
            Külot Stilleri
          </button>
        </div>
      </section>

      {/* ── Styles Grid ── */}
      <div className="guide-content">
        <div key={categoryTab} className="guide-style-grid stagger-in">
          {currentList.map((item) => (
            <article key={item.id} className="guide-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="guide-card-media" style={{ position: 'relative' }}>
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: '4px',
                    color: 'var(--ink)',
                  }}
                >
                  {item.coverage}
                </span>
              </div>

              <div className="guide-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 className="guide-card-title">{item.name}</h3>
                <p className="guide-card-tagline">
                  {item.tagline}
                </p>
                <p className="guide-card-text" style={{ flex: 1, marginBottom: '20px' }}>
                  {item.description}
                </p>

                <div
                  style={{
                    background: 'var(--surface)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: 600, display: 'block', color: 'var(--ink)', marginBottom: '2px' }}>
                    Önerilen Kıyafetler:
                  </span>
                  <span style={{ color: 'var(--muted)' }}>{item.bestFor}</span>
                </div>

                <Link
                  href={item.link}
                  className="guide-cta-link apple-press"
                  style={{ marginTop: 'auto' }}
                >
                  {item.name} Koleksiyonu
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
