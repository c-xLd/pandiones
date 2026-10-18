/**
 * Homepage configuration types, defaults and validation rules.
 * Shared between the admin edit form (client) and Route Handler / server.
 * Zero Next.js or Prisma imports so it can run everywhere.
 */

export type HeroConfig = {
  eyebrow: string;
  title: string;
  sideText: string;
  buttonText: string;
  buttonHref: string;
  modelImage: string;
  modelAlt: string;
  stillImage: string;
  stillAlt: string;
};

export type CategoryStoryCard = {
  id: string;
  title: string;
  badge: string;
  href: string;
  image: string;
  alt: string;
};

export type NightCampaignConfig = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  buttonText: string;
  buttonHref: string;
  image1: string;
  alt1: string;
  image2: string;
  alt2: string;
};

export type CollectionGridConfig = {
  productCount: number;
  title: string;
};

export type ProductStoryItem = {
  id: string;
  slug: string;
  image1: string;
  alt1: string;
  image2: string;
  alt2: string;
};

export type ProductStoriesConfig = {
  enabled: boolean;
  stories: ProductStoryItem[];
};

export type CampaignVideoConfig = {
  enabled: boolean;
  src: string;
  poster: string;
  eyebrow: string;
  title: string;
  buttonText: string;
  buttonHref: string;
};

export type BrandStoryConfig = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  lead: string;
  laceImage: string;
  satinImage: string;
};

export type HomePageConfig = {
  hero: HeroConfig;
  categoryStories: CategoryStoryCard[];
  nightCampaign: NightCampaignConfig;
  collectionGrid: CollectionGridConfig;
  productStories: ProductStoriesConfig;
  campaignVideo: CampaignVideoConfig;
  brandStory: BrandStoryConfig;
  updatedAt: string | null;
};

export const HOMEPAGE_DEFAULTS: Omit<HomePageConfig, 'updatedAt'> = {
  hero: {
    eyebrow: 'İÇ GİYİM & EV GİYİM',
    title: 'Kendine yakın.',
    sideText: 'PANDIONES / YENİ KOLEKSİYON',
    buttonText: 'YENİ GELENLERİ KEŞFET',
    buttonHref: '/yeni-gelenler',
    modelImage: '/assets/home/siyah-crop-2.webp',
    modelAlt: 'Pandiones yeni sezon siyah fitilli crop',
    stillImage: '/assets/home/beyaz-crop-2.webp',
    stillAlt: 'Beyaz crop stüdyo detayı ve kalıp dikişleri',
  },
  categoryStories: [
    {
      id: 'ic-giyim',
      title: 'Siyahın zarafeti.',
      badge: 'İÇ GİYİM ↗',
      href: '/ic-giyim',
      image: '/assets/home/siyah-crop-1.webp',
      alt: 'Siyah crop takım',
    },
    {
      id: 'ev-giyim',
      title: 'Dingin sadelik.',
      badge: 'EV GİYİM ↗',
      href: '/ev-giyim',
      image: '/assets/campaign-chocolate.webp',
      alt: 'Kahve saten sabahlık ev giyim',
    },
    {
      id: 'dantel-takimlar',
      title: 'İnce ayrıntılar.',
      badge: 'TAKIMLARI KEŞFET ↗',
      href: '/ic-giyim/dantel-takimlar',
      image: '/assets/home/pembe-balen-3.webp',
      alt: 'Pembe balenli dantel takım detayları',
    },
  ],
  nightCampaign: {
    enabled: true,
    eyebrow: 'DOĞAL VE ÖZGÜR SİLÜETLER',
    title: 'Kendi ritminde.',
    buttonText: 'PARÇALARI KEŞFET',
    buttonHref: '/yeni-gelenler',
    image1: '/assets/home/siyah-crop-6.webp',
    alt1: 'Siyah fitilli crop ile oturur editoryal poz',
    image2: '/assets/home/siyah-crop-7.webp',
    alt2: 'Siyah fitilli crop yaka ve askı detayı',
  },
  collectionGrid: {
    productCount: 8,
    title: 'Yeni gelenler',
  },
  productStories: {
    enabled: true,
    stories: [
      {
        id: 'pembe-balen',
        slug: 'pembe-balen',
        image1: '/assets/home/pembe-balen-1.webp',
        alt1: 'Pembe balenli dantel takım önden',
        image2: '/assets/home/pembe-balen-2.webp',
        alt2: 'Pembe balenli dantel takımın dantel ve balen detayı',
      },
      {
        id: 'beyaz-crop',
        slug: 'beyaz-crop',
        image1: '/assets/home/beyaz-crop-6.webp',
        alt1: 'Beyaz fitilli crop manken üzerinde, oturur poz',
        image2: '/assets/home/beyaz-crop-7.webp',
        alt2: 'Beyaz fitilli crop yaka ve askı detayı',
      },
    ],
  },
  campaignVideo: {
    enabled: true,
    src: '/assets/Create_fashion.mp4',
    poster: '/assets/home/kampanya-poster.jpg',
    eyebrow: 'YENİ SEZON',
    title: 'Her adımda sen.',
    buttonText: 'YENİ GELENLERİ KEŞFET',
    buttonHref: '/yeni-gelenler',
  },
  brandStory: {
    enabled: true,
    eyebrow: 'Hikâyemiz',
    title: 'En güzel his,\nkendin olmak.',
    lead: 'Dantelin inceliği, satenin hafifliği.\nSana ait anların, sana yakın parçaları.',
    laceImage: '/assets/lace.webp',
    satinImage: '/assets/satin.webp',
  },
};

