import React from 'react';
import Link from 'next/link';
import StatusTag from '@/components/ui/StatusTag';
import { formatTRY } from '@/lib/format/money';
import { formatDate, orderProgressStep, orderStatusMeta, type Order } from '@/lib/orders';

type OrderRowProps = {
  order: Order;
  selected: boolean;
  index: number;
};

/** One order in the list: stacked thumbnails, number, date, status, total and a 4-segment progress rail. */
export default function OrderRow({ order, selected, index }: OrderRowProps) {
  const status = orderStatusMeta(order.status);
  const step = orderProgressStep(order.status);
  const items = order.items ?? [];
  const pieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const images = items.map((item) => item.product?.image).filter((src): src is string => Boolean(src));
  const extra = images.length - 3;

  return (
    <li className="order-row-item" style={{ '--i': index } as React.CSSProperties}>
      <Link
        href={`/siparislerim?siparis=${encodeURIComponent(order.orderNumber)}`}
        scroll={false}
        className={`order-row${selected ? ' is-selected' : ''}`}
        aria-current={selected ? 'true' : undefined}
      >
        <span className="order-row__thumbs" aria-hidden="true">
          {images.slice(0, 3).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src + i} src={src} alt="" width={56} height={84} loading="lazy" />
          ))}
          {extra > 0 ? <span className="order-row__more">+{extra}</span> : null}
          {images.length === 0 ? <span className="order-row__placeholder" /> : null}
        </span>

        <span className="order-row__body">
          <span className="order-row__top">
            <span className="order-row__number">{order.orderNumber}</span>
            <span className="order-row__total">{formatTRY(order.totalAmount)}</span>
          </span>
          <span className="order-row__meta">
            {formatDate(order.createdAt)} · {pieces} parça
          </span>
          <span className="order-row__status">
            <StatusTag tone={status.tone}>{status.label}</StatusTag>
          </span>
          {step > 0 ? (
            <span className="order-rail" aria-hidden="true">
              {[1, 2, 3, 4].map((segment) => (
                <span key={segment} className={`order-rail__seg${segment <= step ? ' is-on' : ''}`} />
              ))}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
