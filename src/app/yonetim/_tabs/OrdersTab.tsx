'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { carrierTrackingUrl } from '@/lib/orders';
import { money } from '../_lib/format';
import { downloadCsv } from '../_lib/csv';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';
import OrderStatus from '../_components/OrderStatus';
import TrackingDialog, { type SavedTone } from '../_components/orders/TrackingDialog';
import {
  CARRIERS,
  allowedNext,
  isBackward,
  primaryNext,
  statusLabel,
  stepLabel,
  type AdminOrder,
  type OrderList,
  type OrderPatch,
  type PatchResult,
  type ShippingConfig,
  type UpdateOrders,
} from '../_components/orders/types';
import { shipmentStatusLabel } from '@/lib/shipping/statuses';

// Opened on demand; kept out of the tab's first load.
const OrderDetailDialog = dynamic(() => import('../_components/orders/OrderDetailDialog'), { ssr: false });
const PackingSlipDialog = dynamic(() => import('../_components/orders/PackingSlipDialog'), { ssr: false });
const TrackingImportDialog = dynamic(() => import('../_components/orders/TrackingImportDialog'), { ssr: false });
const ShippingLabelDialog = dynamic(() => import('../_components/orders/ShippingLabelDialog'), { ssr: false });

type Filters = { status: string; carrier: string; month: string; range: string; q: string; sort: string; page: number; size: number };

const DEFAULTS: Filters = { status: 'ALL', carrier: '', month: '', range: '', q: '', sort: 'new', page: 1, size: 15 };
const PAGE_SIZES = [10, 15, 25, 50, 100] as const;
const EXPORT_LIMIT = 2000;
const BULK_TARGETS = ['HAZIRLANIYOR', 'KARGODA', 'TESLIM_EDILDI'] as const;

/** Filters live in the address bar (`?tab=orders&status=…`), so a reload or a shared link opens the same list. */
function readFilters(initialSearch: string): Filters {
  const params = new URLSearchParams(window.location.search);
  const size = Number(params.get('size'));
  const page = Number(params.get('page'));
  return {
    status: params.get('status') || DEFAULTS.status,
    carrier: params.get('carrier') || '',
    month: params.get('month') || '',
    range: params.get('range') || '',
    q: initialSearch || params.get('q') || '',
    sort: params.get('sort') || DEFAULTS.sort,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULTS.size,
  };
}

function apiQuery(filters: Filters, overrides: Partial<Filters> = {}) {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (f.status !== 'ALL') params.set('status', f.status);
  if (f.carrier) params.set('carrier', f.carrier);
  if (f.month) params.set('month', f.month);
  if (f.range) params.set('range', f.range);
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.sort !== 'new') params.set('sort', f.sort);
  params.set('page', String(f.page));
  params.set('pageSize', String(f.size));
  return params;
}

function writeUrl(filters: Filters) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('tab', 'orders');
  for (const [key, value] of Object.entries(filters)) {
    if (value !== DEFAULTS[key as keyof Filters] && value !== '') url.searchParams.set(key, String(value));
  }
  window.history.replaceState(window.history.state, '', url.toString());
}

