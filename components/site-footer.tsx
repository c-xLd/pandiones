import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="shop-footer">
      <div className="shop-footer-brand">
        <h2>PANDIONES</h2>
        <p>Gündüzden geceye.<br />Kendin gibi.</p>
      </div>
      <div className="shop-footer-links">
        <div><p>ALIŞVERİŞ</p><Link href="/koleksiyon" prefetch={true}>Koleksiyon</Link><Link href="/arama" prefetch={true}>Ürün Ara</Link><Link href="/beden-rehberi" prefetch={true}>Bedenini Bul</Link></div>
        <div><p>DESTEK</p><Link href="/beden-rehberi" prefetch={true}>Beden Rehberi</Link><Link href="/teslimat-iade" prefetch={true}>Teslimat & İade</Link><Link href="/iletisim" prefetch={true}>İletişim</Link><Link href="/gizlilik" prefetch={true}>Gizlilik</Link></div>
        <div className="shop-footer-note"><p>PANDIONES / 2026</p><h3>Rahatlık,<br /><i>özgüvendir.</i></h3><Link href="/koleksiyon" prefetch={true}>Koleksiyonu keşfet ↗</Link></div>
      </div>
      <div className="shop-footer-bottom"><span>© 2026 PANDIONES</span><span>İSTANBUL</span><span>Gizlilik · Koşullar</span></div>
    </footer>
  );
}

