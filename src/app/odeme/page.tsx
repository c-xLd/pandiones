'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const GOOGLE_PLACES_CATALOG = [
  { title: 'Keçeyolu Sokak', subtitle: 'Keçiören, Ankara', district: 'Keçiören', city: 'Ankara', address: 'Keçeyolu Sokak No: 14' },
  { title: 'Keçiören Belediyesi', subtitle: 'Keçiören, Ankara', district: 'Keçiören', city: 'Ankara', address: 'Kalaba Mah. Sanatoryum Cad. No: 1' },
  { title: 'Keçesuyu Caddesi', subtitle: 'Gaziosmanpaşa, İstanbul', district: 'Gaziosmanpaşa', city: 'İstanbul', address: 'Keçesuyu Caddesi No: 42' },
  { title: 'Keçilik Koyu', subtitle: 'Beykoz, İstanbul', district: 'Beykoz', city: 'İstanbul', address: 'Anadolu Kavağı Mah. Keçilik Koyu Mevkii' },
  { title: 'Keçiborlu', subtitle: 'Isparta', district: 'Keçiborlu', city: 'Isparta', address: 'Cumhuriyet Meydanı No: 5' },
  { title: 'Abdi İpekçi Caddesi', subtitle: 'Nişantaşı, Şişli, İstanbul', district: 'Şişli', city: 'İstanbul', address: 'Abdi İpekçi Caddesi No: 28' },
  { title: 'Bağdat Caddesi', subtitle: 'Kadıköy, İstanbul', district: 'Kadıköy', city: 'İstanbul', address: 'Bağdat Caddesi No: 342' },
  { title: 'Bebek Cevdet Paşa Caddesi', subtitle: 'Beşiktaş, İstanbul', district: 'Beşiktaş', city: 'İstanbul', address: 'Cevdet Paşa Caddesi No: 64' },
  { title: 'Tunalı Hilmi Caddesi', subtitle: 'Çankaya, Ankara', district: 'Çankaya', city: 'Ankara', address: 'Tunalı Hilmi Caddesi No: 88' },
  { title: 'Kordon Atatürk Caddesi', subtitle: 'Alsancak, Konak, İzmir', district: 'Konak', city: 'İzmir', address: 'Atatürk Caddesi No: 190' },
  { title: 'Yalıkavak Marina Caddesi', subtitle: 'Bodrum, Muğla', district: 'Bodrum', city: 'Muğla', address: 'Çökertme Cad. No: 14' },
  { title: 'Göktürk İstanbul Caddesi', subtitle: 'Eyüpsultan, İstanbul', district: 'Eyüpsultan', city: 'İstanbul', address: 'İstanbul Caddesi No: 18' },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, cartTotal } = useCart();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingCity: '',
    shippingDistrict: '',
    shippingAddress: '',
    shippingNotes: '',
  });

  // Saved addresses state from DB
  const [dbAddresses, setDbAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Google Haritalar Smart Search state
  const [googleQuery, setGoogleQuery] = useState('');
  const [showGoogleDropdown, setShowGoogleDropdown] = useState(false);

  // Query parameter error handling (e.g. redirected back from 3DS callback with error)
  const urlError = searchParams.get('error');

  // Fetch saved addresses for logged-in user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name,
        customerEmail: prev.customerEmail || user.email,
        customerPhone: prev.customerPhone || user.phone || '',
      }));

      fetch('/api/auth/addresses')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.addresses && data.addresses.length > 0) {
            setDbAddresses(data.addresses);
            const def = data.addresses.find((a: any) => a.isDefault) || data.addresses[0];
            if (def) {
              setSelectedAddressId(def.id);
              setFormData((prev) => ({
                ...prev,
                customerName: def.recipient || prev.customerName || user.name,
                customerPhone: def.phone || prev.customerPhone || user.phone || '',
                shippingAddress: def.address,
                shippingDistrict: def.district,
                shippingCity: def.city,
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSelectSavedAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setFormData((prev) => ({
      ...prev,
      customerName: addr.recipient || prev.customerName,
      customerPhone: addr.phone || prev.customerPhone,
      shippingAddress: addr.address,
      shippingDistrict: addr.district,
      shippingCity: addr.city,
    }));
  };

  const filteredPlaces = googleQuery.trim().length >= 2
    ? GOOGLE_PLACES_CATALOG.filter((p) => {
        const full = `${p.title} ${p.subtitle} ${p.district} ${p.city}`.toLocaleLowerCase('tr-TR');
        return full.includes(googleQuery.toLocaleLowerCase('tr-TR'));
      }).slice(0, 5)
    : [];

  const handleSelectGooglePlace = (place: typeof GOOGLE_PLACES_CATALOG[0]) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddress: place.address,
      shippingDistrict: place.district,
      shippingCity: place.city,
    }));
    setGoogleQuery(`${place.title}, ${place.subtitle}`);
    setShowGoogleDropdown(false);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? decodeURIComponent(urlError) : null);

  // iyzico Payment Modal State
  const [iyzicoHtml, setIyzicoHtml] = useState<string | null>(null);
  const [showIyzicoModal, setShowIyzicoModal] = useState(false);
  const iyzicoContainerRef = useRef<HTMLDivElement | null>(null);

  // Coupon states
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    isGiftCard?: boolean;
    remainingGiftCardBalance?: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Execute embedded scripts when iyzico HTML is rendered
  useEffect(() => {
    if (showIyzicoModal && iyzicoHtml && iyzicoContainerRef.current) {
      const scripts = iyzicoContainerRef.current.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [showIyzicoModal, iyzicoHtml]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setCouponLoading(true);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput,
          subtotal: cartTotal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Geçersiz kupon.');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data);
        setCouponInput('');
      }
    } catch {
      setCouponError('Kupon doğrulanırken hata oluştu.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const finalTotal = Math.max(0, cartTotal - (appliedCoupon?.discountAmount || 0));

  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError('Çantanızda ürün bulunmamaktadır.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          couponCode: appliedCoupon?.code || null,
          cart,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ödeme oturumu başlatılırken bir hata oluştu.');
      }

      if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
        return;
      }

      if (data.checkoutFormContent) {
        setIyzicoHtml(data.checkoutFormContent);
        setShowIyzicoModal(true);
        setLoading(false);
      } else {
        const tokenQuery = data.guestToken ? `?token=${encodeURIComponent(data.guestToken)}` : '';
        router.push(`/siparis-onay/${data.orderNumber}${tokenQuery}`);
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
      setLoading(false);
    }
  };

  if (cart.length === 0 && !showIyzicoModal) {
    return (
      <main id="main" className="padded-main">
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
          <h1 style={{ font: '400 36px var(--serif)', marginBottom: '16px' }}>
            Çantanız Boş
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
            Ödeme adımına geçebilmek için koleksiyonumuzdan bir parça seçmelisiniz.
          </p>
          <Link href="/koleksiyon" className="btn btn--primary btn--lg">
            Koleksiyonu Keşfet ↗
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="padded-main">
      {/* 3D Secure / iyzico Modal Overlay */}
      {showIyzicoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '4px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              position: 'relative',
              padding: '32px 24px',
            }}
          >
            <button
              onClick={() => setShowIyzicoModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                color: 'var(--muted)',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Kapat"
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p className="eyebrow" style={{ letterSpacing: '0.15em', color: 'var(--muted)', margin: '0 0 6px' }}>
                PANDIONES
              </p>
              <h3 style={{ font: '400 24px var(--serif)', margin: 0, color: 'var(--ink)' }}>
                Güvenli 3D Secure Doğrulama
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                Lütfen bankanız tarafından yönlendirilen güvenlik adımını tamamlayınız.
              </p>
            </div>

            <div
              ref={iyzicoContainerRef}
              dangerouslySetInnerHTML={{ __html: iyzicoHtml || '' }}
            />
          </div>
        </div>
      )}

      {/* Stepped Progress Indicator */}
      <div style={{ maxWidth: '1080px', margin: '0 auto 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'grid', placeItems: 'center', fontSize: '11px' }}>1</span>
          <span>İletişim & Adres</span>
        </div>
        <div style={{ width: '32px', height: '1px', background: 'var(--line)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--surface)', color: 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: '11px', border: '1px solid var(--line)' }}>2</span>
          <span>Güvenli 3DS Ödeme</span>
        </div>
        <div style={{ width: '32px', height: '1px', background: 'var(--line)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--surface)', color: 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: '11px', border: '1px solid var(--line)' }}>3</span>
          <span>Sipariş Onayı</span>
        </div>
      </div>

      <div className="checkout-container">
        {/* Sol Kolon: Form */}
        <div>
          <form onSubmit={handleSubmit}>
            <section style={{ marginBottom: '40px' }}>
              <h2 className="checkout-section-title">1. İletişim Bilgileri</h2>
              <div className="form-group">
                <label htmlFor="customerName">Ad Soyad *</label>
                <input
                  id="customerName"
                  className="form-input"
                  name="customerName"
                  required
                  placeholder="Örn: Aslı Yılmaz"
                  value={formData.customerName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="customerEmail">E-posta Adresi *</label>
                  <input
                    id="customerEmail"
                    type="email"
                    className="form-input"
                    name="customerEmail"
                    required
                    placeholder="ornek@pandiones.com"
                    value={formData.customerEmail}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="customerPhone">Telefon Numarası *</label>
                  <input
                    id="customerPhone"
                    type="tel"
                    className="form-input"
                    name="customerPhone"
                    required
                    placeholder="05XX XXX XX XX"
                    value={formData.customerPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 className="checkout-section-title" style={{ margin: 0 }}>2. Teslimat Adresi</h2>
                {user && (
                  <Link href="/hesabim#adresler" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'underline' }}>
                    Adreslerimi Yönet ↗
                  </Link>
                )}
              </div>

              {/* Saved Address Quick Selector for Logged-in Users */}
              {user && dbAddresses.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: '8px' }}>
                    Kayıtlı Adreslerinizden Seçin
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {dbAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          className="apple-press"
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                            background: isSelected ? 'rgba(0,0,0,0.03)' : 'var(--paper)',
                            cursor: 'pointer',
                            transition: 'all 140ms ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{addr.title}</strong>
                            {isSelected && <span style={{ color: '#166534', fontSize: '12px', fontWeight: 600 }}>✓ Seçili</span>}
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {addr.address}
                          </p>
                          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink)' }}>
                            {addr.district} / {addr.city}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Google Haritalar Smart Search Helper matching User Screenshot */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label htmlFor="checkout-google-search" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#1d4ed8', marginBottom: '6px' }}>
                  <span>📍</span> Google Haritalar ile Konum Bul & Doldur
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="checkout-google-search"
                    type="text"
                    className="form-input"
                    placeholder="Sokak, bina veya semt ara (örn: Keçeyolu, Bağdat Cad.)..."
                    value={googleQuery}
                    onChange={(e) => {
                      setGoogleQuery(e.target.value);
                      setShowGoogleDropdown(true);
                    }}
                    onFocus={() => setShowGoogleDropdown(true)}
                    style={{
                      border: '1.5px solid #60a5fa',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      paddingLeft: '36px',
                    }}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', fontSize: '14px' }}>
                    🔍
                  </span>
                  {googleQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleQuery('');
                        setShowGoogleDropdown(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showGoogleDropdown && filteredPlaces.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 30,
                      overflow: 'hidden',
                    }}
                  >
                    {filteredPlaces.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectGooglePlace(place)}
                        className="apple-press"
                        style={{
                          padding: '10px 14px',
                          borderBottom: idx < filteredPlaces.length - 1 ? '1px solid #f1f5f9' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>📍</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{place.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{place.subtitle}</div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500 }}>Doldur ↗</span>
                      </div>
                    ))}
                    <div style={{ padding: '6px 14px', background: '#f8fafc', fontSize: '10px', color: '#64748b', textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>
                      powered by <strong>Google</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shippingCity">Şehir (İl) *</label>
                  <input
                    id="shippingCity"
                    className="form-input"
                    name="shippingCity"
                    required
                    placeholder="İstanbul"
                    value={formData.shippingCity}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="shippingDistrict">İlçe *</label>
                  <input
                    id="shippingDistrict"
                    className="form-input"
                    name="shippingDistrict"
                    required
                    placeholder="Nişantaşı / Beşiktaş"
                    value={formData.shippingDistrict}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="shippingAddress">Açık Adres (Cadde, Mahalle, No, Daire) *</label>
                <textarea
                  id="shippingAddress"
                  className="form-input"
                  rows={3}
                  name="shippingAddress"
                  required
                  placeholder="Adresinizi detaylı yazınız..."
                  value={formData.shippingAddress}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="shippingNotes">Kurye / Teslimat Notu (İsteğe bağlı)</label>
                <input
                  id="shippingNotes"
                  className="form-input"
                  name="shippingNotes"
                  placeholder="Zili çalmayınız, kapıya bırakınız vb."
                  value={formData.shippingNotes}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section style={{ marginBottom: '40px' }}>
              <h2 className="checkout-section-title">3. Güvenli Ödeme Altyapısı (iyzico & 3D Secure)</h2>
              
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  padding: '24px',
                  borderRadius: '4px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px' }}>🔒</span>
                  <strong style={{ fontSize: '14px', letterSpacing: '0.04em' }}>
                    256-Bit SSL & 3D Secure Koruması
                  </strong>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', margin: '0 0 16px' }}>
                  Ödeme işlemleriniz BDDK lisanslı ve uluslararası PCI-DSS Seviye 1 sertifikalı <strong>iyzico</strong> güvencesiyle gerçekleştirilir. 
                  Kart bilgileriniz sistemimizde tutulmaz; ödeme esnasında bankanızdan cep telefonunuza gelecek SMS şifresi ile doğrulanır.
                </p>

                {/* Kart Rozetleri */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Desteklenen Kartlar:</span>
                  <span style={{ fontSize: '11px', background: '#fff', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: '3px' }}>💳 Troy</span>
                  <span style={{ fontSize: '11px', background: '#fff', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: '3px' }}>💳 Mastercard</span>
                  <span style={{ fontSize: '11px', background: '#fff', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: '3px' }}>💳 Visa</span>
                  <span style={{ fontSize: '11px', background: '#fff', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: '3px' }}>✨ Taksit Seçenekleri</span>
                </div>
              </div>
            </section>

            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '14px 18px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn btn--primary btn--lg btn--block btn--split submit-order-btn"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              <span>
                {loading
                  ? 'Ödeme Oturumu Hazırlanıyor...'
                  : finalTotal === 0
                  ? 'Siparişi Onayla & Tamamla ↗'
                  : '3D Secure ile Güvenli Öde ↗'}
              </span>
              <span>{money(finalTotal)}</span>
            </button>
          </form>
        </div>

        {/* Sağ Kolon: Sipariş Özeti */}
        <div>
          <div className="checkout-summary">
            <h3 className="summary-title">Sipariş Özeti</h3>

            <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '20px' }}>
              {cart.map((item) => (
                <div key={`${item.slug}-${item.size}`} className="checkout-item">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <h4 className="checkout-item-title" style={{ margin: '0 0 2px', fontSize: '16px' }}>{item.name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                      {item.color} · Beden {item.size} × {item.quantity}
                    </p>
                  </div>
                  <div>{money(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            {/* Kupon Alanı */}
            <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Kupon Kodu (örn: PANDIONES10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--line)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  style={{
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    padding: '0 16px',
                    fontSize: '12px',
                  }}
                >
                  {couponLoading ? '...' : 'Uygula'}
                </button>
              </div>

              {couponError && (
                <p style={{ color: '#b91c1c', fontSize: '12px', margin: '6px 0 0' }}>
                  {couponError}
                </p>
              )}

              {appliedCoupon && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '8px 12px',
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#15803d',
                  }}
                >
                  <div>
                    <span>
                      ✓ <strong>{appliedCoupon.code}</strong> {appliedCoupon.isGiftCard ? 'Hediye Kartı' : 'Kuponu'} uygulandı (-{money(appliedCoupon.discountAmount)})
                    </span>
                    {appliedCoupon.isGiftCard && typeof appliedCoupon.remainingGiftCardBalance === 'number' && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                        Kartta kalan bakiye: {money(appliedCoupon.remainingGiftCardBalance)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{ textDecoration: 'underline', color: '#b91c1c', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Kaldır
                  </button>
                </div>
              )}
            </div>

            <div className="summary-row">
              <span>Ara Toplam</span>
              <span>{money(cartTotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="summary-row" style={{ color: '#15803d' }}>
                <span>Kupon İndirimi ({appliedCoupon.code})</span>
                <span>-{money(appliedCoupon.discountAmount)}</span>
              </div>
            )}
            <div className="summary-row" style={{ color: '#047857' }}>
              <span>Özel Sigortalı Kurye</span>
              <span>Ücretsiz</span>
            </div>
            <div className="summary-total">
              <span>Genel Toplam</span>
              <span>{money(finalTotal)}</span>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '24px', lineHeight: '1.6' }}>
              * Tüm siparişleriniz Pandiones özel siyah lüks kutusunda, gizli ve mühürlü ambalajla teslim edilir.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OdemePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', letterSpacing: '0.1em' }}>
            ÖDEME SAYFASI YÜKLENİYOR...
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