export type HomePageErrors = Record<string, string>;

const BANNED_PATTERNS = [
  /\bat[oö]lye\b/iu,
  /\batelier\b/iu,
  /\bmaison\b/iu,
  /\b[iİıI]stanbul\b/iu,
];

const validateText = (value: unknown, field: string, maxLen = 200, required = true): string | null => {
  if (value === undefined || value === null || value === '') {
    return required ? 'Bu alan zorunludur.' : null;
  }
  if (typeof value !== 'string') return 'Geçersiz metin.';
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return 'Bu alan zorunludur.';
  if (trimmed.length > maxLen) return `En çok ${maxLen} karakter olabilir.`;
  const lower = trimmed.toLocaleLowerCase('tr-TR');
  for (const banned of BANNED_PATTERNS) {
    if (banned.test(trimmed) || banned.test(lower)) {
      return 'Marka kurallarına aykırı ifade içeriyor.';
    }
  }
  return null;
};

const validateHref = (value: unknown, field: string): string | null => {
  const textErr = validateText(value, field, 500, true);
  if (textErr) return textErr;
  const str = String(value).trim();
  if (str === '#' || str.startsWith('#')) {
    if (str !== '#hikayemiz' && str !== '#collection') {
      return 'Geçerli bir sayfa bağlantısı olmalıdır (örn. /yeni-gelenler).';
    }
  }
  if (!str.startsWith('/') && !str.startsWith('https://') && !str.startsWith('#')) {
    return 'Bağlantı "/" veya "https://" ile başlamalıdır.';
  }
  return null;
};

const validateImage = (value: unknown, field: string): string | null => {
  const textErr = validateText(value, field, 500, true);
  if (textErr) return textErr;
  const str = String(value).trim();
  if (!str.startsWith('/') && !str.startsWith('https://')) {
    return 'Görsel yolu "/" veya "https://" ile başlamalıdır.';
  }
  return null;
};

export type ValidationResult =
  | { ok: true; values: Omit<HomePageConfig, 'updatedAt'> }
  | { ok: false; errors: HomePageErrors };

