'use client';

import React, { useId, useState } from 'react';
import type { Dashboard, SeriesPoint } from '@/lib/admin/dashboard';
import type { AdminTabId } from '../_lib/tabs';
import { money } from '../_lib/format';
import AdminIcon from './AdminIcon';
import { TabLoadError, TabLoading } from './TabState';

export type AdminStats = {
  totalRevenue: number;
  aov: number;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  totalProducts: number;
  totalCustomers: number;
  newMessagesCount: number;
  pendingReturnsCount: number;
  pendingWaitlistCount: number;
  activeGiftCardsCount: number;
  missingTrackingCount: number;
  lowStockThreshold: number;
  lowStockVariants: { id: string; size: string; stock: number; product: { id: string; name: string; slug: string; image: string } }[];
  recentOrders: { id: string; orderNumber: string; customerName: string; totalAmount: number; status: string; createdAt: string }[];
  dashboard: Dashboard;
};

const STATUS_LABEL: Record<string, string> = {
  ODEME_BEKLENIYOR: 'Ödeme bekleniyor',
  ODENDI: 'Ödendi',
  HAZIRLANIYOR: 'Hazırlanıyor',
  KARGODA: 'Kargoda',
  TESLIM_EDILDI: 'Teslim edildi',
  ODEME_BASARISIZ: 'Ödeme başarısız',
};

