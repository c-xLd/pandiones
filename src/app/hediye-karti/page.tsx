'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Product, GIFT_CARD_PRODUCT_ID, GIFT_CARD_PRODUCT_SLUG } from '@/types';

type CardTheme = 'couture' | 'noir' | 'rose';

interface ThemeConfig {
  id: CardTheme;
  name: string;
  subname: string;
  tagline: string;
  bg: string;
  cardSurface: string;
  text: string;
  accent: string;
  border: string;
  mutedText: string;
  foilBorder: string;
  ambientLight: string;
  chipGradient: string;
  sealStroke: string;
}

const EDITIONS: Record<CardTheme, ThemeConfig> = {
  couture: {
    id: 'couture',
    name: 'Haute Couture',
    subname: 'Édition Impériale · İpek & Altın Mühür',
    tagline: 'Fildişi ipek zemin, taçlı kraliçe monogramı, saten kurdele ve 3D kabartmalı altın balmumu mühür.',
    bg: '#FAF7F2',
    cardSurface: 'url(/assets/gift-card-couture.jpg) center / cover no-repeat',
    text: '#2A241E',
    accent: '#8F6F42',
    border: 'rgba(212, 175, 55, 0.45)',
    mutedText: 'rgba(55, 45, 35, 0.75)',
    foilBorder: 'linear-gradient(135deg, rgba(212,175,55,0.9) 0%, rgba(255,248,225,0.85) 45%, rgba(180,140,40,0.95) 70%, rgba(250,240,190,0.9) 100%)',
    ambientLight: 'radial-gradient(circle at 80% 20%, rgba(212,175,55,0.25) 0%, transparent 60%)',
    chipGradient: 'linear-gradient(135deg, #d4af37 0%, #aa8420 100%)',
    sealStroke: '#8F6F42',
  },
  noir: {
    id: 'noir',
    name: 'Pandiones Noir',
    subname: 'Édition Nocturne · Obsidian & 24K Varak',
    tagline: 'Obsidian siyahı, fırçalanmış mat zemin ve 24K altın varak mühür.',
    bg: '#0F0E0D',
    cardSurface: 'linear-gradient(145deg, #181716 0%, #0D0C0B 100%)',
    text: '#FAF7F0',
    accent: '#D4AF37',
    border: 'rgba(212, 175, 55, 0.35)',
    mutedText: 'rgba(250, 247, 240, 0.65)',
    foilBorder: 'linear-gradient(135deg, rgba(212,175,55,0.85) 0%, rgba(255,248,220,0.3) 50%, rgba(180,140,40,0.9) 100%)',
    ambientLight: 'radial-gradient(circle at 80% 20%, rgba(212,175,55,0.2) 0%, transparent 60%)',
    chipGradient: 'linear-gradient(135deg, #d4af37 0%, #aa8420 100%)',
    sealStroke: '#D4AF37',
  },
  rose: {
    id: 'rose',
    name: 'Rosa Seta',
    subname: 'Édition Poudrée · Pudra İpek & Antik Gül',
    tagline: 'Zarif pudra ve gül kurusu ipek, antik bakır mühür parıltısı.',
    bg: '#F6EBE6',
    cardSurface: 'linear-gradient(145deg, #FBF4F1 0%, #EDE0DB 100%)',
    text: '#2D1B1A',
    accent: '#A4534B',
    border: 'rgba(164, 83, 75, 0.3)',
    mutedText: 'rgba(45, 27, 26, 0.65)',
    foilBorder: 'linear-gradient(135deg, rgba(164,83,75,0.7) 0%, rgba(255,240,236,0.9) 50%, rgba(135,62,56,0.8) 100%)',
    ambientLight: 'radial-gradient(circle at 80% 20%, rgba(230,190,185,0.35) 0%, transparent 60%)',
    chipGradient: 'linear-gradient(135deg, #e2aba4 0%, #ab6961 100%)',
    sealStroke: '#A4534B',
  },
};

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];

const NOTE_TEMPLATES = [
  'Zarafetin ve kusursuz anların her daim parıldasın.',
  'Kendi zarif seçimlerinle dolu unutulmaz bir kutlama dileğiyle.',
  'Pandiones Atelier’nin saf ipek dokunuşları sana eşlik etsin.',
];