export function validateHomePageConfig(input: unknown): ValidationResult {
  const errors: HomePageErrors = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { _general: 'Geçersiz veri biçimi.' } };
  }

  const raw = input as Record<string, any>;
  const hero = raw.hero || {};
  const categoryStories = Array.isArray(raw.categoryStories) ? raw.categoryStories : [];
  const nightCampaign = raw.nightCampaign || {};
  const collectionGrid = raw.collectionGrid || {};
  const productStories = raw.productStories || {};
  const campaignVideo = raw.campaignVideo || {};
  const brandStory = raw.brandStory || {};

  // 1. Hero validation
  const heroEyebrowErr = validateText(hero.eyebrow, 'hero.eyebrow', 60);
  if (heroEyebrowErr) errors['hero.eyebrow'] = heroEyebrowErr;

  const heroTitleErr = validateText(hero.title, 'hero.title', 120);
  if (heroTitleErr) errors['hero.title'] = heroTitleErr;

  const heroSideTextErr = validateText(hero.sideText, 'hero.sideText', 80);
  if (heroSideTextErr) errors['hero.sideText'] = heroSideTextErr;

  const heroBtnErr = validateText(hero.buttonText, 'hero.buttonText', 60);
  if (heroBtnErr) errors['hero.buttonText'] = heroBtnErr;

  const heroHrefErr = validateHref(hero.buttonHref, 'hero.buttonHref');
  if (heroHrefErr) errors['hero.buttonHref'] = heroHrefErr;

  const heroModelImgErr = validateImage(hero.modelImage, 'hero.modelImage');
  if (heroModelImgErr) errors['hero.modelImage'] = heroModelImgErr;

  const heroModelAltErr = validateText(hero.modelAlt, 'hero.modelAlt', 160);
  if (heroModelAltErr) errors['hero.modelAlt'] = heroModelAltErr;

  const heroStillImgErr = validateImage(hero.stillImage, 'hero.stillImage');
  if (heroStillImgErr) errors['hero.stillImage'] = heroStillImgErr;

  const heroStillAltErr = validateText(hero.stillAlt, 'hero.stillAlt', 160);
  if (heroStillAltErr) errors['hero.stillAlt'] = heroStillAltErr;

  // 2. Category Stories validation
  if (categoryStories.length === 0) {
    errors['categoryStories'] = 'En az 1 kategori hikâyesi bulunmalıdır.';
  } else {
    categoryStories.forEach((card: any, idx: number) => {
      const tErr = validateText(card.title, `categoryStories.${idx}.title`, 80);
      if (tErr) errors[`categoryStories.${idx}.title`] = tErr;

      const bErr = validateText(card.badge, `categoryStories.${idx}.badge`, 40);
      if (bErr) errors[`categoryStories.${idx}.badge`] = bErr;

      const hErr = validateHref(card.href, `categoryStories.${idx}.href`);
      if (hErr) errors[`categoryStories.${idx}.href`] = hErr;

      const iErr = validateImage(card.image, `categoryStories.${idx}.image`);
      if (iErr) errors[`categoryStories.${idx}.image`] = iErr;

      const aErr = validateText(card.alt, `categoryStories.${idx}.alt`, 160);
      if (aErr) errors[`categoryStories.${idx}.alt`] = aErr;
    });
  }

  // 3. Night Campaign validation
  if (nightCampaign.enabled) {
    const ncEyeErr = validateText(nightCampaign.eyebrow, 'nightCampaign.eyebrow', 80);
    if (ncEyeErr) errors['nightCampaign.eyebrow'] = ncEyeErr;

    const ncTitleErr = validateText(nightCampaign.title, 'nightCampaign.title', 120);
    if (ncTitleErr) errors['nightCampaign.title'] = ncTitleErr;

    const ncBtnErr = validateText(nightCampaign.buttonText, 'nightCampaign.buttonText', 60);
    if (ncBtnErr) errors['nightCampaign.buttonText'] = ncBtnErr;

    const ncHrefErr = validateHref(nightCampaign.buttonHref, 'nightCampaign.buttonHref');
    if (ncHrefErr) errors['nightCampaign.buttonHref'] = ncHrefErr;

    const ncImg1Err = validateImage(nightCampaign.image1, 'nightCampaign.image1');
    if (ncImg1Err) errors['nightCampaign.image1'] = ncImg1Err;

    const ncImg2Err = validateImage(nightCampaign.image2, 'nightCampaign.image2');
    if (ncImg2Err) errors['nightCampaign.image2'] = ncImg2Err;
  }

  // 4. Collection grid validation
  const count = Number(collectionGrid.productCount);
  if (!Number.isInteger(count) || count < 2 || count > 24) {
    errors['collectionGrid.productCount'] = 'Ürün adedi 2 ile 24 arasında tam sayı olmalıdır.';
  }

  // 5. Product stories validation
  const storiesList = Array.isArray(productStories.stories) ? productStories.stories : [];
  storiesList.forEach((story: any, idx: number) => {
    const slugErr = validateText(story.slug, `productStories.stories.${idx}.slug`, 100);
    if (slugErr) errors[`productStories.stories.${idx}.slug`] = slugErr;

    const i1Err = validateImage(story.image1, `productStories.stories.${idx}.image1`);
    if (i1Err) errors[`productStories.stories.${idx}.image1`] = i1Err;

    const i2Err = validateImage(story.image2, `productStories.stories.${idx}.image2`);
    if (i2Err) errors[`productStories.stories.${idx}.image2`] = i2Err;
  });

  // 6. Campaign video validation
  if (campaignVideo.enabled) {
    const vSrcErr = validateText(campaignVideo.src, 'campaignVideo.src', 500);
    if (vSrcErr) errors['campaignVideo.src'] = vSrcErr;

    const vPosterErr = validateImage(campaignVideo.poster, 'campaignVideo.poster');
    if (vPosterErr) errors['campaignVideo.poster'] = vPosterErr;

    const vTitleErr = validateText(campaignVideo.title, 'campaignVideo.title', 120);
    if (vTitleErr) errors['campaignVideo.title'] = vTitleErr;

    const vBtnErr = validateText(campaignVideo.buttonText, 'campaignVideo.buttonText', 60);
    if (vBtnErr) errors['campaignVideo.buttonText'] = vBtnErr;

    const vHrefErr = validateHref(campaignVideo.buttonHref, 'campaignVideo.buttonHref');
    if (vHrefErr) errors['campaignVideo.buttonHref'] = vHrefErr;
  }

  // 7. Brand story validation
  if (brandStory.enabled) {
    const bEyeErr = validateText(brandStory.eyebrow, 'brandStory.eyebrow', 60);
    if (bEyeErr) errors['brandStory.eyebrow'] = bEyeErr;

    const bTitleErr = validateText(brandStory.title, 'brandStory.title', 160);
    if (bTitleErr) errors['brandStory.title'] = bTitleErr;

    const bLeadErr = validateText(brandStory.lead, 'brandStory.lead', 300);
    if (bLeadErr) errors['brandStory.lead'] = bLeadErr;

    const bLaceErr = validateImage(brandStory.laceImage, 'brandStory.laceImage');
    if (bLaceErr) errors['brandStory.laceImage'] = bLaceErr;

    const bSatinErr = validateImage(brandStory.satinImage, 'brandStory.satinImage');
    if (bSatinErr) errors['brandStory.satinImage'] = bSatinErr;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const values: Omit<HomePageConfig, 'updatedAt'> = {
    hero: {
      eyebrow: String(hero.eyebrow).trim(),
      title: String(hero.title).trim(),
      sideText: String(hero.sideText).trim(),
      buttonText: String(hero.buttonText).trim(),
      buttonHref: String(hero.buttonHref).trim(),
      modelImage: String(hero.modelImage).trim(),
      modelAlt: String(hero.modelAlt).trim(),
      stillImage: String(hero.stillImage).trim(),
      stillAlt: String(hero.stillAlt).trim(),
    },
    categoryStories: categoryStories.map((c: any, i: number) => ({
      id: String(c.id || `card-${i + 1}`).trim(),
      title: String(c.title).trim(),
      badge: String(c.badge).trim(),
      href: String(c.href).trim(),
      image: String(c.image).trim(),
      alt: String(c.alt).trim(),
    })),
    nightCampaign: {
      enabled: Boolean(nightCampaign.enabled),
      eyebrow: String(nightCampaign.eyebrow || '').trim(),
      title: String(nightCampaign.title || '').trim(),
      buttonText: String(nightCampaign.buttonText || '').trim(),
      buttonHref: String(nightCampaign.buttonHref || '').trim(),
      image1: String(nightCampaign.image1 || '').trim(),
      alt1: String(nightCampaign.alt1 || '').trim(),
      image2: String(nightCampaign.image2 || '').trim(),
      alt2: String(nightCampaign.alt2 || '').trim(),
    },
    collectionGrid: {
      productCount: count,
      title: String(collectionGrid.title || 'Yeni gelenler').trim(),
    },
    productStories: {
      enabled: Boolean(productStories.enabled),
      stories: storiesList.map((s: any, i: number) => ({
        id: String(s.id || `story-${i + 1}`).trim(),
        slug: String(s.slug).trim(),
        image1: String(s.image1).trim(),
        alt1: String(s.alt1).trim(),
        image2: String(s.image2).trim(),
        alt2: String(s.alt2).trim(),
      })),
    },
    campaignVideo: {
      enabled: Boolean(campaignVideo.enabled),
      src: String(campaignVideo.src || '').trim(),
      poster: String(campaignVideo.poster || '').trim(),
      eyebrow: String(campaignVideo.eyebrow || '').trim(),
      title: String(campaignVideo.title || '').trim(),
      buttonText: String(campaignVideo.buttonText || '').trim(),
      buttonHref: String(campaignVideo.buttonHref || '').trim(),
    },
    brandStory: {
      enabled: Boolean(brandStory.enabled),
      eyebrow: String(brandStory.eyebrow || '').trim(),
      title: String(brandStory.title || '').trim(),
      lead: String(brandStory.lead || '').trim(),
      laceImage: String(brandStory.laceImage || '').trim(),
      satinImage: String(brandStory.satinImage || '').trim(),
    },
  };

  return { ok: true, values };
}

