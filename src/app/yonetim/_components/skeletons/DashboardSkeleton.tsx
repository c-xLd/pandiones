import React from 'react';

/**
 * 1:1 Geometric skeleton matching DashboardTab layout:
 * Revenue chart card (.adm-bento__revenue) + KPI stack (.adm-bento__kpi) + Task list (.adm-bento__tasks).
 */
export default function DashboardSkeleton() {
  return (
    <div className="adm-bento adm-dashboard-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Gösterge paneli yükleniyor
      </p>

      {/* Ciro grafiği */}
      <section className="adm-card adm-bento__revenue" aria-hidden="true">
        <div className="adm-card__core adm-card__core--feature">
          <header className="adm-card__head">
            <div>
              <span className="adm-skel adm-skel--chip" style={{ marginBottom: '8px' }} />
              <span className="adm-skel adm-skel--number" style={{ height: '48px', marginBottom: '8px' }} />
              <span className="adm-skel adm-skel--lead" style={{ width: '220px', height: '14px' }} />
            </div>
            <div className="adm-skel" style={{ width: '140px', height: '36px', borderRadius: 'var(--radius-full)' }} />
          </header>
          <div className="adm-skel adm-skel--chart" style={{ width: '100%', height: '240px', marginTop: '16px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </section>

      {/* KPI kutuları */}
      <section className="adm-card adm-bento__kpi" aria-hidden="true">
        <div className="adm-card__core">
          <span className="adm-skel adm-skel--chip" style={{ marginBottom: '12px' }} />
          <span className="adm-skel adm-skel--kpi" style={{ width: '80px', height: '36px', marginBottom: '12px' }} />
          <span className="adm-skel" style={{ width: '100%', height: '36px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }} />
          <span className="adm-skel adm-skel--line" style={{ width: '70%', height: '12px' }} />
        </div>
      </section>

      <section className="adm-card adm-bento__kpi" aria-hidden="true">
        <div className="adm-card__core">
          <span className="adm-skel adm-skel--chip" style={{ marginBottom: '12px' }} />
          <span className="adm-skel adm-skel--kpi" style={{ width: '110px', height: '36px', marginBottom: '12px' }} />
          <span className="adm-skel adm-skel--line" style={{ width: '80%', height: '12px', marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <span className="adm-skel" style={{ width: '40px', height: '10px', marginBottom: '4px' }} />
                <span className="adm-skel" style={{ width: '30px', height: '16px' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Görev listesi */}
      <section className="adm-bento__tasks" aria-hidden="true">
        <div className="adm-section-head">
          <span className="adm-skel" style={{ width: '130px', height: '22px' }} />
          <span className="adm-skel" style={{ width: '60px', height: '14px' }} />
        </div>
        <div className="adm-tasks">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="adm-task">
              <span className="adm-skel" style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-full)', marginBottom: '8px' }} />
              <span className="adm-skel" style={{ width: '32px', height: '24px', marginBottom: '4px' }} />
              <span className="adm-skel" style={{ width: '110px', height: '14px', marginBottom: '4px' }} />
              <span className="adm-skel" style={{ width: '90px', height: '11px' }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
