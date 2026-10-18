import { STAFF_TABS } from '@/lib/security/roles';

/** Admin sections, grouped as in the sidebar. The id is the `?tab=` value. */
export const ADMIN_TABS = [
  { id: 'dashboard', label: 'Gösterge paneli', group: 'Genel' },
  { id: 'activity', label: 'Etkinlik kaydı', group: 'Genel' },
  { id: 'orders', label: 'Siparişler', group: 'Satış', badge: 'pendingOrdersCount' },
  { id: 'returns', label: 'İadeler', group: 'Satış', badge: 'pendingReturnsCount' },
  { id: 'coupons', label: 'Kuponlar', group: 'Satış' },
  { id: 'gift-cards', label: 'Hediye kartları', group: 'Satış' },
  { id: 'products', label: 'Ürünler', group: 'Katalog' },
  { id: 'categories', label: 'Kategoriler', group: 'Katalog' },
  { id: 'waitlist', label: 'Stok talepleri', group: 'Katalog', badge: 'pendingWaitlistCount' },
  { id: 'customers', label: 'Müşteriler', group: 'Müşteri' },
  { id: 'messages', label: 'Destek', group: 'Müşteri', badge: 'newMessagesCount' },
  { id: 'newsletter', label: 'Bülten', group: 'Müşteri' },
  { id: 'homepage', label: 'Anasayfa', group: 'Mağaza' },
  { id: 'security', label: 'Güvenlik', group: 'Mağaza' },
  { id: 'settings', label: 'Ayarlar', group: 'Mağaza' },
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number]['id'];
export type BadgeKey = 'pendingOrdersCount' | 'pendingReturnsCount' | 'pendingWaitlistCount' | 'newMessagesCount';

export const ADMIN_GROUPS = ['Genel', 'Satış', 'Katalog', 'Müşteri', 'Mağaza'] as const;

/** `?tab=` value → tab; the old "stats" address opens the dashboard. */
export function parseTab(value: string | null): AdminTabId {
  if (value === 'stats') return 'dashboard';
  return ADMIN_TABS.find((tab) => tab.id === value)?.id ?? 'dashboard';
}

export const tabLabel = (id: AdminTabId) => ADMIN_TABS.find((tab) => tab.id === id)?.label ?? '';

/** Staff see only their tabs (security/roles.ts STAFF_TABS); admins see all. */
export const canOpenTab = (role: string | undefined, id: AdminTabId) =>
  role === 'ADMIN' || (role === 'STAFF' && (STAFF_TABS as readonly string[]).includes(id));

/** Where a role lands when the requested tab is not theirs. */
export const defaultTab = (role: string | undefined): AdminTabId => (role === 'STAFF' ? 'orders' : 'dashboard');

export const tabsFor = (role: string | undefined) => ADMIN_TABS.filter((tab) => canOpenTab(role, tab.id));
export const groupsFor = (role: string | undefined) => ADMIN_GROUPS.filter((group) => tabsFor(role).some((tab) => tab.group === group));
