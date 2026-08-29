import CartIndicator from './cart-indicator';

export default function SiteHeader() {
  return (
    <header className="site-header" role="banner">
      <a className="wordmark" href="/" aria-label="Pandiones ana sayfa">
        PANDIONES
      </a>
      <nav className="main-nav" aria-label="Ana menü">
        <a href="/koleksiyon">Koleksiyon</a>
        <a href="/kategori/ic-giyim">İç Giyim</a>
        <a href="/kategori/crop-bustiyer">Crop</a>
        <a href="/kategori/gecelik">Gecelik</a>
        <a href="/beden-rehberi">Beden Rehberi</a>
      </nav>
      <div className="header-actions">
        <a href="/arama" aria-label="Arama">Ara</a>
        <CartIndicator />
      </div>
    </header>
  );
}
