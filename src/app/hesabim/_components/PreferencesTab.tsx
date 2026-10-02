'use client';

import React, { useEffect, useState } from 'react';

type PreferencesTabProps = {
  email: string;
  subscribed: boolean;
  onChanged: () => Promise<void>;
};

export default function PreferencesTab({ email, subscribed: initial, onChanged }: PreferencesTabProps) {
  const [subscribed, setSubscribed] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => setSubscribed(initial), [initial]);

  const toggle = async () => {
    if (saving) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/newsletter/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribe: !subscribed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ tone: 'error', message: data.error || 'Tercihiniz kaydedilemedi. Tekrar deneyin.' });
        return;
      }
      setSubscribed(Boolean(data.subscribed));
      setResult({ tone: 'success', message: data.message || 'Tercihiniz kaydedildi.' });
      await onChanged();
    } catch {
      setResult({ tone: 'error', message: 'Bağlantı kurulamadı. Tekrar deneyin.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="account-panel account-panel--narrow" aria-labelledby="prefs-title">
      <h3 id="prefs-title" className="account-section-title">E-bülten</h3>
      <p className="account-section-desc">Yeni koleksiyon ve duyurular e-posta ile gönderilir. Sipariş bildirimleri bu tercihten etkilenmez.</p>

      {result ? (
        <p className={`form-alert form-alert--${result.tone}`} role={result.tone === 'error' ? 'alert' : 'status'}>
          {result.message}
        </p>
      ) : null}

      <div className="pref-row">
        <div>
          <p className="account-row__title">{subscribed ? 'Abonesiniz' : 'Abone değilsiniz'}</p>
          <p className="account-row__meta">{email}</p>
        </div>
        <button
          type="button"
          className={`btn btn--sm ${subscribed ? 'btn--secondary' : 'btn--primary'}`}
          aria-pressed={subscribed}
          aria-busy={saving || undefined}
          disabled={saving}
          onClick={toggle}
        >
          {subscribed ? 'Aboneliği bitir' : 'Abone ol'}
        </button>
      </div>

    </section>
  );
}
