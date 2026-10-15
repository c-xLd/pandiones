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
  { id: 'seo', title: 'Arama motorları ve doğrulama', lead: 'Site geneli SEO başlığı, açıklaması, arama motoru indekslemesi, GSC ve GA4 kimlikleri.' },
  { id: 'merchant', title: 'Google Merchant', lead: 'Google Merchant Center XML ürün akışı ve kargo parametreleri.' },
  { id: 'performance', title: 'Görsel ve performans', lead: 'Görsel optimizasyon kalitesi ve mağaza önbellek yönetimi.' },
  { id: 'health', title: 'SEO ve Merchant teşhis raporu', lead: 'Katalogdaki eksik meta etiketler, alt metinler ve feed uygunsuzlukları için canlı denetim.' },
  { id: 'stock', title: 'Stok', lead: '“Az kaldı” işareti ve yönetimdeki düşük stok listesi bu eşiği kullanır.' },
] as const;

type HealthReport = {
  missingMeta: Array<{ type: 'product' | 'category'; id: string; name: string; slug: string; reason: string }>;
  missingAlt: Array<{ id: string; productId: string; productName: string; url: string }>;
  oversizedImages: Array<{ path: string; sizeBytes: number; format: string }>;
  ineligibleFeedProducts: Array<{ id: string; name: string; slug: string; reasons: string[] }>;
  timestamp: string;
};

