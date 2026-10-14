'use client';

import React, { useCallback, useState } from 'react';
import Combobox from './Combobox';

export type ColorCandidate = { id: string; name: string; color: string; status: string; image: string };

/**
 * "Mevcut ürünü bağla": picks a product created on its own (same category, outside this model's family)
 * to join as a colour. The list is loaded when opened; choosing hands the product to the editor, which
 * asks before linking.
 */
export default function LinkColorPicker({ productId, disabled, onPick }: { productId: string | null; disabled?: boolean; onPick(candidate: ColorCandidate): void }) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<ColorCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setError(null);
    setCandidates(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}/colors`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(body.candidates)) throw new Error(body.error || 'Ürünler yüklenemedi.');
      setCandidates(body.candidates);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Ürünler yüklenemedi.');
    }
  }, [productId]);

  if (!productId) {
    return <p className="adm-field__hint">Daha önce ayrı oluşturulmuş bir ürünü bu modele renk olarak bağlamak için önce taslağı oluşturun.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        className="adm-link adm-vx__link-toggle"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        Mevcut bir ürünü renk olarak bağla
      </button>
    );
  }

  return (
    <div className="adm-vx__link">
      <label className="adm-vx__label" htmlFor="vx-link">
        Bağlanacak ürün
      </label>
      {error ? (
        <p className="adm-field-error" role="alert">
          {error}{' '}
          <button type="button" className="adm-link" onClick={load}>
            Tekrar dene
          </button>
        </p>
      ) : !candidates ? (
        <p className="adm-field__hint" role="status">
          Ürünler yükleniyor…
        </p>
      ) : candidates.length ? (
        <Combobox
          id="vx-link"
          label="Bağlanacak ürün"
          placeholder="Ürün adı veya renk yazın"
          options={candidates.map((item) => ({ value: item.id, label: `${item.name} – ${item.color}`, hint: item.status === 'PUBLISHED' ? 'yayında' : 'taslak' }))}
          value=""
          onChange={(id) => {
            const picked = candidates.find((item) => item.id === id);
            if (picked) onPick(picked);
          }}
          disabled={disabled}
        />
      ) : (
        <p className="adm-field__hint">Bu kategoride bağlanabilecek başka ürün yok.</p>
      )}
      <button type="button" className="adm-link" onClick={() => setOpen(false)}>
        Kapat
      </button>
    </div>
  );
}
