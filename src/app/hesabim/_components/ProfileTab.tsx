'use client';

import React, { useEffect, useState } from 'react';
import FormField from '@/components/ui/FormField';
import { passwordStrength, PASSWORD_MIN_LENGTH } from './lib';

type Result = { tone: 'success' | 'error'; message: string } | null;

type ProfileTabProps = {
  user: { name: string; email: string; phone?: string | null };
  onProfileSaved: () => Promise<void>;
};

async function patch(url: string, body: unknown, fallback: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, message: data.message || '' } : { ok: false, message: data.error || fallback };
  } catch {
    return { ok: false, message: 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.' };
  }
}

function FormResult({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <p className={`form-alert form-alert--${result.tone}`} role={result.tone === 'error' ? 'alert' : 'status'}>
      {result.message}
    </p>
  );
}

export default function ProfileTab({ user, onProfileSaved }: ProfileTabProps) {
  const [name, setName] = useState(user.name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [profileErrors, setProfileErrors] = useState<{ name?: string; phone?: string }>({});
  const [profileResult, setProfileResult] = useState<Result>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [passwordResult, setPasswordResult] = useState<Result>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
  }, [user.name, user.phone]);

  const strength = passwordStrength(next);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;
    const errors: typeof profileErrors = {};
    if (name.trim().length < 2) errors.name = 'Ad soyad en az 2 karakter olmalı.';
    const digits = (phone.match(/\d/g) || []).length;
    // Same rule as PATCH /api/auth/profile: 7–15 digits when a phone is given.
    if (phone.trim() && (digits < 7 || digits > 15)) errors.phone = 'Geçerli bir telefon numarası yazın.';
    setProfileErrors(errors);
    setProfileResult(null);
    if (Object.keys(errors).length) return;

    setSavingProfile(true);
    const result = await patch('/api/auth/profile', { name: name.trim(), phone: phone.trim() || null }, 'Profil güncellenemedi.');
    setSavingProfile(false);
    if (result.ok) {
      setProfileResult({ tone: 'success', message: result.message || 'Bilgileriniz kaydedildi.' });
      await onProfileSaved();
    } else {
      setProfileResult({ tone: 'error', message: result.message });
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;
    const errors: typeof passwordErrors = {};
    if (!current) errors.current = 'Mevcut şifrenizi yazın.';
    if (next.length < PASSWORD_MIN_LENGTH) errors.next = `Yeni şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`;
    else if (next === current) errors.next = 'Yeni şifre mevcut şifrenizle aynı olamaz.';
    if (confirm !== next) errors.confirm = 'Şifreler eşleşmiyor.';
    setPasswordErrors(errors);
    setPasswordResult(null);
    if (Object.keys(errors).length) return;

    setSavingPassword(true);
    const result = await patch('/api/auth/password', { currentPassword: current, newPassword: next, confirmPassword: confirm }, 'Şifre güncellenemedi.');
    setSavingPassword(false);
    if (result.ok) {
      setPasswordResult({ tone: 'success', message: result.message || 'Şifreniz güncellendi.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } else {
      setPasswordResult({ tone: 'error', message: result.message });
    }
  };

  return (
    <div className="account-split">
      <section className="account-panel" aria-labelledby="profile-title">
        <h3 id="profile-title" className="account-section-title">Kişisel bilgiler</h3>
        <p className="account-section-desc">Sipariş ve teslimat bildirimlerinde bu bilgiler kullanılır.</p>
        <form onSubmit={saveProfile} noValidate>
          <FormResult result={profileResult} />
          <FormField id="profile-name" label="Ad soyad" required error={profileErrors.name}>
            <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField id="profile-email" label="E-posta" hint="E-posta adresi sipariş geçmişinize bağlı olduğu için buradan değiştirilemez.">
            <input type="email" value={user.email} disabled readOnly />
          </FormField>
          <FormField id="profile-phone" label="Telefon" optional error={profileErrors.phone}>
            <input type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <button type="submit" className="btn btn--primary" aria-busy={savingProfile || undefined} disabled={savingProfile}>
            Kaydet
          </button>
        </form>
      </section>

      <section className="account-panel" aria-labelledby="password-title">
        <h3 id="password-title" className="account-section-title">Şifre</h3>
        <p className="account-section-desc">En az {PASSWORD_MIN_LENGTH} karakter; harf, rakam ve sembol karışımı önerilir.</p>
        <form onSubmit={savePassword} noValidate>
          <FormResult result={passwordResult} />
          <FormField id="password-current" label="Mevcut şifre" required error={passwordErrors.current}>
            <input type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </FormField>
          <FormField id="password-new" label="Yeni şifre" required error={passwordErrors.next}>
            <input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </FormField>
          {next ? (
            <div className="password-meter" aria-live="polite">
              <span className={`password-meter__bar password-meter__bar--${strength.level}`} aria-hidden="true" />
              <span className="password-meter__label">Şifre gücü: {strength.label}</span>
            </div>
          ) : null}
          <FormField id="password-confirm" label="Yeni şifre (tekrar)" required error={passwordErrors.confirm}>
            <input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </FormField>
          <label className="account-check">
            <input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} />
            <span>Şifreleri göster</span>
          </label>
          <button type="submit" className="btn btn--primary" aria-busy={savingPassword || undefined} disabled={savingPassword}>
            Şifreyi güncelle
          </button>
        </form>
      </section>
    </div>
  );
}
