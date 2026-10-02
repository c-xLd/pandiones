import React from 'react';
import Link from 'next/link';
import GuideHero, { GuideJumpLinks } from '@/components/guides/GuideHero';
import CareSymbol, { type CareSymbolKind } from '@/components/guides/CareSymbol';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/guides.css';

export const metadata = {
  title: 'Bakım Rehberi — PANDIONES',
  description: 'İpek, dantel, saten ve modal parçalar için yıkama, kurutma, ütüleme ve saklama önerileri.',
};

const CARE_SYMBOLS: Array<{ kind: CareSymbolKind; label: string; text: string }> = [
  { kind: 'wash-30', label: 'Hassas yıkama', text: 'En fazla 30°C, hassas program.' },
  { kind: 'no-bleach', label: 'Ağartıcı yok', text: 'Çamaşır suyu ve optik ağartıcı kullanılmaz.' },
  { kind: 'no-tumble', label: 'Kurutma makinesi yok', text: 'Tamburlu kurutma yapılmaz.' },
  { kind: 'iron-low', label: 'Düşük ısıda ütü', text: 'En fazla 110°C, buharsız.' },
  { kind: 'dry-clean', label: 'Kuru temizleme', text: 'Hassas solventlerle temizlenebilir.' },
  { kind: 'dry-flat', label: 'Sererek kurutma', text: 'Düz bir zeminde, gölgede.' },
];

const FABRICS = [
  {
    id: 'ipek',
    name: 'İpek',
    lead: 'İnce lifli, doğal parlaklığı olan, ısıya ve sürtünmeye hassas bir kumaş.',
    rules: [
      'En fazla 30°C ılık suda, pH nötr ipek şampuanı ya da bebek şampuanıyla elde yıka.',
      'Ovalama, burarak sıkma. Suyunu temiz bir pamuklu havluya sararak al.',
      'Doğrudan güneş ve kalorifer üstünden uzak, gölgede kurut.',
      'Hafif nemliyken, tersinden ve en düşük ısıda ütüle.',
    ],
    avoid: 'Çamaşır suyu ve optik ağartıcı lifleri kalıcı olarak zayıflatır. Emin değilsen kuru temizlemeye ver.',
  },
  {
    id: 'dantel',
    name: 'Dantel',
    lead: 'Açık dokulu, esnek ipliklerden oluşan, takılmaya yatkın bir yüzey.',
    rules: [
      'Makinede yıkayacaksan fermuarlı bir yıkama filesine koy, en hassas programı seç.',
      'Yıkamadan önce sütyen kopçalarını kapat; açık kopça dantel gözlerine takılır.',
      'Az deterjan kullan; ağır yumuşatıcı esnekliği gevşetir.',
      'Oda sıcaklığında, düz bir zeminde kurut.',
    ],
    avoid: 'Parfüm ve deodorantı doğrudan dantelin üstüne sıkma.',
  },
  {
    id: 'saten-modal',
    name: 'Saten ve modal',
    lead: 'Pürüzsüz, dökümlü yüzeyler. Saten bir dokuma türüdür; tek başına ipek anlamına gelmez.',
    rules: [
      'En fazla 30°C, kısa programda benzer renklerle yıka.',
      'Tüylenmeyi azaltmak için ters çevirerek makineye koy.',
      'Kırışıklığı düşük ısıda ya da askıda buharla gider.',
    ],
    avoid: 'Yüksek devirde sıkma, liflerin matlaşmasına yol açabilir.',
  },
];

const STORAGE = [
  { title: 'Kupları iç içe katlama', text: 'Sütyenleri kupları birbirinin içine bastırmadan, çekmecede yan yana sırala. Böylece kup formu çökmez, balen eğilmez.' },
  { title: 'Seyahatte doldur', text: 'Dolgulu kupların içine çorap ya da ince bir gecelik yerleştir; valizde ezilmez.' },
  { title: 'Nefes alan bir kese', text: 'İpek ve dantel parçaları pamuklu bir kesede sakla; plastik torba nemi hapseder.' },
];

export default function BakimRehberiPage() {
  return (
    <main id="main" className="guide-page">
      <GuideHero
        eyebrow="Rehber"
        title="Bakım rehberi"
        lead="Doğru yıkama ve saklama, bir parçanın dokusunu ve formunu yıllarca korur. Her zaman önce ürünün kendi bakım etiketine bak."
        aside={
          <GuideJumpLinks
            links={[
              { href: '#etiket', label: 'Etiket sembolleri' },
              { href: '#kumaslar', label: 'Kumaşa göre bakım' },
              { href: '#saklama', label: 'Saklama' },
            ]}
          />
        }
      />

      <section id="etiket" className="guide-section" aria-labelledby="symbols-title">
        <div className="guide-section__head">
          <p className="guide-section__num" aria-hidden="true">01</p>
          <h2 id="symbols-title" className="guide-section__title">Etiket sembolleri</h2>
          <p className="guide-section__text">Parçalarımızın etiketlerinde en sık göreceğin işaretler.</p>
        </div>
        <ul className="care-grid">
          {CARE_SYMBOLS.map((item) => (
            <li key={item.kind} className="care-grid__item">
              <CareSymbol kind={item.kind} />
              <p className="care-grid__label">{item.label}</p>
              <p className="care-grid__text">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="kumaslar" className="guide-section" aria-labelledby="fabrics-title">
        <div className="guide-section__head">
          <p className="guide-section__num" aria-hidden="true">02</p>
          <h2 id="fabrics-title" className="guide-section__title">Kumaşa göre bakım</h2>
          <p className="guide-section__text">Aynı parçada birden çok kumaş varsa en hassas olanın kuralını uygula.</p>
        </div>
        <div className="fabric-list">
          {FABRICS.map((fabric) => (
            <article key={fabric.id} className="fabric" aria-labelledby={`fabric-${fabric.id}`}>
              <div className="fabric__head">
                <h3 id={`fabric-${fabric.id}`}>{fabric.name}</h3>
                <p>{fabric.lead}</p>
              </div>
              <ol className="fabric__rules">
                {fabric.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
              <p className="fabric__avoid">
                <span className="fabric__avoid-label">Kaçın</span>
                {fabric.avoid}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="saklama" className="guide-section" aria-labelledby="storage-title">
        <div className="guide-section__head">
          <p className="guide-section__num" aria-hidden="true">03</p>
          <h2 id="storage-title" className="guide-section__title">Saklama</h2>
          <p className="guide-section__text">Formu bozan çoğu zaman yıkama değil, çekmecedir.</p>
        </div>
        <ol className="guide-steps guide-steps--wide">
          {STORAGE.map((item, index) => (
            <li key={item.title}>
              <span className="guide-steps__num" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="guide-next" aria-label="Diğer rehberler">
        <p>Emin olamadığın bir etiket mi var?</p>
        <div className="guide-next__links">
          <Link href="/iletisim" className="guide-arrow-link">Bize yaz</Link>
          <Link href="/stil-rehberi" className="guide-arrow-link">Stil rehberi</Link>
        </div>
      </aside>
    </main>
  );
}
