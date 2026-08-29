import Link from 'next/link';
import CartIndicator from './cart-indicator';

export default function SiteHeader() {
  return (
    <header className="site-header" role="banner">
      <Link className="wordmark" href="/" aria-label="Pandiones ana sayfa" prefetch={true}>
        PANDIONES
      </Link>
      <nav className="main-nav" aria-label="Ana menü">
        <Link href="/koleksiyon" prefetch={true}>Koleksiyon</Link>
        <Link href="/ic-giyim" prefetch={true}>İç Giyim</Link>
        <Link href="/crop-bustiyer" prefetch={true}>Crop</Link>
        <Link href="/gecelik" prefetch={true}>Gecelik</Link>
        <Link href="/beden-rehberi" prefetch={true}>Beden Rehberi</Link>
      </nav>
      <div className="header-actions">
        <Link href="/arama" aria-label="Arama" prefetch={true}>Ara</Link>
        <CartIndicator />
      </div>
    </header>
  );
}

