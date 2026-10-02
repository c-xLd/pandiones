/** Store settings shared by the admin form (client) and the server. No Prisma, no Next imports:
 *  the form validates with the same rules the API enforces. */

export type StoreSettingsValues = {
  storeName: string;
  contactEmail: string;
  contactPhone: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  pinterestUrl: string | null;
  shippingFee: number;
  freeShippingThreshold: number | null;
  announcementEnabled: boolean;
  announcementText: string | null;
  announcementHref: string | null;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  seoTitle: string;
  seoDescription: string;
  lowStockThreshold: number;
};

export type StoreSettings = StoreSettingsValues & {
  /** null while the row has never been saved and the defaults are in use. */
  updatedAt: string | null;
};

export const SETTINGS_FIELDS = [
  'storeName',
  'contactEmail',
  'contactPhone',
  'whatsappNumber',
  'instagramUrl',
  'tiktokUrl',
  'pinterestUrl',
  'shippingFee',
  'freeShippingThreshold',
  'announcementEnabled',
  'announcementText',
  'announcementHref',
  'maintenanceEnabled',
  'maintenanceMessage',
  'seoTitle',
  'seoDescription',
  'lowStockThreshold',
] as const satisfies readonly (keyof StoreSettingsValues)[];

/** What the site used before settings existed: the same title, description, inbox and WhatsApp env value. */
export const SETTINGS_DEFAULTS: StoreSettingsValues = {
  storeName: 'Pandiones',
  contactEmail: 'destek@pandiones.com',
  contactPhone: null,
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || null,
  instagramUrl: null,
  tiktokUrl: null,
  pinterestUrl: null,
  shippingFee: 0,
  freeShippingThreshold: null,
  announcementEnabled: false,
  announcementText: null,
  announcementHref: null,
  maintenanceEnabled: false,
  maintenanceMessage: null,
  seoTitle: 'PANDIONES — Görünmeyen zarafet',
  seoDescription: 'Pandiones iç giyim koleksiyonu. Zarif dantel, saten dokular ve kendine ayırdığın anlar.',
  lowStockThreshold: 3,
};

export const SETTINGS_LIMITS = {
  storeName: 60,
  announcementText: 140,
  maintenanceMessage: 280,
  seoTitle: 70,
  seoDescription: 170,
  money: 100_000,
  lowStock: 50,
} as const;

export type SettingsErrors = Partial<Record<keyof StoreSettingsValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const optionalText = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};
const requiredText = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());
const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

function isHttpsUrlOn(value: string, hosts: string[]): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    return url.protocol === 'https:' && hosts.includes(host);
  } catch {
    return false;
  }
}