export function diffHomePageConfig(
  before: Omit<HomePageConfig, 'updatedAt'>,
  after: Omit<HomePageConfig, 'updatedAt'>,
): Record<string, [unknown, unknown]> {
  const diff: Record<string, [unknown, unknown]> = {};
  if (JSON.stringify(before.hero) !== JSON.stringify(after.hero)) {
    diff['hero'] = ['Hero güncellendi', 'Yeni hero'];
  }
  if (JSON.stringify(before.categoryStories) !== JSON.stringify(after.categoryStories)) {
    diff['categoryStories'] = ['Kategori hikâyeleri güncellendi', 'Yeni kategori hikâyeleri'];
  }
  if (JSON.stringify(before.nightCampaign) !== JSON.stringify(after.nightCampaign)) {
    diff['nightCampaign'] = [before.nightCampaign.enabled ? 'Açık' : 'Kapalı', after.nightCampaign.enabled ? 'Açık' : 'Kapalı'];
  }
  if (before.collectionGrid.productCount !== after.collectionGrid.productCount) {
    diff['collectionGrid.productCount'] = [before.collectionGrid.productCount, after.collectionGrid.productCount];
  }
  if (JSON.stringify(before.productStories) !== JSON.stringify(after.productStories)) {
    diff['productStories'] = ['Ürün hikâyeleri güncellendi', 'Yeni ürün hikâyeleri'];
  }
  if (JSON.stringify(before.campaignVideo) !== JSON.stringify(after.campaignVideo)) {
    diff['campaignVideo'] = [before.campaignVideo.enabled ? 'Açık' : 'Kapalı', after.campaignVideo.enabled ? 'Açık' : 'Kapalı'];
  }
  if (JSON.stringify(before.brandStory) !== JSON.stringify(after.brandStory)) {
    diff['brandStory'] = ['Hikâyemiz güncellendi', 'Yeni hikâyemiz'];
  }
  return diff;
}
