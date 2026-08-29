export default function MoodSection({
  mood,
  chooseMood,
}: {
  mood: 'soft' | 'bold';
  chooseMood: (next: 'soft' | 'bold') => void;
}) {
  return (
    <section className="mood-section" aria-labelledby="mood-title">
      <div className="mood-orbit" aria-hidden="true">
        <span />
        <span />
      </div>
      <p className="section-kicker">BİR BEDEN / İKİ HİS</p>
      <h2 id="mood-title">
        Bugün nasıl
        <br />
        <i>hissetmek</i> istersin?
      </h2>
      <div className="mood-switch" role="group" aria-label="Koleksiyon ruhunu seç">
        <button
          className={mood === 'soft' ? 'active' : ''}
          type="button"
          onClick={() => chooseMood('soft')}
          aria-pressed={mood === 'soft'}
        >
          GÜNLÜK <span>01</span>
        </button>
        <button
          className={mood === 'bold' ? 'active' : ''}
          type="button"
          onClick={() => chooseMood('bold')}
          aria-pressed={mood === 'bold'}
        >
          İDDİALI <span>02</span>
        </button>
      </div>
      <p className="mood-copy">
        {mood === 'soft'
          ? 'Kaşkorse dokular, pedli croplar ve gün boyu rahatlık.'
          : 'Dantel, tül ve ışıltılı detaylarla güçlü bir görünüm.'}
      </p>
    </section>
  );
}
