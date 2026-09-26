import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Kumaş ve Bakım Rehberi — PANDIONES Lüks İç Giyim',
  description: 'Saf ipek, İtalyan danteli ve modal kumaşların ömrünü uzatan profesyonel yıkama ve saklama talimatları.',
};

const FABRICS = [
  {
    title: 'Saf Dut İpeği (Mulberry Silk)',
    subtitle: 'Narin lifler, doğal parlaklık ve termal konfor',
    badge: '100% Doğal Lif',
    rules: [
      'Maksimum 30°C ılık suda, pH nötr özel ipek veya bebek şampuanı ile elde yıkayın.',
      'Asla çitilemeyin veya burkarak sıkmayın; fazla suyu temiz bir pamuklu havluya sararak hafifçe alın.',
      'Doğrudan güneş ışığına veya kalorifer üzerine maruz bırakmadan, gölgede sererek kurutun.',
      'Hafif nemliyken, en düşük ısıda (ipek ayarı) tersten buhar uygulamadan ütüleyin.',
    ],
    warning: 'Kuru temizleme önerilir; çamaşır suyu ve optik ağartıcılar lifleri kalıcı olarak zedeler.',
  },
  {
    title: 'İtalyan Danteli (Italian Lace)',
    subtitle: 'Mimari desenler, esnek iplikler ve narin dokuma',
    badge: 'Artisan Zanaat',
    rules: [
      'Makinede yıkanacaksa mutlaka fermuarlı bir yıkama filesi içerisinde, en hassas programda yıkayın.',
      'Sütyen kopçalarını yıkamadan önce mutlaka birbirine takın; açık kopçalar dantel gözlerine takılabilir.',
      'Ağır kimyasal yumuşatıcılar dantelin elastan esnekliğini gevşetir; minimum deterjan kullanın.',
      'Sıcak kurutma makinelerinden uzak tutun; oda sıcaklığında düz bir zeminde kurutun.',
    ],
    warning: 'Dantel üzerine parfüm ve deodorantı doğrudan sıkmaktan kaçının.',
  },
  {
    title: 'Akıcı Saten & Modal',
    subtitle: 'İpeksi döküm, nefes alan lifler ve kalıcı pürüzsüzlük',
    badge: 'Eko-Sertifikalı Dokuma',
    rules: [
      '30°C kısa programda benzer renklerle birlikte yıkayınız.',
      'Tüylenmeyi önlemek için ters çevirerek makineye atınız.',
      'Kırışıklıkları gidermek için düşük ısıda veya askıda dikey buhar vererek ütüleyiniz.',
    ],
    warning: 'Yüksek devirli sıkma programları kumaş liflerinin matlaşmasına yol açabilir.',
  },
];

const CARE_SYMBOLS = [
  { symbol: '30°', label: 'Hassas Yıkama', desc: 'Maks. 30°C narin yıkama' },
  { symbol: '⨂', label: 'Çamaşır Suyu', desc: 'Ağartıcı kesinlikle kullanılmaz' },
  { symbol: '⊘', label: 'Kurutma Makinesi', desc: 'Tamburlu kurutma yapılmaz' },
  { symbol: '⬝', label: 'Düşük Isı Ütü', desc: 'Maks. 110°C, tersten buharsız' },
  { symbol: 'P', label: 'Kuru Temizleme', desc: 'Hassas solventlerle temizlenebilir' },
  { symbol: '―', label: 'Sererek Kurutma', desc: 'Düz bir havlu üzerinde gölgede' },
];

export default function BakimRehberiPage() {
  return (
    <main id="main" className="padded-main guide-page">
      {/* ── Breadcrumb ── */}
      <div className="guide-breadcrumb">
        <nav aria-label="Ekmek kırıntısı">
          <Link href="/" className="apple-press">Ana Sayfa</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>Bakım Rehberi</span>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="guide-hero hero-entrance">
        <p className="guide-eyebrow">PANDIONES ZANAATI & SÜRDÜRÜLEBİLİRLİK</p>
        <h1 className="guide-title">
          Kumaş ve Yıkama Bakım Rehberi
        </h1>
        <p className="guide-subtitle">
          Saf ipekten İtalyan danteline kadar her bir Pandiones parçası, özel bir özen ve hassasiyet hak eder. 
          Parçalarınızın ilk günkü dokusunu ve zarafetini nesiller boyu koruması için hazırladığımız rehber.
        </p>
      </section>

      <div className="guide-content">
        {/* Care Symbols Matrix */}
        <section
          style={{
            marginBottom: '48px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: ' clamp(20px, 3vw, 32px)',
          }}
          aria-label="Uluslararası Bakım Sembolleri"
        >
          <p className="guide-eyebrow" style={{ textAlign: 'center', marginBottom: '8px' }}>
            ETİKET OKUMA KILAVUZU
          </p>
          <h2
            style={{
              font: '400 clamp(20px, 2vw, 24px) var(--serif)',
              textAlign: 'center',
              margin: '0 0 24px',
              color: 'var(--ink)',
            }}
          >
            Uluslararası Bakım Sembolleri
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
            }}
          >
            {CARE_SYMBOLS.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '16px 12px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '24px',
                    fontWeight: 600,
                    color: 'var(--accent-gold)',
                    marginBottom: '6px',
                  }}
                >
                  {item.symbol}
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fabric Care Cards */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} aria-label="Kumaş Türlerine Göre Bakım">
          {FABRICS.map((fabric, idx) => (
            <article
              key={idx}
              className="guide-card"
              style={{
                padding: 'clamp(24px, 4vw, 36px)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h2 style={{ font: '400 clamp(22px, 2.2vw, 28px) var(--serif)', margin: '0 0 6px', color: 'var(--ink)' }}>
                    {fabric.title}
                  </h2>
                  <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                    {fabric.subtitle}
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                    color: 'var(--ink)',
                  }}
                >
                  {fabric.badge}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '24px 0' }}>
                {fabric.rules.map((rule, rIdx) => (
                  <div key={rIdx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '16px', lineHeight: 1.2 }}>✓</span>
                    <span style={{ color: 'var(--ink)' }}>{rule}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#991b1b',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '16px' }}>⚠️</span>
                <span><strong>Önemli Hatırlatma:</strong> {fabric.warning}</span>
              </div>
            </article>
          ))}
        </section>

        {/* Cup & Shape Preservation Guide */}
        <section
          style={{
            marginTop: '56px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: 'clamp(28px, 4vw, 40px)',
          }}
          aria-label="Kalıp Koruma Tavsiyeleri"
        >
          <p className="guide-eyebrow" style={{ marginBottom: '8px' }}>FORM KORUMA ZİYAFETİ</p>
          <h2 style={{ font: '400 clamp(22px, 2.5vw, 28px) var(--serif)', margin: '0 0 14px', color: 'var(--ink)' }}>
            Sütyen Kuplarını ve Balenleri Nasıl Saklamalısınız?
          </h2>
          <p style={{ fontSize: '14.5px', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '28px', maxWidth: '800px' }}>
            Kup formunun çökmesini ve balenlerin deforme olmasını önlemek için sütyenlerinizi kupları birbirinin içine 
            katlamadan (ters çevirmeden), çekmecenizde düz veya ardışık sıralayarak saklayınız. Seyahat ederken süngerli 
            kupların içine çorap veya ipek gecelik yerleştirmek boşluk kalmasını ve ezilmeyi engeller.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/koleksiyon"
              className="apple-press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--ink)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Koleksiyonu İncele ↗
            </Link>
            <Link
              href="/beden-rehberi"
              className="apple-press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Beden Rehberi&apos;ne Git →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
