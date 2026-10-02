import React from 'react';
import Link from 'next/link';
import GuideHero, { GuideJumpLinks } from '@/components/guides/GuideHero';
import SizeFinder from './SizeFinder';
import BraFinder from './BraFinder';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/guides.css';

export const metadata = {
  title: 'Beden Rehberi — PANDIONES',
  description: 'Türkiye beden tablosu, sütyen bant ve kup ölçüsü. Göğüs, bel ve kalça ölçünü gir; S, M, L ve XL arasından sana uygun bedeni bul.',
};

const STEPS = [
  { title: 'Göğüs altı', text: 'Mezurayı göğsün hemen altından, sıkıca ama nefesini kesmeden sar. Sütyen bandını bu ölçü belirler.' },
  { title: 'Göğüs', text: 'Mezurayı göğsün en dolgun noktasından, yere paralel geçir. Sıkma; nefes alabilmelisin.' },
  { title: 'Bel', text: 'Doğal bel çizginden, genellikle göbeğin hemen üstünden ölç. Karnını içine çekme.' },
  { title: 'Kalça', text: 'Ayakların bitişikken kalçanın en geniş noktasından ölç.' },
];

const FIT_NOTES = [
  'İç giyim teni sıkmadan oturmalı; kenarlarda iz bırakmamalı.',
  'Askılar omuza baskı yapmamalı, gün içinde kaymamalı.',
  'Ev giyimi harekete alan bırakmalı; oturduğunda gerilmemeli.',
];

function MeasureFigure() {
  return (
    <svg className="measure-figure" viewBox="0 0 160 300" role="img" aria-labelledby="measure-figure-title">
      <title id="measure-figure-title">Göğüs altı, göğüs, bel ve kalça ölçülerinin alındığı hatlar</title>
      <path
        className="measure-figure__body"
        d="M80 18c11 0 19 9 19 21s-8 22-19 22-19-10-19-22 8-21 19-21Zm-14 46c-22 5-34 16-36 38l-3 42c-1 9 11 11 13 2l6-34c2 22 0 40-6 58-7 22-8 48-6 90 1 12 17 12 18 0l6-78c1-6 5-6 6 0l6 78c1 12 17 12 18 0 2-42 1-68-6-90-6-18-8-36-6-58l6 34c2 9 14 7 13-2l-3-42c-2-22-14-33-36-38"
      />
      <g className="measure-figure__lines">
        <line x1="34" y1="100" x2="126" y2="100" />
        <line x1="38" y1="116" x2="122" y2="116" />
        <line x1="44" y1="140" x2="116" y2="140" />
        <line x1="38" y1="170" x2="122" y2="170" />
      </g>
      <g className="measure-figure__tags">
        <text x="140" y="104">2</text>
        <text x="140" y="120">1</text>
        <text x="140" y="144">3</text>
        <text x="140" y="174">4</text>
      </g>
    </svg>
  );
}

export default function BedenRehberiPage() {
  return (
    <main id="main" className="guide-page">
      <GuideHero
        eyebrow="Rehber"
        title="Beden rehberi"
        lead="Parçalarımız S, M, L ve XL bedenlerde, Türkiye ölçüleriyle hazırlanır. Ölçülerini gir; sana uygun beden tabloda işaretlensin. Sütyen için bant ve kup ölçünü de buradan bulabilirsin."
        aside={
          <GuideJumpLinks
            links={[
              { href: '#bedenini-bul', label: 'Bedenini bul' },
              { href: '#beden-tablosu', label: 'Beden tablosu' },
              { href: '#sutyen-olcusu', label: 'Sütyen ölçüsü' },
              { href: '#nasil-olculur', label: 'Nasıl ölçülür' },
            ]}
          />
        }
      />

      <SizeFinder />
      <BraFinder />

      <section id="nasil-olculur" className="guide-section" aria-labelledby="measure-title">
        <div className="guide-section__head">
          <p className="guide-section__num" aria-hidden="true">04</p>
          <h2 id="measure-title" className="guide-section__title">Nasıl ölçülür</h2>
          <p className="guide-section__text">Yumuşak bir mezura ve ince bir iç giyim yeterli. Ölçüyü aynanın karşısında, dik durarak al.</p>
        </div>
        <div className="measure-guide">
          <MeasureFigure />
          <ol className="guide-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="guide-steps__num" aria-hidden="true">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="guide-note">
          <h3 className="guide-note__title">Doğru oturuş</h3>
          <ul>
            {FIT_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>

      <aside className="guide-next" aria-label="Diğer rehberler">
        <p>Kesimler arasında kararsız mısın?</p>
        <div className="guide-next__links">
          <Link href="/stil-rehberi" className="guide-arrow-link">Stil rehberi</Link>
          <Link href="/iletisim" className="guide-arrow-link">Bize yaz</Link>
        </div>
      </aside>
    </main>
  );
}
