import React from 'react';

/** Shown while the admin session is checked: the panel's own outline (sidebar island, top bar, title,
 *  cards) in skeleton blocks, so the screen does not flash a sentence and then jump to the layout. */
export default function AdminShellSkeleton() {
  return (
    <div className="adm-shell adm-shell--skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Yönetim paneli açılıyor
      </p>
      <aside className="adm-sidebar" aria-hidden="true">
        <div className="adm-sidebar__inner">
          <span className="adm-skel adm-skel--dark adm-skel--logo" />
          <span className="adm-skel adm-skel--dark adm-skel--pill" />
          {[4, 4, 3].map((count, group) => (
            <div key={group} className="adm-skel-group">
              <span className="adm-skel adm-skel--dark adm-skel--heading" />
              {Array.from({ length: count }, (_, i) => (
                <span key={i} className="adm-skel adm-skel--dark adm-skel--nav" />
              ))}
            </div>
          ))}
        </div>
      </aside>
      <div className="adm-main" aria-hidden="true">
        <div className="adm-topbar">
          <span className="adm-skel adm-skel--chip" />
          <span className="adm-skel adm-skel--search" />
        </div>
        <div className="adm-hero">
          <span className="adm-skel adm-skel--title" />
          <span className="adm-skel adm-skel--lead" />
        </div>
        <div className="adm-bento">
          <div className="adm-card adm-bento__revenue">
            <div className="adm-card__core">
              <span className="adm-skel adm-skel--chip" />
              <span className="adm-skel adm-skel--number" />
              <span className="adm-skel adm-skel--chart" />
            </div>
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="adm-card adm-bento__kpi">
              <div className="adm-card__core">
                <span className="adm-skel adm-skel--chip" />
                <span className="adm-skel adm-skel--kpi" />
                <span className="adm-skel adm-skel--line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
