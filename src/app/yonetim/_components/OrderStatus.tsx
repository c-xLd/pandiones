import React from 'react';

export const ORDER_STATUS_LABEL: Record<string, string> = {
  ODEME_BEKLENIYOR: 'Ödeme bekleniyor',
  ODENDI: 'Ödendi',
  HAZIRLANIYOR: 'Hazırlanıyor',
  KARGODA: 'Kargoda',
  TESLIM_EDILDI: 'Teslim edildi',
  ODEME_BASARISIZ: 'Ödeme başarısız',
};

/** Order status pill; the tone classes (adm-status--odendi, …) live in admin-shell.css. */
export default function OrderStatus({ status }: { status: string }) {
  return <span className={`adm-status adm-status--${status.toLowerCase()}`}>{ORDER_STATUS_LABEL[status] ?? status}</span>;
}
