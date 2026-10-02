import React from 'react';
import type { AdminTabId } from '../_lib/tabs';

/** Hairline (1.25) line icons drawn on a 24 grid; decorative, the label always sits next to them. */
const PATHS: Record<AdminTabId | 'search' | 'arrow' | 'store' | 'logout' | 'menu' | 'close' | 'plus' | 'download' | 'copy' | 'trash' | 'edit' | 'print', string> = {
  dashboard: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  activity: 'M3 12h4l2.5-6 5 12 2.5-6H21',
  orders: 'M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8zM9 8V6a3 3 0 0 1 6 0v2',
  returns: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  coupons: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM14 5v12',
  'gift-cards': 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1',
  products: 'M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z',
  categories: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z',
  waitlist: 'M12 4a6 6 0 0 0-6 6v4l-2 3h16l-2-3v-4a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0',
  customers: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c1.6.8 2.7 2.6 3 5.2',
  messages: 'M4 6h16v10H9l-5 4z',
  newsletter: 'M4 6h16v12H4zM4 7l8 6 8-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  security: 'M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6zM9 12l2 2 4-4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  arrow: 'M7 17 17 7M9 7h8v8',
  store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 8h16M4 16h16',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  print: 'M7 9V4h10v5M7 17H4v-8h16v8h-3M7 14h10v6H7z',
};

export type AdminIconName = keyof typeof PATHS;

export default function AdminIcon({ name, className }: { name: AdminIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ? `adm-icon ${className}` : 'adm-icon'} aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
