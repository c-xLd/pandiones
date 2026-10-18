'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { money } from '../_lib/format';
import { downloadCsv } from '../_lib/csv';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import OrderStatus from '../_components/OrderStatus';
import AdminIcon from '../_components/AdminIcon';

type Address = { id: string; title: string; recipient: string; city: string; district: string; address: string; phone: string; isDefault: boolean };
type CustomerOrder = { id: string; orderNumber: string; totalAmount: number; status: string; createdAt: string };
type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'STAFF';
  twoFactor: boolean;
  createdAt: string;
  totalOrdersCount: number;
  paidOrdersCount: number;
  totalSpent: number;
  lastOrderAt?: string | null;
  lastOrderNumber?: string | null;
  wishlistCount: number;
  addresses: Address[];
  recentOrders: CustomerOrder[];
};

const day = (value: string) => new Date(value).toLocaleDateString('tr-TR');
const includes = (value: string | null | undefined, needle: string) => Boolean(value && value.toLocaleLowerCase('tr-TR').includes(needle));

export default function CustomersTab({ onNavigateOrder }: { onNavigateOrder?: (orderNumber: string) => void }) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  // Panel access (admin only): make a customer staff, or staff a customer again; asked once more before it applies.
  const [roleConfirm, setRoleConfirm] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setCustomers(await loadJson<Customer[]>('/api/admin/customers', 'Müşteriler yüklenemedi.', Array.isArray));
    } catch (err) {
      setLoadError(errorText(err, 'Müşteriler yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openProfile = (customer: Customer | null) => {
    setSelected(customer);
    setRoleConfirm(false);
    setRoleError(null);
    setRoleNotice(null);
  };

  const changeRole = async (customer: Customer) => {
    if (roleSaving) return;
    const next = customer.role === 'STAFF' ? 'CUSTOMER' : 'STAFF';
    setRoleSaving(true);
    setRoleError(null);
    try {
      await sendJson('/api/admin/customers', 'PATCH', { userId: customer.id, role: next }, 'Rol değiştirilemedi.');
      const updated = { ...customer, role: next } as Customer;
      setCustomers((list) => (list ? list.map((c) => (c.id === customer.id ? updated : c)) : list));
      setSelected(updated);
      setRoleConfirm(false);
      setRoleNotice(next === 'STAFF'
        ? `${customer.name} artık personel. Açık oturumları kapatıldı; /yonetim/giris adresinden iki adımlı doğrulamayla giriş yapacak.`
        : `${customer.name} artık müşteri. Panel erişimi ve açık oturumları kapatıldı.`);
    } catch (err) {
      setRoleError(errorText(err, 'Rol değiştirilemedi.'));
    } finally {
      setRoleSaving(false);
    }
  };

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setCustomers(null); void load(); }} />;
  if (!customers) return <TabLoading label="Müşteriler yükleniyor" />;

  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const visible = needle ? customers.filter((c) => includes(c.name, needle) || includes(c.email, needle) || includes(c.phone, needle)) : customers;

  const exportCsv = () =>
    downloadCsv(
      `pandiones-musteriler-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Müşteri No', 'Ad Soyad', 'E-posta', 'Telefon', 'Kayıt tarihi', 'Ödenen sipariş', 'Toplam harcama (TL)', 'Son sipariş tarihi'],
      customers.map((c) => [c.id, c.name, c.email, c.phone, day(c.createdAt), c.paidOrdersCount, c.totalSpent, c.lastOrderAt ? day(c.lastOrderAt) : '']),
    );

  return (
    <div className="adm-tab">
      {customers.length > 0 ? (
        <div className="adm-toolbar">
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Ad, e-posta veya telefon ara</span>
            <AdminIcon name="search" />
            <input type="search" placeholder="Ad, e-posta veya telefon" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="adm-toolbar__end">
            <button type="button" className="adm-btn" onClick={exportCsv}>
              <AdminIcon name="download" />
              <span>CSV indir</span>
            </button>
          </div>
        </div>
      ) : null}

      {customers.length === 0 ? (
        <p className="adm-empty">Henüz kayıtlı müşteri yok.</p>
      ) : visible.length === 0 ? (
        <p className="adm-empty">“{search}” ile eşleşen müşteri yok.</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <caption>{needle ? `${visible.length} / ${customers.length} müşteri` : `${customers.length} müşteri`}</caption>
              <thead>
                <tr>
                  <th scope="col">Müşteri</th>
                  <th scope="col">Kayıt</th>
                  <th scope="col" className="adm-num">Ödenen sipariş</th>
                  <th scope="col" className="adm-num">Toplam harcama</th>
                  <th scope="col">Son sipariş</th>
                  <th scope="col" className="adm-num">Favori</th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">Profil</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="adm-cell">
                        <span className="adm-cell__main">
                          {customer.name} {customer.role === 'STAFF' ? <span className="adm-status adm-status--muted">Personel</span> : null}
                        </span>
                        <span className="adm-cell__sub">{customer.email}</span>
                        {customer.phone ? <span className="adm-cell__sub">{customer.phone}</span> : null}
                      </div>
                    </td>
                    <td className="adm-cell__sub">{day(customer.createdAt)}</td>
                    <td className="adm-num">{customer.paidOrdersCount}</td>
                    <td className="adm-num adm-cell__main">{money(customer.totalSpent)}</td>
                    <td>
                      {customer.lastOrderAt ? (
                        <div className="adm-cell">
                          <span>{day(customer.lastOrderAt)}</span>
                          {customer.lastOrderNumber ? <span className="adm-cell__sub">#{customer.lastOrderNumber}</span> : null}
                        </div>
                      ) : (
                        <span className="adm-cell__sub">Henüz yok</span>
                      )}
                    </td>
                    <td className="adm-num">{customer.wishlistCount}</td>
                    <td className="adm-end">
                      <button type="button" className="adm-btn adm-btn--sm" onClick={() => openProfile(customer)}>
                        Profil<span className="visually-hidden"> {customer.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={Boolean(selected)} onClose={() => openProfile(null)} title={selected?.name ?? ''} eyebrow="Müşteri profili" className="adm-dialog" size="lg">
        {selected ? (
          <div className="adm-form">
            <dl className="adm-dl">
              <div>
                <dt>Toplam harcama</dt>
                <dd>{money(selected.totalSpent)}</dd>
              </div>
              <div>
                <dt>Ödenen sipariş</dt>
                <dd>{selected.paidOrdersCount}</dd>
              </div>
              <div>
                <dt>Favori</dt>
                <dd>{selected.wishlistCount}</dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>{selected.email}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{selected.phone || 'Kayıtlı değil'}</dd>
              </div>
              <div>
                <dt>Kayıt</dt>
                <dd>{day(selected.createdAt)}</dd>
              </div>
            </dl>

            <section className="adm-dialog__section" aria-labelledby="customer-addresses">
              <h3 id="customer-addresses" className="adm-dialog__heading">
                Adresler ({selected.addresses.length})
              </h3>
              {selected.addresses.length ? (
                <ul className="adm-dialog__list">
                  {selected.addresses.map((address) => (
                    <li key={address.id}>
                      <div className="adm-cell">
                        <span className="adm-cell__main">
                          {address.title} · {address.recipient} {address.isDefault ? <span className="adm-status adm-status--success">Varsayılan</span> : null}
                        </span>
                        <span>{address.address}</span>
                        <span className="adm-cell__sub">
                          {address.district} / {address.city} · {address.phone}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-cell__sub">Kayıtlı adres yok.</p>
              )}
            </section>

            <section className="adm-dialog__section" aria-labelledby="customer-orders">
              <h3 id="customer-orders" className="adm-dialog__heading">
                Son siparişler ({selected.recentOrders.length}
                {selected.totalOrdersCount > selected.recentOrders.length ? ` / ${selected.totalOrdersCount}` : ''})
              </h3>
              {selected.recentOrders.length ? (
                <div className="adm-table-scroll adm-table-scroll--flat">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">Sipariş</th>
                        <th scope="col">Tarih</th>
                        <th scope="col" className="adm-num">Tutar</th>
                        <th scope="col">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            {onNavigateOrder ? (
                              <button
                                type="button"
                                className="adm-link"
                                onClick={() => {
                                  openProfile(null);
                                  onNavigateOrder(order.orderNumber);
                                }}
                              >
                                #{order.orderNumber}
                              </button>
                            ) : (
                              <span className="adm-cell__main">#{order.orderNumber}</span>
                            )}
                          </td>
                          <td className="adm-cell__sub">{day(order.createdAt)}</td>
                          <td className="adm-num">{money(order.totalAmount)}</td>
                          <td>
                            <OrderStatus status={order.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="adm-cell__sub">Henüz siparişi yok.</p>
              )}
            </section>

            <section className="adm-dialog__section" aria-labelledby="customer-panel-access">
              <h3 id="customer-panel-access" className="adm-dialog__heading">Panel erişimi</h3>
              <p className="adm-cell__sub">
                {selected.role === 'STAFF'
                  ? 'Personel: ürünler, kategoriler, stok talepleri, siparişler, kargo ve iadeler. Para işlemleri, ayarlar ve müşteri verileri yöneticide kalır.'
                  : 'Müşteri: panele erişimi yok.'}
                {selected.role === 'STAFF' && !selected.twoFactor ? ' İki adımlı doğrulamayı ilk girişte kuracak.' : ''}
              </p>
              {roleNotice ? <p className="adm-cell__sub" role="status">{roleNotice}</p> : null}
              {roleError ? <p className="form-alert form-alert--error" role="alert">{roleError}</p> : null}
              {roleConfirm ? (
                <div className="dialog-actions">
                  <button type="button" className="adm-btn" onClick={() => setRoleConfirm(false)} disabled={roleSaving}>Vazgeç</button>
                  <button type="button" className="adm-btn adm-btn--primary" onClick={() => void changeRole(selected)} disabled={roleSaving} aria-busy={roleSaving}>
                    {roleSaving ? 'Kaydediliyor…' : selected.role === 'STAFF' ? 'Evet, müşteri yap' : 'Evet, personel yap'}
                  </button>
                </div>
              ) : (
                <div className="dialog-actions">
                  <button type="button" className="adm-btn" onClick={() => { setRoleConfirm(true); setRoleNotice(null); setRoleError(null); }}>
                    {selected.role === 'STAFF' ? 'Personellikten çıkar' : 'Personel yap'}
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
