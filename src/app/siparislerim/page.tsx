'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import StatusPanel from '@/components/ui/StatusPanel';
import ReceiptDialog from '@/components/orders/ReceiptDialog';
import ReturnDialog from '@/components/orders/ReturnDialog';
import { ACTIVE_STATUSES, filterOrders, type Order, type OrderFilter } from '@/lib/orders';
import OrderRow from './_components/OrderRow';
import OrderDetail from './_components/OrderDetail';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/orders.css';

const FILTER_PARAM: Record<string, OrderFilter> = { devam: 'ACTIVE', teslim: 'DELIVERED', iade: 'RETURNS' };

function OrdersSkeleton() {
  return (
    <main id="main" className="orders-page" aria-busy="true" aria-label="Siparişler yükleniyor">
      <div className="orders-hero" aria-hidden="true">
        <span className="skeleton-block orders-skeleton__title" />
      </div>
      <div className="orders-layout" aria-hidden="true">
        <div className="orders-list-col">
          {[0, 1, 2].map((i) => <span key={i} className="skeleton-block orders-skeleton__row" />)}
        </div>
        <span className="skeleton-block orders-skeleton__detail" />
      </div>
    </main>
  );
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refreshUser } = useAuth();

  const [filter, setFilter] = useState<OrderFilter>(() => FILTER_PARAM[searchParams.get('filtre') ?? ''] ?? 'ALL');
  const [query, setQuery] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const selectedNumber = searchParams.get('siparis');

  useEffect(() => {
    if (loading || user) return;
    const back = `/siparislerim${window.location.search}`;
    router.replace(`/giris-yap?redirect=${encodeURIComponent(back)}`);
  }, [loading, user, router]);

  const orders = useMemo(() => (user?.orders ?? []) as Order[], [user]);
  const visible = useMemo(() => filterOrders(orders, filter, query), [orders, filter, query]);

  // Desktop shows the first visible order when none is chosen; phones show the list first.
  const explicit = selectedNumber ? orders.find((o) => o.orderNumber === selectedNumber) ?? null : null;
  const selected = explicit ?? visible[0] ?? null;

  if (loading || !user) return <OrdersSkeleton />;

  if (orders.length === 0) {
    return (
      <main id="main" className="orders-page orders-page--empty">
        <StatusPanel
          eyebrow="Siparişlerim"
          title="Henüz siparişiniz yok"
          actions={<Link href="/yeni-gelenler" className="btn btn--primary btn--lg">Yeni gelenlere git</Link>}
        >
          <p>Verdiğiniz siparişler; durum, kargo takibi ve iade seçenekleriyle burada listelenir.</p>
        </StatusPanel>
      </main>
    );
  }

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const deliveredCount = orders.filter((o) => o.status === 'TESLIM_EDILDI').length;
  const returnsCount = orders.filter((o) => o.returns && o.returns.length > 0).length;

  const filters: Array<{ key: OrderFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'Tümü', count: orders.length },
    { key: 'ACTIVE', label: 'Devam eden', count: activeCount },
    { key: 'DELIVERED', label: 'Teslim edilen', count: deliveredCount },
    ...(returnsCount > 0 ? [{ key: 'RETURNS' as const, label: 'İade talepli', count: returnsCount }] : []),
  ];

  return (
    <main id="main" className="orders-page">
      <header className="orders-hero">
        <nav aria-label="Konum" className="orders-crumb">
          <Link href="/hesabim">Hesabım</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Siparişlerim</span>
        </nav>
        <h1 className="orders-title">Siparişlerim</h1>
        <dl className="orders-stats">
          <div>
            <dt>Sipariş</dt>
            <dd>{orders.length}</dd>
          </div>
          <div>
            <dt>Devam eden</dt>
            <dd>{activeCount}</dd>
          </div>
          <div>
            <dt>Teslim edilen</dt>
            <dd>{deliveredCount}</dd>
          </div>
        </dl>
      </header>

      <div className={`orders-layout${selectedNumber ? ' has-selection' : ''}`}>
        <section className="orders-list-col" aria-labelledby="orders-list-title">
          <h2 id="orders-list-title" className="visually-hidden">Sipariş listesi</h2>
          <div className="orders-tools">
            <fieldset className="segments">
              <legend className="visually-hidden">Siparişleri filtrele</legend>
              {filters.map((f) => (
                <label key={f.key} className="segment">
                  <input type="radio" name="orders-filter" checked={filter === f.key} onChange={() => setFilter(f.key)} />
                  <span>
                    {f.label} <span className="segment__count">{f.count}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="orders-search">
              <label htmlFor="orders-search" className="visually-hidden">Sipariş numarası veya ürün adı ile ara</label>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
              <input
                id="orders-search"
                type="search"
                className="field__control"
                placeholder="Sipariş no veya ürün adı"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <p className="visually-hidden" role="status">{visible.length} sipariş gösteriliyor.</p>

          {visible.length > 0 ? (
            <ul className="orders-list">
              {visible.map((order, index) => (
                <OrderRow key={order.id} order={order} index={index} selected={selected?.id === order.id} />
              ))}
            </ul>
          ) : (
            <div className="orders-filter-empty">
              <p>Bu aramayla eşleşen sipariş yok.</p>
              <button
                type="button"
                className="btn btn--link"
                onClick={() => {
                  setFilter('ALL');
                  setQuery('');
                }}
              >
                Filtreleri temizle
              </button>
            </div>
          )}
        </section>

        <section className="orders-detail-col" aria-label="Sipariş ayrıntısı">
          {selectedNumber ? (
            <Link href="/siparislerim" scroll={false} className="orders-back">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              Tüm siparişler
            </Link>
          ) : null}
          {selectedNumber && !explicit ? (
            <StatusPanel headingLevel={2} title="Sipariş bulunamadı" actions={<Link href="/siparislerim" className="btn btn--secondary">Tüm siparişler</Link>}>
              <p>{selectedNumber} numaralı sipariş hesabınızda yok.</p>
            </StatusPanel>
          ) : selected ? (
            <OrderDetail
              key={selected.id}
              order={selected}
              onOpenReceipt={() => setReceiptOpen(true)}
              onRequestReturn={() => setReturnOpen(true)}
            />
          ) : null}
        </section>
      </div>

      <ReceiptDialog order={receiptOpen ? selected : null} onClose={() => setReceiptOpen(false)} />
      <ReturnDialog order={returnOpen ? selected : null} onClose={() => setReturnOpen(false)} onCreated={refreshUser} />
    </main>
  );
}

export default function SiparislerimPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}
