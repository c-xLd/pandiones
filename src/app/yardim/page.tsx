'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface FaqItem {
  id: string;
  category: 'siparis-kargo' | 'iade-degisim' | 'odeme-guvenlik' | 'beden-bakim' | 'hediye';
  question: string;
  answer: string;
  actionLink?: {
    href: string;
    label: string;
  };
}

const FAQ_CATEGORIES = [
  { id: 'all', label: 'Tüm Konular' },
  { id: 'siparis-kargo', label: 'Sipariş & Teslimat' },
  { id: 'iade-degisim', label: 'İade, Değişim & Hijyen' },
  { id: 'odeme-guvenlik', label: 'Ödeme & Güvenlik' },
  { id: 'beden-bakim', label: 'Beden & Ürün Bakımı' },
  { id: 'hediye', label: 'Hediye Paketi & Kartı' },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'kargo-sure',
    category: 'siparis-kargo',
    question: 'Siparişim ne kadar sürede kargoya verilir ve teslim edilir?',
    answer:
      'Hafta içi saat 14:00’e kadar verilen siparişler aynı gün özenle hazırlanarak Yurtiçi Kargo’ya teslim edilir. İstanbul içi teslimatlar genellikle ertesi iş günü, Türkiye’nin diğer illerine teslimatlar ise 1-3 iş günü içerisinde gerçekleştirilmektedir.',
    actionLink: {
      href: '/siparis-takip',
      label: 'Siparişinizi Anlık Takip Edin',
    },
  },
  {
    id: 'kargo-ucret',
    category: 'siparis-kargo',
    question: 'Kargo ücreti ne kadar? Ücretsiz kargo baremi var mı?',
    answer:
      'Pandiones misafirperverliği gereği, mağazamızdaki tüm siparişlerde sigortalı Yurtiçi Kargo gönderimi tamamen ÜCRETSİZDİR. Ekstra bir teslimat ücreti yansıtılmaz.',
  },
  {
    id: 'kargo-takip-nasil',
    category: 'siparis-kargo',
    question: 'Siparişimin anlık durumunu nereden öğrenebilirim?',
    answer:
      'Siparişiniz onaylandığında ve kargoya verildiğinde e-posta adresinize bilgilendirme iletilir. Dilediğiniz zaman sipariş kodunuz (PAN-...) ve e-posta adresinizle Sipariş Takip ekranımızdan kargo takip numaranızı ve paketinizin hareketlerini görebilirsiniz.',
    actionLink: {
      href: '/siparis-takip',
      label: 'Sipariş Takip Sayfasına Git',
    },
  },
  {
    id: 'iade-hijyen-kural',
    category: 'iade-degisim',
    question: 'İç giyim ve alt giyim parçalarında iade ve değişim yapılabilir mi?',
    answer:
      'T.C. Ticaret Bakanlığı Mesafeli Sözleşmeler Yönetmeliği ve hijyen kuralları uyarınca; hijyen koruma bandı açılmamış, denenmemiş, orijinal ambalajı ve etiketleri zarar görmemiş ürünler teslimat tarihinden itibaren 14 gün içerisinde ücretsiz iade edilebilir. Hijyen bandı sökülmüş veya denenmiş külot ve alt giyim ürünleri sağlık ve hijyen sebebiyle iade alınamamaktadır.',
    actionLink: {
      href: '/iletisim',
      label: 'İade Talebi Oluşturun',
    },
  },
  {
    id: 'iade-sureci',
    category: 'iade-degisim',
    question: 'İade sürecini nasıl başlatabilirim ve kargo ücreti öder miyim?',
    answer:
      'İade talebinizi İletişim Formumuz üzerinden veya WhatsApp destek hattımızdan bize bildirdiğinizde tarafınıza özel Yurtiçi Kargo ücretsiz iade kodu verilir. Paketi orijinal kutusunda kargoya teslim etmeniz yeterlidir. Kargo ücreti Pandiones tarafından karşılanır.',
    actionLink: {
      href: '/iletisim',
      label: 'Müşteri Hizmetleri İletişim Formu',
    },
  },
  {
    id: 'iade-ucret-iadesi',
    category: 'iade-degisim',
    question: 'İade tutarı kartıma ne zaman yansır?',
    answer:
      'İade edilen parçalar merkezimize ulaşıp kalite ve hijyen kontrolünden geçtikten sonra 2 iş günü içerisinde bankanıza iade talimatı verilir. Tutarın ekstrenize yansıması bankanızın işlem hızına bağlı olarak 2-7 iş günü sürebilmektedir.',
  },
  {
    id: 'odeme-yontemleri',
    category: 'odeme-guvenlik',
    question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz? Taksit imkanı var mı?',
    answer:
      'Tüm yerli ve yabancı Visa, MasterCard ve Troy özellikli kredi ve banka kartlarıyla güvenle ödeme yapabilirsiniz. Anlaşmalı kredi kartlarına peşin fiyatına 3 aya varan taksit avantajları sunulmaktadır.',
  },
  {
    id: 'guvenlik-ssl',
    category: 'odeme-guvenlik',
    question: 'Kredi kartı bilgilerim güvende mi?',
    answer:
      'Kesinlikle. Pandiones, BDDK lisanslı güvenli ödeme altyapısı ve 256-bit SSL şifreleme protokolü kullanır. Tüm işlemler 3D Secure SMS doğrulaması ile tamamlanır ve kart bilgileriniz kesinlikle sunucularımızda saklanmaz.',
  },
  {
    id: 'dogru-beden-secimi',
    category: 'beden-bakim',
    question: 'Kendime en uygun sütyen ve iç giyim bedenini nasıl bulabilirim?',
    answer:
      'İtalyan kuplar ve balensiz braletler teni saracak şekilde tasarlanmıştır. Göğüs altı ve göğüs çevresi ölçünüzü girerek kupunuzu ve doğru bedeninizi hesaplamak için Beden Rehberimizi inceleyebilirsiniz.',
    actionLink: {
      href: '/beden-rehberi',
      label: 'İnteraktif Beden Hesaplayıcıyı Aç',
    },
  },
  {
    id: 'siluet-ve-model-secimi',
    category: 'beden-bakim',
    question: 'Hangi kıyafetin içine hangi sütyen ve külot modelini tercih etmeliyim?',
    answer:
      'Derin dekolteler, tişörtler, saten elbiseler veya günlük şıklık için hangi modelin (Bralet, Push-up, Balconette, Brezilya, Tanga vb.) uygun olduğunu Stil Rehberimizden detaylı inceleyebilirsiniz.',
    actionLink: {
      href: '/stil-rehberi',
      label: 'Kapsamlı Stil Rehberine Göz Atın',
    },
  },
  {
    id: 'yikama-ve-bakim',
    category: 'beden-bakim',
    question: 'Saf ipek ve İtalyan danteli parçalarımı nasıl yıkamalı ve korumalıyım?',
    answer:
      'Hassas dantel ve ipek parçaların formunu koruması için 30°C’de elde veya özel yıkama filesi içinde narin programda yıkanması, sıkma yapılmaması ve gölgede düz serilerek kurutulması önerilir.',
    actionLink: {
      href: '/bakim-rehberi',
      label: 'Kumaş ve Bakım Rehberi',
    },
  },
  {
    id: 'hediye-paketi',
    category: 'hediye',
    question: 'Siparişler nasıl paketleniyor? Hediye notu ekleyebilir miyim?',
    answer:
      'Tüm Pandiones siparişleri, özel mühürlü lüks hediye kutusu, asitsiz pelur kağıdı ve ipek saten kurdele ile zarif bir sunumla hazırlanır. Sipariş veya ödeme aşamasında sevdikleriniz için kişisel hediye notu ekleyebilirsiniz.',
  },
  {
    id: 'hediye-karti-nasil-kullanilir',
    category: 'hediye',
    question: 'Dijital Hediye Kartı nasıl çalışır?',
    answer:
      'Satın aldığınız hediye kartı, belirlediğiniz tutarda özel bir dijital kod ile alıcının e-posta adresine iletilir. Alıcı, sepetinde veya ödeme adımında bu kodu girerek bakiyesini tek seferde veya bölünerek 24 ay boyunca dilediği parçalarda kullanabilir.',
    actionLink: {
      href: '/hediye-karti',
      label: 'Dijital Hediye Kartı Oluştur',
    },
  },
];

