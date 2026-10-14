import React from 'react';

/**
 * 1:1 Geometric skeleton matching ProductsTab layout:
 * 4 metric task boxes + filter / new product toolbar + 56px thumbnail table (.adm-table).
 */
export default function ProductsSkeleton() {
  return (
    <div className="adm-tab adm-products-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Ürünler yükleniyor
      </p>

      {/* 4 metrik kutusu */}
      <div className="adm-tasks" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="adm-task">
            <span className="adm-skel" style={{ width: '32px', height: '28px', marginBottom: '8px' }} />
            <span className="adm-skel" style={{ width: '70px', height: '14px', marginBottom: '4px' }} />
            <span className="adm-skel" style={{ width: '130px', height: '11px' }} />
          </div>
        ))}
      </div>

      {/* Filtre / yeni ürün çubuğu */}
      <div className="adm-toolbar" aria-hidden="true">
        <div className="adm-skel adm-toolbar__grow" style={{ height: '40px', borderRadius: 'var(--radius-md)' }} />
        <div className="adm-skel" style={{ width: '140px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        <div className="adm-skel" style={{ width: '130px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        <div className="adm-toolbar__end" style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div className="adm-skel" style={{ width: '100px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="adm-skel" style={{ width: '110px', height: '40px', borderRadius: 'var(--radius-full)' }} />
        </div>
      </div>

      {/* 56px görsel thumbnail'li tablo iskeleti */}
      <div className="adm-table-wrap" aria-hidden="true">
        <div className="adm-table-scroll">
          <table className="adm-table adm-products-table">
            <thead>
              <tr>
                <th scope="col" className="adm-check" style={{ width: '40px' }}>
                  <span className="adm-skel" style={{ width: '16px', height: '16px' }} />
                </th>
                <th scope="col"><span className="adm-skel" style={{ width: '60px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '50px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '60px', height: '14px' }} /></th>
                <th scope="col"><span className="adm-skel" style={{ width: '90px', height: '14px' }} /></th>
                <th scope="col" className="adm-num"><span className="adm-skel" style={{ width: '60px', height: '14px', marginLeft: 'auto' }} /></th>
                <th scope="col" className="adm-end"><span className="adm-skel" style={{ width: '40px', height: '14px', marginLeft: 'auto' }} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="adm-check">
                    <span className="adm-skel" style={{ width: '16px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="adm-row adm-row--flush" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span
                        className="adm-skel adm-row__thumb"
                        style={{ width: '56px', height: '70px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}
                      />
                      <div className="adm-cell" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="adm-skel" style={{ width: '140px', height: '15px' }} />
                        <span className="adm-skel" style={{ width: '90px', height: '12px' }} />
                        <span className="adm-skel" style={{ width: '60px', height: '11px' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="adm-skel" style={{ width: '60px', height: '22px', borderRadius: 'var(--radius-full)' }} />
                  </td>
                  <td>
                    <span className="adm-skel" style={{ width: '70px', height: '16px' }} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3].map((s) => (
                        <span key={s} className="adm-skel" style={{ width: '42px', height: '28px', borderRadius: 'var(--radius-sm)' }} />
                      ))}
                    </div>
                  </td>
                  <td className="adm-num">
                    <span className="adm-skel" style={{ width: '50px', height: '15px', marginLeft: 'auto' }} />
                  </td>
                  <td className="adm-end">
                    <span className="adm-skel" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', marginLeft: 'auto' }} />
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
