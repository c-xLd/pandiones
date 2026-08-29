export default function Story() {
  return (
    <section className="story" id="story" aria-labelledby="story-title">
      <div className="story-sticky">
        <div className="story-media" aria-hidden="true">
          <img
            src="/fabric-wide.webp"
            alt="Pandiones akışkan kumaş kompozisyonu"
            loading="lazy"
            decoding="async"
            width="1200"
            height="800"
          />
        </div>
        <div className="story-stage story-form">
          <p>01 / FORM</p>
          <h2 id="story-title">
            Designed around
            <br />
            the way you feel.
          </h2>
        </div>
        <div className="story-stage story-touch">
          <p>02 / TOUCH</p>
          <h2>
            Lace. Satin.
            <br />
            <i>Motion.</i>
          </h2>
        </div>
        <div className="story-stage story-yours">
          <p>03 / YOURS</p>
          <h2>
            Make it
            <br />
            <i>yours.</i>
          </h2>
        </div>
      </div>
    </section>
  );
}
