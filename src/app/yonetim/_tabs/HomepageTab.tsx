'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  HOMEPAGE_DEFAULTS,
  validateHomePageConfig,
  type HomePageConfig,
  type HomePageErrors,
} from '@/lib/homepage/shared';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { adminFetch } from '../_lib/admin-fetch';

type ProductOption = {
  id: string;
  slug: string;
  name: string;
  color: string;
  image: string;
};

type FieldProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  multiline?: boolean;
  type?: 'text' | 'number' | 'url';
  placeholder?: string;
  onChange: (value: string) => void;
};

function Field({
  label,
  name,
  value,
  error,
  hint,
  maxLength,
  multiline,
  type = 'text',
  placeholder,
  onChange,
}: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ') || undefined;

  const common = {
    id,
    name,
    value: value ?? '',
    maxLength,
    placeholder,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
  };

  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          {...common}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...common}
          type={type}
          step={type === 'number' ? '1' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="adm-field__hint">
          {hint}
          {maxLength ? ` ${value?.length || 0}/${maxLength}` : ''}
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

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="adm-toggle">
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
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

export default function HomepageTab() {
  const [saved, setSaved] = useState<HomePageConfig | null>(null);
  const [draft, setDraft] = useState<HomePageConfig | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<HomePageErrors>({});
  const [status, setStatus] = useState<{ tone: 'idle' | 'saving' | 'success' | 'error'; message?: string }>({
    tone: 'idle',
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetch('/api/admin/homepage', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.config) {
          throw new Error(data?.error || 'Anasayfa ayarları yüklenemedi.');
        }
        if (cancelled) return;
        setSaved(data.config);
        setDraft(data.config);
        if (Array.isArray(data.products)) {
          setProducts(data.products);
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Anasayfa ayarları yüklenemedi.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const dirty = useMemo(() => {
    if (!saved || !draft) return false;
    const { updatedAt: sU, ...sClean } = saved;
    const { updatedAt: dU, ...dClean } = draft;
    return JSON.stringify(sClean) !== JSON.stringify(dClean);
  }, [saved, draft]);

  // Leaving with unsaved changes confirmation
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const updateHero = useCallback((field: keyof HomePageConfig['hero'], val: string) => {
    setDraft((prev) => (prev ? { ...prev, hero: { ...prev.hero, [field]: val } } : prev));
  }, []);

  const updateCategoryCard = useCallback((index: number, field: string, val: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextCards = [...prev.categoryStories];
      nextCards[index] = { ...nextCards[index], [field]: val };
      return { ...prev, categoryStories: nextCards };
    });
  }, []);

  const updateNightCampaign = useCallback((field: keyof HomePageConfig['nightCampaign'], val: any) => {
    setDraft((prev) => (prev ? { ...prev, nightCampaign: { ...prev.nightCampaign, [field]: val } } : prev));
  }, []);

  const updateCollectionGrid = useCallback((field: keyof HomePageConfig['collectionGrid'], val: any) => {
    setDraft((prev) => (prev ? { ...prev, collectionGrid: { ...prev.collectionGrid, [field]: val } } : prev));
  }, []);

  const updateProductStory = useCallback((index: number, field: string, val: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextStories = [...prev.productStories.stories];
      nextStories[index] = { ...nextStories[index], [field]: val };
      return {
        ...prev,
        productStories: {
          ...prev.productStories,
          stories: nextStories,
        },
      };
    });
  }, []);

  const updateProductStoriesEnabled = useCallback((enabled: boolean) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            productStories: {
              ...prev.productStories,
              enabled,
            },
          }
        : prev,
    );
  }, []);

  const updateCampaignVideo = useCallback((field: keyof HomePageConfig['campaignVideo'], val: any) => {
    setDraft((prev) => (prev ? { ...prev, campaignVideo: { ...prev.campaignVideo, [field]: val } } : prev));
  }, []);

  const updateBrandStory = useCallback((field: keyof HomePageConfig['brandStory'], val: any) => {
    setDraft((prev) => (prev ? { ...prev, brandStory: { ...prev.brandStory, [field]: val } } : prev));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !saved) return;

    const validation = validateHomePageConfig(draft);
    if (!validation.ok) {
      setErrors(validation.errors);
      setStatus({ tone: 'error', message: 'Lütfen hatalı alanları düzeltin.' });
      return;
    }

    setErrors({});
    setStatus({ tone: 'saving' });

    try {
      const response = await adminFetch('/api/admin/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, updatedAt: saved.updatedAt }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 409) {
        if (data?.config) {
          setSaved(data.config);
          setDraft(data.config);
        }
        setStatus({
          tone: 'error',
          message: data?.error || 'Başka bir oturum ayarları değiştirdi. Sayfa güncellendi.',
        });
        return;
      }

      if (!response.ok || !data?.config) {
        if (data?.fieldErrors) {
          setErrors(data.fieldErrors);
        }
        throw new Error(data?.error || 'Kayıt başarısız oldu.');
      }

      setSaved(data.config);
      setDraft(data.config);
      setStatus({ tone: 'success', message: 'Anasayfa vitrini başarıyla kaydedildi ve yayınlandı.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Kayıt yapılamadı.',
      });
    }
  };

  if (loadError) {
    return <TabLoadError message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (!draft || !saved) {
    return <TabLoading label="Anasayfa ayarları yükleniyor" tab="homepage" />;
  }

  return (
    <form className="adm-settings-form" onSubmit={handleSubmit} noValidate>
      {/* Top Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-subtle, #6b7280)' }}>
            Anasayfadaki hero, kategori hikâyeleri, kampanyalar ve marka bölümlerini buradan yönetebilirsiniz.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="adm-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Vitrine Git ↗
          </Link>
        </div>
      </div>

      <div className="adm-settings__grid">
        {/* 01. HERO CAMPAIGN */}
        <div className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
            <legend>
              <span className="adm-fieldset__no" aria-hidden="true">01</span>
              Hero Vitrini
            </legend>
            <p className="adm-fieldset__lead">
              Kullanıcının siteyi açtığında gördüğü tam ekran ilk editoryal karşılama alanı.
            </p>

            <Field
              label="Üst başlık (Eyebrow)"
              name="hero.eyebrow"
              value={draft.hero.eyebrow}
              error={errors['hero.eyebrow']}
              maxLength={60}
              hint="Koleksiyon etiketi (örn. İÇ GİYİM & EV GİYİM)"
              onChange={(v) => updateHero('eyebrow', v)}
            />

            <Field
              label="Manşet Başlık"
              name="hero.title"
              value={draft.hero.title}
              error={errors['hero.title']}
              maxLength={120}
              hint="Ana karşılama cümlesi (örn. Kendine yakın.)"
              onChange={(v) => updateHero('title', v)}
            />

            <Field
              label="Kenar Metni"
              name="hero.sideText"
              value={draft.hero.sideText}
              error={errors['hero.sideText']}
              maxLength={80}
              hint="Dikey sağ şerit metni (örn. PANDIONES / YENİ KOLEKSİYON)"
              onChange={(v) => updateHero('sideText', v)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field
                label="Buton Metni"
                name="hero.buttonText"
                value={draft.hero.buttonText}
                error={errors['hero.buttonText']}
                maxLength={60}
                onChange={(v) => updateHero('buttonText', v)}
              />
              <Field
                label="Buton Bağlantısı"
                name="hero.buttonHref"
                value={draft.hero.buttonHref}
                error={errors['hero.buttonHref']}
                placeholder="/yeni-gelenler"
                onChange={(v) => updateHero('buttonHref', v)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field
                label="Ana Model Görseli URL"
                name="hero.modelImage"
                value={draft.hero.modelImage}
                error={errors['hero.modelImage']}
                hint="Mobilde ve masaüstünde sol yarıda görünen dikey görsel"
                onChange={(v) => updateHero('modelImage', v)}
              />
              <Field
                label="Model Görseli Açıklaması (Alt Metin)"
                name="hero.modelAlt"
                value={draft.hero.modelAlt}
                error={errors['hero.modelAlt']}
                maxLength={160}
                onChange={(v) => updateHero('modelAlt', v)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field
                label="İkinci Stüdyo Görseli URL"
                name="hero.stillImage"
                value={draft.hero.stillImage}
                error={errors['hero.stillImage']}
                hint="Masaüstünde sağ yarıda görünen stüdyo detayı görseli"
                onChange={(v) => updateHero('stillImage', v)}
              />
              <Field
                label="Stüdyo Görseli Açıklaması (Alt Metin)"
                name="hero.stillAlt"
                value={draft.hero.stillAlt}
                error={errors['hero.stillAlt']}
                maxLength={160}
                onChange={(v) => updateHero('stillAlt', v)}
              />
            </div>
          </fieldset>
        </div>

        {/* 02. CATEGORY STORIES */}
        <div className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
            <legend>
              <span className="adm-fieldset__no" aria-hidden="true">02</span>
              Kategori Hikâyeleri (3 Kart)
            </legend>
            <p className="adm-fieldset__lead">
              Hero vitrininin hemen altındaki üç editoryal kategori keşif kartı.
            </p>

            {draft.categoryStories.map((card, idx) => (
              <div
                key={card.id || idx}
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--color-bg-subtle, #fafafa)',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: 'var(--radius-md, 8px)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: '0 0 var(--space-3) 0' }}>
                  Kart {idx + 1}: {card.title || 'Başlıksız'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="Kart Başlığı"
                    name={`categoryStories.${idx}.title`}
                    value={card.title}
                    error={errors[`categoryStories.${idx}.title`]}
                    maxLength={80}
                    onChange={(v) => updateCategoryCard(idx, 'title', v)}
                  />
                  <Field
                    label="Buton / Rozet Metni"
                    name={`categoryStories.${idx}.badge`}
                    value={card.badge}
                    error={errors[`categoryStories.${idx}.badge`]}
                    maxLength={40}
                    onChange={(v) => updateCategoryCard(idx, 'badge', v)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="Kategori Bağlantısı"
                    name={`categoryStories.${idx}.href`}
                    value={card.href}
                    error={errors[`categoryStories.${idx}.href`]}
                    placeholder="/ic-giyim"
                    onChange={(v) => updateCategoryCard(idx, 'href', v)}
                  />
                  <Field
                    label="Görsel URL"
                    name={`categoryStories.${idx}.image`}
                    value={card.image}
                    error={errors[`categoryStories.${idx}.image`]}
                    onChange={(v) => updateCategoryCard(idx, 'image', v)}
                  />
                </div>

                <Field
                  label="Görsel Alt Metni"
                  name={`categoryStories.${idx}.alt`}
                  value={card.alt}
                  error={errors[`categoryStories.${idx}.alt`]}
                  maxLength={160}
                  onChange={(v) => updateCategoryCard(idx, 'alt', v)}
                />
              </div>
            ))}
          </fieldset>
        </div>

        {/* 03. NIGHT CAMPAIGN */}
        <div className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
            <legend>
              <span className="adm-fieldset__no" aria-hidden="true">03</span>
              Gece Kampanyası (Vurgu Bölümü)
            </legend>
            <p className="adm-fieldset__lead">
              Kategorilerin altında yer alan tam genişlik büyük editoryal kampanya bölümü.
            </p>

            <Toggle
              label="Bölüm Açık"
              hint="Kapatılırsa anasayfada bu kampanya alanı gizlenir."
              checked={draft.nightCampaign.enabled}
              onChange={(c) => updateNightCampaign('enabled', c)}
            />

            {draft.nightCampaign.enabled && (
              <>
                <Field
                  label="Üst Başlık (Eyebrow)"
                  name="nightCampaign.eyebrow"
                  value={draft.nightCampaign.eyebrow}
                  error={errors['nightCampaign.eyebrow']}
                  maxLength={80}
                  onChange={(v) => updateNightCampaign('eyebrow', v)}
                />

                <Field
                  label="Kampanya Başlığı"
                  name="nightCampaign.title"
                  value={draft.nightCampaign.title}
                  error={errors['nightCampaign.title']}
                  maxLength={120}
                  onChange={(v) => updateNightCampaign('title', v)}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="Buton Metni"
                    name="nightCampaign.buttonText"
                    value={draft.nightCampaign.buttonText}
                    error={errors['nightCampaign.buttonText']}
                    maxLength={60}
                    onChange={(v) => updateNightCampaign('buttonText', v)}
                  />
                  <Field
                    label="Buton Bağlantısı"
                    name="nightCampaign.buttonHref"
                    value={draft.nightCampaign.buttonHref}
                    error={errors['nightCampaign.buttonHref']}
                    placeholder="/yeni-gelenler"
                    onChange={(v) => updateNightCampaign('buttonHref', v)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="1. Görsel URL"
                    name="nightCampaign.image1"
                    value={draft.nightCampaign.image1}
                    error={errors['nightCampaign.image1']}
                    onChange={(v) => updateNightCampaign('image1', v)}
                  />
                  <Field
                    label="2. Görsel URL"
                    name="nightCampaign.image2"
                    value={draft.nightCampaign.image2}
                    error={errors['nightCampaign.image2']}
                    onChange={(v) => updateNightCampaign('image2', v)}
                  />
                </div>
              </>
            )}
          </fieldset>
        </div>

        {/* 04. COLLECTION GRID */}
        <div className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
            <legend>
              <span className="adm-fieldset__no" aria-hidden="true">04</span>
              Koleksiyon Izgarası (Yeni Gelenler)
            </legend>
            <p className="adm-fieldset__lead">
              Anasayfada sergilenen en yeni ürün parçalarının adedi.
            </p>

            <Field
              label="Gösterilecek Ürün Adedi"
              name="collectionGrid.productCount"
              type="number"
              value={String(draft.collectionGrid.productCount)}
              error={errors['collectionGrid.productCount']}
              hint="Önerilen: 8 parça (2 ile 24 arası)"
              onChange={(v) => updateCollectionGrid('productCount', Number(v) || 8)}
            />
          </fieldset>
        </div>

        {/* 05. PRODUCT STORIES */}
        <div className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
            <legend>
              <span className="adm-fieldset__no" aria-hidden="true">05</span>
              Ürün Hikâyeleri (2-Up Büyük Vitrinler)
            </legend>
            <p className="adm-fieldset__lead">
              Koleksiyon ızgarasının altında iki dikey fotoğraf ile ürünleri öne çıkaran editoryal hikâye bölümleri.
            </p>

            <Toggle
              label="Ürün Hikâyeleri Açık"
              hint="Kapatılırsa ürün hikâyesi blokları gizlenir."
              checked={draft.productStories.enabled}
              onChange={updateProductStoriesEnabled}
            />

            {draft.productStories.enabled &&
              draft.productStories.stories.map((story, idx) => (
                <div
                  key={story.id || idx}
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--color-bg-subtle, #fafafa)',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: 'var(--radius-md, 8px)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: '0 0 var(--space-3) 0' }}>
                    Hikâye {idx + 1}: {story.slug || 'Ürün seçilmedi'}
                  </p>

                  <div className="adm-field">
                    <label htmlFor={`story-slug-${idx}`}>Bağlı Ürün (Slug)</label>
                    <select
                      id={`story-slug-${idx}`}
                      value={story.slug}
                      onChange={(e) => updateProductStory(idx, 'slug', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm, 4px)',
                        border: '1px solid var(--color-border, #d1d5db)',
                        background: '#fff',
                      }}
                    >
                      <option value="">Ürün seçin…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.slug}>
                          {p.name} ({p.color}) — {p.slug}
                        </option>
                      ))}
                    </select>
                    {errors[`productStories.stories.${idx}.slug`] ? (
                      <p className="adm-field-error">
                        {errors[`productStories.stories.${idx}.slug`]}
                      </p>
                    ) : null}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                    <Field
                      label="1. Görsel URL"
                      name={`productStories.stories.${idx}.image1`}
                      value={story.image1}
                      error={errors[`productStories.stories.${idx}.image1`]}
                      onChange={(v) => updateProductStory(idx, 'image1', v)}
                    />
                    <Field
                      label="2. Görsel URL"
                      name={`productStories.stories.${idx}.image2`}
                      value={story.image2}
                      error={errors[`productStories.stories.${idx}.image2`]}
                      onChange={(v) => updateProductStory(idx, 'image2', v)}
                    />
                  </div>
                </div>
              ))}
          </fieldset>
        </div>

        {/* 06. CAMPAIGN VIDEO */}
        <div className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
            <legend>
              <span className="adm-fieldset__no" aria-hidden="true">06</span>
              Kampanya Videosu
            </legend>
            <p className="adm-fieldset__lead">
              Sessiz döngüde oynatılan tam ekran editoryal kampanya videosu.
            </p>

            <Toggle
              label="Video Bölümü Açık"
              hint="Kapatılırsa veya dosya bulunamazsa video alanı anasayfada çizilmez."
              checked={draft.campaignVideo.enabled}
              onChange={(c) => updateCampaignVideo('enabled', c)}
            />

            {draft.campaignVideo.enabled && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="Video Dosya Yolu (MP4 / WebM)"
                    name="campaignVideo.src"
                    value={draft.campaignVideo.src}
                    error={errors['campaignVideo.src']}
                    placeholder="/assets/Create_fashion.mp4"
                    onChange={(v) => updateCampaignVideo('src', v)}
                  />
                  <Field
                    label="Poster Görseli URL"
                    name="campaignVideo.poster"
                    value={draft.campaignVideo.poster}
                    error={errors['campaignVideo.poster']}
                    placeholder="/assets/home/kampanya-poster.jpg"
                    onChange={(v) => updateCampaignVideo('poster', v)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="Üst Başlık (Eyebrow)"
                    name="campaignVideo.eyebrow"
                    value={draft.campaignVideo.eyebrow}
                    error={errors['campaignVideo.eyebrow']}
                    maxLength={60}
                    onChange={(v) => updateCampaignVideo('eyebrow', v)}
                  />
                  <Field
                    label="Video Başlığı"
                    name="campaignVideo.title"
                    value={draft.campaignVideo.title}
                    error={errors['campaignVideo.title']}
                    maxLength={120}
                    onChange={(v) => updateCampaignVideo('title', v)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="Buton Metni"
                    name="campaignVideo.buttonText"
                    value={draft.campaignVideo.buttonText}
                    error={errors['campaignVideo.buttonText']}
                    maxLength={60}
                    onChange={(v) => updateCampaignVideo('buttonText', v)}
                  />
                  <Field
                    label="Buton Bağlantısı"
                    name="campaignVideo.buttonHref"
                    value={draft.campaignVideo.buttonHref}
                    error={errors['campaignVideo.buttonHref']}
                    placeholder="/yeni-gelenler"
                    onChange={(v) => updateCampaignVideo('buttonHref', v)}
                  />
                </div>
              </>
            )}
          </fieldset>
        </div>

        {/* 07. BRAND STORY */}
        <div className="adm-fieldset">
          <fieldset className="adm-fieldset__core">
            <legend>
              <span className="adm-fieldset__no" aria-hidden="true">07</span>
              Hikâyemiz (Marka Bölümü)
            </legend>
            <p className="adm-fieldset__lead">
              Footer'daki "Hikâyemiz" bağlantısının doğrudan indiği, kumaş dokuları ve marka felsefesi alanı.
            </p>

            <Toggle
              label="Hikâyemiz Bölümü Açık"
              hint="Kapatılırsa anasayfada bu bölüm gizlenir."
              checked={draft.brandStory.enabled}
              onChange={(c) => updateBrandStory('enabled', c)}
            />

            {draft.brandStory.enabled && (
              <>
                <Field
                  label="Üst Başlık"
                  name="brandStory.eyebrow"
                  value={draft.brandStory.eyebrow}
                  error={errors['brandStory.eyebrow']}
                  maxLength={60}
                  onChange={(v) => updateBrandStory('eyebrow', v)}
                />

                <Field
                  label="Başlık"
                  name="brandStory.title"
                  value={draft.brandStory.title}
                  error={errors['brandStory.title']}
                  maxLength={160}
                  multiline
                  hint="Satır atlamak için Enter kullanabilirsiniz"
                  onChange={(v) => updateBrandStory('title', v)}
                />

                <Field
                  label="Açıklama / Metin"
                  name="brandStory.lead"
                  value={draft.brandStory.lead}
                  error={errors['brandStory.lead']}
                  maxLength={300}
                  multiline
                  onChange={(v) => updateBrandStory('lead', v)}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field
                    label="Dantel Doku Görseli URL"
                    name="brandStory.laceImage"
                    value={draft.brandStory.laceImage}
                    error={errors['brandStory.laceImage']}
                    placeholder="/assets/lace.webp"
                    onChange={(v) => updateBrandStory('laceImage', v)}
                  />
                  <Field
                    label="Saten Doku Görseli URL"
                    name="brandStory.satinImage"
                    value={draft.brandStory.satinImage}
                    error={errors['brandStory.satinImage']}
                    placeholder="/assets/satin.webp"
                    onChange={(v) => updateBrandStory('satinImage', v)}
                  />
                </div>
              </>
            )}
          </fieldset>
        </div>
      </div>

      {/* Floating Save Bar */}
      <div className="adm-savebar" data-visible={dirty || status.tone !== 'idle'}>
        <p role="status" aria-live="polite" className={`adm-savebar__status adm-savebar__status--${status.tone}`}>
          {status.tone === 'saving'
            ? 'Kaydediliyor…'
            : status.message ?? (dirty ? 'Kaydedilmemiş değişiklikler var.' : '')}
        </p>
        <div className="adm-savebar__actions">
          <button
            type="button"
            className="adm-btn"
            disabled={!dirty || status.tone === 'saving'}
            onClick={() => {
              setDraft(saved);
              setErrors({});
              setStatus({ tone: 'idle' });
            }}
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="adm-btn adm-btn--primary"
            disabled={!dirty || status.tone === 'saving'}
          >
            {status.tone === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {saved.updatedAt ? (
        <p className="adm-settings__stamp" style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          Son kayıt: {new Date(saved.updatedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      ) : (
        <p className="adm-settings__stamp" style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          Henüz kaydedilmedi; anasayfa varsayılan editoryal değerleri kullanıyor.
        </p>
      )}
    </form>
  );
}
