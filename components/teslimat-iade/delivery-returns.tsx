import Link from 'next/link';

export default function DeliveryReturns() {
  return (
    <>
      <div className="delivery-flow">
        <article>
          <span>01</span>
          <div>
            <p>SİPARİŞ ALINDI</p>
            <h2>Hazırlık</h2>
            <p>Ödeme onayından sonra siparişin hazırlanır. Paket kargoya teslim edildiğinde takip bilgisi kayıtlı iletişim kanalına iletilir.</p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <p>YOLA ÇIKTI</p>
            <h2>Teslimat</h2>
            <p>Gönderi süresi adres ve seçilen kargo yöntemine göre değişebilir. Güncel tahmin ödeme adımında açıkça gösterilir.</p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <p>TALEP OLUŞTURULDU</p>
            <h2>İade incelemesi</h2>
            <p>İç giyim ürünlerinde talep; koruyucu ambalaj, bant veya mührün durumu ve hijyen koşulları dikkate alınarak ürün özelinde incelenir.</p>
          </div>
        </article>
      </div>
      <section className="delivery-notice">
        <span>ÖNEMLİ / HİJYEN</span>
        <h2>Koruyucu ambalajı<br /><i>teslim almadan açma.</i></h2>
        <p>İade değerlendirmesinde ürünün kullanılmamış olması ve hijyen korumasının bütünlüğü önemlidir. Ürünü teslim aldığında önce beden ve ürün bilgilerini kontrol et.</p>
      </section>
      <div className="delivery-faq">
        <details>
          <summary>Kargo bilgisini nereden görebilirim? <span>+</span></summary>
          <p>Sipariş kargoya verildiğinde takip bilgisi siparişte kayıtlı iletişim kanalına iletilir.</p>
        </details>
        <details>
          <summary>İade talebim nasıl değerlendirilir? <span>+</span></summary>
          <p>Talep, ürünün niteliği ve hijyen korumasının durumu dikkate alınarak ürün özelinde incelenir.</p>
        </details>
        <details>
          <summary>Destek için ne hazırlamalıyım? <span>+</span></summary>
          <p>Sipariş numaranı ve talebini açıklayan kısa bilgiyi hazır bulundur. Kart bilgisi veya şifre paylaşma.</p>
        </details>
      </div>
      <aside>
        <span>SİPARİŞ DESTEĞİ</span>
        <h2>Siparişinle ilgili desteğe mi ihtiyacın var?</h2>
        <p>Sipariş numaranı hazır bulundur; sana doğru kanaldan yardımcı olalım.</p>
        <Link href="/iletisim" prefetch={true}>İletişim seçeneklerini gör →</Link>
      </aside>
    </>
  );
}

