'use client';

import React, { useEffect, useRef, useState } from 'react';
import '@/styles/components/mfa.css';

type Props = {
  mode: 'verify' | 'setup';
  /** Called once a session exists (after a correct code, or after the backup codes were saved). */
  onDone(info: { backupCodesLeft?: number | null }): void;
  /** Back to the password step (the pending step expires after 10 minutes anyway). */
  onCancel(): void;
};

type SetupData = { secret: string; uri: string; qrSvg: string };

/**
 * Second step of sign-in. `verify`: a 6-digit code from the authenticator app, or a backup code.
 * `setup` (admins on first sign-in): scan the QR / enter the key, confirm with a code, then save the
 * one-time backup codes before continuing.
 */
export default function MfaStep({ mode, onDone, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'setup') return;
    let cancelled = false;
    fetch('/api/auth/2fa/setup', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Kurulum başlatılamadı.');
        if (!cancelled) setSetup(data);
      })
      .catch((err) => !cancelled && setSetupError(err instanceof Error ? err.message : 'Kurulum başlatılamadı.'));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => inputRef.current?.focus(), [useBackup, setup]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const value = code.trim();
    if (!useBackup && !/^\d{6}$/.test(value.replace(/\s+/g, ''))) {
      setError('Uygulamadaki 6 haneli kodu girin.');
      inputRef.current?.focus();
      return;
    }
    if (useBackup && value.replace(/[\s-]/g, '').length !== 8) {
      setError('Yedek kod 8 karakterdir (ör. 7KQ2-M9XA).');
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(mode === 'setup' ? '/api/auth/2fa/setup' : '/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Kod doğrulanamadı.');
        if (data.code === 'MFA_EXPIRED') setTimeout(onCancel, 1500);
        setCode('');
        inputRef.current?.focus();
        return;
      }
      if (mode === 'setup') setBackupCodes(data.backupCodes ?? []);
      else onDone({ backupCodesLeft: data.backupCodesLeft });
    } catch {
      setError('Bağlantı kurulamadı. Tekrar deneyin.');
    } finally {
      setPending(false);
    }
  }

  if (backupCodes) {
    const text = backupCodes.join('\n');
    return (
      <div className="mfa">
        <h2 className="mfa__title">Yedek kodlarınızı kaydedin</h2>
        <p className="mfa__lead">
          Telefonunuza erişemezseniz bu kodlarla giriş yapabilirsiniz. Her kod bir kez kullanılır ve <strong>bir daha gösterilmez</strong>.
        </p>
        <ol className="mfa__codes">
          {backupCodes.map((c) => (
            <li key={c}>
              <code>{c}</code>
            </li>
          ))}
        </ol>
        <div className="mfa__row">
          <button type="button" className="mfa__link" onClick={() => void navigator.clipboard?.writeText(text)}>
            Kopyala
          </button>
          <a className="mfa__link" href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Pandiones yedek kodları\n\n${text}\n`)}`} download="pandiones-yedek-kodlar.txt">
            Metin dosyası olarak indir
          </a>
        </div>
        <label className="mfa__check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Kodları güvenli bir yere kaydettim
        </label>
        <button type="button" className="mfa__submit" disabled={!saved} onClick={() => onDone({})}>
          Devam et
        </button>
      </div>
    );
  }

  return (
    <form className="mfa" onSubmit={submit} noValidate>
      <h2 className="mfa__title">{mode === 'setup' ? 'İki adımlı doğrulamayı kurun' : 'Doğrulama kodu'}</h2>
      {mode === 'setup' ? (
        <>
          <p className="mfa__lead">
            Yönetici hesapları için zorunludur. Google Authenticator, Microsoft Authenticator, 1Password gibi bir uygulamayla QR kodu okutun ya da anahtarı elle girin.
          </p>
          {setupError ? (
            <p className="mfa__error" role="alert">
              {setupError}
            </p>
          ) : !setup ? (
            <div className="mfa__qr skeleton-block" aria-busy="true">
              <span className="visually-hidden">Kurulum hazırlanıyor</span>
            </div>
          ) : (
            <div className="mfa__setup">
              {/* Server-generated SVG from our own QR encoder (no user input inside). */}
              <div className="mfa__qr" role="img" aria-label="Doğrulama uygulaması için QR kod" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
              <div className="mfa__key">
                <span>Elle girmek için anahtar</span>
                <code>{setup.secret}</code>
                <a className="mfa__link" href={setup.uri}>
                  Bu cihazdaki uygulamada aç
                </a>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="mfa__lead">
          {useBackup ? 'Kaydettiğiniz yedek kodlardan birini girin.' : 'Doğrulama uygulamanızdaki 6 haneli kodu girin.'}
        </p>
      )}

      <div className="mfa__field">
        <label htmlFor="mfa-code">{useBackup ? 'Yedek kod' : '6 haneli kod'}</label>
        <input
          ref={inputRef}
          id="mfa-code"
          name="code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          inputMode={useBackup ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          maxLength={useBackup ? 9 : 7}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'mfa-error' : undefined}
          disabled={mode === 'setup' && !setup}
        />
      </div>
      {error ? (
        <p id="mfa-error" className="mfa__error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="mfa__submit" disabled={pending || (mode === 'setup' && !setup)}>
        {pending ? 'Doğrulanıyor' : mode === 'setup' ? 'Etkinleştir' : 'Doğrula'}
      </button>
      <div className="mfa__row">
        {mode === 'verify' ? (
          <button
            type="button"
            className="mfa__link"
            onClick={() => {
              setUseBackup((v) => !v);
              setCode('');
              setError(null);
            }}
          >
            {useBackup ? 'Uygulama kodunu kullan' : 'Telefonuma erişemiyorum — yedek kod kullan'}
          </button>
        ) : null}
        <button type="button" className="mfa__link" onClick={onCancel}>
          Geri dön
        </button>
      </div>
    </form>
  );
}
