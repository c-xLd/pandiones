export default function PortalSection() {
  return (
    <section className="portal" aria-labelledby="portal-title">
      <div className="portal-copy">
        <p className="section-kicker">ÜRÜN PORTRESİ / 01</p>
        <h2 id="portal-title">
          Gecenin
          <br />
          <i>ışıltısı.</i>
        </h2>
        <p>
          Simli baskısı, balenli yapısı ve destekli formuyla güçlü görünümü rahatlıkla buluşturan iki parçalı takım.
        </p>
        <a href="/urun/simli-destekli-bustiyer-takim">
          Ürünü keşfet <span>→</span>
        </a>
      </div>
      <div className="portal-image">
        <div className="portal-halo" aria-hidden="true" />
        <img
          src="/products/simli-bustiyer-takim.jpg"
          alt="Pandiones simli destekli büstiyer sütyen takımının ürün görünümü"
        />
      </div>
      <dl className="portal-specs">
        <div>
          <dt>01 / MATERYAL</dt>
          <dd>Poliamid karışımı</dd>
        </div>
        <div>
          <dt>02 / DESTEK</dt>
          <dd>Balenli ve destekli</dd>
        </div>
        <div>
          <dt>03 / TAKIM</dt>
          <dd>İki parçalı set</dd>
        </div>
        <div>
          <dt>04 / RENK</dt>
          <dd>
            <span className="swatch bone" /> Siyah
          </dd>
        </div>
      </dl>
    </section>
  );
}
