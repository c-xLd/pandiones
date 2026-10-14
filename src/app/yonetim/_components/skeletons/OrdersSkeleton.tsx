import React from 'react';

/**
 * 1:1 Geometric skeleton matching OrdersTab layout:
 * 4 tasks tiles (.adm-tasks) + status pills & filter row + 6-row table (.adm-table).
 */
export default function OrdersSkeleton() {
  return (
    <div className="adm-tab adm-orders-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Siparişler yükleniyor
      </p>

      {/* 4 görev kutusu (.adm-tasks) */}
      <div className="adm-tasks" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="adm-task">
            <span className="adm-skel" style={{ width: '32px', height: '28px', marginBottom: '8px' }} />
            <span className="adm-skel" style={{ width: '80px', height: '14px', marginBottom: '4px' }} />
            <span className="adm-skel" style={{ width: '120px', height: '11px' }} />
          </div>
        ))}
      </div>

      {/* Durum hapları ve filtreleme satırı */}
      <div className="adm-toolbar adm-toolbar--stack" aria-hidden="true">
        <div className="adm-segmented">
          {[80, 96, 64, 88, 72, 90, 110].map((width, i) => (
            <span
              key={i}
              className="adm-skel"
              style={{ width: `${width}px`, height: '32px', borderRadius: 'var(--radius-full)' }}
            />
          ))}
        </div>
        <div className="adm-toolbar__row">
          <div className="adm-skel adm-toolbar__grow" style={{ height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="adm-skel" style={{ width: '150px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="adm-skel" style={{ width: '120px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="adm-skel" style={{ width: '120px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="adm-skel" style={{ width: '110px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>

      {/* 6 satırlık tablo iskeleti (.adm-table) */}
      <div className="adm-table-wrap" aria-hidden="true">
        <div className="adm-table-scroll">
          <table className="adm-table adm-orders-table">
            <thead>
              <tr>
                <th scope="col" className="adm-check" style={{ width: '40px' }}>
                  <span className="adm-skel" style={{ width: '16px', height: '16px' }} />
                </th>
                <th scope="col"><span className="adm-skel" style={{ width: '60px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '80px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '120px', height: '14px' }} /></th>
                <th scope="col" className="adm-num"><span className="adm-skel" style={{ width: '60px', height: '14px', marginLeft: 'auto' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '70px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '80px', height: '14px' }} /></th>
                <th scope="col" className="adm-end"><span className="adm-skel" style={{ width: '50px', height: '14px', marginLeft: 'auto' }} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="adm-check">
                    <span className="adm-skel" style={{ width: '16px', height: '16px' }} />
                  </td>
                  <td>
                    <span className="adm-skel" style={{ width: '75px', height: '16px', marginBottom: '6px' }} />
                    <span className="adm-skel" style={{ width: '110px', height: '12px' }} />
                  </td>
                  <td>
                    <span className="adm-skel" style={{ width: '110px', height: '14px', marginBottom: '4px' }} />
                    <span className="adm-skel" style={{ width: '140px', height: '12px' }} />
                  </td>
                  <td>
                    <span className="adm-skel" style={{ width: '130px', height: '14px', marginBottom: '4px' }} />
                    <span className="adm-skel" style={{ width: '90px', height: '12px' }} />
                  </td>
                  <td className="adm-num">
                    <span className="adm-skel" style={{ width: '70px', height: '15px', marginLeft: 'auto' }} />
                  </td>
                  <td>
                    <span className="adm-skel" style={{ width: '88px', height: '24px', borderRadius: 'var(--radius-full)' }} />
                  </td>
                  <td>
                    <span className="adm-skel" style={{ width: '90px', height: '14px' }} />
                  </td>
                  <td className="adm-end">
                    <span className="adm-skel" style={{ width: '80px', height: '32px', borderRadius: 'var(--radius-md)', marginLeft: 'auto' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
