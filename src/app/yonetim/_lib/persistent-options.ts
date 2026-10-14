'use client';

/**
 * Persistent options store for admin form selects.
 * Automatically saves custom entries added by the admin to localStorage
 * so that they can be selected in future product creation and edit flows.
 */

export const DEFAULT_COLORS = [
  'Siyah',
  'Beyaz',
  'Ekru',
  'Bej',
  'Pudra',
  'Şampanya',
  'Gece Mavisi',
  'Bordo',
  'Antrasit',
  'Vizon',
  'Zümrüt Yeşili',
  'Gül Kurusu',
  'Haki',
  'Lacivert',
  'Taş',
  'Kırmızı',
  'Fuşya',
  'Mürdüm',
  'Bebek Mavisi',
  'Karamel',
] as const;

export const DEFAULT_MATERIALS = [
  '%100 İpek Saten',
  '%100 Doğal İpek',
  '%92 İpek, %8 Elastan',
  '%100 Pamuk Saten',
  'Fransız Kupon Dantel & İpek',
  'Modal & İpek Karışımı',
  'İtalyan Tül & Dantel',
  '%95 Viskon, %5 Elastan',
  '%100 İtalyan Tülü',
] as const;

export const DEFAULT_CARE_INSTRUCTIONS = [
  '30°C hassas yıkama veya kuru temizleme',
  'Yalnızca profesyonel kuru temizleme',
  'Elde soğuk suda çitilemeden yıkayınız',
  'Düşük ısıda tersten buharsız ütüleyiniz',
  'Ağartıcı kullanılmaz, sererek kurutunuz',
  'Sıkma ve tamburlu kurutma yapılmaz',
] as const;

export const DEFAULT_DETAIL_PRESETS = [
  'Ayarlanabilir omuz askıları',
  'Fransız kupon dantel biyeli',
  'Gizli yan dikişler ve dökümlü silüet',
  'Balensiz nefes alan konfor kalıp',
  'El işçiliği biye detayları',
  'Sırtta ayarlanabilir kopça kapama',
  'Çıkarılabilir pedli kuplar',
] as const;

export type StorageKey =
  | 'pandiones_custom_colors'
  | 'pandiones_custom_sizes'
  | 'pandiones_custom_materials'
  | 'pandiones_custom_care'
  | 'pandiones_custom_details';

export function getPersistentOptions(key: StorageKey, defaults: readonly string[]): string[] {
  if (typeof window === 'undefined') return [...defaults];
  try {
    const raw = localStorage.getItem(key);
    const custom: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>();
    const result: string[] = [];
    for (const item of [...defaults, ...custom]) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!set.has(lower)) {
        set.add(lower);
        result.push(trimmed);
      }
    }
    return result;
  } catch {
    return [...defaults];
  }
}

export function persistCustomOption(key: StorageKey, value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    if (!existing.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...existing, trimmed];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch {
    return [];
  }
}

export function removePersistentOption(key: StorageKey, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const existing: string[] = JSON.parse(raw);
    const updated = existing.filter((item) => item.toLowerCase() !== value.trim().toLowerCase());
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/** Color hex mappings for realistic color swatch dots in the editor */
export const COLOR_SWATCH_MAP: Record<string, string> = {
  siyah: '#111111',
  beyaz: '#ffffff',
  ekru: '#fdfbf7',
  bej: '#e8dcce',
  pudra: '#f7dcdb',
  'pudra pembe': '#f7dcdb',
  'şeker pembe': '#f4a6b8',
  şampanya: '#fad6a5',
  'gece mavisi': '#131e3a',
  bordo: '#671927',
  antrasit: '#3c3d42',
  vizon: '#a59388',
  'zümrüt yeşili': '#164e3f',
  'gül kurusu': '#b3747b',
  haki: '#5f634f',
  lacivert: '#1a2942',
  taş: '#cfcbbe',
  kırmızı: '#b91c1c',
  fuşya: '#c026d3',
  mürdüm: '#581c87',
  'bebek mavisi': '#bae6fd',
  kahve: '#4a2c20',
  fildişi: '#fffff0',
  'pandiones noir': '#0a0a0a',
};

export function getColorSwatch(name: string): string {
  const clean = name.trim().toLowerCase();
  return COLOR_SWATCH_MAP[clean] || '#cccccc';
}
