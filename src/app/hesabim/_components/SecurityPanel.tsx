'use client';

import React, { useCallback, useEffect, useState } from 'react';
import MfaStep from '@/components/auth/MfaStep';
import FormField from '@/components/ui/FormField';

type SessionRow = { id: string; device: string; createdAt: string; lastSeenAt: string; current: boolean };

const when = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Two-step verification (optional for customers) and the account's open sessions. */
export default function SecurityPanel({ twoFactorEnabled, onChanged }: { twoFactorEnabled: boolean; onChanged(): void }) {
  const [settingUp, setSettingUp] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mfaMessage, setMfaMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsError(null);
    try {
      const res = await fetch('/api/auth/sessions', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Oturumlar yüklenemedi.');
      setSessions(data.sessions);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : 'Oturumlar yüklenemedi.');
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function closeSession(body: { id?: string; others?: boolean }) {
    setClosing(body.id ?? 'others');
    try {
      const res = await fetch('/api/auth/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      await loadSessions();
    } catch {
      setSessionsError('Oturum kapatılamadı. Tekrar deneyin.');
    } finally {
      setClosing(null);
    }
  }

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!password || !code.trim()) {
      setMfaMessage({ tone: 'error', text: 'Şifrenizi ve doğrulama kodunu girin.' });
      return;
    }
    setBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Kapatılamadı.');
      setDisabling(false);
      setPassword('');
      setCode('');
      setMfaMessage({ tone: 'success', text: 'İki adımlı doğrulama kapatıldı.' });
      onChanged();
    } catch (err) {
      setMfaMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Kapatılamadı.' });
    } finally {
      setBusy(false);
    }
  }

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword, code: deleteCode, confirm: deleteConfirm.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Hesap silinemedi.');
      window.location.assign('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Hesap silinemedi.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="account-split">
      <section className="account-panel" aria-labelledby="mfa-title">
        <h3 id="mfa-title" className="account-section-title">İki adımlı doğrulama</h3>
        <p className="account-section-desc">
          Girişte şifrenizin yanında doğrulama uygulamanızdaki kod da istenir. Şifreniz ele geçse bile hesabınıza girilemez.
        </p>
        {mfaMessage ? (
          <p className={mfaMessage.tone === 'error' ? 'form-alert form-alert--error' : 'form-alert form-alert--success'} role={mfaMessage.tone === 'error' ? 'alert' : 'status'}>
            {mfaMessage.text}
          </p>
        ) : null}
        {settingUp ? (
          <MfaStep
            mode="setup"
            onDone={() => {
              setSettingUp(false);
              setMfaMessage({ tone: 'success', text: 'İki adımlı doğrulama açıldı.' });
              onChanged();
            }}
            onCancel={() => setSettingUp(false)}
          />
        ) : twoFactorEnabled ? (
          disabling ? (
            <form className="account-form" onSubmit={disable} noValidate>
              <FormField id="mfa-disable-password" label="Şifreniz" required>
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormField>
              <FormField id="mfa-disable-code" label="Doğrulama kodu" required hint="Uygulamadaki 6 haneli kod ya da bir yedek kod.">
                <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
              </FormField>
              <div className="account-form-actions">
                <button type="button" className="btn btn--secondary" onClick={() => setDisabling(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy || undefined}>
                  {busy ? 'Kapatılıyor' : 'Kapat'}
                </button>
              </div>
            </form>
          ) : (
            <div className="account-form-actions">
              <span className="account-badge account-badge--success">Açık</span>
              <button type="button" className="btn btn--secondary" onClick={() => setDisabling(true)}>
                Kapat
              </button>
            </div>
          )
        ) : (
          <div className="account-form-actions">
            <span className="account-badge">Kapalı</span>
            <button type="button" className="btn btn--primary" onClick={() => setSettingUp(true)}>
              Etkinleştir
            </button>
          </div>
        )}
      </section>

      <section className="account-panel" aria-labelledby="sessions-title">
        <h3 id="sessions-title" className="account-section-title">Açık oturumlar</h3>
        <p className="account-section-desc">Tanımadığınız bir cihaz görürseniz kapatın ve şifrenizi değiştirin.</p>
        {sessionsError ? (
          <div className="form-alert form-alert--error" role="alert">
            {sessionsError}{' '}
            <button type="button" className="btn btn--link" onClick={() => void loadSessions()}>
              Tekrar dene
            </button>
          </div>
        ) : null}
        {!sessions && !sessionsError ? <div className="skeleton-block account-skeleton-row" aria-hidden="true" /> : null}
        {sessions ? (
          <ul className="account-sessions">
            {sessions.map((s) => (
              <li key={s.id} className="account-session">
                <div>
                  <strong>{s.device}</strong>
                  {s.current ? <span className="account-badge account-badge--success">Bu cihaz</span> : null}
                  <span className="account-session__meta">
                    Son etkinlik {when(s.lastSeenAt)} · açılış {when(s.createdAt)}
                  </span>
                </div>
                {!s.current ? (
                  <button type="button" className="btn btn--link" disabled={closing === s.id} onClick={() => void closeSession({ id: s.id })}>
                    {closing === s.id ? 'Kapatılıyor' : 'Oturumu kapat'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {others > 0 ? (
          <button type="button" className="btn btn--secondary" disabled={closing === 'others'} onClick={() => void closeSession({ others: true })}>
            {closing === 'others' ? 'Kapatılıyor' : `Diğer ${others} oturumu kapat`}
          </button>
        ) : null}
      </section>

      <section className="account-panel" aria-labelledby="data-title">
        <h3 id="data-title" className="account-section-title">Verileriniz</h3>
        <p className="account-section-desc">
          Hesabınızla ilgili sakladığımız tüm bilgileri indirebilir ya da hesabınızı kapatabilirsiniz. Faturalı siparişler yasal süre boyunca saklanır, hesabınızdan ayrılır.
        </p>
        <div className="account-form-actions">
          <a className="btn btn--secondary" href="/api/auth/account" download>
            Verilerimi indir (JSON)
          </a>
          {!deleting ? (
            <button type="button" className="btn btn--link" onClick={() => setDeleting(true)}>
              Hesabımı sil
            </button>
          ) : null}
        </div>
        {deleting ? (
          <form className="account-form" onSubmit={deleteAccount} noValidate>
            {deleteError ? (
              <p className="form-alert form-alert--error" role="alert">
                {deleteError}
              </p>
            ) : null}
            <FormField id="delete-password" label="Şifreniz" required>
              <input type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
            </FormField>
            {twoFactorEnabled ? (
              <FormField id="delete-code" label="Doğrulama kodu" required>
                <input inputMode="numeric" autoComplete="one-time-code" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value)} />
              </FormField>
            ) : null}
            <FormField id="delete-confirm" label="Onaylamak için HESABIMI SIL yazın" required>
              <input autoComplete="off" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            </FormField>
            <div className="account-form-actions">
              <button type="button" className="btn btn--secondary" onClick={() => setDeleting(false)}>
                Vazgeç
              </button>
              <button type="submit" className="btn btn--primary" disabled={deleteBusy || deleteConfirm.trim() !== 'HESABIMI SIL'} aria-busy={deleteBusy || undefined}>
                {deleteBusy ? 'Siliniyor' : 'Hesabımı kalıcı olarak sil'}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
