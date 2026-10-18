import React from 'react';

/**
 * 1:1 Geometric skeleton matching HomepageTab layout.
 */
export default function HomepageSkeleton() {
  return (
    <div className="adm-settings adm-settings-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Anasayfa ayarları yükleniyor
      </p>

      <div className="adm-settings__sections" aria-hidden="true" style={{ width: '100%' }}>
        {[1, 2, 3].map((section) => (
          <div key={section} className="adm-fieldset">
            <div className="adm-fieldset__core">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="adm-skel" style={{ width: '24px', height: '16px' }} />
                <span className="adm-skel" style={{ width: '160px', height: '20px' }} />
              </div>
              <span className="adm-skel" style={{ width: '320px', height: '14px', marginBottom: '24px' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
