'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { carrierTrackingUrl, customerTrackingWhatsAppUrl } from '@/lib/orders';
import { money } from '../_lib/format';
import { downloadCsv } from '../_lib/csv';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';
import OrderStatus from '../_components/OrderStatus';
import OrderDetailDialog from '../_components/orders/OrderDetailDialog';
import PackingSlipDialog from '../_components/orders/PackingSlipDialog';
import TrackingDialog from '../_components/orders/TrackingDialog';
import { CARRIERS, statusLabel, type AdminOrder, type OrderPatch, type UpdateOrders } from '../_components/orders/types';

type StatusFilter = 'ALL' | 'PENDING_FULFILLMENT' | 'MISSING_TRACKING' | 'ODENDI' | 'HAZIRLANIYOR' | 'KARGODA' | 'TESLIM_EDILDI';
type DateFilter = 'ALL' | 'TODAY' | '7DAYS' | '30DAYS';

const PAGE_SIZES = [10, 15, 25, 50, 100] as const;
const DAY = 24 * 3600 * 1000;
const IN_FULFILLMENT = ['ODENDI', 'HAZIRLANIYOR', 'KARGODA'];

/** The single next step offered on each row; KARGODA without a code opens the tracking dialog instead. */
const NEXT_STEP: Record<string, { status: string; label: string } | undefined> = {
  ODENDI: { status: 'HAZIRLANIYOR', label: 'Hazırlamaya al' },
  HAZIRLANIYOR: { status: 'KARGODA', label: 'Kargoya ver' },
  KARGODA: { status: 'TESLIM_EDILDI', label: 'Teslim edildi' },
};

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const shortDateTime = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const includes = (value: string | null | undefined, needle: string) => Boolean(value && value.toLocaleLowerCase('tr-TR').includes(needle));

