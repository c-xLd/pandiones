import React from 'react';
import Link from 'next/link';
import GuideHero, { GuideJumpLinks } from '@/components/guides/GuideHero';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/guides.css';

export const metadata = {
  title: 'Stil Rehberi — PANDIONES',
  description: 'Sütyen ve külot kesimleri: hangisi hangi kıyafetin altına uyar, ne kadar kapatır, nasıl hissettirir.',
};

/** 1 minimal · 2 hafif · 3 orta · 4 tam */
type Coverage = 1 | 2 | 3 | 4;

type Cut = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  wearWith: string;
  coverage: Coverage;
};

const COVERAGE_LABELS: Record<Coverage, string> = { 1: 'Minimal', 2: 'Hafif', 3: 'Orta', 4: 'Tam' };

const BRA_CUTS: Cut[] = [
  {
    slug: 'bralet',
    name: 'Bralet',
    tagline: 'Hafif ve doğal',
    description: 'Balensiz, hafif yapısıyla teni kısıtlamadan sarar. Destekten çok rahatlık ve görünen bir dantel çizgisi için.',
    wearWith: 'Açık yakalar, dökümlü gömlekler, ev.',
    coverage: 2,
  },
  {
    slug: 'push-up-destekli',
    name: 'Push-up ve destekli',
    tagline: 'Hacim ve toparlama',
    description: 'Kademeli dolgusu göğsü yukarı ve ortaya toplar; belirgin bir dekolte oluşturur.',
    wearWith: 'Derin V yakalar, yapılı elbiseler.',
    coverage: 3,
  },
  {
    slug: 'balensiz-sutyen',
    name: 'Balensiz sütyen',
    tagline: 'Baskısız destek',
    description: 'Metal balen içermez; göğsün doğal formunu korurken hafif destek verir.',
    wearWith: 'Uzun günler, seyahat, hassas ciltler.',
    coverage: 3,
  },
  {
    slug: 'dikissiz-lazer-sutyen',
    name: 'Dikişsiz, lazer kesim',
    tagline: 'Kıyafet altında iz bırakmaz',
    description: 'Lazer kesim kenarları ve pürüzsüz yüzeyiyle ince kumaşların altından belli olmaz.',
    wearWith: 'Beyaz tişörtler, saten elbiseler, ince trikolar.',
    coverage: 3,
  },
  {
    slug: 'straplez-balkonet',
    name: 'Straplez ve balkonet',
    tagline: 'Açık omuzlar için',
    description: 'Çıkarılabilir askıları ve iç kenardaki kaymaz bandıyla omuzları açık bırakır.',
    wearWith: 'Straplez elbiseler, halter yaka, düşük omuz.',
    coverage: 3,
  },
  {
    slug: 'ucgen-sutyen',
    name: 'Üçgen sütyen',
    tagline: 'Sade çizgiler',
    description: 'İnce tül veya saten üçgen kuplar; destekten çok çizgisiyle öne çıkar.',
    wearWith: 'Derin gömlek yakaları, transparan katmanlar.',
    coverage: 1,
  },
];