export default function SettingsTab({ onSaved }: { onSaved?(settings: StoreSettings): void }) {
  const [saved, setSaved] = useState<StoreSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [status, setStatus] = useState<{ tone: 'idle' | 'saving' | 'success' | 'error'; message?: string }>({ tone: 'idle' });
  const [reloadKey, setReloadKey] = useState(0);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<'all' | 'home' | 'categories' | 'products'>('all');
  const [purgeResult, setPurgeResult] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [healthData, setHealthData] = useState<HealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

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

  const handlePurge = async () => {
    if (purging) return;
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await adminFetch('/api/admin/cache/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: purgeTarget }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Önbellek temizlenemedi.');
      setPurgeResult({
        tone: 'success',
        message: `Önbellek temizlendi (${(data.purged || [purgeTarget]).join(', ')}).`,
      });
    } catch (err) {
      setPurgeResult({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Önbellek temizleme başarısız.',
      });
    } finally {
      setPurging(false);
    }
  };

  const fetchHealthReport = async () => {
    if (healthLoading) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await adminFetch('/api/admin/health-report');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Teşhis raporu alınamadı.');
      setHealthData(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Teşhis raporuna erişilemedi.');
    } finally {
      setHealthLoading(false);
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
          <Field name="seoDefaultOgImage" label="Varsayılan paylaşım görseli (Open Graph)" type="url" inputMode="url" placeholder="https://pandiones.vercel.app/og.jpg" hint="Sosyal medya paylaşımlarında kullanılan varsayılan görsel URL'si." {...field} />
          <Toggle name="seoRobotsIndexing" label="Arama motoru indekslemesi (robots.txt)" hint="Açıkken arama motorları siteyi dizine ekler; kapalıyken Disallow: / ile engellenir." draft={draft} onChange={onChange} />
          <div className="adm-fieldset__grid">
            <Field name="gscVerificationTag" label="Google Search Console doğrulama kodu" placeholder="google-site-verification=..." hint="HTML meta etiketindeki içerik (content)." {...field} />
            <Field name="merchantVerificationTag" label="Google Merchant Center doğrulama kodu" placeholder="google-site-verification=..." hint="Google Merchant site sahipliği doğrulama kodu." {...field} />
            <Field name="googleAnalyticsId" label="Google Analytics 4 Ölçüm Kimliği" placeholder="G-XXXXXXXXXX" hint="G- formatında GA4 ölçüm kimliği." {...field} />
          </div>
          </fieldset>
        </div>

        <div id="ayar-merchant" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">06</span>
            {SECTIONS[5].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[5].lead}</p>
          <Toggle name="merchantFeedEnabled" label="Google Merchant XML akışını etkinleştir" hint="Açıkken /api/feed/google-merchant adresinden XML kataloğu sunulur; kapalıyken 404 döner." draft={draft} onChange={onChange} />
          <div className="adm-fieldset__grid">
            <Field name="merchantBrand" label="Marka adı" maxLength={60} placeholder="Pandiones" hint="XML akışındaki g:brand değeri." {...field} />
            <Field name="merchantShippingFee" label="XML kargo ücreti" type="number" inputMode="decimal" suffix="₺" hint="Google Merchant akışındaki varsayılan kargo bedeli." {...field} />
            <Field name="merchantTransitDays" label="Tahmini teslimat süresi" type="number" inputMode="numeric" suffix="gün" hint="XML kargo transit süresi." {...field} />
          </div>
          </fieldset>
        </div>

        <div id="ayar-performance" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">07</span>
            {SECTIONS[6].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[6].lead}</p>
          <Field name="imageQuality" label="Görsel kalitesi" type="number" inputMode="numeric" hint="Next.js görsel optimizasyon kalitesi (60–100, varsayılan 85)." {...field} />
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Mağaza Önbelleğini Temizle</h3>
            <p className="adm-field__hint" style={{ marginBottom: 'var(--space-3)' }}>
              Katalog, ana sayfa veya kategori önbelleğini anında geçersiz kılın. Değişiklikler ziyaretçilere derhal yansır.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <select
                value={purgeTarget}
                onChange={(e) => setPurgeTarget(e.target.value as any)}
                disabled={purging}
                style={{ padding: '6px 10px', fontSize: '13px' }}
              >
                <option value="all">Tüm Önbellek (Katalog, Kategoriler, Ana Sayfa)</option>
                <option value="home">Yalnız Ana Sayfa</option>
                <option value="categories">Yalnız Kategoriler</option>
                <option value="products">Yalnız Ürünler ve Katalog</option>
              </select>
              <button
                type="button"
                className="adm-btn adm-btn--sm"
                disabled={purging}
                onClick={handlePurge}
              >
                {purging ? 'Temizleniyor…' : 'Önbelleği Temizle'}
              </button>
              {purgeResult ? (
                <span style={{ fontSize: '12px', color: purgeResult.tone === 'success' ? 'var(--color-success, #166534)' : 'var(--color-danger, #b91c1c)' }}>
                  {purgeResult.message}
                </span>
              ) : null}
            </div>
          </div>
          </fieldset>
        </div>

        <div id="ayar-health" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">08</span>
            {SECTIONS[7].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[7].lead}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <button
              type="button"
              className="adm-btn adm-btn--sm"
              disabled={healthLoading}
              onClick={fetchHealthReport}
            >
              {healthLoading ? 'Denetleniyor…' : healthData ? 'Raporu Yenile' : 'Teşhis Raporunu Çalıştır'}
            </button>
            {healthData ? (
              <span className="adm-field__hint" style={{ margin: 0 }}>
                Son denetim: {new Date(healthData.timestamp).toLocaleTimeString('tr-TR')}
              </span>
            ) : null}
          </div>
          {healthError ? (
            <p className="adm-field-error" role="alert">{healthError}</p>
          ) : null}
          {healthData ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Eksik Meta</span>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0' }}>{healthData.missingMeta.length}</p>
                  <p className="adm-field__hint" style={{ margin: 0 }}>SEO başlığı veya açıklaması olmayan kayıtlar.</p>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Eksik Alt Metin</span>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0' }}>{healthData.missingAlt.length}</p>
                  <p className="adm-field__hint" style={{ margin: 0 }}>Alt metni bulunmayan ürün görselleri.</p>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Büyük Görseller (&gt;500KB)</span>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0' }}>{healthData.oversizedImages.length}</p>
                  <p className="adm-field__hint" style={{ margin: 0 }}>Optimize edilmemiş statik varlıklar.</p>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feed Uygunsuz Ürün</span>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0' }}>{healthData.ineligibleFeedProducts.length}</p>
                  <p className="adm-field__hint" style={{ margin: 0 }}>Merchant akışına dahil edilmeyen ürünler.</p>
                </div>
              </div>

              {healthData.missingMeta.length > 0 ? (
                <details style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    Eksik Meta Kayıtları ({healthData.missingMeta.length})
                  </summary>
                  <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6 }}>
                    {healthData.missingMeta.slice(0, 15).map((item) => (
                      <li key={`${item.type}-${item.id}`}>
                        <strong>[{item.type === 'product' ? 'Ürün' : 'Kategori'}]</strong> {item.name} ({item.slug}) — <span style={{ color: 'var(--color-danger, #b91c1c)' }}>{item.reason}</span>
                      </li>
                    ))}
                    {healthData.missingMeta.length > 15 ? <li>… ve {healthData.missingMeta.length - 15} kayıt daha</li> : null}
                  </ul>
                </details>
              ) : null}

              {healthData.missingAlt.length > 0 ? (
                <details style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    Eksik Alt Metinli Görseller ({healthData.missingAlt.length})
                  </summary>
                  <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6 }}>
                    {healthData.missingAlt.slice(0, 15).map((item) => (
                      <li key={item.id}>
                        <strong>{item.productName}</strong>: {item.url}
                      </li>
                    ))}
                    {healthData.missingAlt.length > 15 ? <li>… ve {healthData.missingAlt.length - 15} görsel daha</li> : null}
                  </ul>
                </details>
              ) : null}

              {healthData.oversizedImages.length > 0 ? (
                <details style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    Büyük Boyutlu Statik Görseller ({healthData.oversizedImages.length})
                  </summary>
                  <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6 }}>
                    {healthData.oversizedImages.slice(0, 15).map((item) => (
                      <li key={item.path}>
                        <code>{item.path}</code> ({Math.round(item.sizeBytes / 1024)} KB, {item.format.toUpperCase()})
                      </li>
                    ))}
                    {healthData.oversizedImages.length > 15 ? <li>… ve {healthData.oversizedImages.length - 15} dosya daha</li> : null}
                  </ul>
                </details>
              ) : null}

              {healthData.ineligibleFeedProducts.length > 0 ? (
                <details style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f9fafb)', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    Merchant Akışına Uygun Olmayan Ürünler ({healthData.ineligibleFeedProducts.length})
                  </summary>
                  <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6 }}>
                    {healthData.ineligibleFeedProducts.slice(0, 15).map((item) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong> ({item.slug}) — <span style={{ color: 'var(--color-text-subtle, #6b7280)' }}>{item.reasons.join(', ')}</span>
                      </li>
                    ))}
                    {healthData.ineligibleFeedProducts.length > 15 ? <li>… ve {healthData.ineligibleFeedProducts.length - 15} ürün daha</li> : null}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
          </fieldset>
        </div>

        <div id="ayar-stock" className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
          <legend>
            <span className="adm-fieldset__no" aria-hidden="true">09</span>
            {SECTIONS[8].title}
          </legend>
          <p className="adm-fieldset__lead">{SECTIONS[8].lead}</p>
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