/** Siparişler ve sevkiyat. Loads its own orders from /api/admin/orders. */
export default function OrdersTab({ initialSearch = '' }: { initialSearch?: string }) {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [carrierFilter, setCarrierFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [priorityOpen, setPriorityOpen] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [slipOrders, setSlipOrders] = useState<AdminOrder[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { notice, success, error } = useTabNotice();
  const { ask, dialog } = useConfirm();

  useEffect(() => setSearch(initialSearch), [initialSearch]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setOrders(await loadJson<AdminOrder[]>('/api/admin/orders', 'Siparişler yüklenemedi.', Array.isArray));
    } catch (err) {
      setLoadError(errorText(err, 'Siparişler yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!copiedId) return;
    const timer = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  /** Every order mutation goes through here; the server's saved rows replace the local ones. */
  const updateOrders: UpdateOrders = useCallback(async (patch: OrderPatch, fallback: string) => {
    const data = await sendJson<{ orders?: AdminOrder[] }>('/api/admin/orders', 'PATCH', patch, fallback);
    const saved = Array.isArray(data.orders) ? data.orders : [];
    const byId = new Map(saved.map((order) => [order.id, order]));
    setOrders((current) => current?.map((order) => byId.get(order.id) ?? order) ?? null);
    return saved;
  }, []);

  const step = async (order: AdminOrder) => {
    const next = NEXT_STEP[order.status];
    if (!next) return;
    if (next.status === 'KARGODA' && !order.trackingCode) {
      setTrackingId(order.id);
      return;
    }
    if (busy.includes(order.id)) return;
    setBusy((current) => [...current, order.id]);
    try {
      await updateOrders({ orderId: order.id, status: next.status }, 'Durum güncellenemedi.');
      success(`#${order.orderNumber}: ${statusLabel(next.status)}.`);
    } catch (err) {
      error(`#${order.orderNumber}: ${errorText(err, 'Durum güncellenemedi.')}`);
    } finally {
      setBusy((current) => current.filter((id) => id !== order.id));
    }
  };

  const bulkStatus = (status: string) =>
    ask({
      title: `${selected.length} sipariş “${statusLabel(status)}” yapılsın mı?`,
      message:
        status === 'KARGODA' ? (
          <p>Takip numarası kayıtlı siparişlerin müşterilerine kargo e-postası gönderilir. Takip numarası olmayanlara e-posta gitmez.</p>
        ) : (
          <p>Seçili siparişlerin durumu değişir; bu işlem etkinlik kaydına yazılır.</p>
        ),
      confirmLabel: `Durumu değiştir (${selected.length})`,
      pendingLabel: 'Kaydediliyor',
      onConfirm: async () => {
        const saved = await updateOrders({ orderIds: selected, status }, 'Toplu durum güncellenemedi.');
        setSelected([]);
        success(`${saved.length} sipariş “${statusLabel(status)}” yapıldı.`);
      },
    });

  const copyCode = async (order: AdminOrder) => {
    try {
      await navigator.clipboard.writeText(order.trackingCode || '');
      setCopiedId(order.id);
    } catch {
      error('Takip numarası panoya kopyalanamadı.');
    }
  };

  const monthOptions = useMemo(() => {
    const months = new Map<string, { key: string; label: string; count: number }>();
    for (const order of orders ?? []) {
      const key = monthKey(order.createdAt);
      const entry = months.get(key);
      if (entry) entry.count += 1;
      else months.set(key, { key, label: monthLabel(order.createdAt), count: 1 });
    }
    return Array.from(months.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    const now = Date.now();
    const maxAge = dateFilter === 'TODAY' ? DAY : dateFilter === '7DAYS' ? 7 * DAY : dateFilter === '30DAYS' ? 30 * DAY : Infinity;
    return (orders ?? []).filter((o) => {
      if (statusFilter === 'PENDING_FULFILLMENT' && o.status !== 'ODENDI' && o.status !== 'HAZIRLANIYOR') return false;
      if (statusFilter === 'MISSING_TRACKING' && (o.trackingCode || !IN_FULFILLMENT.includes(o.status))) return false;
      if (!['ALL', 'PENDING_FULFILLMENT', 'MISSING_TRACKING'].includes(statusFilter) && o.status !== statusFilter) return false;
      if (carrierFilter !== 'ALL' && o.trackingCompany !== carrierFilter) return false;
      if (monthFilter !== 'ALL' && monthKey(o.createdAt) !== monthFilter) return false;
      if (now - new Date(o.createdAt).getTime() > maxAge) return false;
      if (!needle) return true;
      return (
        includes(o.orderNumber, needle) ||
        includes(o.customerName, needle) ||
        includes(o.customerPhone, needle) ||
        includes(o.shippingCity, needle) ||
        includes(o.shippingDistrict, needle) ||
        includes(o.trackingCode, needle) ||
        Boolean(o.items?.some((item) => includes(item.productName, needle)))
      );
    });
  }, [orders, search, statusFilter, carrierFilter, monthFilter, dateFilter]);

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setOrders(null); void load(); }} />;
  if (!orders) return <TabLoading label="Siparişler yükleniyor" />;

  const count = (status: string) => orders.filter((o) => o.status === status).length;
  const toPack = count('ODENDI');
  const toShip = count('HAZIRLANIYOR');
  const inTransit = count('KARGODA');
  const delivered = count('TESLIM_EDILDI');
  const missingTracking = orders.filter((o) => IN_FULFILLMENT.includes(o.status) && !o.trackingCode).length;
  const priority = orders.filter((o) => o.status === 'ODENDI');

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageOrders = filtered.slice(start, start + pageSize);
  const pageIds = pageOrders.map((o) => o.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someOnPage = pageIds.some((id) => selected.includes(id));

  const filterBy = (next: StatusFilter) => {
    setStatusFilter((current) => (current === next ? 'ALL' : next));
    setPage(1);
  };
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const exportCsv = () => {
    const target = selected.length ? orders.filter((o) => selected.includes(o.id)) : orders;
    downloadCsv(
      `pandiones-siparisler-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Sipariş No', 'Müşteri', 'E-posta', 'Telefon', 'Şehir', 'Tutar (TL)', 'Durum', 'Kargo firması', 'Takip numarası', 'Yönetici notu', 'Tarih'],
      target.map((o) => [
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
  };

  const detailOrder = detailId ? orders.find((o) => o.id === detailId) ?? null : null;
  const trackingOrder = trackingId ? orders.find((o) => o.id === trackingId) ?? null : null;

  const tiles: { filter: StatusFilter; count: number; label: string; hint: string; alert?: boolean }[] = [
    { filter: 'ODENDI', count: toPack, label: 'Hazırlanacak', hint: 'Ödemesi alındı, paketlenmeyi bekliyor' },
    { filter: 'HAZIRLANIYOR', count: toShip, label: 'Kargoya verilecek', hint: 'Paketlendi, kargo teslimi bekliyor' },
    { filter: 'KARGODA', count: inTransit, label: 'Kargoda', hint: 'Müşteriye doğru yolda' },
    { filter: 'MISSING_TRACKING', count: missingTracking, label: 'Takip numarası eksik', hint: 'Ödenmiş, numarası girilmemiş', alert: missingTracking > 0 },
  ];

  let lastMonth = '';

  return (
    <div className="adm-tab">
      <div className="adm-tasks">
        {tiles.map((tile) => (
          <button
            key={tile.filter}
            type="button"
            className="adm-task"
            data-empty={tile.count === 0}
            data-alert={tile.alert || undefined}
            aria-pressed={statusFilter === tile.filter}
            onClick={() => filterBy(tile.filter)}
          >
            <span className="adm-task__count">{tile.count}</span>
            <span className="adm-task__label">{tile.label}</span>
            <span className="adm-task__hint">{tile.hint}</span>
          </button>
        ))}
      </div>

      {priority.length > 0 ? (
        <section className="adm-card" aria-labelledby="priority-heading">
          <div className="adm-card__core adm-priority">
            <div className="adm-card__head">
              <div>
                <span className="adm-eyebrow">Öncelikli</span>
                <h2 id="priority-heading" className="adm-card__title">
                  Hazırlanacak {priority.length} sipariş
                </h2>
              </div>
              <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" aria-expanded={priorityOpen} aria-controls="priority-list" onClick={() => setPriorityOpen((v) => !v)}>
                {priorityOpen ? 'Gizle' : 'Göster'}
              </button>
            </div>
            <ul id="priority-list" className="adm-priority__list" hidden={!priorityOpen}>
              {priority.map((order) => (
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
                    <button type="button" className="adm-btn adm-btn--sm adm-btn--primary" disabled={busy.includes(order.id)} aria-busy={busy.includes(order.id)} onClick={() => step(order)}>
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
          </div>
        </section>
      ) : null}

      <div className="adm-toolbar adm-toolbar--stack">
        <div className="adm-segmented" role="group" aria-label="Sipariş durumu">
          {(
            [
              ['ALL', `Tümü (${orders.length})`],
              ['PENDING_FULFILLMENT', `Bekleyen (${toPack + toShip})`],
              ['ODENDI', `Ödendi (${toPack})`],
              ['HAZIRLANIYOR', `Hazırlanıyor (${toShip})`],
              ['KARGODA', `Kargoda (${inTransit})`],
              ['TESLIM_EDILDI', `Teslim edildi (${delivered})`],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="adm-toolbar__row">
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Sipariş no, müşteri, telefon, şehir, takip numarası veya ürün ara</span>
            <AdminIcon name="search" />
            <input
              type="search"
              placeholder="Sipariş no, müşteri, telefon, takip no"
              value={search}
              onChange={(e) => resetPage(setSearch)(e.target.value)}
            />
          </label>
          <label>
            <span className="visually-hidden">Kargo firması</span>
            <select className="adm-select" value={carrierFilter} onChange={(e) => resetPage(setCarrierFilter)(e.target.value)}>
              <option value="ALL">Tüm kargo firmaları</option>
              {CARRIERS.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Ay</span>
            <select className="adm-select" value={monthFilter} onChange={(e) => resetPage(setMonthFilter)(e.target.value)}>
              <option value="ALL">Tüm aylar</option>
              {monthOptions.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.label} ({month.count})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Zaman aralığı</span>
            <select className="adm-select" value={dateFilter} onChange={(e) => resetPage(setDateFilter)(e.target.value as DateFilter)}>
              <option value="ALL">Tüm zamanlar</option>
              <option value="TODAY">Son 24 saat</option>
              <option value="7DAYS">Son 7 gün</option>
              <option value="30DAYS">Son 30 gün</option>
            </select>
          </label>
          <button type="button" className="adm-btn" onClick={exportCsv} disabled={orders.length === 0}>
            <AdminIcon name="download" />
            <span>{selected.length ? `Seçilenleri CSV (${selected.length})` : 'CSV indir'}</span>
          </button>
        </div>
      </div>

      {notice}

      {orders.length === 0 ? (
        <p className="adm-empty">Henüz sipariş yok. Ödeme adımına geçen siparişler burada listelenir.</p>
      ) : filtered.length === 0 ? (
        <p className="adm-empty">Bu arama ve filtrelerle eşleşen sipariş yok.</p>
      ) : (
        <>
          <div className="adm-table-wrap">
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
                          setSelected((current) =>
                            e.target.checked ? Array.from(new Set([...current, ...pageIds])) : current.filter((id) => !pageIds.includes(id)),
                          )
                        }
                        aria-label="Bu sayfadaki tüm siparişleri seç"
                      />
                    </th>
                    <th scope="col">Sipariş</th>
                    <th scope="col">Müşteri</th>
                    <th scope="col">Ürünler</th>
                    <th scope="col" className="adm-num">Tutar</th>
                    <th scope="col">Durum</th>
                    <th scope="col">Kargo</th>
                    <th scope="col" className="adm-end">
                      <span className="visually-hidden">İşlem</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.map((order) => {
                    const month = monthLabel(order.createdAt);
                    const showMonth = month !== lastMonth;
                    lastMonth = month;
                    const isSelected = selected.includes(order.id);
                    const next = NEXT_STEP[order.status];
                    const trackingUrl = carrierTrackingUrl(order.trackingCompany, order.trackingCode);
                    const whatsappUrl = order.trackingCode
                      ? customerTrackingWhatsAppUrl({
                          customerPhone: order.customerPhone,
                          customerName: order.customerName,
                          orderNumber: order.orderNumber,
                          trackingCompany: order.trackingCompany,
                          trackingCode: order.trackingCode,
                        })
                      : null;
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
                              onChange={(e) => setSelected((current) => (e.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id)))}
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
                              {next ? (
                                <button
                                  type="button"
                                  className={`adm-btn adm-btn--sm ${next.status === 'KARGODA' ? 'adm-btn--primary' : ''}`}
                                  disabled={isBusy}
                                  aria-busy={isBusy}
                                  onClick={() => step(order)}
                                >
                                  {isBusy ? 'Kaydediliyor' : next.label}
                                  <span className="visually-hidden"> #{order.orderNumber}</span>
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td>
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
                                  <button type="button" className="adm-icon-btn" onClick={() => setTrackingId(order.id)} aria-label={`#${order.orderNumber} takip bilgisini düzenle`}>
                                    <AdminIcon name="edit" />
                                  </button>
                                  {whatsappUrl ? (
                                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="adm-btn adm-btn--sm adm-btn--quiet">
                                      WhatsApp<span className="visually-hidden">: #{order.orderNumber} takip numarasını gönder (yeni sekme)</span>
                                    </a>
                                  ) : null}
                                  {copiedId === order.id ? (
                                    <span className="adm-cell__sub" role="status">
                                      Kopyalandı
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setTrackingId(order.id)}>
                                <AdminIcon name="plus" />
                                <span>
                                  Takip no<span className="visually-hidden"> ekle: #{order.orderNumber}</span>
                                </span>
                              </button>
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
              {filtered.length} siparişten {start + 1}–{Math.min(start + pageSize, filtered.length)}
            </p>
            <div className="adm-pagination__controls">
              <label>
                <span>Sayfa başına</span>
                <select
                  className="adm-select adm-select--sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="adm-btn adm-btn--sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                Önceki
              </button>
              <span aria-current="page">
                {currentPage} / {pageCount}
              </span>
              <button type="button" className="adm-btn adm-btn--sm" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                Sonraki
              </button>
            </div>
          </nav>
        </>
      )}

      {selected.length > 0 ? (
        <div className="adm-dock" role="region" aria-label="Seçili siparişler">
          <span className="adm-dock__count">{selected.length} sipariş seçili</span>
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSlipOrders(orders.filter((o) => selected.includes(o.id)))}>
            <AdminIcon name="print" />
            <span>Depo fişi</span>
          </button>
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => bulkStatus('HAZIRLANIYOR')}>
            Hazırlanıyor
          </button>
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => bulkStatus('KARGODA')}>
            Kargoda
          </button>
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => bulkStatus('TESLIM_EDILDI')}>
            Teslim edildi
          </button>
          <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setSelected([])}>
            Seçimi kaldır
          </button>
        </div>
      ) : null}

      {detailOrder ? (
        <OrderDetailDialog order={detailOrder} updateOrders={updateOrders} onClose={() => setDetailId(null)} onPrint={(order) => {
            // One dialog at a time: the slip replaces the detail sheet.
            setDetailId(null);
            setSlipOrders([order]);
          }}
          onSaved={success} />
      ) : null}
      {trackingOrder ? (
        <TrackingDialog
          key={trackingOrder.id}
          order={trackingOrder}
          updateOrders={updateOrders}
          onClose={() => setTrackingId(null)}
          onSaved={(message) => {
            setTrackingId(null);
            success(message);
          }}
        />
      ) : null}
      {slipOrders ? <PackingSlipDialog orders={slipOrders} onClose={() => setSlipOrders(null)} /> : null}
      {dialog}
    </div>
  );
}
