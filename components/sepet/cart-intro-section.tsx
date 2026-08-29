export default function CartIntroSection() {
  return (
    <section className="cart-intro-v2">
      <div>
        <p>ALIŞVERİŞ ÇANTASI</p>
        <h1>Seçimlerin.</h1>
      </div>
      <ol aria-label="Sipariş adımları">
        <li className="active">
          <span>01</span>Çanta
        </li>
        <li>
          <span>02</span>Teslimat
        </li>
        <li>
          <span>03</span>Ödeme
        </li>
      </ol>
    </section>
  );
}
