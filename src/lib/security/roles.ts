/**
 * Roles and what they may do in the panel. Pure (no database, no Next): used by the session code, the
 * middleware, every /api/admin route and the panel's sidebar.
 *
 * - CUSTOMER: the shop and their own account.
 * - STAFF: the panel's catalogue and order work — products, categories, stock requests, orders,
 *   shipping and returns. No money (refunds, coupons, gift cards), no store settings, no customer
 *   list, messages or newsletter, no security or activity log, no revenue dashboard.
 * - ADMIN: everything.
 *
 * Staff and admin sign in to the panel the same way (2FA required, 8 h session, 30 min idle).
 */

export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type Permission = 'catalog' | 'orders' | 'admin';

export const ROLES: readonly Role[] = ['CUSTOMER', 'STAFF', 'ADMIN'];

/** The stored role (free text in the database) as one of the known roles; anything else is a customer. */
export const toRole = (value: unknown): Role => (value === 'ADMIN' || value === 'STAFF' ? value : 'CUSTOMER');

/** Roles that sign in to /yonetim (and therefore need 2FA and the short admin session). */
export const isPanelRole = (role: unknown): boolean => role === 'ADMIN' || role === 'STAFF';

const STAFF_PERMISSIONS: ReadonlySet<Permission> = new Set(['catalog', 'orders']);

export function can(role: unknown, permission: Permission): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'STAFF') return STAFF_PERMISSIONS.has(permission);
  return false;
}

/** Panel tabs staff may open (the rest of the sidebar is admin only). Staff land on orders. */
export const STAFF_TABS = ['orders', 'returns', 'products', 'categories', 'waitlist'] as const;

export const roleLabel = (role: Role) => (role === 'ADMIN' ? 'Yönetici' : role === 'STAFF' ? 'Personel' : 'Müşteri');
