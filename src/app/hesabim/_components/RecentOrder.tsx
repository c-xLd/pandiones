import React from 'react';
import Link from 'next/link';
import StatusTag from '@/components/ui/StatusTag';
import { formatTRY } from '@/lib/format/money';
import { formatDate, orderStatusMeta, type Order } from '@/lib/orders';

/** The latest order as a single line with a way into /siparislerim. Hidden when there are none. */
export default function RecentOrder({ orders }: { orders: Order[] }) {
  const latest = orders[0];
  if (!latest) return null;
  const status = orderStatusMeta(latest.status);
  const images = (latest.items ?? []).map((item) => item.product?.image).filter((src): src is string => Boolean(src)).slice(0, 3);

  return (
    <section className="recent-order" aria-labelledby="recent-order-title">
      <div className="recent-order__thumbs" aria-hidden="true">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src + i} src={src} alt="" width={48} height={72} />
        ))}
      </div>
      <div className="recent-order__info">
        <p className="account-label" id="recent-order-title">Son sipariş</p>
        <p className="recent-order__line">
          <span className="recent-order__number">{latest.orderNumber}</span>
          <span>{formatDate(latest.createdAt)}</span>
          <StatusTag tone={status.tone}>{status.label}</StatusTag>
        </p>
      </div>
      <p className="recent-order__total account-num">{formatTRY(latest.totalAmount)}</p>
      <Link href={`/siparislerim?siparis=${encodeURIComponent(latest.orderNumber)}`} className="btn btn--secondary btn--sm">
        Siparişlerim
      </Link>
    </section>
  );
}