/** Compact lira for axis ticks: 1.250 ₺, 12,5 B ₺. */
const shortMoney = (n: number) =>
  n >= 10_000
    ? `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(n / 1000)} B ₺`
    : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n)} ₺`;

function delta(current: number, previous: number): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (previous === 0) return current > 0 ? { text: 'Yeni', tone: 'up' } : null;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { text: '±0%', tone: 'flat' };
  return { text: `${change > 0 ? '+' : ''}${change}%`, tone: change > 0 ? 'up' : 'down' };
}

/** A "nice" axis ceiling so gridlines land on round values. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * exponent >= value) ?? 10;
  return step * exponent;
}

/** Revenue over time: one series, so one hue and no legend. 2px line on a soft fill, recessive
 *  gridlines, a crosshair + tooltip on hover/focus, and a table for screen readers. */
function RevenueChart({ points, caption }: { points: SeriesPoint[]; caption: string }) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.revenue)));
  const W = 100;
  const H = 100;
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.revenue).toFixed(2)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const ticks = [max, max / 2, 0];
  const labelEvery = points.length > 14 ? 6 : 2;
  const point = active === null ? null : points[active];

  function pick(clientX: number, rect: DOMRect) {
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setActive(Math.round(ratio * (points.length - 1)));
  }

  return (
    <figure className="adm-area">
      <div className="adm-area__plot">
        <div className="adm-area__ticks" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{shortMoney(tick)}</span>
          ))}
        </div>
        <div
          className="adm-area__canvas"
          role="img"
          aria-label={`${caption}. En yüksek: ${money(Math.max(...points.map((p) => p.revenue)))}`}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') setActive((i) => Math.min((i ?? -1) + 1, points.length - 1));
            if (e.key === 'ArrowLeft') setActive((i) => Math.max((i ?? points.length) - 1, 0));
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="adm-area__stop-top" />
                <stop offset="100%" className="adm-area__stop-bottom" />
              </linearGradient>
            </defs>
            {[0, 50, 100].map((g) => (
              <line key={g} x1="0" x2={W} y1={g} y2={g} className="adm-area__grid" />
            ))}
            <path d={area} fill={`url(#${gradientId})`} className="adm-area__fill" />
            <path d={line} className="adm-area__line" />
          </svg>
          {point && active !== null ? (
            <>
              <span className="adm-area__guide" style={{ left: `${x(active)}%` }} aria-hidden="true" />
              <span className="adm-area__dot" style={{ left: `${x(active)}%`, top: `${y(point.revenue)}%` }} aria-hidden="true" />
              <div
                className="adm-area__tip"
                data-side={active > points.length * 0.66 ? 'left' : 'right'}
                style={{ left: `${x(active)}%` }}
                role="status"
              >
                <span className="adm-area__tip-label">{point.label}</span>
                <strong>{money(point.revenue)}</strong>
                <span>{point.orders} sipariş</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="adm-area__axis" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.key} style={{ left: `${x(i)}%` }} data-show={i % labelEvery === 0 || i === points.length - 1}>
            {p.label}
          </span>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Dönem</th>
            <th scope="col">Ciro</th>
            <th scope="col">Sipariş</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.label}</th>
              <td>{money(p.revenue)}</td>
              <td>{p.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Tiny trend line for a KPI; decorative, the number beside it is the data. */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / Math.max(values.length - 1, 1)) * 100).toFixed(2)},${(30 - (v / max) * 28).toFixed(2)}`).join(' ');
  return (
    <svg className="adm-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function StockEditor({ variant, onSaved }: { variant: AdminStats['lowStockVariants'][number]; onSaved(): void }) {
  const [value, setValue] = useState(String(variant.stock));
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const parsed = Number(value);
  const valid = value.trim() !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed <= 9999;
  const changed = valid && parsed !== variant.stock;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!changed || state === 'saving') return;
    setState('saving');
    setMessage(null);
    try {
      const response = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: variant.id, stock: parsed }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Stok kaydedilemedi.');
      setState('idle');
      onSaved();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Stok kaydedilemedi.');
    }
  }

  const inputId = `stock-${variant.id}`;
  return (
    <form className="adm-stock-form" onSubmit={save}>
      <label htmlFor={inputId} className="visually-hidden">
        {variant.product.name} {variant.size} bedeni stok adedi
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={0}
        max={9999}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={!valid}
        aria-describedby={message ? `${inputId}-error` : undefined}
      />
      <button type="submit" className="adm-chip-btn" disabled={!changed || state === 'saving'}>
        {state === 'saving' ? '…' : 'Kaydet'}
      </button>
      {message ? (
        <span id={`${inputId}-error`} className="adm-field-error" role="alert">
          {message}
        </span>
      ) : null}
    </form>
  );
}

export default function DashboardTab({
  stats,
  error,
  onRetry,
  onNavigate,
}: {
  stats: AdminStats | null;
  error: string | null;
  onRetry(): void;
  onNavigate(tab: AdminTabId, search?: string): void;
}) {
  const [range, setRange] = useState<'daily' | 'monthly'>('daily');

  if (error) return <TabLoadError message={error} onRetry={onRetry} />;
  if (!stats) return <TabLoading label="Gösterge paneli yükleniyor" />;

  const { dashboard } = stats;
  const revenueDelta = delta(dashboard.period.revenue, dashboard.period.previousRevenue);
  const ordersDelta = delta(dashboard.period.orders, dashboard.period.previousOrders);
  const periodAov = dashboard.period.orders > 0 ? dashboard.period.revenue / dashboard.period.orders : 0;
  const lastTwoWeeks = dashboard.daily.slice(-14);
  const tasks: { label: string; count: number; tab: AdminTabId; hint: string }[] = [
    { label: 'Paketlenecek sipariş', count: stats.pendingOrdersCount, tab: 'orders', hint: 'Ödendi ya da hazırlanıyor' },
    { label: 'Yanıt bekleyen mesaj', count: stats.newMessagesCount, tab: 'messages', hint: 'Destek kutusu' },
    { label: 'Bekleyen iade', count: stats.pendingReturnsCount, tab: 'returns', hint: 'Onay ya da ret bekliyor' },
    { label: 'Stok talebi', count: stats.pendingWaitlistCount, tab: 'waitlist', hint: 'Gelince haber ver' },
  ];
  const openTasks = tasks.reduce((sum, task) => sum + task.count, 0);

  return (
    <div className="adm-bento">
      {/* Revenue — the headline card */}
      <section className="adm-card adm-bento__revenue adm-reveal" style={{ '--i': 0 } as React.CSSProperties} aria-labelledby="adm-revenue-title">
        <div className="adm-card__core adm-card__core--feature">
          <header className="adm-card__head">
            <div>
              <span className="adm-eyebrow">Ciro · son 30 gün</span>
              <h2 id="adm-revenue-title" className="visually-hidden">
                Ciro
              </h2>
              <p className="adm-hero-number">{money(dashboard.period.revenue)}</p>
              <p className="adm-card__meta">
                {revenueDelta ? <span className={`adm-delta adm-delta--${revenueDelta.tone}`}>{revenueDelta.text}</span> : null}
                <span>önceki 30 güne göre · yalnız ödenmiş siparişler</span>
              </p>
            </div>
            <div className="adm-segmented" role="group" aria-label="Grafik dönemi">
              <button type="button" aria-pressed={range === 'daily'} onClick={() => setRange('daily')}>
                30 gün
              </button>
              <button type="button" aria-pressed={range === 'monthly'} onClick={() => setRange('monthly')}>
                12 ay
              </button>
            </div>
          </header>
          <RevenueChart
            points={range === 'daily' ? dashboard.daily : dashboard.monthly}
            caption={range === 'daily' ? 'Son 30 günün günlük cirosu' : 'Son 12 ayın aylık cirosu'}
          />
        </div>
      </section>

      {/* KPI stack */}
      <section className="adm-card adm-bento__kpi adm-reveal" style={{ '--i': 1 } as React.CSSProperties} aria-labelledby="adm-kpi-orders">
        <div className="adm-card__core">
          <span id="adm-kpi-orders" className="adm-eyebrow adm-eyebrow--quiet">
            Sipariş · 30 gün
          </span>
          <div className="adm-kpi-row">
            <p className="adm-kpi-number">{dashboard.period.orders}</p>
            {ordersDelta ? <span className={`adm-delta adm-delta--${ordersDelta.tone}`}>{ordersDelta.text}</span> : null}
          </div>
          <Sparkline values={lastTwoWeeks.map((p) => p.orders)} />
          <p className="adm-card__foot">Son 14 günün günlük ödenmiş siparişi</p>
        </div>
      </section>

      <section className="adm-card adm-bento__kpi adm-reveal" style={{ '--i': 2 } as React.CSSProperties} aria-labelledby="adm-kpi-aov">
        <div className="adm-card__core">
          <span id="adm-kpi-aov" className="adm-eyebrow adm-eyebrow--quiet">
            Ortalama sepet
          </span>
          <div className="adm-kpi-row">
            <p className="adm-kpi-number">{money(periodAov || stats.aov)}</p>
          </div>
          <p className="adm-card__foot">
            30 günde {money(periodAov)} · tüm zamanlar {money(stats.aov)}
          </p>
          <dl className="adm-mini-stats">
            <div>
              <dt>Müşteri</dt>
              <dd>{stats.totalCustomers}</dd>
            </div>
            <div>
              <dt>Ürün</dt>
              <dd>{stats.totalProducts}</dd>
            </div>
            <div>
              <dt>Aktif hediye kartı</dt>
              <dd>{stats.activeGiftCardsCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Waiting work */}
      <section className="adm-bento__tasks adm-reveal" style={{ '--i': 3 } as React.CSSProperties} aria-labelledby="adm-tasks-title">
        <div className="adm-section-head">
          <h2 id="adm-tasks-title">Bekleyen işler</h2>
          <span className="adm-eyebrow adm-eyebrow--quiet">{openTasks === 0 ? 'Her şey yolunda' : `${openTasks} kayıt`}</span>
        </div>
        <div className="adm-tasks">
          {tasks.map((task) => (
            <button key={task.tab} type="button" className="adm-task" data-empty={task.count === 0} onClick={() => onNavigate(task.tab)}>
              <span className="adm-task__icon" aria-hidden="true">
                <AdminIcon name={task.tab} />
              </span>
              <span className="adm-task__count">{task.count}</span>
              <span className="adm-task__label">{task.label}</span>
              <span className="adm-task__hint">{task.hint}</span>
              <span className="adm-task__go" aria-hidden="true">
                <AdminIcon name="arrow" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Low stock */}
      <section className="adm-card adm-bento__stock adm-reveal" style={{ '--i': 4 } as React.CSSProperties} aria-labelledby="adm-low-title">
        <div className="adm-card__core">
          <header className="adm-card__head">
            <div>
              <h2 id="adm-low-title" className="adm-card__title">
                Düşük stok
              </h2>
              <p className="adm-card__sub">Yayındaki ürünlerde {stats.lowStockThreshold} adet ve altı · eşik Ayarlar’dan</p>
            </div>
            <span className="adm-count-pill">{stats.lowStockVariants.length}</span>
          </header>
          {stats.lowStockVariants.length === 0 ? (
            <p className="adm-empty">Eşiğin altında beden yok.</p>
          ) : (
            <ul className="adm-rows">
              {stats.lowStockVariants.slice(0, 8).map((variant) => (
                <li key={variant.id} className="adm-row">
                  <span className="adm-row__thumb" aria-hidden="true">
                    {variant.product.image ? <img src={variant.product.image} alt="" loading="lazy" /> : null}
                  </span>
                  <div className="adm-row__main">
                    <button type="button" className="adm-link" onClick={() => onNavigate('products', variant.product.name)}>
                      {variant.product.name}
                    </button>
                    <span className="adm-row__sub">
                      Beden {variant.size} ·{' '}
                      {variant.stock === 0 ? <strong className="adm-text-danger">tükendi</strong> : `${variant.stock} adet kaldı`}
                    </span>
                  </div>
                  <StockEditor variant={variant} onSaved={onRetry} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Best sellers */}
      <section className="adm-card adm-bento__top adm-reveal" style={{ '--i': 5 } as React.CSSProperties} aria-labelledby="adm-top-title">
        <div className="adm-card__core">
          <header className="adm-card__head">
            <div>
              <h2 id="adm-top-title" className="adm-card__title">
                En çok satanlar
              </h2>
              <p className="adm-card__sub">Ödenmiş siparişlerdeki adet</p>
            </div>
          </header>
          {dashboard.topProducts.length === 0 ? (
            <p className="adm-empty">Henüz ödenmiş sipariş yok.</p>
          ) : (
            <ol className="adm-rank">
              {dashboard.topProducts.map((product, index) => {
                const share = product.quantity / dashboard.topProducts[0].quantity;
                return (
                  <li key={product.productId} className="adm-rank__item">
                    <span className="adm-rank__no">{String(index + 1).padStart(2, '0')}</span>
                    <div className="adm-rank__main">
                      <div className="adm-rank__line">
                        <span className="adm-rank__name">{product.name}</span>
                        <span className="adm-rank__qty">{product.quantity} adet</span>
                      </div>
                      <span className="adm-rank__bar" aria-hidden="true">
                        <span style={{ transform: `scaleX(${share})` }} />
                      </span>
                      <span className="adm-row__sub">{money(product.revenue)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {/* Recent orders */}
      <section className="adm-card adm-bento__recent adm-reveal" style={{ '--i': 6 } as React.CSSProperties} aria-labelledby="adm-recent-title">
        <div className="adm-card__core">
          <header className="adm-card__head">
            <div>
              <h2 id="adm-recent-title" className="adm-card__title">
                Son siparişler
              </h2>
              <p className="adm-card__sub">Durumu ne olursa olsun son beş kayıt</p>
            </div>
            <button type="button" className="adm-pill adm-pill--ghost" onClick={() => onNavigate('orders')}>
              <span>Tümü</span>
              <span className="adm-pill__icon" aria-hidden="true">
                <AdminIcon name="arrow" />
              </span>
            </button>
          </header>
          {stats.recentOrders.length === 0 ? (
            <p className="adm-empty">Henüz sipariş yok.</p>
          ) : (
            <ul className="adm-orders">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <button type="button" className="adm-orders__row" onClick={() => onNavigate('orders', order.orderNumber)}>
                    <span className="adm-orders__no">#{order.orderNumber}</span>
                    <span className="adm-orders__who">{order.customerName}</span>
                    <span className="adm-orders__date">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`adm-status adm-status--${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
                    <span className="adm-orders__sum">{money(order.totalAmount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
