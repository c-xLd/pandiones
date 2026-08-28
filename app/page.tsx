'use client';

import { useEffect, useState } from 'react';

const products = [
  { name: 'Satin Column Dress', price: '₺4.250', tone: 'Bone', image: '/campaign-living-fabric.png', pos: '50% 52%' },
  { name: 'Veil Lounge Set', price: '₺2.890', tone: 'Soft Skin', image: '/fabric-wide.png', pos: '72% 50%' },
  { name: 'Wine Silk Shirt', price: '₺2.450', tone: 'Deep Wine', image: '/campaign-living-fabric.png', pos: '52% 20%' },
  { name: 'Fluid Evening Skirt', price: '₺3.150', tone: 'Ink', image: '/fabric-wide.png', pos: '18% 55%' },
];

const worlds = [
  { no: '01', name: 'INTIMATES', note: 'Sessiz bir ikinci ten', className: 'world-intimates' },
  { no: '02', name: 'NIGHT', note: 'Geceye dokunan formlar', className: 'world-night' },
  { no: '03', name: 'CROP', note: 'Keskin çizgi, özgür hareket', className: 'world-crop' },
  { no: '04', name: 'LOUNGE', note: 'Yavaş günler için', className: 'world-lounge' },
];

export default function Home() {
  const [mood, setMood] = useState<'soft' | 'bold'>('soft');
  const [bagCount, setBagCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('pandiones-mood');
    if (saved === 'soft' || saved === 'bold') setMood(saved);
  }, []);

  const chooseMood = (next: 'soft' | 'bold') => {
    setMood(next);
    window.localStorage.setItem('pandiones-mood', next);
  };

  const addToBag = (name: string) => {
    setBagCount((value) => value + 1);
    setNotice(`${name} çantana eklendi.`);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const toggleFavorite = (name: string) => {
    setFavorites((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  };

  return (
    <main className={`site-shell mood-${mood}`}>
      <section className="hero" id="top" aria-labelledby="hero-title">
        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="Pandiones ana sayfa">PANDIONES</a>
          <nav className="main-nav" aria-label="Ana menü">
            <a href="#collection">Yeni</a><a href="#products">İç Giyim</a><a href="#worlds">Giyim</a><a href="#worlds">Dünyalar</a>
          </nav>
          <div className="header-actions">
            <button type="button" aria-label="Ara">Ara</button>
            <a href="#products" aria-label={`Alışveriş çantası, ${bagCount} ürün`}>Çanta <span>{bagCount}</span></a>
          </div>
        </header>

        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="fabric-sculpture" aria-hidden="true">
          <span className="fabric fabric-one" /><span className="fabric fabric-two" /><span className="fabric fabric-three" /><span className="fabric-shadow" />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">DROP 01 / 2026</p>
          <h1 id="hero-title"><span>SECOND</span><span className="title-indent">SKIN</span></h1>
        </div>
        <div className="hero-footer">
          <p>Formunu hisset.<br />Hareketinle yaşayan kumaşlar.</p>
          <a className="primary-cta" href="#collection"><span>Yeni koleksiyonu keşfet</span><span aria-hidden="true">↗</span></a>
          <p className="scene-label">LIVING FABRIC<br />SCENE 01</p>
        </div>
        <a className="scroll-cue" href="#story" aria-label="Hikâyeye ilerle"><span>Kaydır</span><span aria-hidden="true">↓</span></a>
      </section>

      <section className="story" id="story" aria-labelledby="story-title">
        <div className="story-sticky">
          <div className="story-media" aria-hidden="true"><img src="/fabric-wide.png" alt="" /></div>
          <div className="story-stage story-form"><p>01 / FORM</p><h2 id="story-title">Designed around<br />the way you feel.</h2></div>
          <div className="story-stage story-touch"><p>02 / TOUCH</p><h2>Lace. Satin.<br /><i>Motion.</i></h2></div>
          <div className="story-stage story-yours"><p>03 / YOURS</p><h2>Make it<br /><i>yours.</i></h2></div>
        </div>
      </section>

      <section className="mood-section" aria-labelledby="mood-title">
        <div className="mood-orbit" aria-hidden="true"><span /><span /></div>
        <p className="section-kicker">ONE BODY / TWO WORLDS</p>
        <h2 id="mood-title">How do you<br />want to <i>feel?</i></h2>
        <div className="mood-switch" role="group" aria-label="Koleksiyon ruhunu seç">
          <button className={mood === 'soft' ? 'active' : ''} type="button" onClick={() => chooseMood('soft')} aria-pressed={mood === 'soft'}>SOFT <span>01</span></button>
          <button className={mood === 'bold' ? 'active' : ''} type="button" onClick={() => chooseMood('bold')} aria-pressed={mood === 'bold'}>BOLD <span>02</span></button>
        </div>
        <p className="mood-copy">{mood === 'soft' ? 'İnci ışığı, sakin formlar ve günlük ritüeller.' : 'Derin tonlar, keskin çizgiler ve gecenin enerjisi.'}</p>
      </section>

      <section className="drop-section" id="collection" aria-labelledby="drop-title">
        <header className="section-head"><p>CURATED ARRIVALS</p><h2 id="drop-title">THE DROP <span>/ 01</span></h2><p>Kaydırarak keşfet →</p></header>
        <div className="drop-reel">
          <article className="drop-card drop-hero">
            <img src="/campaign-living-fabric.png" alt="Kemik beyaz saten elbiseli model, şarap rengi kumaş katmanları arasında" />
            <div className="drop-number">01</div>
            <div className="drop-info"><p>NEW SILHOUETTE</p><h3>Satin Column<br />Dress</h3><div><span>Bone</span><span>₺4.250</span></div><button type="button" onClick={() => addToBag('Satin Column Dress')}>Çantaya ekle ↗</button></div>
          </article>
          <article className="drop-card drop-fabric">
            <img src="/fabric-wide.png" alt="Şarap, fildişi ve ten tonlarında katmanlı ipek kumaşlar" />
            <div className="drop-number">02</div>
            <div className="drop-info"><p>SOFT WORLD</p><h3>Veil Lounge<br />Set</h3><div><span>Soft Skin</span><span>₺2.890</span></div><button type="button" onClick={() => addToBag('Veil Lounge Set')}>Çantaya ekle ↗</button></div>
          </article>
          <article className="drop-card drop-type">
            <p className="giant-word">FEEL<br />THE<br /><i>FORM</i></p>
            <div className="drop-number">03</div>
            <div className="drop-info"><p>THE EDIT / 2026</p><h3>Pieces that move<br />the way you do.</h3><a href="#products">Tümünü gör ↗</a></div>
          </article>
        </div>
      </section>

      <section className="portal" aria-labelledby="portal-title">
        <div className="portal-copy"><p className="section-kicker">PRODUCT PORTAL / 01</p><h2 id="portal-title">The form<br />of <i>light.</i></h2><p>Akışkan saten, bedeni takip eden dengeli bir form ve gün boyu süren hafiflik.</p><button type="button" onClick={() => addToBag('Satin Column Dress')}>Ürünü keşfet <span>↗</span></button></div>
        <div className="portal-image"><div className="portal-halo" aria-hidden="true" /><img src="/campaign-living-fabric.png" alt="Kemik beyaz uzun saten elbisenin ön görünümü" /></div>
        <dl className="portal-specs"><div><dt>01 / MATERIAL</dt><dd>Silk satin blend</dd></div><div><dt>02 / FEEL</dt><dd>Fluid &amp; weightless</dd></div><div><dt>03 / FORM</dt><dd>Body-skimming</dd></div><div><dt>04 / COLOR</dt><dd><span className="swatch bone" /> Bone white</dd></div></dl>
      </section>

      <section className="worlds" id="worlds" aria-labelledby="worlds-title">
        <header><p className="section-kicker">CHOOSE YOUR ATMOSPHERE</p><h2 id="worlds-title">CATEGORY<br /><i>WORLDS</i></h2></header>
        <div className="world-grid">
          {worlds.map((world) => <a href="#products" className={`world-card ${world.className}`} key={world.name}><span>{world.no}</span><div><h3>{world.name}</h3><p>{world.note}</p></div><b aria-hidden="true">↗</b></a>)}
        </div>
      </section>

      <section className="products" id="products" aria-labelledby="products-title">
        <header className="section-head"><p>SELECTED FOR YOU</p><h2 id="products-title">NEW FORMS</h2><a href="#products">Tümünü gör ↗</a></header>
        <div className="product-grid">
          {products.map((product, index) => {
            const favorite = favorites.includes(product.name);
            return <article className="product-card" key={product.name}>
              <div className="product-image"><img src={product.image} alt={`${product.name} için editoryal ürün görünümü`} style={{ objectPosition: product.pos }} /><span>0{index + 1}</span><button type="button" onClick={() => toggleFavorite(product.name)} aria-pressed={favorite} aria-label={`${product.name} ${favorite ? 'favorilerden çıkar' : 'favorilere ekle'}`}>{favorite ? '♥' : '♡'}</button><div className="quick-add"><button type="button" onClick={() => addToBag(product.name)}>Hızlı ekle</button><span>XS · S · M · L</span></div></div>
              <div className="product-meta"><div><h3>{product.name}</h3><p>{product.tone}</p></div><p>{product.price}</p></div>
            </article>;
          })}
        </div>
      </section>

      <section className="manifesto" aria-label="Pandiones manifestosu">
        <img src="/fabric-wide.png" alt="Katmanlı saten ve tül kumaş kompozisyonu" />
        <div><p>MADE TO MOVE WITH YOU</p><h2>Soft is<br /><i>power.</i></h2><a href="#top">Hikâyemizi keşfet ↗</a></div>
      </section>

      <footer className="site-footer">
        <div className="footer-top"><h2>PANDIONES</h2><p>Formuna yakın.<br />Hareketine özgür.</p></div>
        <div className="footer-grid"><div><p>SHOP</p><a href="#products">Yeni</a><a href="#products">İç Giyim</a><a href="#worlds">Giyim</a><a href="#worlds">Aksesuar</a></div><div><p>HELP</p><a href="#top">Beden Rehberi</a><a href="#top">Teslimat</a><a href="#top">İade</a><a href="#top">İletişim</a></div><div className="newsletter"><p>STAY CLOSE</p><h3>Yeni hikâyelerden<br />ilk sen haberdar ol.</h3><form onSubmit={(event) => { event.preventDefault(); setNotice('Teşekkürler. Listeye eklendin.'); }}><label className="sr-only" htmlFor="email">E-posta adresi</label><input id="email" type="email" placeholder="E-posta adresin" required /><button type="submit" aria-label="Bültene kaydol">↗</button></form></div></div>
        <div className="footer-bottom"><span>© 2026 PANDIONES</span><span>ISTANBUL / 41.0082° N</span><span>Gizlilik · Koşullar</span></div>
      </footer>

      <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice}</div>
    </main>
  );
}
