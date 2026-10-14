'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  SETTINGS_FIELDS,
  SETTINGS_LIMITS,
  validateSettings,
  type SettingsErrors,
  type StoreSettings,
  type StoreSettingsValues,
} from '@/lib/settings/shared';
import { TabLoadError, TabLoading } from './TabState';
import SettingsSkeleton from './skeletons/SettingsSkeleton';
import { adminFetch } from '../_lib/admin-fetch';

/** Every input is kept as a string while editing; validateSettings turns it back into typed values. */
type Draft = Record<keyof StoreSettingsValues, string | boolean>;

const toDraft = (settings: StoreSettings): Draft =>
  Object.fromEntries(
    SETTINGS_FIELDS.map((field) => {
      const value = settings[field];
      return [field, typeof value === 'boolean' ? value : value === null ? '' : String(value)];
    }),
  ) as Draft;

type FieldProps = {
  name: keyof StoreSettingsValues;
  label: string;
  hint?: string;
  draft: Draft;
  errors: SettingsErrors;
  onChange(name: keyof StoreSettingsValues, value: string | boolean): void;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  multiline?: boolean;
  suffix?: string;
  placeholder?: string;
};

function Field({ name, label, hint, draft, errors, onChange, type = 'text', inputMode, maxLength, multiline, suffix, placeholder }: FieldProps) {
  const id = useId();
  const error = errors[name];
  const value = String(draft[name] ?? '');
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    name,
    value,
    maxLength,
    placeholder,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
  };
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <div className={suffix ? 'adm-field__affix' : undefined}>
        {multiline ? (
          <textarea {...common} rows={3} onChange={(e) => onChange(name, e.target.value)} />
        ) : (
          <input {...common} type={type} inputMode={inputMode} step={type === 'number' ? 'any' : undefined} onChange={(e) => onChange(name, e.target.value)} />
        )}
        {suffix ? <span aria-hidden="true">{suffix}</span> : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="adm-field__hint">
          {hint}
          {maxLength ? ` ${value.length}/${maxLength}` : ''}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="adm-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({ name, label, hint, draft, onChange }: Pick<FieldProps, 'name' | 'label' | 'hint' | 'draft' | 'onChange'>) {
  const id = useId();
  const checked = draft[name] === true;
  return (
    <div className="adm-toggle">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(name, e.target.checked)} aria-describedby={hint ? `${id}-hint` : undefined} />
      <label htmlFor={id}>
        <span className="adm-toggle__label">{label}</span>
        {hint ? (
          <span id={`${id}-hint`} className="adm-field__hint">
            {hint}
          </span>
        ) : null}
      </label>
    </div>
  );
}

const SECTIONS = [
  { id: 'store', title: 'Mağaza', lead: 'Alt bilgide ve e-postalarda görünen ad.' },
  { id: 'contact', title: 'İletişim ve sosyal medya', lead: 'Alt bilgi, iletişim sayfası ve e-posta alt bilgisinde kullanılır. Boş bırakılan kanal gösterilmez.' },
  { id: 'shipping', title: 'Kargo', lead: 'Kargo ücreti ve ücretsiz kargo eşiği; altında PTT etiketinde kullanılan gönderici bilgileri.' },
  { id: 'announcement', title: 'Duyuru ve bakım', lead: 'Duyuru sitenin en üstünde görünür. Bakım modunda yalnız yöneticiler siteyi görür; diğer herkes bakım sayfasını görür.' },
  { id: 'seo', title: 'Arama motorları', lead: 'Sayfa kendi başlığını vermediğinde kullanılan varsayılan başlık ve açıklama.' },
  { id: 'stock', title: 'Stok', lead: '“Az kaldı” işareti ve yönetimdeki düşük stok listesi bu eşiği kullanır.' },
] as const;

