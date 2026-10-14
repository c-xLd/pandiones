'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import SizeChartTable from '@/components/guides/SizeChartTable';
// Loaded with this lazily imported overlay, not on first paint.
import '@/styles/layout/overlays.css';

export default function GuideModals() {
  const { activeGuide, setActiveGuide } = useCart();

  if (!activeGuide) return null;

  return (
    <div className="modal-overlay" onClick={() => setActiveGuide(null)}>
      <div
        className="modal-content"
        style={{ width: 'min(820px, 94vw)', padding: 'clamp(40px, 5vw, 60px) clamp(24px, 4vw, 48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-btn"
          type="button"
          aria-label="Kapat"
          onClick={() => setActiveGuide(null)}
        >
          ×
        </button>

        {activeGuide === 'size' && (
          <div>
            <p className="eyebrow">İNCE AYRINTILAR</p>
            <h2 style={{ font: '400 36px var(--serif)', marginBottom: '16px' }}>
              Beden Rehberi
            </h2>
            <p style={{ fontStyle: 'italic', marginBottom: '24px', color: 'var(--muted)' }}>
              Kendini rahat hissettiğin uyum.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Ölçünü al
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Yumuşak bir mezurayı vücuduna paralel tut. Göğüs çevreni en dolgun noktadan,
              göğüs altını hemen altından; belini doğal bel çizgisinden ve kalçanı en geniş
              noktadan ölç. Mezurayı sıkma.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Uyumu kontrol et
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              İç giyim cildini sıkmadan oturmalı. Askılar omuzlarına baskı yapmamalı; ev
              giyimi ise hareketlerine alan bırakmalı.
            </p>

            <div className="size-chart-wrap">
              <SizeChartTable />
            </div>
            <p className="size-chart-note">
              <Link href="/beden-rehberi" onClick={() => setActiveGuide(null)}>Ölçünü gir, bedenini bul</Link>
            </p>
          </div>
        )}

        {activeGuide === 'fabric' && (
          <div>
            <p className="eyebrow">İNCE AYRINTILAR</p>
            <h2 style={{ font: '400 36px var(--serif)', marginBottom: '16px' }}>
              Kumaş Rehberi
            </h2>
            <p style={{ fontStyle: 'italic', marginBottom: '24px', color: 'var(--muted)' }}>
              Dokuyu tanı. Hissini bul.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Dantel
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Desenli, açık dokulu bir yüzeydir. Esnekliği ve hissi kullanılan ipliğe ve astara
              göre değişir. Pandiones dantelleri teni tahriş etmeyen esnek Fransız pamuk-elastan karışımı liflerden dokunur.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Saten
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Saten bir dokuma türüdür; tek başına ipek anlamına gelmez. Pürüzsüz yüzeyi ve parlak
              görünümüyle öne çıkar. Dökümlü ve hafif yapısıyla vücut hareketlerini kısıtlamaz.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Özenli bakım
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Her zaman ürünün bakım etiketini takip et. Hassas dokuları takı, fermuar ve pürüzlü
              yüzeylerle temastan koru. 30°C altında hassas program önerilir.
            </p>
          </div>
        )}

        {activeGuide === 'privacy' && (
          <div>
            <p className="eyebrow">YASAL &amp; GÜVENLİK</p>
            <h2 style={{ font: '400 36px var(--serif)', marginBottom: '16px' }}>
              Gizlilik Politikası &amp; KVKK
            </h2>
            <p style={{ fontStyle: 'italic', marginBottom: '24px', color: 'var(--muted)' }}>
              Verileriniz, en yüksek güvenlik standartlarımızla özenle korunur.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Kişisel Verilerin İşlenmesi
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Pandiones, 6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca, siparişlerinizi
              hazırlamak, güvenli ödeme sağlamak ve özel davetlerimizi iletmek amacıyla bilgilerinizi
              güvenli şifreleme protokolleriyle, mevzuata uygun biçimde işler ve asla üçüncü şahıslara satmaz.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Bülten &amp; Tercihler
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Bülten aboneliğinden tek bir tıkla veya info@pandiones.com adresine yazarak
              dilediğiniz an ayrılabilirsiniz.
            </p>
          </div>
        )}

        {activeGuide === 'terms' && (
          <div>
            <p className="eyebrow">HİZMET KOŞULLARI</p>
            <h2 style={{ font: '400 36px var(--serif)', marginBottom: '16px' }}>
              Kullanım &amp; Satış Koşulları
            </h2>
            <p style={{ fontStyle: 'italic', marginBottom: '24px', color: 'var(--muted)' }}>
              Pandiones deneyiminizin her aşamasında şeffaflık.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Sipariş &amp; Teslimat
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Siparişleriniz özenli paketlemeyle hazırlanır ve anlaşmalı kargo sağlayıcılarımız ile tarafınıza
              ulaştırılır. Hijyen bandı açılmamış ürünlerde 14 gün yasal cayma ve iade hakkınız mevcuttur.
            </p>

            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
              Özgün Tasarım
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
              Sitedeki tüm tasarımlar, görsel içerikler ve monogramlar Pandiones&apos;e aittir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
