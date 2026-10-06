import type { StoreSettingsValues } from '@/lib/settings/shared';

export type Sender = { name: string; phone: string; address: string; district: string; city: string };

const REQUIRED: [keyof Sender, keyof StoreSettingsValues, string][] = [
  ['name', 'senderName', 'gönderici adı'],
  ['phone', 'senderPhone', 'telefon'],
  ['address', 'senderAddress', 'adres'],
  ['district', 'senderDistrict', 'ilçe'],
  ['city', 'senderCity', 'il'],
];

/** The sender block of a label, from store settings. Pure; a label is not printed while anything is missing. */
export function senderFromSettings(settings: Pick<StoreSettingsValues, 'senderName' | 'senderPhone' | 'senderAddress' | 'senderDistrict' | 'senderCity'>):
  | { complete: true; sender: Sender }
  | { complete: false; missing: string[] } {
  const missing = REQUIRED.filter(([, key]) => !String(settings[key as keyof typeof settings] ?? '').trim()).map(([, , label]) => label);
  if (missing.length) return { complete: false, missing };
  return {
    complete: true,
    sender: {
      name: String(settings.senderName).trim(),
      phone: String(settings.senderPhone).trim(),
      address: String(settings.senderAddress).trim(),
      district: String(settings.senderDistrict).trim(),
      city: String(settings.senderCity).trim(),
    },
  };
}
