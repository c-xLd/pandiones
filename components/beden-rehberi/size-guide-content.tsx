export default function SizeGuideContent() {
  return (
    <>
      <div className="size-guide-lead">
        <span>ÖLÇÜM ÖNCESİ</span>
        <h2>Mezuranı hazırla.<br /><i>Doğal dur.</i></h2>
        <p>İnce kıyafet veya iç giyim üzerinden ölçüm yap. Mezurayı yere paralel tut; sıkmadan, boşluk da bırakmadan vücuduna yerleştir.</p>
      </div>
      <div className="size-steps">
        <article>
          <span>01</span>
          <div>
            <p>ÇEVRE ÖLÇÜSÜ</p>
            <h2>Göğüs çevresi</h2>
            <p>Mezurayı göğsünün en dolgun noktasından, zemine paralel ve sıkmadan geçir.</p>
          </div>
          <b>→</b>
        </article>
        <article>
          <span>02</span>
          <div>
            <p>BANT ÖLÇÜSÜ</p>
            <h2>Göğüs altı</h2>
            <p>Sütyen bandının oturduğu çizgiden ölç. Mezura sabit dursun fakat tenini sıkıştırmasın.</p>
          </div>
          <b>→</b>
        </article>
        <article>
          <span>03</span>
          <div>
            <p>FORM ÖLÇÜSÜ</p>
            <h2>Bel çevresi</h2>
            <p>Doğal bel hattından, rahat nefes alırken ölç. İki beden arasındaysan ürün formu notunu kontrol et.</p>
          </div>
          <b>→</b>
        </article>
      </div>
      <div className="size-checklist">
        <div>
          <span>01</span>
          <p>Mezura zemine paralel mi?</p>
        </div>
        <div>
          <span>02</span>
          <p>Normal şekilde nefes alıyor musun?</p>
        </div>
        <div>
          <span>03</span>
          <p>Ürün sayfasındaki kalıp notunu okudun mu?</p>
        </div>
      </div>
      <aside>
        <span>KİŞİSEL BEDEN DESTEĞİ</span>
        <h2>İki beden arasında mı kaldın?</h2>
        <p>Ürün sayfasındaki form bilgisini incele. Karar veremediğinde ürün adı ve ölçülerinle destek kanalımızdan bize ulaş.</p>
        <a href="/iletisim">Bize ulaş →</a>
      </aside>
    </>
  );
}