export default function HediyeKartiPage() {
  const { addToCart, setIsBagOpen, showToast } = useCart();

  // Mode Selection
  const [activeTab, setActiveTab] = useState<'create' | 'balance'>('create');

  // Customizer State
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('couture');
  const [selectedAmount, setSelectedAmount] = useState<number>(2500);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmountVal, setCustomAmountVal] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [sendSchedule, setSendSchedule] = useState<'now' | 'custom'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Balance Check State
  const [balanceCode, setBalanceCode] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<{
    code: string;
    theme: string;
    recipientName: string;
    senderName?: string | null;
    giftNote?: string | null;
    initialBalance: number;
    currentBalance: number;
    expiresAt: string;
  } | null>(null);

  // 3D Tilt Physics
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50 });

  const activeAmount = isCustomAmount ? Number(customAmountVal) || 0 : selectedAmount;
  const currentTheme = EDITIONS[selectedTheme];

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current || isFlipped) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Bounded tilt angles (-10deg to +10deg)
    setTilt({
      rx: (y - 0.5) * -16,
      ry: (x - 0.5) * 16,
      px: x * 100,
      py: y * 100,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, px: 50, py: 50 });
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (activeAmount < 500) {
      errors.amount = 'Minimum hediye sertifikası tutarı 500 ₺ olmalıdır.';
    } else if (activeAmount > 50000) {
      errors.amount = 'Maksimum hediye sertifikası tutarı 50.000 ₺ olmalıdır.';
    }

    if (!recipientName.trim()) {
      errors.recipientName = 'Lütfen alıcının tam adını giriniz.';
    }

    if (!recipientEmail.trim() || !recipientEmail.includes('@') || !recipientEmail.includes('.')) {
      errors.recipientEmail = 'Lütfen geçerli bir e-posta adresi giriniz.';
    }

    if (sendSchedule === 'custom' && !scheduleDate) {
      errors.scheduleDate = 'Lütfen geçerli bir teslimat tarihi belirleyiniz.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsAdding(true);

    const cardProduct: Product = {
      id: GIFT_CARD_PRODUCT_ID,
      slug: GIFT_CARD_PRODUCT_SLUG,
      name: `Pandiones Dijital Hediye Kartı (${currentTheme.name})`,
      price: activeAmount,
      color: currentTheme.name,
      category: 'hediye-karti',
      subcategory: 'Dijital Hediye Kartı',
      image: '/assets/campaign-hero.jpeg',
      description: `Alıcı: ${recipientName.trim()} (${recipientEmail.trim()}). Gönderen: ${senderName.trim() || 'Bir Dost'}. Not: ${giftNote.trim() || 'Kusursuz anlarına eşlik etmesi dileğiyle...'}.`,
    };

    addToCart(cardProduct, `${activeAmount} TL`, 1, {
      giftCardTheme: selectedTheme,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      senderName: senderName.trim() || undefined,
      giftNote: giftNote.trim() || undefined,
      deliveryDate: sendSchedule === 'custom' ? scheduleDate : 'now',
    });

    setIsAdding(false);
    setAddedSuccess(true);
    showToast(`${formatMoney(activeAmount)} Pandiones Hediye Sertifikası çantaya eklendi.`);
    setIsBagOpen(true);

    setTimeout(() => {
      setAddedSuccess(false);
    }, 4000);
  };

  const handleQueryBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceCode.trim()) return;

    setBalanceLoading(true);
    setBalanceError(null);
    setBalanceData(null);

    try {
      const res = await fetch('/api/gift-cards/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: balanceCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBalanceError(data.error || 'Hediye kartı doğrulanamadı. Kodu kontrol ederek tekrar deneyiniz.');
      } else {
        setBalanceData(data);
      }
    } catch {
      setBalanceError('Atölye sunucusuna bağlanılamadı. Lütfen internet bağlantınızı kontrol ediniz.');
    } finally {
      setBalanceLoading(false);
    }
  };

  return (
    <main id="main" className="padded-main" style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* ── Scoped Atelier Visual Physics & Styles ── */}
      <style>{`
        .atelier-card-shell {
          position: relative;
          width: 100%;
          aspect-ratio: 1.586 / 1;
          border-radius: 20px;
          transform-style: preserve-3d;
          transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 320ms ease;
          user-select: none;
        }
        .atelier-foil-edge {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 1.5px;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: destination-out;
          pointer-events: none;
        }
        .atelier-chip {
          width: 44px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.25);
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .atelier-chip::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 10px);
        }
        .apple-press:active {
          transform: scale(0.98);
        }
        .template-pill {
          transition: all 160ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .template-pill:hover {
          border-color: var(--ink);
          background: rgba(0,0,0,0.03);
        }
      `}</style>

      {/* ── Minimal Breadcrumb Bar ── */}
      <div style={{ maxWidth: '1360px', margin: '0 auto 16px', padding: '0 24px' }}>
        <nav aria-label="Ekmek kırıntısı" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
          <Link href="/" className="apple-press" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
            Atelier
          </Link>
          <span aria-hidden="true" style={{ opacity: 0.35 }}>/</span>
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Dijital Hediye Sertifikası</span>
        </nav>
      </div>

      {/* ── Editorial Header (Max 2-line headline, disciplined copy) ── */}
      <header style={{ maxWidth: '960px', margin: '0 auto 40px', textAlign: 'center', padding: '0 24px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 16px',
            borderRadius: '999px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            fontSize: '10px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: '18px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5 12 2" />
          </svg>
          CARTE CADEAU D&apos;ATELIER · 1 YIL GEÇERLİLİK
        </div>

        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(36px, 5vw, 60px)',
            fontWeight: 400,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: 'var(--ink)',
            margin: '0 0 16px',
            textWrap: 'balance',
          }}
        >
          Zarafeti ve Özgür Tercihi Hediye Edin
        </h1>

        <p
          style={{
            fontSize: '15.5px',
            lineHeight: 1.6,
            color: 'var(--muted)',
            maxWidth: '580px',
            margin: '0 auto 28px',
            textWrap: 'pretty',
          }}
        >
          Sevdiklerinize saf ipek, İtalyan danteli ve özel dikim ev giyimi dünyasını diledikleri anda keşfetme özgürlüğü sunun.
        </p>

        {/* ── Segmented Controller ── */}
        <div
          role="tablist"
          style={{
            display: 'inline-flex',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
            className="apple-press"
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeTab === 'create' ? 600 : 500,
              background: activeTab === 'create' ? 'var(--ink)' : 'transparent',
              color: activeTab === 'create' ? 'var(--paper)' : 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Sertifika Düzenle
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'balance'}
            onClick={() => setActiveTab('balance')}
            className="apple-press"
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeTab === 'balance' ? 600 : 500,
              background: activeTab === 'balance' ? 'var(--ink)' : 'transparent',
              color: activeTab === 'balance' ? 'var(--paper)' : 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Bakiye &amp; Doğrulama
          </button>
        </div>
      </header>

      {/* ── Workspace ── */}
      <div style={{ maxWidth: '1360px', margin: '0 auto 80px', padding: '0 24px' }}>
        {activeTab === 'create' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '56px',
              alignItems: 'start',
            }}
          >
            {/* ── Left Column: Physical 3D Atelier Stage ── */}
            <div style={{ position: 'sticky', top: '96px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Canlı Sertifika Simülasyonu
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    1 Yıl (12 Ay) Geçerlilik
                  </span>
                </div>

                {/* 3D Perspective Card Stage */}
                <div
                  ref={cardContainerRef}
                  onPointerMove={handlePointerMove}
                  onPointerLeave={handlePointerLeave}
                  style={{
                    perspective: '1400px',
                    cursor: isFlipped ? 'default' : 'grab',
                  }}
                >
                  <div
                    className="atelier-card-shell"
                    style={{
                      background: currentTheme.cardSurface,
                      color: currentTheme.text,
                      border: `1px solid ${currentTheme.border}`,
                      boxShadow: isFlipped
                        ? '0 28px 60px -16px rgba(0,0,0,0.35)'
                        : `0 32px 70px -16px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.06) inset`,
                      transform: isFlipped
                        ? 'rotateY(180deg)'
                        : `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                      padding: 'clamp(24px, 3.2vw, 36px)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Metallic Foil Edge Border */}
                    <div
                      className="atelier-foil-edge"
                      style={{ background: currentTheme.foilBorder }}
                    />

                    {/* Specular Interactive Shine (Follows Cursor) */}
                    {!isFlipped && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: `radial-gradient(circle at ${tilt.px}% ${tilt.py}%, rgba(255,255,255,0.18) 0%, transparent 60%)`,
                          pointerEvents: 'none',
                          mixBlendMode: 'overlay',
                        }}
                      />
                    )}

                    {!isFlipped ? (
                      currentTheme.id === 'couture' ? (
                        /* ── HAUTE COUTURE SIGNATURE EDITION (Direct match with reference) ── */
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                          }}
                        >
                          {/* Live Nominal Tutar, Note & Recipient in center-bottom zone */}
                          <div style={{ textAlign: 'center', margin: '0 auto', maxWidth: '340px' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'baseline',
                                gap: '8px',
                                padding: '4px 18px',
                                borderRadius: '999px',
                                background: 'rgba(255, 255, 255, 0.75)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(212, 175, 55, 0.45)',
                                boxShadow: '0 4px 16px rgba(120, 90, 50, 0.12)',
                                marginBottom: '6px',
                              }}
                            >
                              <span style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7A6248', fontWeight: 600 }}>
                                NOMİNAL TUTAR
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--serif)',
                                  fontSize: 'clamp(24px, 3.2vw, 34px)',
                                  fontWeight: 600,
                                  color: '#3A2E20',
                                  fontVariantNumeric: 'tabular-nums',
                                  letterSpacing: '-0.02em',
                                  lineHeight: 1,
                                }}
                              >
                                {activeAmount > 0 ? formatMoney(activeAmount) : '— ₺'}
                              </span>
                            </div>

                            {/* Live Personal Note */}
                            <p
                              style={{
                                margin: '4px 0 6px',
                                fontFamily: 'var(--serif)',
                                fontSize: 'clamp(12px, 1.4vw, 13.5px)',
                                fontStyle: 'italic',
                                color: '#342B23',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textShadow: '0 1px 1px rgba(255,255,255,0.7)',
                              }}
                            >
                              &ldquo;{giftNote.trim() || 'Zarafetinize ve benzersiz anlarınıza eşlik etmesi dileğiyle...'}&rdquo;
                            </p>

                            {/* Recipient & Sender */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '10.5px',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#5E4C38',
                                fontWeight: 500,
                              }}
                            >
                              <span>Sayın {recipientName.trim() || 'Değerli Misafirimiz'}</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span>{senderName.trim() ? `Takdim: ${senderName.trim()}` : 'Atelier Özel'}</span>
                            </div>
                          </div>

                          {/* Bottom Bar: Serial Code & 1-Year Guarantee */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-end',
                              marginTop: 'auto',
                              paddingTop: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '10.5px',
                                  letterSpacing: '0.14em',
                                  color: '#3A2E20',
                                  background: 'rgba(255, 255, 255, 0.8)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(212, 175, 55, 0.4)',
                                  fontWeight: 600,
                                }}
                              >
                                PND-GC-••••-••••
                              </span>
                              <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6A5641', fontWeight: 600 }}>
                                1 YIL GEÇERLİ
                              </span>
                            </div>
                            <span style={{ fontSize: '8.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7A6856', opacity: 0.85 }}>
                              ÉDITION IMPÉRIALE
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* ── NOIR & ROSE BESPOKE EDITIONS ── */
                        <>
                          {/* Header: Monogram + Chip + Denomination */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <div
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    border: `1.5px solid ${currentTheme.accent}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <span style={{ fontFamily: 'var(--serif)', fontSize: '13px', fontWeight: 600, color: currentTheme.accent }}>
                                    P
                                  </span>
                                </div>
                                <div>
                                  <span style={{ display: 'block', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: currentTheme.accent, fontWeight: 600 }}>
                                    PANDIONES ATELIER
                                  </span>
                                  <span style={{ display: 'block', fontSize: '9px', opacity: 0.65, letterSpacing: '0.08em' }}>
                                    {currentTheme.subname}
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontFamily: 'var(--serif)', fontSize: '24px', letterSpacing: '0.02em', display: 'block', fontWeight: 400, marginTop: '4px' }}>
                                Carte Cadeau
                              </span>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'block', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.65 }}>
                                Nominal Değer
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--serif)',
                                  fontSize: 'clamp(26px, 3.4vw, 36px)',
                                  fontWeight: 600,
                                  color: currentTheme.accent,
                                  fontVariantNumeric: 'tabular-nums',
                                  letterSpacing: '-0.02em',
                                  display: 'block',
                                  lineHeight: 1.1,
                                }}
                              >
                                {activeAmount > 0 ? formatMoney(activeAmount) : '— ₺'}
                              </span>
                            </div>
                          </div>

                          {/* Mid Section: Chip & Live Personal Note */}
                          <div style={{ position: 'relative', zIndex: 2, margin: '14px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                              <div className="atelier-chip" style={{ background: currentTheme.chipGradient }} />
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.2em', opacity: 0.75 }}>
                                PND-GC-••••-••••
                              </span>
                            </div>

                            <p
                              style={{
                                margin: '8px 0 0',
                                fontFamily: 'var(--serif)',
                                fontSize: 'clamp(13px, 1.5vw, 15px)',
                                fontStyle: 'italic',
                                lineHeight: 1.45,
                                opacity: 0.9,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                paddingBottom: '2px',
                              }}
                            >
                              &ldquo;{giftNote.trim() || 'Kusursuz anlarına ve zarafetine eşlik etmesi dileğiyle...'}&rdquo;
                            </p>
                          </div>

                          {/* Footer: Recipient & Sender Credentials */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-end',
                              position: 'relative',
                              zIndex: 2,
                              paddingTop: '12px',
                              borderTop: '1px solid rgba(255,255,255,0.12)',
                            }}
                          >
                            <div>
                              <span style={{ display: 'block', fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.6 }}>
                                Alıcı
                              </span>
                              <span style={{ fontSize: '13.5px', fontWeight: 500, letterSpacing: '0.02em' }}>
                                {recipientName.trim() || 'Değerli Misafirimiz'}
                              </span>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'block', fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.6 }}>
                                Gönderen
                              </span>
                              <span style={{ fontSize: '13.5px', fontWeight: 500, letterSpacing: '0.02em' }}>
                                {senderName.trim() || 'Bir Dost'}
                              </span>
                            </div>
                          </div>
                        </>
                      )
                    ) : (
                      /* ── CARD BACK ── */
                      <div
                        style={{
                          transform: 'rotateY(180deg)',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          zIndex: 2,
                        }}
                      >
                        {/* Silk Magnetic Tape */}
                        <div
                          style={{
                            height: '40px',
                            background: '#090807',
                            margin: '-12px -24px 10px',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
                          }}
                        />

                        <div style={{ padding: '0 8px', fontSize: '11px', lineHeight: 1.6, opacity: 0.85 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '10px' }}>
                              ATELIER GÜVENLİK PROTOKOLÜ
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>12 AY VALİD</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '10.5px' }}>
                            Bu sertifika pandiones.com adresindeki tüm siparişlerde nakit karşılığı gibi kullanılır.
                            Ödeme adımında kupon alanına kod girildiğinde toplam tutardan otomatik düşülür; harcanmayan bakiye 1 yıl boyunca saklanır.
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '10px',
                            opacity: 0.7,
                            borderTop: '1px solid rgba(255,255,255,0.12)',
                            paddingTop: '10px',
                          }}
                        >
                          <span>Geçerlilik: 1 Yıl (12 Ay)</span>
                          <span>Danışma: concierge@pandiones.com</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Flip Interaction Button */}
                <div style={{ marginTop: '14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="apple-press"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '12px',
                      color: 'var(--muted)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: '4px 12px',
                    }}
                  >
                    {isFlipped ? '← Sertifikanın ön yüzüne dön' : 'Kartın arka yüzünü ve güvenlik talimatını incele ↻'}
                  </button>
                </div>
              </div>

              {/* Guarantees Box */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--ink)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>
                      1 Yıl (12 Ay) Boyunca Kesintisiz Geçerlilik
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Hediye kartınız satın alındığı andan itibaren tam 12 ay boyunca geçerlidir.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--ink)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>
                      Kademeli Harcama Özgürlüğü
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Bakiyeyi tek siparişte tüketme zorunluluğu yoktur; kalan tutar sonraki alışverişlerde korunur.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--ink)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>
                      Lüks E-Posta Sertifikası
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Sipariş tamamlandığında kişisel tebrik notunuz ve sertifikanız doğrudan alıcının gelen kutusuna ulaşır.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column: Interactive Studio Customizer ── */}
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '20px',
                padding: 'clamp(24px, 4vw, 44px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
              }}
            >
              <form onSubmit={handleAddToCart}>
                {/* 1. Theme / Edition Selector */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      1. Sertifika Edisyonunu Seçin
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {currentTheme.name}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    {(Object.keys(EDITIONS) as CardTheme[]).map((themeKey) => {
                      const theme = EDITIONS[themeKey];
                      const isSelected = selectedTheme === themeKey;
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => setSelectedTheme(themeKey)}
                          className="apple-press"
                          style={{
                            padding: '14px 12px',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid var(--ink)' : '1px solid var(--line)',
                            background: isSelected ? 'var(--surface)' : 'var(--paper)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: theme.accent,
                                display: 'inline-block',
                                border: '1px solid rgba(0,0,0,0.1)',
                              }}
                            />
                            <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{theme.name}</strong>
                          </div>
                          <span style={{ fontSize: '10.5px', color: 'var(--muted)', lineHeight: 1.3 }}>
                            {theme.subname}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Nominal Denomination Selector */}
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '12px' }}>
                    2. Hediye Kartı Tutarını Belirleyin
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = !isCustomAmount && selectedAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setSelectedAmount(amt);
                            setIsCustomAmount(false);
                            if (formErrors.amount) {
                              const copy = { ...formErrors };
                              delete copy.amount;
                              setFormErrors(copy);
                            }
                          }}
                          className="apple-press"
                          style={{
                            padding: '14px 10px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            textAlign: 'center',
                            border: isSelected ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                            background: isSelected ? 'var(--ink)' : 'var(--surface)',
                            color: isSelected ? 'var(--paper)' : 'var(--ink)',
                            cursor: 'pointer',
                            transition: 'all 140ms ease',
                          }}
                        >
                          {formatMoney(amt)}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setIsCustomAmount(!isCustomAmount)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '12px',
                        color: 'var(--ink)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      {isCustomAmount ? '← Standart tutarlara dön' : 'Özel bir tutar belirlemek istiyorum ↗'}
                    </button>
                  </div>

                  {isCustomAmount && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min={500}
                          max={50000}
                          step={100}
                          value={customAmountVal}
                          onChange={(e) => {
                            setCustomAmountVal(e.target.value);
                            if (formErrors.amount) {
                              const copy = { ...formErrors };
                              delete copy.amount;
                              setFormErrors(copy);
                            }
                          }}
                          placeholder="Örn: 7.500"
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'var(--surface)',
                            border: formErrors.amount ? '1px solid #dc2626' : '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--ink)',
                            outline: 'none',
                          }}
                        />
                        <span style={{ position: 'absolute', right: '16px', top: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                          ₺ TRY
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                        Minimum 500 ₺, maksimum 50.000 ₺ arasında dilediğiniz tutarı belirleyebilirsiniz.
                      </span>
                    </div>
                  )}

                  {formErrors.amount && (
                    <p style={{ color: '#b91c1c', fontSize: '12px', margin: '6px 0 0' }}>
                      {formErrors.amount}
                    </p>
                  )}
                </div>

                {/* 3. Personalization & Greeting */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '28px', marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px' }}>
                    3. Alıcı ve Gönderici Bilgileri
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label htmlFor="recipientName" style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                        Alıcının Adı ve Soyadı *
                      </label>
                      <input
                        id="recipientName"
                        type="text"
                        value={recipientName}
                        onChange={(e) => {
                          setRecipientName(e.target.value);
                          if (formErrors.recipientName) {
                            const copy = { ...formErrors };
                            delete copy.recipientName;
                            setFormErrors(copy);
                          }
                        }}
                        placeholder="Örn: Aslı Yılmaz"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: formErrors.recipientName ? '1px solid #dc2626' : '1px solid var(--line)',
                          background: 'var(--surface)',
                          fontSize: '14px',
                          color: 'var(--ink)',
                          outline: 'none',
                        }}
                      />
                      {formErrors.recipientName && (
                        <p style={{ color: '#b91c1c', fontSize: '11px', margin: '4px 0 0' }}>
                          {formErrors.recipientName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="recipientEmail" style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                        Alıcının E-Posta Adresi *
                      </label>
                      <input
                        id="recipientEmail"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => {
                          setRecipientEmail(e.target.value);
                          if (formErrors.recipientEmail) {
                            const copy = { ...formErrors };
                            delete copy.recipientEmail;
                            setFormErrors(copy);
                          }
                        }}
                        placeholder="asli@ornek.com"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: formErrors.recipientEmail ? '1px solid #dc2626' : '1px solid var(--line)',
                          background: 'var(--surface)',
                          fontSize: '14px',
                          color: 'var(--ink)',
                          outline: 'none',
                        }}
                      />
                      {formErrors.recipientEmail && (
                        <p style={{ color: '#b91c1c', fontSize: '11px', margin: '4px 0 0' }}>
                          {formErrors.recipientEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="senderName" style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                      Sizin Adınız (Gönderen)
                    </label>
                    <input
                      id="senderName"
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Örn: Selin veya Bir Dost"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        fontSize: '14px',
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="giftNote" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)' }}>
                        Kişisel Tebrik &amp; Hediye Notunuz
                      </label>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {giftNote.length} / 200
                      </span>
                    </div>

                    <textarea
                      id="giftNote"
                      rows={3}
                      maxLength={200}
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      placeholder="Kusursuz anlarına ve zarafetine eşlik etmesi dileğiyle..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        fontSize: '14px',
                        color: 'var(--ink)',
                        outline: 'none',
                        resize: 'none',
                        lineHeight: 1.5,
                      }}
                    />

                    {/* Quick Inspiration Templates */}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', alignSelf: 'center' }}>Örnek notlar:</span>
                      {NOTE_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGiftNote(tmpl)}
                          className="apple-press template-pill"
                          style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: '1px solid var(--line)',
                            background: 'var(--surface)',
                            color: 'var(--ink)',
                            cursor: 'pointer',
                          }}
                        >
                          &ldquo;{tmpl.slice(0, 26)}...&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Delivery Scheduling */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '28px', marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '14px' }}>
                    4. Gönderim Zamanı
                  </label>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sendSchedule"
                        checked={sendSchedule === 'now'}
                        onChange={() => setSendSchedule('now')}
                      />
                      <span>Sipariş tamamlandığında anında ilet</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sendSchedule"
                        checked={sendSchedule === 'custom'}
                        onChange={() => setSendSchedule('custom')}
                      />
                      <span>Özel bir kutlama gününde teslim et</span>
                    </label>
                  </div>

                  {sendSchedule === 'custom' && (
                    <div style={{ marginTop: '14px' }}>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => {
                          setScheduleDate(e.target.value);
                          if (formErrors.scheduleDate) {
                            const copy = { ...formErrors };
                            delete copy.scheduleDate;
                            setFormErrors(copy);
                          }
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--surface)',
                          border: formErrors.scheduleDate ? '1px solid #dc2626' : '1px solid var(--line)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: 'var(--ink)',
                          outline: 'none',
                        }}
                      />
                      {formErrors.scheduleDate && (
                        <p style={{ color: '#b91c1c', fontSize: '11px', margin: '4px 0 0' }}>
                          {formErrors.scheduleDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Submit CTA */}
                <button
                  type="submit"
                  disabled={isAdding}
                  className="apple-press"
                  style={{
                    width: '100%',
                    padding: '18px 24px',
                    borderRadius: '10px',
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: isAdding ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    transition: 'all 180ms ease',
                  }}
                >
                  <span>
                    {addedSuccess ? '✓ Hediye Sertifikası Çantaya Eklendi' : 'Hediye Sertifikasını Çantaya Ekle'}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(activeAmount)} →
                  </span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ── Tab 2: Code Verification & Live Balance Ticket ── */
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '20px',
                padding: 'clamp(28px, 5vw, 48px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    color: 'var(--ink)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 400, margin: '0 0 8px', color: 'var(--ink)' }}>
                  Hediye Kartı Bakiyesi Sorgulama
                </h2>
                <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                  Elinizdeki dijital hediye kartı kodunu girerek kalan bakiyenizi ve 1 yıllık son geçerlilik tarihinizi anında görüntüleyebilirsiniz.
                </p>
              </div>

              <form onSubmit={handleQueryBalance} style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={balanceCode}
                    onChange={(e) => setBalanceCode(e.target.value.toUpperCase())}
                    placeholder="PND-GC-XXXX-XXXX"
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--ink)',
                      outline: 'none',
                    }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={balanceLoading}
                    className="apple-press"
                    style={{
                      padding: '0 24px',
                      borderRadius: '10px',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: balanceLoading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {balanceLoading ? 'Sorgulanıyor...' : 'Sorgula →'}
                  </button>
                </div>
              </form>

              {balanceError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '16px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{balanceError}</span>
                </div>
              )}

              {balanceData && (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1.5px solid var(--ink)',
                    borderRadius: '16px',
                    padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', display: 'block' }}>
                        DOĞRULANMIŞ SERTİFİKA
                      </span>
                      <strong style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.14em', color: 'var(--ink)' }}>
                        {balanceData.code}
                      </strong>
                    </div>

                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      ✓ Aktif
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                        Kalan Kullanılabilir Bakiye
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--serif)',
                          fontSize: '32px',
                          fontWeight: 600,
                          color: 'var(--ink)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatMoney(balanceData.currentBalance)}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                        Başlangıç Değeri
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(balanceData.initialBalance)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', borderTop: '1px solid var(--line)', paddingTop: '16px', marginBottom: '24px' }}>
                    <div>
                      <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Alıcı</span>
                      <strong style={{ color: 'var(--ink)' }}>{balanceData.recipientName}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Son Geçerlilik (1 Yıl)</span>
                      <strong style={{ color: 'var(--ink)' }}>{formatDate(balanceData.expiresAt)}</strong>
                    </div>
                  </div>

                  <Link
                    href="/koleksiyon"
                    className="apple-press"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      padding: '14px',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Koleksiyonu Keşfet &amp; Bakiyeni Harca →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Atelier Craftsmanship Assurances ── */}
      <section
        style={{
          borderTop: '1px solid var(--line)',
          padding: '80px 24px',
          background: 'var(--surface)',
        }}
      >
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px' }}>
            <span style={{ fontSize: '10.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
              ATÖLYE STANDARTLARI
            </span>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '32px', fontWeight: 400, margin: '8px 0 0', color: 'var(--ink)' }}>
              Pandiones Hediye Deneyimi
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '32px 24px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  color: 'var(--ink)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
                Kriptografik Güvenlik
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Her sertifika, atölye veritabanında benzersiz `PND-GC` güvenlik anahtarıyla mühürlenir. İki faktörlü ve tekil yetkilendirmeyle korunur.
              </p>
            </div>

            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '32px 24px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  color: 'var(--ink)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
                1 Yıl Geçerlilik &amp; Kademeli Bakiye
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Bakiyenizi acele etmeden 12 ay boyunca dilediğiniz sezonda kullanın. Tek siparişte tükenmeyen miktar sonraki siparişlerinizde saklanır.
              </p>
            </div>

            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '32px 24px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  color: 'var(--ink)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
                Lüks Dijital Sunum
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Alıcının e-posta adresine iletilen sertifika, seçtiğiniz edisyona uygun tipografi ve kişisel mesajınızla bir sanat objesi gibi sunulur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Curated FAQ Section ── */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '80px 24px' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '32px', fontWeight: 400, textAlign: 'center', margin: '0 0 36px', color: 'var(--ink)' }}>
          Sıkça Sorulan Sorular
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            {
              q: 'Dijital hediye kartını alışverişimde nasıl kullanabilirim?',
              a: 'Beğendiğiniz ürünleri sepete ekledikten sonra /odeme sayfasında yer alan "Kupon / Hediye Kartı" hanesine PND-GC kodunuzu girip "Uygula" butonuna basmanız yeterlidir. Sepet tutarınız kart bakiyenizden otomatik olarak düşülür.',
            },
            {
              q: 'Karttaki bakiyeyi birden fazla siparişte bölebilir miyim?',
              a: 'Evet, kesinlikle. Örneğin 5.000 ₺ değerindeki hediye kartınızla 2.000 ₺ tutarında bir sipariş verdiğinizde kalan 3.000 ₺ bakiyeniz kartınızda saklanır ve 1 yıl (12 ay) boyunca sonraki siparişlerinizde aynı kodla kullanılabilir.',
            },
            {
              q: 'Hediye kartı satın alımında faturam kime iletilir?',
              a: 'Satın alma faturası siparişi veren göndericiye iletilir. Alıcıya yalnızca hediye kartı nominal tutarı, kişisel mesajınız ve kullanım talimatı iletilir; hiçbir ödeme detayı paylaşılmaz.',
            },
            {
              q: 'Hediye kartı ile ödenen bir sipariş iade edilirse ne olur?',
              a: 'Hediye kartı bakiyesiyle yapılan alışverişlerin iadelerinde, ilgili iade tutarı tekrar hediye kartınızın mevcut bakiyesine anında ve eksiksiz olarak geri yüklenir.',
            },
          ].map((item, idx) => (
            <details
              key={idx}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '18px 24px',
                cursor: 'pointer',
              }}
            >
              <summary
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--ink)',
                  outline: 'none',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{item.q}</span>
                <span style={{ fontSize: '18px', fontWeight: 300, color: 'var(--muted)' }}>+</span>
              </summary>
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: '13.5px',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