const PANTY_CUTS: Cut[] = [
  {
    slug: 'brazilian-kulot',
    name: 'Brazilian',
    tagline: 'Dengeli kesim',
    description: 'Klasik külot ile tanga arası; arkada V kesimle kalçayı kısmen açık bırakır.',
    wearWith: 'Günlük kullanım, çoğu kıyafetin altı.',
    coverage: 2,
  },
  {
    slug: 'tanga-string',
    name: 'Tanga ve string',
    tagline: 'Çizgi yapmaz',
    description: 'Arkada neredeyse hiç kumaş bırakmaz; dar kıyafetlerde iz sorununu ortadan kaldırır.',
    wearWith: 'Taytlar, saten etekler, açık renk pantolonlar.',
    coverage: 1,
  },
  {
    slug: 'slip-klasik',
    name: 'Slip ve klasik',
    tagline: 'Tam kavrama',
    description: 'Kalçayı tamamen sarar, beli sıkmaz. Her gün ve dinlenme saatleri için.',
    wearWith: 'Günlük kullanım, ev.',
    coverage: 4,
  },
  {
    slug: 'dikissiz-lazer-kulot',
    name: 'Dikişsiz, lazer kesim',
    tagline: 'İkinci ten',
    description: 'Dikiş yerine yapıştırma kenarlarıyla vücuda oturur; ince kumaşların altında görünmez.',
    wearWith: 'İnce elbiseler, açık renk kumaşlar.',
    coverage: 3,
  },
  {
    slug: 'yuksek-bel-kulot',
    name: 'Yüksek bel',
    tagline: 'Beli saran silüet',
    description: 'Göbek hizasına kadar çıkan dantel ya da saten panelleriyle beli hafifçe toparlar.',
    wearWith: 'Yüksek bel pantolonlar, etekler.',
    coverage: 4,
  },
];

function CoverageMeter({ level }: { level: Coverage }) {
  return (
    <span className="coverage">
      <span className="coverage__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={step <= level ? 'is-on' : undefined} />
        ))}
      </span>
      <span>{COVERAGE_LABELS[level]}</span>
    </span>
  );
}

function CutList({ id, number, title, lead, cuts }: { id: string; number: string; title: string; lead: string; cuts: Cut[] }) {
  return (
    <section id={id} className="guide-section" aria-labelledby={`${id}-title`}>
      <div className="guide-section__head">
        <p className="guide-section__num" aria-hidden="true">{number}</p>
        <h2 id={`${id}-title`} className="guide-section__title">{title}</h2>
        <p className="guide-section__text">{lead}</p>
      </div>
      <ol className="cut-list">
        {cuts.map((cut, index) => (
          <li key={cut.slug} className="cut" style={{ '--i': index } as React.CSSProperties}>
            <div className="cut__name">
              <h3>{cut.name}</h3>
              <p className="cut__tagline">{cut.tagline}</p>
            </div>
            <p className="cut__text">{cut.description}</p>
            <dl className="cut__facts">
              <div>
                <dt>Kapatma</dt>
                <dd><CoverageMeter level={cut.coverage} /></dd>
              </div>
              <div>
                <dt>Neyle giyilir</dt>
                <dd>{cut.wearWith}</dd>
              </div>
            </dl>
            <Link href={`/${id}/${cut.slug}`} className="guide-arrow-link cut__link">
              Parçaları gör<span className="visually-hidden">: {cut.name}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function StilRehberiPage() {
  return (
    <main id="main" className="guide-page">
      <GuideHero
        eyebrow="Rehber"
        title="Stil rehberi"
        lead="Hangi kesim hangi kıyafetin altına uyar, ne kadar kapatır, nasıl hissettirir. Karar vermeden önce kesimleri yan yana gör."
        aside={
          <GuideJumpLinks
            links={[
              { href: '#sutyen', label: 'Sütyen kesimleri' },
              { href: '#kulot', label: 'Külot kesimleri' },
            ]}
          />
        }
      />

      <CutList id="sutyen" number="01" title="Sütyen kesimleri" lead="Destek, dekolte ve kıyafet altında görünürlük açısından." cuts={BRA_CUTS} />
      <CutList id="kulot" number="02" title="Külot kesimleri" lead="Kapatma oranı ve kıyafet altında iz bırakıp bırakmaması açısından." cuts={PANTY_CUTS} />

      <aside className="guide-next" aria-label="Diğer rehberler">
        <p>Kesimi seçtin, sıra bedende.</p>
        <div className="guide-next__links">
          <Link href="/beden-rehberi" className="guide-arrow-link">Beden rehberi</Link>
          <Link href="/bakim-rehberi" className="guide-arrow-link">Bakım rehberi</Link>
        </div>
      </aside>
    </main>
  );
}