/** A site path ("/yeni-gelenler") or an https URL. */
function isLinkTarget(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Normalises raw form/JSON input and returns the clean values or per-field Turkish messages.
 *  Unknown keys are ignored; every field is required in the input (the form always sends the full set). */
export function validateSettings(input: Record<string, unknown>):
  | { ok: true; values: StoreSettingsValues }
  | { ok: false; errors: SettingsErrors } {
  const errors: SettingsErrors = {};

  const storeName = requiredText(input.storeName);
  if (!storeName) errors.storeName = 'Mağaza adını girin.';
  else if (storeName.length > SETTINGS_LIMITS.storeName) errors.storeName = `En fazla ${SETTINGS_LIMITS.storeName} karakter.`;

  const contactEmail = requiredText(input.contactEmail).toLowerCase();
  if (!EMAIL.test(contactEmail)) errors.contactEmail = 'Geçerli bir e-posta adresi girin.';

  const contactPhone = optionalText(input.contactPhone);
  if (contactPhone && !/^\+?[\d\s()-]{10,20}$/.test(contactPhone)) errors.contactPhone = 'Telefonu 0555 555 55 55 biçiminde girin.';

  const whatsappRaw = optionalText(input.whatsappNumber);
  const whatsappNumber = whatsappRaw ? whatsappRaw.replace(/\D/g, '') : null;
  if (whatsappNumber && (whatsappNumber.length < 10 || whatsappNumber.length > 15)) {
    errors.whatsappNumber = 'Ülke koduyla girin: 905551234567.';
  }

  const social: [keyof StoreSettingsValues, string[], string][] = [
    ['instagramUrl', ['instagram.com'], 'https://instagram.com/... biçiminde girin.'],
    ['tiktokUrl', ['tiktok.com'], 'https://tiktok.com/@... biçiminde girin.'],
    ['pinterestUrl', ['pinterest.com', 'tr.pinterest.com'], 'https://pinterest.com/... biçiminde girin.'],
  ];
  const socialValues: Record<string, string | null> = {};
  for (const [field, hosts, message] of social) {
    const value = optionalText(input[field]);
    if (value && !isHttpsUrlOn(value, hosts)) errors[field] = message;
    socialValues[field] = value;
  }

  const shippingFee = toNumber(input.shippingFee) ?? 0;
  if (Number.isNaN(shippingFee) || shippingFee < 0 || shippingFee > SETTINGS_LIMITS.money) {
    errors.shippingFee = 'Kargo ücreti 0 veya pozitif bir tutar olmalı.';
  }
  const freeShippingThreshold = toNumber(input.freeShippingThreshold);
  if (freeShippingThreshold !== null && (Number.isNaN(freeShippingThreshold) || freeShippingThreshold <= 0 || freeShippingThreshold > SETTINGS_LIMITS.money)) {
    errors.freeShippingThreshold = 'Eşik boş bırakılabilir ya da pozitif bir tutar olmalı.';
  }

  const announcementEnabled = input.announcementEnabled === true || input.announcementEnabled === 'true';
  const announcementText = optionalText(input.announcementText);
  const announcementHref = optionalText(input.announcementHref);
  if (announcementEnabled && !announcementText) errors.announcementText = 'Duyuru açıkken metin gerekli.';
  else if (announcementText && announcementText.length > SETTINGS_LIMITS.announcementText) {
    errors.announcementText = `En fazla ${SETTINGS_LIMITS.announcementText} karakter.`;
  }
  if (announcementHref && !isLinkTarget(announcementHref)) errors.announcementHref = '/yeni-gelenler gibi bir yol ya da https:// adresi girin.';

  const maintenanceEnabled = input.maintenanceEnabled === true || input.maintenanceEnabled === 'true';
  const maintenanceMessage = optionalText(input.maintenanceMessage);
  if (maintenanceMessage && maintenanceMessage.length > SETTINGS_LIMITS.maintenanceMessage) {
    errors.maintenanceMessage = `En fazla ${SETTINGS_LIMITS.maintenanceMessage} karakter.`;
  }

  const seoTitle = requiredText(input.seoTitle);
  if (!seoTitle) errors.seoTitle = 'Site başlığını girin.';
  else if (seoTitle.length > SETTINGS_LIMITS.seoTitle) errors.seoTitle = `En fazla ${SETTINGS_LIMITS.seoTitle} karakter.`;
  const seoDescription = requiredText(input.seoDescription);
  if (!seoDescription) errors.seoDescription = 'Site açıklamasını girin.';
  else if (seoDescription.length > SETTINGS_LIMITS.seoDescription) errors.seoDescription = `En fazla ${SETTINGS_LIMITS.seoDescription} karakter.`;

  const lowStock = toNumber(input.lowStockThreshold);
  if (lowStock === null || Number.isNaN(lowStock) || !Number.isInteger(lowStock) || lowStock < 0 || lowStock > SETTINGS_LIMITS.lowStock) {
    errors.lowStockThreshold = `0 ile ${SETTINGS_LIMITS.lowStock} arasında tam sayı girin.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    values: {
      storeName,
      contactEmail,
      contactPhone,
      whatsappNumber,
      instagramUrl: socialValues.instagramUrl,
      tiktokUrl: socialValues.tiktokUrl,
      pinterestUrl: socialValues.pinterestUrl,
      shippingFee: Math.round(shippingFee * 100) / 100,
      freeShippingThreshold: freeShippingThreshold === null ? null : Math.round(freeShippingThreshold * 100) / 100,
      announcementEnabled,
      announcementText,
      announcementHref,
      maintenanceEnabled,
      maintenanceMessage,
      seoTitle,
      seoDescription,
      lowStockThreshold: lowStock as number,
    },
  };
}

/** Field → [before, after] for every value that changed. Used for the activity log. */
export function diffSettings(before: StoreSettingsValues, after: StoreSettingsValues) {
  const diff: Partial<Record<keyof StoreSettingsValues, [unknown, unknown]>> = {};
  for (const field of SETTINGS_FIELDS) {
    if (before[field] !== after[field]) diff[field] = [before[field], after[field]];
  }
  return diff;
}

export const SETTINGS_LABELS: Record<keyof StoreSettingsValues, string> = {
  storeName: 'Mağaza adı',
  contactEmail: 'İletişim e-postası',
  contactPhone: 'Telefon',
  whatsappNumber: 'WhatsApp',
  instagramUrl: 'Instagram',
  tiktokUrl: 'TikTok',
  pinterestUrl: 'Pinterest',
  shippingFee: 'Kargo ücreti',
  freeShippingThreshold: 'Ücretsiz kargo eşiği',
  announcementEnabled: 'Duyuru çubuğu',
  announcementText: 'Duyuru metni',
  announcementHref: 'Duyuru bağlantısı',
  maintenanceEnabled: 'Bakım modu',
  maintenanceMessage: 'Bakım mesajı',
  seoTitle: 'Site başlığı',
  seoDescription: 'Site açıklaması',
  lowStockThreshold: 'Düşük stok eşiği',
};

/** wa.me link for a configured number (digits only, country code first); null when unset or malformed. */
export function whatsappHref(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}
