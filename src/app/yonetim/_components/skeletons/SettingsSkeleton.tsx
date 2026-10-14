import React from 'react';

/**
 * 1:1 Geometric skeleton matching SettingsTab layout:
 * Left vertical TOC links (7 items) + Right form card sections (.adm-fieldset).
 */
export default function SettingsSkeleton() {
  return (
    <div className="adm-settings adm-settings-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Ayarlar yükleniyor
      </p>

      {/* Sol dikey TOC linkleri (7 adet) */}
      <nav className="adm-settings__toc" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="adm-skel"
            style={{ width: `${80 + (i % 3) * 20}px`, height: '20px', margin: '8px 0', borderRadius: 'var(--radius-sm)' }}
          />
        ))}
      </nav>

      {/* Sağ form kartları */}
      <div className="adm-settings__sections" aria-hidden="true">
        {[1, 2, 3].map((section) => (
          <div key={section} className="adm-fieldset">
            <div className="adm-fieldset__core">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="adm-skel" style={{ width: '24px', height: '16px' }} />
                <span className="adm-skel" style={{ width: '140px', height: '20px' }} />
              </div>
              <span className="adm-skel" style={{ width: '320px', height: '14px', marginBottom: '24px' }} />

              <div className="adm-fieldset__grid">
                {[1, 2, 3, 4].map((field) => (
                  <div key={field} className="adm-field">
                    <span className="adm-skel" style={{ width: '100px', height: '14px', marginBottom: '8px' }} />
                    <span className="adm-skel" style={{ width: '100%', height: '42px', borderRadius: 'var(--radius-md)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
