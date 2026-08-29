import Link from 'next/link';

const worlds = [
  { no: '01', name: 'TAKIMLAR', note: 'Dantelli ve destekli favoriler', className: 'world-intimates', href: '/ic-giyim' },
  { no: '02', name: 'GECELİK', note: 'Tül, dantel ve feminen detaylar', className: 'world-night', href: '/gecelik' },
  { no: '03', name: 'CROP', note: 'Günlük stile uyum sağlayan formlar', className: 'world-crop', href: '/crop-bustiyer' },
  { no: '04', name: 'YENİ', note: 'Koleksiyona yeni eklenenler', className: 'world-lounge', href: '/koleksiyon' },
];

export default function Worlds() {
  return (
    <section className="worlds" id="worlds" aria-labelledby="worlds-title">
      <header>
        <p className="section-kicker">RUHUNU SEÇ</p>
        <h2 id="worlds-title">
          KOLEKSİYON
          <br />
          <i>DÜNYALARI</i>
        </h2>
      </header>
      <div className="world-grid">
        {worlds.map((world) => (
          <Link href={world.href} className={`world-card ${world.className}`} key={world.name} prefetch={true}>
            <span>{world.no}</span>
            <div>
              <h3>{world.name}</h3>
              <p>{world.note}</p>
            </div>
            <b aria-hidden="true">→</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

