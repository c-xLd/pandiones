export default function SiteFooter() {
  return (
    <footer className="shop-footer">
      <div className="shop-footer-brand">
        <h2>PANDIONES</h2>
        <p>Gündüzden geceye.<br />Kendin gibi.</p>
      </div>
      <div className="shop-footer-links">
        <div><p>ALIŞVERİŞ</p><a href="/koleksiyon">Koleksiyon</a><a href="/arama">Ürün Ara</a><a href="/beden-rehberi">Bedenini Bul</a></div>
        <div><p>DESTEK</p><a href="/beden-rehberi">Beden Rehberi</a><a href="/teslimat-iade">Teslimat & İade</a><a href="/iletisim">İletişim</a><a href="/gizlilik">Gizlilik</a></div>
        <div className="shop-footer-note"><p>PANDIONES / 2026</p><h3>Rahatlık,<br /><i>özgüvendir.</i></h3><a href="/koleksiyon">Koleksiyonu keşfet ↗</a></div>
      </div>
      <div className="shop-footer-bottom"><span>© 2026 PANDIONES</span><span>İSTANBUL</span><span>Gizlilik · Koşullar</span></div>
    </footer>
  );
}