export default function SettingsTab({ onSaved }: { onSaved?(settings: StoreSettings): void }) {
  const [saved, setSaved] = useState<StoreSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [status, setStatus] = useState<{ tone: 'idle' | 'saving' | 'success' | 'error'; message?: string }>({ tone: 'idle' });
  const [reloadKey, setReloadKey] = useState(0);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.settings) throw new Error(data?.error || 'Ayarlar yüklenemedi.');
        if (cancelled) return;
        setSaved(data.settings);
        setDraft(toDraft(data.settings));
      })
      .catch((error) => !cancelled && setLoadError(error instanceof Error ? error.message : 'Ayarlar yüklenemedi.'));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const dirty = useMemo(() => {
    if (!saved || !draft) return false;
    const base = toDraft(saved);
    return SETTINGS_FIELDS.some((field) => base[field] !== draft[field]);
  }, [saved, draft]);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const onChange = useCallback((name: keyof StoreSettingsValues, value: string | boolean) => {
    setDraft((current) => (current ? { ...current, [name]: value } : current));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
    setStatus((current) => (current.tone === 'success' || current.tone === 'error' ? { tone: 'idle' } : current));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !saved || status.tone === 'saving') return;
    const check = validateSettings(draft);
    if (!check.ok) {
      setErrors(check.errors);
      setStatus({ tone: 'error', message: 'Bazı alanlar hatalı. İşaretli alanları düzeltin.' });
      document.querySelector<HTMLElement>('.adm-settings [aria-invalid="true"]')?.focus();
      return;
    }
    setStatus({ tone: 'saving' });
    try {
      const response = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...check.values, updatedAt: saved.updatedAt }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 409 && data?.settings) {
        setSaved(data.settings);
        setDraft(toDraft(data.settings));
        setStatus({ tone: 'error', message: data.error });
        return;
      }
      if (response.status === 422 && data?.fieldErrors) {
        setErrors(data.fieldErrors);
        setStatus({ tone: 'error', message: data.error });
        return;
      }
      if (!response.ok || !data?.settings) throw new Error(data?.error || 'Ayarlar kaydedilemedi.');
      setSaved(data.settings);
      setDraft(toDraft(data.settings));
      setErrors({});
      setStatus({ tone: 'success', message: 'Kaydedildi. Değişiklikler sitede yayında.' });
      onSaved?.(data.settings);
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Ayarlar kaydedilemedi.' });
    }
  }

  const handleTestEmail = async () => {
    if (testingEmail) return;
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await adminFetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: String(draft?.contactEmail || '') }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Test e-postası gönderilemedi.');
      }
      setTestEmailResult({
        tone: 'success',
        message: `${data.message} (${data.provider})`,
      });
    } catch (err) {
      setTestEmailResult({
        tone: 'error',
        message: err instanceof Error ? err.message : 'E-posta servisine erişilemedi.',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  if (loadError) return <TabLoadError message={loadError} onRetry={() => setReloadKey((v) => v + 1)} />;
  if (!draft || !saved) return <SettingsSkeleton />;

  const field = { draft, errors, onChange };
  const maintenanceOn = draft.maintenanceEnabled === true;

  return (
    <form className="adm-settings" onSubmit={submit} noValidate>
      <nav className="adm-settings__toc" aria-label="Ayar bölümleri">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#ayar-${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>

      <div className="adm-settings__sections">
        {maintenanceOn ? (
          <p className="adm-banner adm-banner--warning" role="status">
            Bakım modu açık: kaydettiğinizde ziyaretçiler bakım sayfasını görür. Siz yönetici olarak siteyi görmeye devam edersiniz.
          </p>
        ) : null}

        <div id="ayar-store" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">01</span>
            {SECTIONS[0].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[0].lead}</p>
          <Field name="storeName" label="Mağaza adı" maxLength={SETTINGS_LIMITS.storeName} hint="Alt bilgideki telif satırında." {...field} />
          </fieldset>
        </div>

        <div id="ayar-contact" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">02</span>
            {SECTIONS[1].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[1].lead}</p>
          <div className="adm-fieldset__grid">
            <Field name="contactEmail" label="İletişim e-postası" type="email" inputMode="email" {...field} />
            <Field name="contactPhone" label="Telefon" type="tel" inputMode="tel" placeholder="0212 000 00 00" {...field} />
            <Field name="whatsappNumber" label="WhatsApp numarası" type="tel" inputMode="tel" placeholder="905551234567" hint="Ülke koduyla, yalnız rakam." {...field} />
            <Field name="instagramUrl" label="Instagram" type="url" inputMode="url" placeholder="https://instagram.com/pandiones" {...field} />
            <Field name="tiktokUrl" label="TikTok" type="url" inputMode="url" placeholder="https://tiktok.com/@pandiones" {...field} />
            <Field name="pinterestUrl" label="Pinterest" type="url" inputMode="url" placeholder="https://pinterest.com/pandiones" {...field} />
          </div>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="adm-btn adm-btn--sm"
              disabled={testingEmail}
              onClick={handleTestEmail}
            >
              {testingEmail ? 'Gönderiliyor…' : 'E-posta Gönderimini Test Et'}
            </button>
            {testEmailResult ? (
              <span style={{ fontSize: '12px', color: testEmailResult.tone === 'success' ? 'var(--color-success, #166534)' : 'var(--color-danger, #b91c1c)' }}>
                {testEmailResult.message}
              </span>
            ) : (
              <span className="adm-field__hint" style={{ margin: 0 }}>
                Kayıtlı iletişim e-postasına test iletisi göndererek sağlayıcı bağlantısını doğrular.
              </span>
            )}
          </div>
          </fieldset>
        </div>

        <div id="ayar-shipping" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">03</span>
            {SECTIONS[2].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[2].lead}</p>
          <div className="adm-fieldset__grid">
            <Field name="shippingFee" label="Kargo ücreti" type="number" inputMode="decimal" suffix="₺" hint="0 = kargo ücretsiz." {...field} />
            <Field name="freeShippingThreshold" label="Ücretsiz kargo eşiği" type="number" inputMode="decimal" suffix="₺" hint="Boş = eşik yok." {...field} />
          </div>
          <p className="adm-fieldset__lead">Kargo göndericisi: PTT etiketinde ve gönderi kaydında yazar. Ad, telefon, adres, il ve ilçe tamamlanmadan etiket basılmaz.</p>
          <div className="adm-fieldset__grid">
            <Field name="senderName" label="Gönderici adı" maxLength={SETTINGS_LIMITS.senderName} hint="Firma ya da kişi adı." {...field} />
            <Field name="senderPhone" label="Gönderici telefonu" type="tel" inputMode="tel" placeholder="0555 555 55 55" {...field} />
          </div>
          <Field name="senderAddress" label="Gönderici adresi" multiline maxLength={SETTINGS_LIMITS.senderAddress} hint="Mahalle, cadde/sokak, no, daire." {...field} />
          <div className="adm-fieldset__grid">
            <Field name="senderDistrict" label="İlçe" maxLength={SETTINGS_LIMITS.place} {...field} />
            <Field name="senderCity" label="İl" maxLength={SETTINGS_LIMITS.place} {...field} />
            <Field name="defaultDesi" label="Varsayılan desi" type="number" inputMode="decimal" hint="Yeni gönderide önerilen değer; gönderi oluştururken değiştirilebilir." {...field} />
          </div>
          </fieldset>
        </div>

        <div id="ayar-announcement" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">04</span>
            {SECTIONS[3].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[3].lead}</p>
          <Toggle name="announcementEnabled" label="Duyuru çubuğunu göster" draft={draft} onChange={onChange} />
          <div className="adm-fieldset__grid">
            <Field name="announcementText" label="Duyuru metni" maxLength={SETTINGS_LIMITS.announcementText} hint="Tek satır." {...field} />
            <Field name="announcementHref" label="Duyuru bağlantısı" placeholder="/yeni-gelenler" hint="İsteğe bağlı: site yolu ya da https:// adresi." {...field} />
          </div>
          <Toggle name="maintenanceEnabled" label="Bakım modu" hint="Ödeme ve sipariş durur; yönetim paneli ve giriş açık kalır." draft={draft} onChange={onChange} />
          <Field name="maintenanceMessage" label="Bakım mesajı" multiline maxLength={SETTINGS_LIMITS.maintenanceMessage} hint="Boş bırakılırsa varsayılan mesaj gösterilir." {...field} />
          </fieldset>
        </div>

        <div id="ayar-seo" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">05</span>
            {SECTIONS[4].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[4].lead}</p>
          <Field name="seoTitle" label="Site başlığı" maxLength={SETTINGS_LIMITS.seoTitle} hint="Tarayıcı sekmesinde ve aramada." {...field} />
          <Field name="seoDescription" label="Site açıklaması" multiline maxLength={SETTINGS_LIMITS.seoDescription} hint="Arama sonuçlarındaki özet." {...field} />
          </fieldset>
        </div>

        <div id="ayar-stock" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">06</span>
            {SECTIONS[5].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[5].lead}</p>
          <Field name="lowStockThreshold" label="Düşük stok eşiği" type="number" inputMode="numeric" suffix="adet" hint={`0–${SETTINGS_LIMITS.lowStock}; 0 “az kaldı” işaretini kapatır.`} {...field} />
          </fieldset>
        </div>
      </div>

      <div className="adm-savebar" data-visible={dirty || status.tone !== 'idle'}>
        <p role="status" aria-live="polite" className={`adm-savebar__status adm-savebar__status--${status.tone}`}>
          {status.tone === 'saving' ? 'Kaydediliyor…' : status.message ?? (dirty ? 'Kaydedilmemiş değişiklikler var.' : '')}
        </p>
        <div className="adm-savebar__actions">
          <button
            type="button"
            className="adm-btn"
            disabled={!dirty || status.tone === 'saving'}
            onClick={() => {
              setDraft(toDraft(saved));
              setErrors({});
              setStatus({ tone: 'idle' });
            }}
          >
            Vazgeç
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={!dirty || status.tone === 'saving'}>
            {status.tone === 'saving' ? 'Kaydediliyor' : 'Kaydet'}
          </button>
        </div>
      </div>
      {saved.updatedAt ? (
        <p className="adm-settings__stamp">Son kayıt: {new Date(saved.updatedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      ) : (
        <p className="adm-settings__stamp">Henüz kaydedilmedi; site varsayılan değerleri kullanıyor.</p>
      )}
    </form>
  );
}
