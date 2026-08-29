import Link from 'next/link';

export default function ProductValues() {
  return (
    <section className="product-values" aria-label="Pandiones ürün hizmetleri">
      <article>
        <span>01</span>
        <h2>Beden desteği</h2>
        <p>Karar vermeden önce beden rehberini incele; formuna en uygun seçimi yap.</p>
        <Link href="/beden-rehberi" prefetch={true}>Rehberi aç →</Link>
      </article>
      <article>
        <span>02</span>
        <h2>Özenli paketleme</h2>
        <p>Siparişin ürünü koruyan, sade ve özenli bir paketleme ile hazırlanır.</p>
      </article>
      <article>
        <span>03</span>
        <h2>Teslimat bilgisi</h2>
        <p>Kargo, değişim ve iade sürecinin tüm adımlarına tek yerden ulaş.</p>
        <Link href="/teslimat-iade" prefetch={true}>Detayları gör →</Link>
      </article>
    </section>
  );
}

