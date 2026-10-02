'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import { isValidTurkishMobile } from '@/lib/checkout/form-validation';
import type { Address, AddressInput } from './useAddresses';

export const ADDRESS_TITLES = ['Ev', 'İş', 'Yazlık', 'Diğer'];

type Fields = Omit<AddressInput, 'id' | 'isDefault' | 'postalCode'> & { postalCode: string; isDefault: boolean };
type FieldErrors = Partial<Record<keyof Fields, string>>;

type AddressDialogProps = {
  open: boolean;
  address: Address | null;
  defaults: { recipient: string; phone: string; isFirst: boolean };
  onClose: () => void;
  onSave: (input: AddressInput) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const validate = (f: Fields): FieldErrors => {
  const errors: FieldErrors = {};
  if (!f.recipient.trim()) errors.recipient = 'Teslim alacak kişinin adını yazın.';
  if (!f.phone.trim()) errors.phone = 'Telefon numarası gerekli.';
  else if (!isValidTurkishMobile(f.phone)) errors.phone = '05XX XXX XX XX biçiminde bir cep telefonu yazın.';
  if (f.address.trim().length < 5) errors.address = 'Mahalle, sokak ve kapı numarasıyla açık adresi yazın.';
  if (!f.district.trim()) errors.district = 'İlçe gerekli.';
  if (!f.city.trim()) errors.city = 'İl gerekli.';
  if (f.postalCode.trim() && !/^\d{5}$/.test(f.postalCode.trim())) errors.postalCode = 'Posta kodu 5 haneli olmalı.';
  return errors;
};

export default function AddressDialog({ open, address, defaults, onClose, onSave }: AddressDialogProps) {
  const [fields, setFields] = useState<Fields>(() => emptyFields(defaults));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFields(
      address
        ? {
            title: address.title || 'Ev',
            recipient: address.recipient,
            phone: address.phone,
            address: address.address,
            district: address.district,
            city: address.city,
            postalCode: address.postalCode ?? '',
            isDefault: address.isDefault,
          }
        : emptyFields(defaults),
    );
    setErrors({});
    setFormError(null);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address?.id]);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const nextErrors = validate(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = Object.keys(nextErrors)[0];
      document.getElementById(`address-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const result = await onSave({
      ...(address ? { id: address.id } : {}),
      title: fields.title,
      recipient: fields.recipient.trim(),
      phone: fields.phone.trim(),
      address: fields.address.trim(),
      district: fields.district.trim(),
      city: fields.city.trim(),
      postalCode: fields.postalCode.trim() || null,
      isDefault: fields.isDefault,
    });
    setSubmitting(false);
    if (result.ok) setSaved(true);
    else setFormError(result.error);
  };

  return (
    <Dialog open={open} onClose={onClose} title={address ? 'Adresi düzenle' : 'Yeni adres'} eyebrow="Teslimat adresi">
      {saved ? (
        <div className="dialog-result">
          <Notice tone="success" role="status">
            <p>{address ? 'Adres güncellendi.' : 'Adres kaydedildi.'}</p>
          </Notice>
          <button type="button" className="btn btn--primary btn--block" onClick={onClose} data-autofocus>
            Kapat
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {formError ? <p className="form-alert form-alert--error" role="alert">{formError}</p> : null}

          <fieldset className="choice-row">
            <legend className="field__label">Adres adı</legend>
            {ADDRESS_TITLES.map((title) => (
              <label key={title} className="segment">
                <input type="radio" name="address-title" value={title} checked={fields.title === title} onChange={() => set('title', title)} />
                <span>{title}</span>
              </label>
            ))}
          </fieldset>

          <div className="form-row">
            <FormField id="address-recipient" label="Ad soyad" required error={errors.recipient}>
              <input type="text" autoComplete="name" value={fields.recipient} onChange={(e) => set('recipient', e.target.value)} />
            </FormField>
            <FormField id="address-phone" label="Cep telefonu" required error={errors.phone}>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" value={fields.phone} onChange={(e) => set('phone', e.target.value)} />
            </FormField>
          </div>

          <FormField id="address-address" label="Açık adres" required error={errors.address} hint="Mahalle, sokak, bina ve daire numarası">
            <textarea rows={3} autoComplete="street-address" value={fields.address} onChange={(e) => set('address', e.target.value)} />
          </FormField>

          <div className="form-row form-row--3">
            <FormField id="address-district" label="İlçe" required error={errors.district}>
              <input type="text" autoComplete="address-level2" value={fields.district} onChange={(e) => set('district', e.target.value)} />
            </FormField>
            <FormField id="address-city" label="İl" required error={errors.city}>
              <input type="text" autoComplete="address-level1" value={fields.city} onChange={(e) => set('city', e.target.value)} />
            </FormField>
            <FormField id="address-postalCode" label="Posta kodu" optional error={errors.postalCode}>
              <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={fields.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
            </FormField>
          </div>

          <label className="account-check">
            <input type="checkbox" checked={fields.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
            <span>Varsayılan teslimat adresim olsun</span>
          </label>

          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="btn btn--primary" aria-busy={submitting || undefined} disabled={submitting}>
              {address ? 'Değişiklikleri kaydet' : 'Adresi kaydet'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function emptyFields(defaults: AddressDialogProps['defaults']): Fields {
  return {
    title: 'Ev',
    recipient: defaults.recipient,
    phone: defaults.phone,
    address: '',
    district: '',
    city: '',
    postalCode: '',
    isDefault: defaults.isFirst,
  };
}
