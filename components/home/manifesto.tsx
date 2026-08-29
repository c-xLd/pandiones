import Link from 'next/link';

export default function Manifesto() {
  return (
    <section className="manifesto" aria-label="Pandiones manifestosu">
      <img src="/fabric-wide.webp" alt="Katmanlı saten ve tül kumaş kompozisyonu" loading="lazy" decoding="async" width="1600" height="900" />
      <div>
        <p>HER HALİNE EŞLİK EDER</p>
        <h2>
          Rahatlık
          <br />
          <i>özgüvendir.</i>
        </h2>
        <Link href="/koleksiyon" prefetch={true}>Koleksiyonu keşfet →</Link>
      </div>
    </section>
  );
}

