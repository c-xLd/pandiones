'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export default function BedenRehberiPage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'bra-table' | 'panty-table' | 'sleep-table'>('calculator');

  // Calculator inputs (in cm)
  const [underbust, setUnderbust] = useState<number>(75); // Göğüs altı
  const [bust, setBust] = useState<number>(90); // Göğüs tepe noktası

  // Calculation Logic
  const calculatedBra = useMemo(() => {
    // Determine band size (TR / EU standard)
    let band = 75;
    if (underbust < 68) band = 65;
    else if (underbust <= 72) band = 70;
    else if (underbust <= 77) band = 75;
    else if (underbust <= 82) band = 80;
    else if (underbust <= 87) band = 85;
    else if (underbust <= 92) band = 90;
    else if (underbust <= 97) band = 95;
    else band = 100;

    // Difference between bust and underbust determines Cup size
    const diff = bust - underbust;
    let cup = 'B';
    if (diff <= 11) cup = 'A';
    else if (diff <= 13.5) cup = 'B';
    else if (diff <= 16) cup = 'C';
    else if (diff <= 18.5) cup = 'D';
    else if (diff <= 21) cup = 'E';
    else cup = 'F';

    // International conversions
    const itSize = band === 65 ? '1B' : band === 70 ? '2' : band === 75 ? '3' : band === 80 ? '4' : band === 85 ? '5' : '6';

    return {
      size: `${band}${cup}`,
      band,
      cup,
      itSize: `${itSize} (${band}${cup})`,
      usSize: `${band === 70 ? 32 : band === 75 ? 34 : band === 80 ? 36 : band === 85 ? 38 : 40}${cup}`,
      diff,
    };
  }, [underbust, bust]);

  const tabs = [
    { key: 'calculator' as const, label: '✨ İnteraktif Hesaplayıcı' },
    { key: 'bra-table' as const, label: 'Sütyen Beden Tablosu' },
    { key: 'panty-table' as const, label: 'Külot Beden Tablosu' },
    { key: 'sleep-table' as const, label: 'Pijama & Ev Giyim' },
  ];

  return (
    <main id="main" className="padded-main guide-page">
      {/* ── Breadcrumb ── */}
      <div className="guide-breadcrumb">
        <nav aria-label="Ekmek kırıntısı">
          <Link href="/">Ana Sayfa</Link>
          <span>/</span>
          <span style={{ color: 'var(--ink)' }}>Beden Rehberi</span>
        </nav>
      </div>

      {/* ── Editorial Header ── */}
      <section className="guide-hero hero-entrance">
        <p className="guide-eyebrow">PANDIONES REHBERİ</p>
        <h1 className="guide-title">
          Beden ve Kup Rehberi
        </h1>
        <p className="guide-subtitle hero-entrance-delay">
          Doğru sütyen ve iç giyim bedeni, kıyafetin duruşunu ve gün boyu teninizdeki konforu baştan aşağı değiştirir. İtalyan kuplarımız ve mimari kalıplarımız için kusursuz bedeninizi keşfedin.
        </p>
      </section>

      <div className="guide-content">
        {/* ── Tabs Navigation ── */}
        <div
          role="tablist"
          aria-label="Beden rehberi sekmeleri"
          className="guide-tab-bar"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`guide-tab apple-press${activeTab === tab.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: INTERACTIVE CALCULATOR ── */}
        {activeTab === 'calculator' && (
          <div className="guide-calculator-grid stagger-in">
            {/* Input Controls Card */}
            <div className="guide-card" style={{ borderRadius: '12px' }}>
              <div className="guide-card-body" style={{ padding: 'clamp(24px, 3vw, 36px)' }}>
                <h2 style={{ font: '400 22px var(--serif)', margin: '0 0 8px' }}>Ölçülerinizi Belirleyin</h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 28px', lineHeight: 1.5 }}>
                  Mezurayı göğsünüze paralel tutarak santimetre cinsinden ölçülerinizi seçin.
                </p>

                {/* Step 1: Underbust (Bant) */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label htmlFor="underbust-range" style={{ fontSize: '13px', fontWeight: 600 }}>
                      1. Göğüs Altı Çevresi (Bant)
                    </label>
                    <span className="guide-range-value">{underbust} cm</span>
                  </div>
                  <input
                    id="underbust-range"
                    type="range"
                    min={65}
                    max={100}
                    step={1}
                    value={underbust}
                    onChange={(e) => setUnderbust(Number(e.target.value))}
                    className="guide-range-slider"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                    Göğüslerin hemen altındaki kemik hattından mezurayı sıkıca sararak ölçün.
                  </span>
                </div>

                {/* Step 2: Bust (Tepe Noktası) */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label htmlFor="bust-range" style={{ fontSize: '13px', fontWeight: 600 }}>
                      2. Göğüs Çevresi (Tepe Noktası)
                    </label>
                    <span className="guide-range-value">{bust} cm</span>
                  </div>
                  <input
                    id="bust-range"
                    type="range"
                    min={Math.max(underbust + 5, 75)}
                    max={120}
                    step={1}
                    value={bust}
                    onChange={(e) => setBust(Number(e.target.value))}
                    className="guide-range-slider"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                    Göğüs ucunun en dolgun olduğu hattan, mezurayı sıkmadan yatay şekilde ölçün.
                  </span>
                </div>

                <div className="guide-tip-box">
                  💡 <strong>Önemli İpucu:</strong> Ölçüm alırken süngersiz ve balensiz hafif bir sütyen giymeniz en doğru neticeyi verir.
                </div>
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="glass-surface guide-result-card">
              <p className="guide-eyebrow" style={{ marginBottom: '8px' }}>ÖNERİLEN BEDENİNİZ</p>
              <div className="guide-result-size">
                {calculatedBra.size}
              </div>

              <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
                Ölçümlerinize göre ideal sütyen bedeniniz <strong>{calculatedBra.size}</strong> olarak hesaplanmıştır.
              </p>

              {/* International Conversions */}
              <div className="guide-conversion-grid">
                <div>
                  <span className="guide-conversion-label">TR / EU</span>
                  <strong>{calculatedBra.size}</strong>
                </div>
                <div>
                  <span className="guide-conversion-label">İTALYA</span>
                  <strong>{calculatedBra.itSize}</strong>
                </div>
                <div>
                  <span className="guide-conversion-label">US / UK</span>
                  <strong>{calculatedBra.usSize}</strong>
                </div>
              </div>

              <Link href="/koleksiyon/sutyen" className="btn btn--primary btn--lg btn--block guide-result-cta">
                {calculatedBra.size} Sütyen Koleksiyonunu Keşfet ↗
              </Link>
            </div>
          </div>
        )}

        {/* ── TAB 2: BRA SIZE TABLE ── */}
        {activeTab === 'bra-table' && (
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>TR / EU Beden</th>
                  <th>İtalya (IT)</th>
                  <th>US / UK</th>
                  <th>Göğüs Altı (cm)</th>
                  <th>Kup B (cm)</th>
                  <th>Kup C (cm)</th>
                  <th>Kup D (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { eu: '70', it: '1', us: '32', under: '68 - 72', b: '84 - 86', c: '86 - 88', d: '88 - 90' },
                  { eu: '75', it: '2', us: '34', under: '73 - 77', b: '89 - 91', c: '91 - 93', d: '93 - 95' },
                  { eu: '80', it: '3', us: '36', under: '78 - 82', b: '94 - 96', c: '96 - 98', d: '98 - 100' },
                  { eu: '85', it: '4', us: '38', under: '83 - 87', b: '99 - 101', c: '101 - 103', d: '103 - 105' },
                  { eu: '90', it: '5', us: '40', under: '88 - 92', b: '104 - 106', c: '106 - 108', d: '108 - 110' },
                  { eu: '95', it: '6', us: '42', under: '93 - 97', b: '109 - 111', c: '111 - 113', d: '113 - 115' },
                ].map((row) => (
                  <tr key={row.eu}>
                    <td><strong>{row.eu}</strong></td>
                    <td>{row.it}</td>
                    <td>{row.us}</td>
                    <td>{row.under} cm</td>
                    <td>{row.b} cm</td>
                    <td>{row.c} cm</td>
                    <td>{row.d} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 3: PANTY SIZE TABLE ── */}
        {activeTab === 'panty-table' && (
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Beden</th>
                  <th>İtalya (IT)</th>
                  <th>Avrupa (EU)</th>
                  <th>Bel Çevresi (cm)</th>
                  <th>Basen Çevresi (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: 'XS', it: '1', eu: '34', waist: '60 - 64', hip: '86 - 90' },
                  { size: 'S', it: '2', eu: '36', waist: '65 - 69', hip: '91 - 95' },
                  { size: 'M', it: '3', eu: '38', waist: '70 - 74', hip: '96 - 100' },
                  { size: 'L', it: '4', eu: '40', waist: '75 - 79', hip: '101 - 105' },
                  { size: 'XL', it: '5', eu: '42', waist: '80 - 85', hip: '106 - 112' },
                ].map((row) => (
                  <tr key={row.size}>
                    <td><strong>{row.size}</strong></td>
                    <td>{row.it}</td>
                    <td>{row.eu}</td>
                    <td>{row.waist} cm</td>
                    <td>{row.hip} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 4: SLEEP & LOUNGE TABLE ── */}
        {activeTab === 'sleep-table' && (
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Standart Beden</th>
                  <th>Avrupa (EU)</th>
                  <th>Göğüs (cm)</th>
                  <th>Bel (cm)</th>
                  <th>Basen (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: 'XS (34)', eu: '34', bust: '80 - 84', waist: '60 - 64', hip: '86 - 90' },
                  { size: 'S (36)', eu: '36', bust: '85 - 89', waist: '65 - 69', hip: '91 - 95' },
                  { size: 'M (38)', eu: '38', bust: '90 - 94', waist: '70 - 74', hip: '96 - 100' },
                  { size: 'L (40)', eu: '40', bust: '95 - 99', waist: '75 - 79', hip: '101 - 105' },
                  { size: 'XL (42)', eu: '42', bust: '100 - 106', waist: '80 - 86', hip: '106 - 112' },
                ].map((row) => (
                  <tr key={row.size}>
                    <td><strong>{row.size}</strong></td>
                    <td>{row.eu}</td>
                    <td>{row.bust} cm</td>
                    <td>{row.waist} cm</td>
                    <td>{row.hip} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── MEASURING GUIDE STEPS ── */}
        <section className="guide-measure-section">
          <h2 className="guide-measure-title">
            Doğru Ölçüm Nasıl Alınır?
          </h2>
          <div className="guide-style-grid stagger-in">
            <div className="guide-card">
              <div className="guide-card-body">
                <span className="guide-step-number">01</span>
                <h3 className="guide-card-title" style={{ fontSize: '16px' }}>Bant Ölçüsü (Göğüs Altı)</h3>
                <p className="guide-card-text">
                  Mezurayı göğüs dokunuzun bittiği alt çizgi boyunca sıkı ama nefesinizi kısıtlamayacak şekilde dolayın. Çıkan santimetre bant ölçünüzü belirler.
                </p>
              </div>
            </div>
            <div className="guide-card">
              <div className="guide-card-body">
                <span className="guide-step-number">02</span>
                <h3 className="guide-card-title" style={{ fontSize: '16px' }}>Kup Ölçüsü (Tepe Noktası)</h3>
                <p className="guide-card-text">
                  Mezurayı göğüs ucunun en dolgun olduğu tepe noktasından geçirin. Mezurayı bastırmadan, yere tam paralel olduğundan emin olarak ölçün.
                </p>
              </div>
            </div>
            <div className="guide-card">
              <div className="guide-card-body">
                <span className="guide-step-number">03</span>
                <h3 className="guide-card-title" style={{ fontSize: '16px' }}>Kusursuz Oturuş Kontrolü</h3>
                <p className="guide-card-text">
                  Doğru sütyenin sırt bandı yukarı kaymaz, balenleri kol altına batmaz ve kup kenarlarından taşma veya boşluk oluşmaz.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