const monthLabel = (key: string) => new Date(`${key}-15T12:00:00+03:00`).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const shortDateTime = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Siparişler: server-side list, safe status steps, tracking import, detail with timeline. */
export default function OrdersTab({ initialSearch = '' }: { initialSearch?: string }) {
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [searchText, setSearchText] = useState('');
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<OrderList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [priority, setPriority] = useState<{ orders: AdminOrder[]; total: number } | null>(null);
  const [priorityOpen, setPriorityOpen] = useState(true);
  const [selected, setSelected] = useState<Map<string, AdminOrder>>(new Map());
  const [busy, setBusy] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<{ order: AdminOrder; ship: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [slipOrders, setSlipOrders] = useState<AdminOrder[] | null>(null);
  const [labelOrders, setLabelOrders] = useState<AdminOrder[] | null>(null);
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { notice, success, error } = useTabNotice();
  const { ask, dialog } = useConfirm();
  const notify = useCallback((message: string, tone: SavedTone) => (tone === 'success' ? success(message) : error(message)), [success, error]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Read the address bar once on mount (and when the command palette sends a search).
  useEffect(() => {
    const initial = readFilters(initialSearch);
    setFilters(initial);
    setSearchText(initial.q);
    setReady(true);
  }, [initialSearch]);

  // Debounced search box → filters.
  useEffect(() => {
    if (!ready || searchText === filters.q) return;
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, q: searchText, page: 1 })), 300);
    return () => window.clearTimeout(timer);
  }, [searchText, filters.q, ready]);

  useEffect(() => {
    if (ready) writeUrl(filters);
  }, [filters, ready]);

  // The page of orders; a newer request cancels the one in flight, the old table stays until it lands.
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    fetch(`/api/admin/orders?${apiQuery(filters)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(data?.orders)) throw new Error(data?.error || 'Siparişler yüklenemedi.');
        setList(data);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError(errorText(err, 'Siparişler yüklenemedi.'));
        setLoading(false);
      });
    return () => controller.abort();
  }, [filters, reloadKey, ready]);

  // PTT mode and the label sender; read once (Ayarlar changes apply on the next visit).
  useEffect(() => {
    loadJson<ShippingConfig>('/api/admin/shipments/config', 'Kargo ayarları yüklenemedi.', (body) => Boolean((body as ShippingConfig | null)?.ptt))
      .then(setShippingConfig)
      .catch(() => setShippingConfig(null));
  }, []);

  // Paid orders waiting to be prepared, oldest first.
  useEffect(() => {
    if (!ready) return;
    loadJson<OrderList>('/api/admin/orders?status=ODENDI&sort=old&pageSize=25', 'Öncelikli siparişler yüklenemedi.', (body) => Array.isArray((body as OrderList | null)?.orders))
      .then((data) => setPriority({ orders: data.orders, total: data.total }))
      .catch(() => setPriority(null));
  }, [reloadKey, ready]);

  useEffect(() => {
    if (!copiedId) return;
    const timer = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'page' ? {} : { page: 1 }) }));

  /** Every order mutation goes through here: saved rows replace local ones, then counts and filters refresh. */
  const updateOrders: UpdateOrders = useCallback(async (patch: OrderPatch, fallback: string) => {
    const data = await sendJson<Partial<PatchResult>>('/api/admin/orders', 'PATCH', patch, fallback);
    const result: PatchResult = { orders: data.orders ?? [], skipped: data.skipped ?? [], emails: data.emails ?? { sent: [], failed: [] } };
    const byId = new Map(result.orders.map((order) => [order.id, order]));
    setList((current) => (current ? { ...current, orders: current.orders.map((order) => byId.get(order.id) ?? order) } : current));
    setSelected((current) => {
      if (!result.orders.some((order) => current.has(order.id))) return current;
      const next = new Map(current);
      for (const order of result.orders) if (next.has(order.id)) next.set(order.id, order);
      return next;
    });
    setReloadKey((value) => value + 1);
    return result;
  }, []);

  const reportPatch = (result: PatchResult, done: string) => {
    if (result.skipped.length || result.emails.failed.length) {
      const parts = [done];
      if (result.skipped.length) parts.push(`Atlanan: ${result.skipped.map((item) => `#${item.orderNumber} (${item.reason})`).join(', ')}`);
      if (result.emails.failed.length) parts.push(`Kargo e-postası gönderilemeyen: ${result.emails.failed.map((no) => `#${no}`).join(', ')}`);
      error(parts.join(' · '));
    } else success(done);
  };

  const step = async (order: AdminOrder, next: string) => {
    if (next === 'KARGODA' && !order.trackingCode) {
      setTracking({ order, ship: true });
      return;
    }
    const go = async () => {
      setBusy((current) => [...current, order.id]);
      try {
        const result = await updateOrders({ orderId: order.id, status: next }, 'Durum güncellenemedi.');
        reportPatch(result, `#${order.orderNumber}: ${statusLabel(next)}.`);
      } catch (err) {
        error(`#${order.orderNumber}: ${errorText(err, 'Durum güncellenemedi.')}`);
      } finally {
        setBusy((current) => current.filter((id) => id !== order.id));
      }
    };
    if (busy.includes(order.id)) return;
    if (isBackward(order.status, next)) {
      ask({
        title: `#${order.orderNumber} geri alınsın mı?`,
        message: <p>Durum {statusLabel(order.status)} → {statusLabel(next)} olur. Bu değişiklik etkinlik kaydına yazılır.</p>,
        confirmLabel: 'Geri al',
        pendingLabel: 'Kaydediliyor',
        danger: true,
        onConfirm: go,
      });
      return;
    }
    await go();
  };

  const bulkStatus = (target: string) => {
    const orders = [...selected.values()];
    const eligible = orders.filter((order) => (allowedNext(order.status) as readonly string[]).includes(target) && (target !== 'KARGODA' || order.trackingCode));
    const skipped = orders.length - eligible.length;
    ask({
      title: `${eligible.length} sipariş “${statusLabel(target)}” yapılsın mı?`,
      message: (
        <>
          {skipped ? <p>{skipped} sipariş bu duruma geçemez (ör. takip numarası yok ya da durum izin vermiyor) ve atlanacak.</p> : null}
          {target === 'KARGODA' ? <p>Müşterilere takip numaralı kargo e-postası gönderilir; gönderilemeyenler size bildirilir.</p> : <p>Değişiklik etkinlik kaydına yazılır.</p>}
        </>
      ),
      confirmLabel: `Durumu değiştir (${eligible.length})`,
      pendingLabel: 'Kaydediliyor',
      onConfirm: async () => {
        if (!eligible.length) throw new Error('Seçili siparişlerden hiçbiri bu duruma geçemez.');
        const result = await updateOrders({ orderIds: orders.map((order) => order.id), status: target }, 'Toplu durum güncellenemedi.');
        setSelected(new Map());
        reportPatch(result, `${result.orders.length} sipariş “${statusLabel(target)}” yapıldı.`);
      },
    });
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      let rows: AdminOrder[] = [...selected.values()];
      let truncated = false;
      if (!rows.length) {
        for (let page = 1; rows.length < EXPORT_LIMIT; page += 1) {
          const data = await loadJson<OrderList>(`/api/admin/orders?${apiQuery(filters, { page, size: 100 })}`, 'Siparişler indirilemedi.', (body) => Array.isArray((body as OrderList | null)?.orders));
          rows = rows.concat(data.orders);
          if (rows.length >= data.total || data.orders.length === 0) break;
          if (rows.length >= EXPORT_LIMIT) truncated = true;
        }
      }
      downloadCsv(
        `pandiones-siparisler-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Sipariş No', 'Müşteri', 'E-posta', 'Telefon', 'Şehir', 'Tutar (TL)', 'Durum', 'Kargo firması', 'Takip numarası', 'Yönetici notu', 'Tarih'],
        rows.slice(0, EXPORT_LIMIT).map((o) => [
          o.orderNumber,
          o.customerName,
          o.customerEmail,
          o.customerPhone,
          `${o.shippingDistrict} / ${o.shippingCity}`,
          o.totalAmount,
          statusLabel(o.status),
          o.trackingCompany,
          o.trackingCode,
          o.adminNotes,
          new Date(o.createdAt).toLocaleDateString('tr-TR'),
        ]),
      );
      if (truncated) error(`CSV ilk ${EXPORT_LIMIT} siparişi içeriyor; tümü için filtreyi daraltın.`);
    } catch (err) {
      error(errorText(err, 'Siparişler indirilemedi.'));
    } finally {
      setExporting(false);
    }
  };

  const copyCode = async (order: AdminOrder) => {
    try {
      await navigator.clipboard.writeText(order.trackingCode || '');
      setCopiedId(order.id);
    } catch {
      error('Takip numarası panoya kopyalanamadı.');
    }
  };

  if (!list && loadError) return <TabLoadError message={loadError} onRetry={() => setReloadKey((v) => v + 1)} />;
  if (!list) return <TabLoading label="Siparişler yükleniyor" />;

  const counts = list.counts;
  const pageCount = Math.max(1, Math.ceil(list.total / list.pageSize));
  const start = (list.page - 1) * list.pageSize;
  const pageIds = list.orders.map((o) => o.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));
  const filtered = filters.status !== 'ALL' || filters.carrier || filters.month || filters.range || filters.q;

  const tiles = [
    { status: 'ODENDI', count: counts.ODENDI ?? 0, label: 'Hazırlanacak', hint: 'Ödemesi alındı, paketlenmeyi bekliyor' },
    { status: 'HAZIRLANIYOR', count: counts.HAZIRLANIYOR ?? 0, label: 'Kargoya verilecek', hint: 'Paketlendi, kargo teslimi bekliyor' },
    { status: 'KARGODA', count: counts.KARGODA ?? 0, label: 'Kargoda', hint: 'Müşteriye doğru yolda' },
    { status: 'MISSING_TRACKING', count: counts.missingTracking ?? 0, label: 'Takip numarası eksik', hint: 'Ödenmiş, numarası girilmemiş', alert: (counts.missingTracking ?? 0) > 0 },
  ];
  const segments: [string, string][] = [
    ['ALL', `Tümü (${counts.all ?? 0})`],
    ['PENDING_FULFILLMENT', `Bekleyen (${(counts.ODENDI ?? 0) + (counts.HAZIRLANIYOR ?? 0)})`],
    ['ODENDI', `Ödendi (${counts.ODENDI ?? 0})`],
    ['HAZIRLANIYOR', `Hazırlanıyor (${counts.HAZIRLANIYOR ?? 0})`],
    ['KARGODA', `Kargoda (${counts.KARGODA ?? 0})`],
    ['TESLIM_EDILDI', `Teslim edildi (${counts.TESLIM_EDILDI ?? 0})`],
    ['ODEME_BEKLENIYOR', `Ödeme bekleyen (${counts.ODEME_BEKLENIYOR ?? 0})`],
    ...(counts.labelPending ? ([['LABEL_NOT_PRINTED', `Etiketi basılmamış (${counts.labelPending})`]] as [string, string][]) : []),
    ...(counts.deliveryFailed ? ([['DELIVERY_FAILED', `Teslim edilemeyen (${counts.deliveryFailed})`]] as [string, string][]) : []),
    ...(counts.IADE_EDILDI ? ([['IADE_EDILDI', `İade edildi (${counts.IADE_EDILDI})`]] as [string, string][]) : []),
  ];
  const selectedOrders = [...selected.values()];
  let lastMonth = '';

  return (
    <div className="adm-tab">
      <div className="adm-tasks">
        {tiles.map((tile) => (
          <button
            key={tile.status}
            type="button"
            className="adm-task"
            data-empty={tile.count === 0}
            data-alert={tile.alert || undefined}
            aria-pressed={filters.status === tile.status}
            onClick={() => setFilter('status', filters.status === tile.status ? 'ALL' : tile.status)}
          >
            <span className="adm-task__count">{tile.count}</span>
            <span className="adm-task__label">{tile.label}</span>
            <span className="adm-task__hint">{tile.hint}</span>
          </button>
        ))}
      </div>

      {priority && priority.total > 0 ? (
        <section className="adm-card" aria-labelledby="priority-heading">
          <div className="adm-card__core adm-priority">
            <div className="adm-card__head">
              <div>
                <span className="adm-eyebrow">Öncelikli · en eski önce</span>
                <h2 id="priority-heading" className="adm-card__title">
                  Hazırlanacak {priority.total} sipariş
                </h2>
              </div>
              <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" aria-expanded={priorityOpen} aria-controls="priority-list" onClick={() => setPriorityOpen((v) => !v)}>
                {priorityOpen ? 'Gizle' : 'Göster'}
              </button>
            </div>
            <div id="priority-list" hidden={!priorityOpen}>
              <ul className="adm-priority__list">
                {priority.orders.map((order) => (
                  <li key={order.id} className="adm-priority__item">
                    <div className="adm-cell">
                      <span className="adm-cell__main">
                        #{order.orderNumber} · {order.customerName}
                      </span>
                      <span className="adm-cell__sub">
                        {shortDateTime(order.createdAt)} · {order.shippingDistrict} / {order.shippingCity} · {order.items?.length ?? 0} ürün · {money(order.totalAmount)}
                      </span>
                      {order.adminNotes ? <span className="adm-cell__sub adm-note">Not: {order.adminNotes}</span> : null}
                    </div>
                    <div className="adm-actions">
                      <button type="button" className="adm-btn adm-btn--sm adm-btn--primary" disabled={busy.includes(order.id)} aria-busy={busy.includes(order.id)} onClick={() => step(order, 'HAZIRLANIYOR')}>
                        {busy.includes(order.id) ? 'Kaydediliyor' : 'Hazırlamaya al'}
                        <span className="visually-hidden"> #{order.orderNumber}</span>
                      </button>
                      <button type="button" className="adm-btn adm-btn--sm" onClick={() => setDetailId(order.id)}>
                        Detay<span className="visually-hidden"> #{order.orderNumber}</span>
                      </button>
                      <button type="button" className="adm-icon-btn" onClick={() => setSlipOrders([order])} aria-label={`#${order.orderNumber} depo fişi`}>
                        <AdminIcon name="print" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {priority.total > priority.orders.length ? (
                <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setFilters({ ...DEFAULTS, status: 'ODENDI', sort: 'old' })}>
                  Tümünü listede göster ({priority.total})
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="adm-toolbar adm-toolbar--stack">
        <div className="adm-segmented" role="group" aria-label="Sipariş durumu">
          {segments.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filters.status === value} onClick={() => setFilter('status', value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="adm-toolbar__row">
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Sipariş no, müşteri, e-posta, telefon, şehir, takip numarası veya ürün ara</span>
            <AdminIcon name="search" />
            <input type="search" placeholder="Sipariş no, müşteri, telefon, takip no, ürün" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </label>
          <label>
            <span className="visually-hidden">Kargo firması</span>
            <select className="adm-select" value={filters.carrier} onChange={(e) => setFilter('carrier', e.target.value)}>
              <option value="">Tüm kargo firmaları</option>
              {CARRIERS.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Ay</span>
            <select className="adm-select" value={filters.month} onChange={(e) => setFilter('month', e.target.value)}>
              <option value="">Tüm aylar</option>
              {list.months.map((month) => (
                <option key={month.key} value={month.key}>
                  {monthLabel(month.key)} ({month.count})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Zaman aralığı</span>
            <select className="adm-select" value={filters.range} onChange={(e) => setFilter('range', e.target.value)}>
              <option value="">Tüm zamanlar</option>
              <option value="24h">Son 24 saat</option>
              <option value="7d">Son 7 gün</option>
              <option value="30d">Son 30 gün</option>
            </select>
          </label>
          <label>
            <span className="visually-hidden">Sıralama</span>
            <select className="adm-select" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
              <option value="new">En yeni</option>
              <option value="old">En eski</option>
              <option value="total">En yüksek tutar</option>
            </select>
          </label>
        </div>
        <div className="adm-toolbar__row adm-toolbar__row--end">
          {filtered ? (
            <button
              type="button"
              className="adm-btn adm-btn--sm adm-btn--quiet"
              onClick={() => {
                setFilters(DEFAULTS);
                setSearchText('');
              }}
            >
              Filtreleri temizle
            </button>
          ) : null}
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => setImporting(true)}>
            <AdminIcon name="plus" />
            <span>Toplu kargo yükle</span>
          </button>
          <button type="button" className="adm-btn adm-btn--sm" onClick={exportCsv} disabled={exporting || list.total === 0} aria-busy={exporting}>
            <AdminIcon name="download" />
            <span>{exporting ? 'Hazırlanıyor' : selected.size ? `Seçilenleri CSV (${selected.size})` : `CSV indir (${list.total})`}</span>
          </button>
        </div>
      </div>

      {notice}

      <div className="adm-list-state" aria-live="polite">
        {loading ? <span className="adm-progress" role="status"><span className="visually-hidden">Liste güncelleniyor</span></span> : null}
        {loadError ? (
          <p className="adm-notice adm-notice--error" role="alert">
            <span>{loadError}</span>
            <button type="button" className="adm-btn adm-btn--sm" onClick={() => setReloadKey((v) => v + 1)}>
              Tekrar dene
            </button>
          </p>
        ) : null}
      </div>

      {list.total === 0 ? (
        <p className="adm-empty">{filtered ? 'Bu arama ve filtrelerle eşleşen sipariş yok.' : 'Henüz sipariş yok. Ödeme adımına geçen siparişler burada listelenir.'}</p>
      ) : (
        <>
          <div className="adm-table-wrap" ref={tableRef} aria-busy={loading}>
            <div className="adm-table-scroll">
              <table className="adm-table adm-orders-table">
                <thead>
                  <tr>
                    <th scope="col" className="adm-check">
                      <input
                        type="checkbox"
                        checked={allOnPage}
                        ref={(el) => {
                          if (el) el.indeterminate = !allOnPage && someOnPage;
                        }}
                        onChange={(e) =>
                          setSelected((current) => {
                            const next = new Map(current);
                            for (const order of list.orders) {
                              if (e.target.checked) next.set(order.id, order);
                              else next.delete(order.id);
                            }
                            return next;
                          })
                        }
                        aria-label="Bu sayfadaki tüm siparişleri seç"
                      />
                    </th>
                    <th scope="col">Sipariş</th>
                    <th scope="col">Müşteri</th>
                    <th scope="col">Ürünler</th>
                    <th scope="col" className="adm-num">
                      Tutar
                    </th>
                    <th scope="col">Durum</th>
                    <th scope="col">Kargo</th>
                    <th scope="col" className="adm-end">
                      <span className="visually-hidden">İşlem</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.orders.map((order) => {
                    const month = new Date(order.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                    const showMonth = filters.sort !== 'total' && month !== lastMonth;
                    lastMonth = month;
                    const isSelected = selected.has(order.id);
                    const primary = primaryNext(order.status);
                    const secondary = allowedNext(order.status).filter((next) => next !== primary);
                    const trackingUrl = carrierTrackingUrl(order.trackingCompany, order.trackingCode);
                    const isBusy = busy.includes(order.id);
                    return (
                      <React.Fragment key={order.id}>
                        {showMonth ? (
                          <tr className="adm-table__group">
                            <td colSpan={8}>{month}</td>
                          </tr>
                        ) : null}
                        <tr data-selected={isSelected || undefined}>
                          <td className="adm-check">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelected((current) => {
                                  const next = new Map(current);
                                  if (e.target.checked) next.set(order.id, order);
                                  else next.delete(order.id);
                                  return next;
                                })
                              }
                              aria-label={`#${order.orderNumber} seç`}
                            />
                          </td>
                          <td>
                            <div className="adm-cell">
                              <button type="button" className="adm-link adm-cell__main" onClick={() => setDetailId(order.id)}>
                                #{order.orderNumber}
                              </button>
                              <span className="adm-cell__sub">{shortDateTime(order.createdAt)}</span>
                              {order.adminNotes ? (
                                <span className="adm-cell__sub adm-note" title={order.adminNotes}>
                                  Not: {order.adminNotes.length > 24 ? `${order.adminNotes.slice(0, 24)}…` : order.adminNotes}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className="adm-cell">
                              <span className="adm-cell__main">{order.customerName}</span>
                              <span className="adm-cell__sub">
                                {order.shippingDistrict} / {order.shippingCity}
                              </span>
                              <span className="adm-cell__sub">{order.customerPhone}</span>
                            </div>
                          </td>
                          <td>
                            <ul className="adm-order-items">
                              {order.items?.map((item) => (
                                <li key={item.id}>
                                  <span className="adm-order-items__thumb" aria-hidden="true">
                                    {item.product?.image ? <img src={item.product.image} alt="" loading="lazy" /> : null}
                                  </span>
                                  <span className="adm-cell">
                                    <span>{item.productName}</span>
                                    <span className="adm-cell__sub">
                                      {item.size} × {item.quantity}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="adm-num">
                            <div className="adm-cell">
                              <span className="adm-cell__main">{money(order.totalAmount)}</span>
                              {order.couponCode ? <span className="adm-cell__sub">{order.couponCode}</span> : null}
                            </div>
                          </td>
                          <td>
                            <div className="adm-cell adm-cell--gap">
                              <OrderStatus status={order.status} />
                              {primary ? (
                                <button
                                  type="button"
                                  className={`adm-btn adm-btn--sm ${primary === 'KARGODA' ? 'adm-btn--primary' : ''}`}
                                  disabled={isBusy}
                                  aria-busy={isBusy}
                                  onClick={() => step(order, primary)}
                                >
                                  {isBusy ? 'Kaydediliyor' : stepLabel(order.status, primary)}
                                  <span className="visually-hidden"> #{order.orderNumber}</span>
                                </button>
                              ) : null}
                              {secondary.map((next) => (
                                <button key={next} type="button" className="adm-link adm-cell__sub" disabled={isBusy} onClick={() => step(order, next)}>
                                  {stepLabel(order.status, next)}
                                  <span className="visually-hidden"> #{order.orderNumber}</span>
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            {order.shipments?.[0] ? (
                              <div className="adm-ship-chip">
                                <span className={`adm-status adm-status--${['TESLIM_EDILEMEDI', 'IADE'].includes(order.shipments[0].status) ? 'danger' : order.shipments[0].status === 'ETIKET_HAZIR' ? 'warning' : 'success'}`}>
                                  PTT · {shipmentStatusLabel(order.shipments[0].status)}
                                </span>
                                {!order.shipments[0].barcode ? <span className="adm-cell__sub">Barkod bekleniyor</span> : null}
                                {order.shipments[0].status === 'ETIKET_HAZIR' && !order.shipments[0].labelPrintedAt ? <span className="adm-cell__sub">Etiket basılmadı</span> : null}
                                <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setLabelOrders([order])} disabled={!shippingConfig}>
                                  <AdminIcon name="print" />
                                  <span>
                                    Etiket<span className="visually-hidden"> #{order.orderNumber}</span>
                                  </span>
                                </button>
                              </div>
                            ) : null}
                            {order.trackingCode ? (
                              <div className="adm-cell adm-cell--gap">
                                <span className="adm-code">
                                  {order.trackingCompany || 'Kargo'} · {order.trackingCode}
                                </span>
                                <div className="adm-actions adm-actions--start">
                                  <button type="button" className="adm-icon-btn" onClick={() => copyCode(order)} aria-label={`#${order.orderNumber} takip numarasını kopyala`}>
                                    <AdminIcon name="copy" />
                                  </button>
                                  {trackingUrl ? (
                                    <a href={trackingUrl} target="_blank" rel="noreferrer" className="adm-icon-btn" aria-label={`#${order.orderNumber} kargo takip sayfası (yeni sekme)`}>
                                      <AdminIcon name="arrow" />
                                    </a>
                                  ) : null}
                                  <button type="button" className="adm-icon-btn" onClick={() => setTracking({ order, ship: false })} aria-label={`#${order.orderNumber} takip bilgisini düzenle`}>
                                    <AdminIcon name="edit" />
                                  </button>
                                  {copiedId === order.id ? (
                                    <span className="adm-cell__sub" role="status">
                                      Kopyalandı
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : order.shipments?.[0] ? null : ['ODENDI', 'HAZIRLANIYOR'].includes(order.status) ? (
                              <div className="adm-actions adm-actions--start">
                                <button type="button" className="adm-btn adm-btn--sm" onClick={() => setDetailId(order.id)}>
                                  PTT gönderisi<span className="visually-hidden"> oluştur: #{order.orderNumber}</span>
                                </button>
                                <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setTracking({ order, ship: false })}>
                                  <AdminIcon name="plus" />
                                  <span>
                                    Takip no<span className="visually-hidden"> ekle: #{order.orderNumber}</span>
                                  </span>
                                </button>
                              </div>
                            ) : ['KARGODA', 'TESLIM_EDILDI'].includes(order.status) ? (
                              <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setTracking({ order, ship: false })}>
                                <AdminIcon name="plus" />
                                <span>
                                  Takip no<span className="visually-hidden"> ekle: #{order.orderNumber}</span>
                                </span>
                              </button>
                            ) : (
                              <span className="adm-cell__sub">—</span>
                            )}
                          </td>
                          <td className="adm-end">
                            <div className="adm-actions">
                              <button type="button" className="adm-btn adm-btn--sm" onClick={() => setDetailId(order.id)}>
                                Detay<span className="visually-hidden"> #{order.orderNumber}</span>
                              </button>
                              <button type="button" className="adm-icon-btn" onClick={() => setSlipOrders([order])} aria-label={`#${order.orderNumber} depo fişi`}>
                                <AdminIcon name="print" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <nav className="adm-pagination" aria-label="Sipariş sayfaları">
            <p>
              {list.total} siparişten {start + 1}–{Math.min(start + list.pageSize, list.total)}
            </p>
            <div className="adm-pagination__controls">
              <label>
                <span>Sayfa başına</span>
                <select className="adm-select adm-select--sm" value={filters.size} onChange={(e) => setFilter('size', Number(e.target.value))}>
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="adm-btn adm-btn--sm"
                disabled={list.page <= 1 || loading}
                onClick={() => {
                  setFilter('page', list.page - 1);
                  tableRef.current?.scrollIntoView({ block: 'start' });
                }}
              >
                Önceki
              </button>
              <span aria-current="page">
                {list.page} / {pageCount}
              </span>
              <button
                type="button"
                className="adm-btn adm-btn--sm"
                disabled={list.page >= pageCount || loading}
                onClick={() => {
                  setFilter('page', list.page + 1);
                  tableRef.current?.scrollIntoView({ block: 'start' });
                }}
              >
                Sonraki
              </button>
            </div>
          </nav>
        </>
      )}

      {selected.size > 0 ? (
        <div className="adm-dock" role="region" aria-label="Seçili siparişler">
          <span className="adm-dock__count">{selected.size} sipariş seçili</span>
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => setLabelOrders(selectedOrders)} disabled={!shippingConfig || !selectedOrders.some((order) => order.shipments?.[0])}>
            <AdminIcon name="print" />
            <span>Kargo etiketi ({selectedOrders.filter((order) => order.shipments?.[0]).length})</span>
          </button>
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSlipOrders(selectedOrders)}>
            <AdminIcon name="print" />
            <span>Depo fişi</span>
          </button>
          {BULK_TARGETS.map((target) => {
            const eligible = selectedOrders.filter((order) => allowedNext(order.status).includes(target) && (target !== 'KARGODA' || order.trackingCode)).length;
            return (
              <button key={target} type="button" className="adm-btn adm-btn--sm" disabled={eligible === 0} onClick={() => bulkStatus(target)}>
                {statusLabel(target)} ({eligible})
              </button>
            );
          })}
          <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setSelected(new Map())}>
            Seçimi kaldır
          </button>
        </div>
      ) : null}

      {detailId ? (
        <OrderDetailDialog
          orderId={detailId}
          updateOrders={updateOrders}
          onClose={() => setDetailId(null)}
          onPrint={(order) => {
            // One dialog at a time: the slip replaces the detail sheet.
            setDetailId(null);
            setSlipOrders([order]);
          }}
          onNotify={notify}
          shippingConfig={shippingConfig}
          onShipmentChanged={() => setReloadKey((v) => v + 1)}
          onPrintLabel={(order) => {
            setDetailId(null);
            setLabelOrders([order]);
          }}
        />
      ) : null}
      {tracking ? (
        <TrackingDialog
          key={tracking.order.id}
          order={tracking.order}
          shipByDefault={tracking.ship}
          updateOrders={updateOrders}
          onClose={() => setTracking(null)}
          onSaved={(message, tone) => {
            setTracking(null);
            notify(message, tone);
          }}
        />
      ) : null}
      {importing ? (
        <TrackingImportDialog
          onClose={() => setImporting(false)}
          onApplied={(message, tone) => {
            notify(message, tone);
            setReloadKey((v) => v + 1);
          }}
        />
      ) : null}
      {slipOrders ? <PackingSlipDialog orders={slipOrders} onClose={() => setSlipOrders(null)} /> : null}
      {labelOrders && shippingConfig ? (
        <ShippingLabelDialog orders={labelOrders} config={shippingConfig} onClose={() => setLabelOrders(null)} onPrinted={() => setReloadKey((v) => v + 1)} />
      ) : null}
      {dialog}
    </div>
  );
}
