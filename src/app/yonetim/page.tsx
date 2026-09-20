'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ProductEditor from '@/components/admin/ProductEditor';

export default function YonetimPage() {
  const { user, loading, login, logout } = useAuth();

  const [tab, setTab] = useState<'stats' | 'orders' | 'products' | 'coupons' | 'newsletter' | 'reviews' | 'returns'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [trackingDrafts, setTrackingDrafts] = useState<{ [orderId: string]: { company: string; code: string } }>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Admin login credentials for inline login
  const [adminEmail, setAdminEmail] = useState('admin@pandiones.com');
  const [adminPassword, setAdminPassword] = useState('Admin123!');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [editingProductId, setEditingProductId] = useState<string | null | undefined>(undefined);

  // New coupon form
  const [showNewCouponModal, setShowNewCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minSpend: '0',
    maxUses: '100',
  });

  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      // Fetch stats
      fetch('/api/admin/stats')
        .then((r) => r.json())
        .then((d) => setStats(d))
        .catch(() => {});

      // Fetch orders
      fetch('/api/admin/orders')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setOrders(d);
        })
        .catch(() => {});

      // Fetch products
      setProductsLoading(true);
      setProductsError(null);
      fetch('/api/admin/products')
        .then((r) => {
          if (!r.ok) throw new Error('Ürünler yüklenemedi. Tekrar deneyin.');
          return r.json();
        })
        .then((d) => {
          if (!Array.isArray(d)) throw new Error('Ürün listesi beklenmeyen biçimde geldi.');
          setProducts(d);
        })
        .catch((error) => setProductsError(error instanceof Error ? error.message : 'Ürünler yüklenemedi.'))
        .finally(() => setProductsLoading(false));

      // Fetch coupons
      fetch('/api/admin/coupons')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setCoupons(d);
        })
        .catch(() => {});

      // Fetch newsletter subscribers
      fetch('/api/admin/newsletter')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setSubscribers(d);
        })
        .catch(() => {});

      // Fetch reviews
      fetch('/api/admin/reviews')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setReviewsList(d);
        })
        .catch(() => {});

      // Fetch return requests
      fetch('/api/admin/returns')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setReturnRequests(d);
        })
        .catch(() => {});
    }
  }, [user, refreshTrigger]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await login(adminEmail, adminPassword);
    if (!res.success) {
      setLoginError(res.error || 'Yönetici girişi başarısız.');
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });
      setRefreshTrigger((v) => v + 1);
    } catch {
      alert('Durum güncellenirken hata oluştu.');
    }
  };

  const handleStockUpdate = async (variantId: string, stock: number) => {
    try {
      const response = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, stock }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Stok güncellenemedi.');
      }
      setRefreshTrigger((v) => v + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Stok güncellenirken hata oluştu.');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowNewCouponModal(false);
        setNewCoupon({
          code: '',
          discountType: 'PERCENTAGE',
          discountValue: '',
          minSpend: '0',
          maxUses: '100',
        });
        setRefreshTrigger((v) => v + 1);
      } else {
        alert(data.error || 'Kupon oluşturulamadı.');
      }
    } catch {
      alert('Kupon oluşturulurken hata oluştu.');
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`"${code}" kodlu kuponu silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRefreshTrigger((v) => v + 1);
      } else {
        alert('Kupon silinemedi.');
      }
    } catch {
      alert('Hata oluştu.');
    }
  };

  const handleUpdateTracking = async (orderId: string, status: string, trackingCompany: string, trackingCode: string) => {
    try {
      await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, trackingCompany, trackingCode }),
      });
      setRefreshTrigger((v) => v + 1);
    } catch {
      alert('Kargo bilgisi kaydedilirken hata oluştu.');
    }
  };


  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`"${email}" adresini bülten listesinden silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRefreshTrigger((v) => v + 1);
      } else {
        alert('Abone silinemedi.');
      }
    } catch {
      alert('Hata oluştu.');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Bu müşteri yorumunu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRefreshTrigger((v) => v + 1);
      } else {
        alert('Yorum silinemedi.');
      }
    } catch {
      alert('Hata oluştu.');
    }
  };

  const handleUpdateReturnStatus = async (id: string, status: string, adminNotes?: string) => {
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, adminNotes }),
      });
      if (res.ok) {
        setRefreshTrigger((v) => v + 1);
      } else {
        alert('İade durumu güncellenemedi.');
      }
    } catch {
      alert('İade güncelleme hatası.');
    }
  };

  const exportOrdersCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Sipariş No', 'Müşteri', 'E-posta', 'Telefon', 'Şehir', 'Tutar (TL)', 'Durum', 'Kargo Firması', 'Takip Kodu', 'Tarih'];
    const rows = orders.map((o) => [
      o.orderNumber,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      o.customerEmail,
      o.customerPhone,
      `"${(o.shippingCity || '').replace(/"/g, '""')}"`,
      o.totalAmount,
      o.status,
      o.trackingCompany || '',
      o.trackingCode || '',
      new Date(o.createdAt).toLocaleDateString('tr-TR'),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pandiones-siparisler-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportProductsCSV = () => {
    if (products.length === 0) return;
    const headers = ['Ürün Kodu', 'Ürün Adı', 'Kategori', 'Renk', 'Fiyat (TL)', 'Toplam Stok', 'Eklenme Tarihi'];
    const rows = products.map((p) => {
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + v.stock, 0) || 0;
      return [
        p.slug,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.color,
        p.price,
        totalStock,
        new Date(p.createdAt).toLocaleDateString('tr-TR'),
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pandiones-urun-stok-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main id="main" className="padded-main">
        <div style={{ padding: '80px 4%', textAlign: 'center' }}>Yükleniyor...</div>
      </main>
    );
  }

  // Not an Admin? Show luxury Admin Gate
  if (!user || user.role !== 'ADMIN') {
    return (
      <main id="main" className="padded-main">
        <div style={{ maxWidth: '440px', margin: '80px auto', padding: '36px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <p className="eyebrow" style={{ textAlign: 'center' }}>PANDIONES YÖNETİM</p>
          <h1 style={{ font: '400 32px var(--serif)', textAlign: 'center', marginBottom: '24px' }}>
            Yönetici Girişi
          </h1>

          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label>Yönetici E-posta</label>
              <input
                className="form-input"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Şifre</label>
              <input
                className="form-input"
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>

            {loginError && (
              <div style={{ color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
                {loginError}
              </div>
            )}

            <button className="submit-order-btn" type="submit">
              Panele Giriş Yap ↗
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="padded-main">
      <div style={{ maxWidth: 'min(1760px, 95vw)', margin: '40px auto 100px', padding: '0 clamp(20px, 3vw, 56px)' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '24px', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p className="eyebrow">PANDIONES ATÖLYE & MAĞAZA</p>
            <h1 style={{ font: '400 36px var(--serif)' }}>Yönetim Paneli</h1>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Yönetici: <strong>{user.name}</strong>
            </span>
            <Link href="/" style={{ fontSize: '13px', textDecoration: 'underline' }}>
              Mağazaya Dön ↗
            </Link>
            <button
              type="button"
              onClick={logout}
              style={{ fontSize: '13px', border: '1px solid var(--line)', padding: '6px 14px' }}
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--line)', marginBottom: '32px' }}>
          <button
            type="button"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: tab === 'stats' ? 600 : 400,
              borderBottom: tab === 'stats' ? '2px solid var(--ink)' : '2px solid transparent',
            }}
            onClick={() => setTab('stats')}
          >
            📊 Genel Bakış & Raporlar
          </button>
          <button
            type="button"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: tab === 'orders' ? 600 : 400,
              borderBottom: tab === 'orders' ? '2px solid var(--ink)' : '2px solid transparent',
            }}
            onClick={() => setTab('orders')}
          >
            📦 Sipariş Yönetimi ({orders.length})
          </button>
          <button
            type="button"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: tab === 'products' ? 600 : 400,
              borderBottom: tab === 'products' ? '2px solid var(--ink)' : '2px solid transparent',
            }}
            onClick={() => setTab('products')}
          >
            👗 Ürünler & Stok ({products.length})
          </button>
          <button
            type="button"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: tab === 'coupons' ? 600 : 400,
              borderBottom: tab === 'coupons' ? '2px solid var(--ink)' : '2px solid transparent',
            }}
            onClick={() => setTab('coupons')}
          >
            🎟️ Kupon Yönetimi ({coupons.length})
          </button>
          <button
            type="button"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: tab === 'newsletter' ? 600 : 400,
              borderBottom: tab === 'newsletter' ? '2px solid var(--ink)' : '2px solid transparent',
            }}
            onClick={() => setTab('newsletter')}
          >
            📬 Bülten Aboneleri ({subscribers.length})
          </button>
          <button
            type="button"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: tab === 'reviews' ? 600 : 400,
              borderBottom: tab === 'reviews' ? '2px solid var(--ink)' : '2px solid transparent',
            }}
            onClick={() => setTab('reviews')}
          >
            ⭐ Yorum Denetimi ({reviewsList.length})
          </button>
          <button
            type="button"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: tab === 'returns' ? 600 : 400,
              borderBottom: tab === 'returns' ? '2px solid var(--ink)' : '2px solid transparent',
            }}
            onClick={() => setTab('returns')}
          >
            🔄 İade Talepleri ({returnRequests.length})
          </button>
        </div>

        {/* Tab 1: Stats */}
        {tab === 'stats' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ background: 'var(--surface)', padding: '24px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  TOPLAM SATIŞ (CİRO)
                </span>
                <strong style={{ fontSize: '28px', font: '400 28px var(--serif)' }}>
                  {money(stats.totalRevenue || 0)}
                </strong>
              </div>

              <div style={{ background: 'var(--surface)', padding: '24px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  TOPLAM SİPARİŞ
                </span>
                <strong style={{ fontSize: '28px', font: '400 28px var(--serif)' }}>
                  {stats.totalOrders} adet
                </strong>
              </div>

              <div style={{ background: 'var(--surface)', padding: '24px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  AKTİF ÜRÜN ÇEŞİDİ
                </span>
                <strong style={{ fontSize: '28px', font: '400 28px var(--serif)' }}>
                  {stats.totalProducts} parça
                </strong>
              </div>

              <div style={{ background: 'var(--surface)', padding: '24px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  KAYITLI MÜŞTERİ
                </span>
                <strong style={{ fontSize: '28px', font: '400 28px var(--serif)' }}>
                  {stats.totalCustomers} üye
                </strong>
              </div>
            </div>

            {/* Critical Low Stocks */}
            <div>
              <h3 style={{ font: '400 22px var(--serif)', marginBottom: '16px' }}>
                ⚠️ Kritik Stok Takibi (5 ve Altı Kalanlar)
              </h3>
              {stats.lowStockVariants && stats.lowStockVariants.length > 0 ? (
                <div style={{ background: '#fff', border: '1px solid var(--line)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                        <th style={{ padding: '12px 16px' }}>Ürün</th>
                        <th style={{ padding: '12px 16px' }}>Beden</th>
                        <th style={{ padding: '12px 16px' }}>Kalan Stok</th>
                        <th style={{ padding: '12px 16px' }}>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.lowStockVariants.map((v: any) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '12px 16px' }}>{v.product?.name}</td>
                          <td style={{ padding: '12px 16px' }}>Beden {v.size}</td>
                          <td style={{ padding: '12px 16px', color: '#b91c1c', fontWeight: 600 }}>
                            {v.stock} adet
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ color: '#b91c1c', fontSize: '12px' }}>Kritik Seviye</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                  Tüm ürünlerin stokları güvenli seviyede.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Orders */}
        {tab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ font: '400 24px var(--serif)', margin: 0 }}>Tüm Müşteri Siparişleri</h2>
              <button
                type="button"
                onClick={exportOrdersCSV}
                style={{
                  background: 'var(--ink)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📥</span>
                <span>Excel / CSV Olarak İndir</span>
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--line)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '14px 16px' }}>Sipariş No</th>
                    <th style={{ padding: '14px 16px' }}>Müşteri</th>
                    <th style={{ padding: '14px 16px' }}>Teslimat</th>
                    <th style={{ padding: '14px 16px' }}>İçerik</th>
                    <th style={{ padding: '14px 16px' }}>Tutar</th>
                    <th style={{ padding: '14px 16px' }}>Durum Değiştir</th>
                    <th style={{ padding: '14px 16px' }}>Kargo & Takip No</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const draft = trackingDrafts[o.id] || {
                      company: o.trackingCompany || 'Yurtiçi Kargo',
                      code: o.trackingCode || '',
                    };
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>{o.orderNumber}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div>{o.customerName}</div>
                          <small style={{ color: 'var(--muted)' }}>{o.customerPhone}</small>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div>{o.shippingDistrict} / {o.shippingCity}</div>
                          <small style={{ color: 'var(--muted)' }}>{o.shippingAddress}</small>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {o.items?.map((it: any) => (
                            <div key={it.id}>
                              {it.productName} ({it.size}) × {it.quantity}
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>{money(o.totalAmount)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            style={{
                              padding: '6px 10px',
                              border: '1px solid var(--line)',
                              background: '#fff',
                              fontSize: '12px',
                            }}
                          >
                            <option value="ODENDI">Ödeme Alındı</option>
                            <option value="HAZIRLANIYOR">Hazırlanıyor</option>
                            <option value="KARGODA">Kargoya Verildi</option>
                            <option value="TESLIM_EDILDI">Teslim Edildi</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select
                              value={draft.company}
                              onChange={(e) =>
                                setTrackingDrafts({
                                  ...trackingDrafts,
                                  [o.id]: { ...draft, company: e.target.value },
                                })
                              }
                              style={{ padding: '4px 6px', fontSize: '11px', border: '1px solid var(--line)' }}
                            >
                              <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                              <option value="MNG Kargo">MNG Kargo</option>
                              <option value="Aras Kargo">Aras Kargo</option>
                              <option value="Kolay Gelsin">Kolay Gelsin</option>
                              <option value="Sürat Kargo">Sürat Kargo</option>
                            </select>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input
                                placeholder="Takip No..."
                                value={draft.code}
                                onChange={(e) =>
                                  setTrackingDrafts({
                                    ...trackingDrafts,
                                    [o.id]: { ...draft, code: e.target.value },
                                  })
                                }
                                style={{
                                  padding: '4px 6px',
                                  fontSize: '11px',
                                  border: '1px solid var(--line)',
                                  width: '110px',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateTracking(o.id, o.status, draft.company, draft.code)}
                                style={{
                                  background: 'var(--ink)',
                                  color: 'var(--paper)',
                                  fontSize: '10px',
                                  padding: '4px 8px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Kaydet
                              </button>
                            </div>
                            {o.trackingCode && (
                              <small style={{ color: '#16a34a', fontSize: '11px' }}>
                                ✓ Kayıtlı: {o.trackingCode}
                              </small>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Products */}
        {tab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ font: '400 24px var(--serif)', margin: 0 }}>Koleksiyon & Beden Stokları</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={exportProductsCSV}
                  disabled={productsLoading || !!productsError || products.length === 0}
                  style={{
                    background: 'transparent',
                    color: 'var(--ink)',
                    border: '1px solid var(--line)',
                    padding: '10px 18px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📥</span>
                  <span>Excel / CSV İndir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProductId(null)}
                  style={{
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    padding: '10px 20px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Yeni Parça Ekle +
                </button>
              </div>
            </div>

            {productsLoading && <p role="status">Ürünler yükleniyor…</p>}
            {productsError && <div role="alert" className="admin-products-error"><p>{productsError}</p><button type="button" onClick={() => setRefreshTrigger((value) => value + 1)}>Tekrar dene</button></div>}
            {!productsLoading && !productsError && products.length === 0 && <p role="status">Henüz ürün yok. İlk parçayı taslak olarak oluşturabilirsiniz.</p>}

            {!productsLoading && !productsError && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
              {products.map((p) => (
                <div key={p.id} style={{ background: '#fff', border: '1px solid var(--line)', padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    {p.image ? <img src={p.image} alt={p.name} style={{ width: '80px', height: '100px', objectFit: 'cover' }} /> : <div className="admin-product-image-empty">Kapak yok</div>}
                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '16px' }}>{p.name}</h4>
                      <span className="admin-product-status">{p.status === 'DRAFT' ? 'Taslak' : 'Yayında'}</span>
                      <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--muted)' }}>
                        {p.color} · {p.category === 'ic-giyim' ? 'İç Giyim' : 'Ev Giyim'}
                      </p>
                      <strong style={{ fontSize: '15px' }}>{money(p.price)}</strong>
                      <button type="button" className="admin-product-edit" onClick={() => setEditingProductId(p.id)}>Medyayı ve ürünü düzenle →</button>
                    </div>
                  </div>

                  {/* Variants stock edit */}
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
                      Beden Stokları (Değiştirmek için tıkla):
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {p.variants?.map((v: any) => (
                        <div key={v.id} style={{ textAlign: 'center', background: 'var(--surface)', padding: '6px' }}>
                          <span style={{ fontSize: '12px', display: 'block', color: 'var(--muted)' }}>
                            {v.size}
                          </span>
                          <input
                            type="number"
                            defaultValue={v.stock}
                            onBlur={(e) => handleStockUpdate(v.id, parseInt(e.target.value))}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              padding: '4px',
                              border: '1px solid var(--line)',
                              fontSize: '13px',
                              background: '#fff',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        )}

        {/* Tab 4: Coupons */}
        {tab === 'coupons' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ font: '400 24px var(--serif)', margin: '0 0 6px' }}>İndirim & Promosyon Kuponları</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Müşterilerin sepet ve ödeme aşamasında kullanabileceği aktif kupon kodlarını yönetin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCouponModal(true)}
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  padding: '10px 20px',
                  fontSize: '13px',
                }}
              >
                Yeni Kupon Tanımla +
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--line)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '14px 16px' }}>Kupon Kodu</th>
                    <th style={{ padding: '14px 16px' }}>İndirim Tutarı / Oranı</th>
                    <th style={{ padding: '14px 16px' }}>Min. Sepet Tutarı</th>
                    <th style={{ padding: '14px 16px' }}>Kullanım / Limit</th>
                    <th style={{ padding: '14px 16px' }}>Durum</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, letterSpacing: '0.05em' }}>
                        <code>{c.code}</code>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {c.discountType === 'PERCENTAGE' ? `%${c.discountValue} İndirim` : `${money(c.discountValue)} İndirim`}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {c.minSpend > 0 ? money(c.minSpend) : 'Koşulsuz'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600 }}>{c.usedCount}</span> / {c.maxUses}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="status-badge status-delivered">
                          {c.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          style={{
                            color: '#dc2626',
                            background: 'none',
                            border: '1px solid #fecaca',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Sil ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
                        Henüz tanımlanmış bir indirim kuponu bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Newsletter */}
        {tab === 'newsletter' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ font: '400 24px var(--serif)', margin: '0 0 6px' }}>E-Bülten Aboneleri</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Özel davet ve bülten kayıt listesine katılan tüm e-posta adresleri.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const emails = subscribers.map((s) => s.email).join(', ');
                  navigator.clipboard.writeText(emails);
                  alert(`${subscribers.length} adet e-posta panoya kopyalandı!`);
                }}
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  padding: '10px 20px',
                  fontSize: '13px',
                }}
              >
                📋 E-postaları Kopyala (CSV)
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--line)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '14px 16px' }}>E-Posta Adresi</th>
                    <th style={{ padding: '14px 16px' }}>Kayıt Tarihi</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>{s.email}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>
                        {new Date(s.subscribedAt || s.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubscriber(s.id, s.email)}
                          style={{
                            color: '#dc2626',
                            background: 'none',
                            border: '1px solid #fecaca',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Listeden Çıkar ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {subscribers.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
                        Henüz kayıtlı bülten abonesi bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Reviews Moderation */}
        {tab === 'reviews' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ font: '400 24px var(--serif)', margin: '0 0 6px' }}>Müşteri Yorumları & Değerlendirmeler</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Ürün sayfalarında yayınlanan tüm müşteri değerlendirmelerini inceleyin ve denetleyin.
                </p>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--line)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '14px 16px' }}>İlgili Parça</th>
                    <th style={{ padding: '14px 16px' }}>Puan</th>
                    <th style={{ padding: '14px 16px' }}>Yorumcu</th>
                    <th style={{ padding: '14px 16px' }}>Yorum</th>
                    <th style={{ padding: '14px 16px' }}>Tarih</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewsList.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {r.product?.image && (
                            <img src={r.product.image} alt={r.product.name} style={{ width: '36px', height: '46px', objectFit: 'cover' }} />
                          )}
                          <Link href={`/koleksiyon/${r.product?.category || 'ic-giyim'}/${r.product?.slug || ''}`} style={{ fontWeight: 500, textDecoration: 'underline' }}>
                            {r.product?.name}
                          </Link>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#f59e0b', whiteSpace: 'nowrap' }}>
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} ({r.rating}/5)
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                        {r.userName}
                        {r.isVerified && (
                          <span style={{ fontSize: '10px', display: 'block', color: '#059669' }}>
                            ✓ Onaylı Alıcı
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '300px', lineHeight: 1.5 }}>
                        {r.comment}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(r.id)}
                          style={{
                            color: '#dc2626',
                            background: 'none',
                            border: '1px solid #fecaca',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Yorumu Kaldır ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reviewsList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
                        Henüz yayınlanmış bir müşteri yorumu bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 7: Return Requests */}
        {tab === 'returns' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ font: '400 24px var(--serif)', margin: '0 0 6px' }}>Müşteri İade Talepleri &amp; Hijyen Denetimi</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  6502 Sayılı Tüketicinin Korunması Kanunu iç giyim hijyen mevzuatı çerçevesinde gelen iade taleplerini değerlendirin.
                </p>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--line)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '14px 16px' }}>Talep No &amp; Tarih</th>
                    <th style={{ padding: '14px 16px' }}>Sipariş No &amp; Müşteri</th>
                    <th style={{ padding: '14px 16px' }}>Ürünler</th>
                    <th style={{ padding: '14px 16px' }}>İade Nedeni</th>
                    <th style={{ padding: '14px 16px' }}>Durum</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {returnRequests.map((ret) => (
                    <tr key={ret.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <strong>#{ret.id.slice(-6).toUpperCase()}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {new Date(ret.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div><strong>{ret.order?.orderNumber || ret.orderId}</strong></div>
                        <small style={{ color: 'var(--muted)' }}>{ret.customerEmail}</small>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {ret.order?.items?.map((it: any) => (
                          <div key={it.id} style={{ fontSize: '12px' }}>
                            {it.productName} ({it.size}) × {it.quantity}
                          </div>
                        )) || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '240px', lineHeight: 1.4 }}>
                        {ret.reason}
                        {ret.adminNotes && (
                          <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                            Not: {ret.adminNotes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {ret.status === 'BEKLIYOR' && (
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '2px', fontWeight: 500, fontSize: '12px' }}>
                            ⏳ Bekliyor
                          </span>
                        )}
                        {ret.status === 'ONAYLANDI' && (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '2px', fontWeight: 500, fontSize: '12px' }}>
                            ✓ Onaylandı
                          </span>
                        )}
                        {ret.status === 'REDDEDILDI' && (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '2px', fontWeight: 500, fontSize: '12px' }}>
                            ✗ Reddedildi
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {ret.status === 'BEKLIYOR' ? (
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateReturnStatus(ret.id, 'ONAYLANDI')}
                              style={{
                                background: '#166534',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 10px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                borderRadius: '2px',
                              }}
                            >
                              ✓ Onayla
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateReturnStatus(ret.id, 'REDDEDILDI', 'Hijyen bandı koruma mevzuatı gereği')}
                              style={{
                                background: '#991b1b',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 10px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                borderRadius: '2px',
                              }}
                            >
                              ✗ Hijyen Nedeniyle Reddet
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>İşlem Tamamlandı</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {returnRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
                        Henüz iletilmiş bir iade talebi bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editingProductId !== undefined && (
          <ProductEditor
            productId={editingProductId ?? undefined}
            onSaved={() => setRefreshTrigger((value) => value + 1)}
            onClose={() => setEditingProductId(undefined)}
          />
        )}

        {/* Modal: New Coupon */}
        {showNewCouponModal && (
          <div className="modal-overlay" onClick={() => setShowNewCouponModal(false)}>
            <div className="modal-content" style={{ maxWidth: '520px', padding: '36px' }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ font: '400 28px var(--serif)', marginBottom: '20px' }}>
                Yeni İndirim Kuponu Tanımla
              </h2>

              <form onSubmit={handleCreateCoupon}>
                <div className="form-group">
                  <label>Kupon Kodu *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="Örn: BAHAR20, VIP100"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>İndirim Türü *</label>
                    <select
                      className="form-input"
                      value={newCoupon.discountType}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                    >
                      <option value="PERCENTAGE">Yüzdelik (%) İndirim</option>
                      <option value="FIXED">Sabit Tutar (₺) İndirim</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      {newCoupon.discountType === 'PERCENTAGE' ? 'İndirim Yüzdesi (%) *' : 'İndirim Tutarı (₺) *'}
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      required
                      placeholder={newCoupon.discountType === 'PERCENTAGE' ? '15' : '300'}
                      value={newCoupon.discountValue}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Min. Sepet Tutarı (₺)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="0 (Koşulsuz)"
                      value={newCoupon.minSpend}
                      onChange={(e) => setNewCoupon({ ...newCoupon, minSpend: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Maksimum Kullanım Kotası</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="100"
                      value={newCoupon.maxUses}
                      onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="submit-order-btn" type="submit" style={{ flex: 1 }}>
                    Kuponu Oluştur ↗
                  </button>
                  <button
                    type="button"
                    style={{ border: '1px solid var(--line)', padding: '14px 20px', marginTop: '28px' }}
                    onClick={() => setShowNewCouponModal(false)}
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