export default function YardimPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'kargo-sure': true,
    'iade-hijyen-kural': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query);

      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <main id="main" className="padded-main guide-page">
      {/* ── Breadcrumb ── */}
      <div className="guide-breadcrumb">
        <nav aria-label="Ekmek kırıntısı">
          <Link href="/" className="apple-press">Ana Sayfa</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>Yardım & Destek</span>
        </nav>
      </div>

      {/* ── Hero ── */}
      <header className="guide-hero hero-entrance">
        <p className="guide-eyebrow">MÜŞTERİ HİZMETLERİ · GENEL BİLGİ</p>
        <h1 className="guide-title">
          Yardım & Sıkça Sorulan Sorular
        </h1>
        <p className="guide-subtitle">
          Sipariş, teslimat, iade hakları ve ürün seçimi hakkında en çok merak edilen soruların yanıtlarını keşfedin.
        </p>

        {/* Search Box */}
        <div style={{ maxWidth: '480px', margin: '32px auto 0', position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sorunuzu arayın (örn. kargo, iade, beden)..."
            style={{
              width: '100%',
              padding: '14px 44px 14px 20px',
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: '30px',
              fontSize: '14px',
              color: 'var(--ink)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              aria-label="Aramayı temizle"
            >
              ✕
            </button>
          ) : (
            <span
              style={{
                position: 'absolute',
                right: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
                fontSize: '14px',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              🔍
            </span>
          )}
        </div>
      </header>

      <div className="guide-content" style={{ maxWidth: '860px' }}>
        {/* Categories Rail Tabs */}
        <div className="guide-tab-bar" role="tablist" aria-label="Soru kategorileri">
          {FAQ_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat.id)}
                className={`guide-tab apple-press ${isActive ? 'is-active' : ''}`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Accordion List */}
        <div style={{ marginBottom: '56px' }}>
          {filteredItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--line)',
              }}
            >
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--ink)' }}>Aramanızla eşleşen soru bulunamadı.</p>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--muted)' }}>
                Farklı bir arama terimi deneyebilir veya müşteri danışmanımıza doğrudan yazabilirsiniz.
              </p>
              <Link
                href="/iletisim"
                className="apple-press"
                style={{
                  display: 'inline-block',
                  background: 'var(--ink)',
                  color: '#fff',
                  padding: '12px 28px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Bize Ulaşın →
              </Link>
            </div>
          ) : (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
              {filteredItems.map((item, index) => {
                const isOpen = !!openItems[item.id];
                return (
                  <div
                    key={item.id}
                    className="pdn-accordion-item"
                    style={{
                      borderBottom: index === filteredItems.length - 1 ? 'none' : '1px solid var(--line)',
                      padding: '0 24px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="pdn-accordion-trigger"
                      aria-expanded={isOpen}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ink)' }}>
                        {item.question}
                      </span>
                      <span
                        style={{
                          fontSize: '20px',
                          fontWeight: 300,
                          color: 'var(--muted)',
                          transform: isOpen ? 'rotate(45deg)' : 'none',
                          transition: 'transform 200ms ease-out',
                          marginLeft: '16px',
                          display: 'inline-block',
                        }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          paddingBottom: '20px',
                          fontSize: '14px',
                          color: 'var(--muted)',
                          lineHeight: 1.65,
                          borderTop: '1px solid var(--surface)',
                          paddingTop: '12px',
                        }}
                      >
                        <p style={{ margin: '0 0 12px' }}>{item.answer}</p>
                        {item.actionLink && (
                          <Link
                            href={item.actionLink.href}
                            className="guide-cta-link apple-press"
                            style={{ margin: 0 }}
                          >
                            {item.actionLink.label}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Still Need Assistance Banner */}
        <section
          className="glass-surface"
          style={{
            padding: 'clamp(28px, 4vw, 40px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}
          aria-label="Yardım Desteği"
        >
          <div>
            <h2 style={{ font: '400 clamp(20px, 2vw, 24px) var(--serif)', color: 'var(--ink)', margin: '0 0 6px' }}>
              Aradığınız cevabı bulamadınız mı?
            </h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted)' }}>
              Pandiones Kişisel Danışmanlık ekibi size memnuniyetle yardımcı olmak için hazır.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              href="/iletisim"
              className="apple-press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--ink)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              İletişime Geçin →
            </Link>
            <a
              href="https://wa.me/908500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="apple-press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#25D366',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              WhatsApp Destek
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
