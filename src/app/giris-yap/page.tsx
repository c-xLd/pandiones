'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function GirisYapPage() {
  const router = useRouter();
  const { user, login, register } = useAuth();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    if (user.role === 'ADMIN') {
      router.push('/yonetim');
    } else {
      router.push('/hesabim');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isLoginTab) {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Giriş yapılamadı.');
        setLoading(false);
      } else {
        router.push('/hesabim');
      }
    } else {
      const res = await register(name, email, password, phone);
      if (!res.success) {
        setError(res.error || 'Kayıt yapılamadı.');
        setLoading(false);
      } else {
        router.push('/hesabim');
      }
    }
  };

  const fillQuickLogin = (quickEmail: string, quickPass: string) => {
    setIsLoginTab(true);
    setEmail(quickEmail);
    setPassword(quickPass);
  };

  return (
    <main id="main" className="padded-main">
      <div style={{ maxWidth: '480px', margin: '60px auto 100px', padding: '0 24px' }}>
        <p className="eyebrow" style={{ textAlign: 'center' }}>PANDIONES</p>
        <h1 style={{ font: '400 clamp(32px, 4vw, 46px)/1.1 var(--serif)', textAlign: 'center', marginBottom: '32px' }}>
          {isLoginTab ? 'Hoş Geldiniz' : 'Hesap Oluşturun'}
        </h1>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '32px' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '14px 0',
              fontSize: '14px',
              borderBottom: isLoginTab ? '2px solid var(--ink)' : '2px solid transparent',
              color: isLoginTab ? 'var(--ink)' : 'var(--muted)',
              fontWeight: isLoginTab ? 500 : 400,
            }}
            onClick={() => { setIsLoginTab(true); setError(null); }}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '14px 0',
              fontSize: '14px',
              borderBottom: !isLoginTab ? '2px solid var(--ink)' : '2px solid transparent',
              color: !isLoginTab ? 'var(--ink)' : 'var(--muted)',
              fontWeight: !isLoginTab ? 500 : 400,
            }}
            onClick={() => { setIsLoginTab(false); setError(null); }}
          >
            Üye Ol
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLoginTab && (
            <div className="form-group">
              <label htmlFor="authName">Ad Soyad *</label>
              <input
                id="authName"
                className="form-input"
                required
                placeholder="Adınız ve Soyadınız"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="authEmail">E-posta Adresi *</label>
            <input
              id="authEmail"
              type="email"
              className="form-input"
              required
              placeholder="ornek@pandiones.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="authPassword">Şifre *</label>
            <input
              id="authPassword"
              type="password"
              className="form-input"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLoginTab && (
            <div className="form-group">
              <label htmlFor="authPhone">Telefon Numarası (İsteğe bağlı)</label>
              <input
                id="authPhone"
                type="tel"
                className="form-input"
                placeholder="05XX XXX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn btn--primary btn--lg btn--block"
            type="submit"
            disabled={loading}
            aria-busy={loading}
            style={{ marginTop: '12px' }}
          >
            {loading ? 'İşleniyor...' : isLoginTab ? 'Giriş Yap ↗' : 'Kaydı Tamamla ↗'}
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div style={{ marginTop: '40px', padding: '20px', background: 'var(--surface)', borderRadius: '4px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 12px' }}>
            HIZLI TEST HESAPLARI (TEK TIKLA DOLDUR):
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              style={{
                textAlign: 'left',
                fontSize: '12px',
                padding: '8px 12px',
                background: '#fff',
                border: '1px solid var(--line)',
              }}
              onClick={() => fillQuickLogin('admin@pandiones.com', 'Admin123!')}
            >
              🔑 <strong>Yönetici (Admin):</strong> admin@pandiones.com / Admin123!
            </button>
            <button
              type="button"
              style={{
                textAlign: 'left',
                fontSize: '12px',
                padding: '8px 12px',
                background: '#fff',
                border: '1px solid var(--line)',
              }}
              onClick={() => fillQuickLogin('asli@pandiones.com', 'Asli123!')}
            >
              👤 <strong>Müşteri (Aslı):</strong> asli@pandiones.com / Asli123!
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
