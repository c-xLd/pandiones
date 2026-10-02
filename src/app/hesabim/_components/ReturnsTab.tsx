import React from 'react';
import Link from 'next/link';
import Notice from '@/components/ui/Notice';
import StatusTag from '@/components/ui/StatusTag';
import { formatDate, returnStatusMeta, type Order, type ReturnRequest } from './lib';

type ReturnRow = ReturnRequest & { orderNumber: string };

export const collectReturns = (orders: Order[]): ReturnRow[] =>
  orders
    .flatMap((order) => (order.returns ?? []).map((ret) => ({ ...ret, orderNumber: order.orderNumber })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export default function ReturnsTab({ orders }: { orders: Order[] }) {
  const returns = collectReturns(orders);

  return (
    <>
      <Notice tone="info" className="account-policy">
        <p>
          Hijyen gereği; koruyucu bandı çıkarılmış, denenmiş veya ambalajı açılmış iç giyim parçalarının iadesi kabul edilmez.
          İade talebini <Link href="/siparislerim">Siparişlerim</Link> sayfasında ilgili siparişten açabilirsiniz.
        </p>
      </Notice>

      {returns.length === 0 ? (
        <div className="account-empty">
          <p className="account-empty__title">Açık veya geçmiş iade talebiniz yok.</p>
          <Link href="/siparislerim" className="btn btn--link">Siparişlerime git</Link>
        </div>
      ) : (
        <ul className="account-rows">
          {returns.map((ret) => {
            const status = returnStatusMeta(ret.status);
            return (
              <li key={ret.id} className="return-row">
                <div className="return-row__head">
                  <div>
                    <p className="account-label">Sipariş</p>
                    <p className="account-row__title">{ret.orderNumber}</p>
                  </div>
                  <div>
                    <p className="account-label">Talep tarihi</p>
                    <p>{formatDate(ret.createdAt)}</p>
                  </div>
                  <StatusTag tone={status.tone}>{status.label}</StatusTag>
                </div>
                <p className="return-row__reason">{ret.reason}</p>
                {ret.adminNotes ? (
                  <p className="return-row__note">
                    <span className="account-label">Müşteri hizmetleri notu</span>
                    {ret.adminNotes}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
