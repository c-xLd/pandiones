import React from 'react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { loadHomeCollection } from '@/lib/products/load-collection';
import { getHomePageConfig } from '@/lib/homepage/server';
import { ALL_PRODUCTS_HREF, categoryHref, productHref, subcategoryHref } from '@/lib/routes';
import HomeProductGrid from '../_home/HomeProductGrid';
import GuideTile from '../_home/GuideTile';
import HomeVideo from '../_home/HomeVideo';

// Rendered per request (the video check reads the file system), but the products come from a 60 s cache
// (tag "catalog", cleared on publish/unpublish), so the page answers without waiting for the database.
export const dynamic = 'force-dynamic';

/** How many of the newest pieces the home grid shows; the rest are on /yeni-gelenler. */
const HOME_PRODUCT_COUNT = 8;

/** Two large product stories under the grid: each pairs two real photos of one product.
 *  Only portrait originals (≥1000 px wide): a wide photo cropped into these tall frames is blurry.
 *  Name, colour and link come from the live product; an unpublished product's story is not shown. */
const PRODUCT_STORIES = [
  {
    slug: 'pembe-balen',
    images: [
      { src: '/assets/home/pembe-balen-1.webp', alt: 'Pembe balenli dantel takım önden' },
      { src: '/assets/home/pembe-balen-2.webp', alt: 'Pembe balenli dantel takımın dantel ve balen detayı' },
    ],
  },
  {
    slug: 'beyaz-crop',
    images: [
      { src: '/assets/home/beyaz-crop-6.webp', alt: 'Beyaz fitilli crop manken üzerinde, oturur poz' },
      { src: '/assets/home/beyaz-crop-7.webp', alt: 'Beyaz fitilli crop yaka ve askı detayı' },
    ],
  },
] as const;

/** Hero and night campaign are full width on mobile/tablet (<=900px) and half on desktop (50vw). */
const HERO_FRAME_SIZES = '(max-width: 900px) 100vw, 50vw';

/** Product stories display two photos side by side across mobile and desktop. */
const STORY_FRAME_SIZES = '(max-width: 900px) 50vw, 50vw';

/** The campaign video is a file added by hand; until it exists the section is not rendered. */
const HOME_VIDEO = { src: '/assets/Create_fashion.mp4', poster: '/assets/home/kampanya-poster.jpg' };
const publicFileExists = (publicPath: string) => existsSync(path.join(process.cwd(), 'public', publicPath));

const createdTime = (product: Product) => {
  const value = (product as Product & { createdAt?: string }).createdAt;
  return value ? Date.parse(value) : 0;
};

export default async function HomePage() {
  // Read on the server so the first HTML already carries the products and homepage config.
  const [data, homeConfig] = await Promise.all([
    loadHomeCollection(),
    getHomePageConfig(),
  ]);

  const newest = [...data.products].sort((a, b) => createdTime(b) - createdTime(a));

  const stories = homeConfig.productStories.enabled
    ? homeConfig.productStories.stories.flatMap((story) => {
        const product = data.products.find((p) => p.slug === story.slug);
        if (!product) return [];
        return [
          {
            product,
            images: [
              { src: story.image1, alt: story.alt1 || product.name },
              { src: story.image2, alt: story.alt2 || `${product.name} detay` },
            ],
          },
        ];
      })
    : [];

  const videoConfig = homeConfig.campaignVideo;
  const video =
    videoConfig.enabled && (publicFileExists(videoConfig.src) || videoConfig.src.startsWith('http'))
      ? {
          src: videoConfig.src,
          poster:
            videoConfig.poster && (publicFileExists(videoConfig.poster) || videoConfig.poster.startsWith('http'))
              ? videoConfig.poster
              : undefined,
        }
      : null;

  const gridLimit = homeConfig.collectionGrid.productCount || HOME_PRODUCT_COUNT;

  return (
    <main id="main">
      {/* 1. HERO CAMPAIGN */}
      <section className="campaign hero" aria-labelledby="hero-title">
        <div className="campaign-pictures">
          <Image
            className="campaign-model"
            src={homeConfig.hero.modelImage}
            alt={homeConfig.hero.modelAlt}
            priority
            width={1122}
            height={1402}
            sizes={HERO_FRAME_SIZES}
          />
          {/* Hidden below 900px; lazy, so a phone never downloads it. */}
          <Image
            className="campaign-still"
            src={homeConfig.hero.stillImage}
            alt={homeConfig.hero.stillAlt}
            loading="lazy"
            width={1086}
            height={1448}
            sizes="(max-width: 900px) 50vw, 65vw"
          />
        </div>
        <div className="campaign-caption">
          <p className="eyebrow">{homeConfig.hero.eyebrow}</p>
          <h1 id="hero-title">{homeConfig.hero.title}</h1>
          <Link className="campaign-link" href={homeConfig.hero.buttonHref || ALL_PRODUCTS_HREF}>
            {homeConfig.hero.buttonText} <span>↗</span>
          </Link>
        </div>
        <span className="campaign-side">{homeConfig.hero.sideText}</span>
      </section>

      {/* 3. CATEGORY STORIES */}
      <section className="category-stories" aria-label="Kategorileri keşfet">
        {homeConfig.categoryStories.map((card, idx) => (
          <Link
            key={card.id || idx}
            className={`category-card${idx === 2 ? ' category-detail' : ''}`}
            href={card.href}
          >
            <Image
              src={card.image}
              alt={card.alt}
              loading="lazy"
              width={1086}
              height={1448}
              sizes="(max-width: 900px) 50vw, 33vw"
            />
            <div>
              <h2>{card.title}</h2>
              <span>{card.badge}</span>
            </div>
          </Link>
        ))}
      </section>

      {/* 4. NIGHT CAMPAIGN */}
      {homeConfig.nightCampaign.enabled && (
        <section className="campaign night-campaign" aria-labelledby="night-title">
          <div className="campaign-pictures">
            <Image
              src={homeConfig.nightCampaign.image1}
              alt={homeConfig.nightCampaign.alt1}
              loading="lazy"
              width={1122}
              height={1402}
              sizes={HERO_FRAME_SIZES}
            />
            <Image
              src={homeConfig.nightCampaign.image2}
              alt={homeConfig.nightCampaign.alt2}
              loading="lazy"
              width={1122}
              height={1402}
              sizes="(max-width: 900px) 50vw, 65vw"
            />
          </div>
          <div className="campaign-caption">
            <p className="eyebrow">{homeConfig.nightCampaign.eyebrow}</p>
            <h2 id="night-title">{homeConfig.nightCampaign.title}</h2>
            <Link className="campaign-link" href={homeConfig.nightCampaign.buttonHref || ALL_PRODUCTS_HREF}>
              {homeConfig.nightCampaign.buttonText} <span>↗</span>
            </Link>
          </div>
        </section>
      )}

      {/* 5. EDITORIAL COLLECTION GRID — the newest pieces */}
      <section id="collection" className="collection" aria-label={homeConfig.collectionGrid.title || 'Yeni gelenler'}>
        <HomeProductGrid
          products={newest.slice(0, gridLimit)}
          error={data.error}
        />
      </section>

      {/* 5b. PRODUCT STORIES — large two-up campaigns */}
      {stories.map(({ product, images }, index) => (
        <section
          key={product.slug}
          className="campaign product-story"
          aria-labelledby={`story-${index}-title`}
        >
          <div className="campaign-pictures">
            {images.map((image) => (
              <Image
                key={image.src}
                src={image.src}
                alt={image.alt}
                loading="lazy"
                width={1086}
                height={1448}
                sizes={STORY_FRAME_SIZES}
              />
            ))}
          </div>
          <div className="campaign-caption">
            <p className="eyebrow">
              {product.category === 'ev-giyim' ? 'EV GİYİM' : 'İÇ GİYİM'} · {product.color.toLocaleUpperCase('tr-TR')}
            </p>
            <h2 id={`story-${index}-title`}>{product.name}</h2>
            <Link className="campaign-link" href={productHref(product.slug)}>
              ÜRÜNÜ İNCELE <span>↗</span>
            </Link>
          </div>
        </section>
      ))}

      {/* 5c. CAMPAIGN VIDEO */}
      {video ? (
        <HomeVideo src={video.src} poster={video.poster} label="Pandiones kampanya videosu">
          <p className="eyebrow">{videoConfig.eyebrow}</p>
          <h2>{videoConfig.title}</h2>
          <Link className="campaign-link" href={videoConfig.buttonHref || ALL_PRODUCTS_HREF}>
            {videoConfig.buttonText} <span>↗</span>
          </Link>
        </HomeVideo>
      ) : null}

      {/* 6. BRAND STORY */}
      {homeConfig.brandStory.enabled && (
        <section className="brand-story" id="hikayemiz" aria-labelledby="brand-story-title">
          <div className="brand-story__media">
            <figure className="brand-story__frame brand-story__frame--lace">
              <Image
                src={homeConfig.brandStory.laceImage}
                alt="Dantel kumaş dokusu ve ince detayları"
                loading="lazy"
                width={1086}
                height={1448}
                sizes="(max-width: 900px) 60vw, 30vw"
              />
              <figcaption>Dantel</figcaption>
            </figure>
            <figure className="brand-story__frame brand-story__frame--satin">
              <Image
                src={homeConfig.brandStory.satinImage}
                alt="Saten kumaş dokusu ve dökümlü yüzey"
                loading="lazy"
                width={1086}
                height={1448}
                sizes="(max-width: 900px) 60vw, 30vw"
              />
              <figcaption>Saten</figcaption>
            </figure>
          </div>
          <div className="brand-story__copy">
            <p className="eyebrow">{homeConfig.brandStory.eyebrow}</p>
            <h2 id="brand-story-title" style={{ whiteSpace: 'pre-line' }}>
              {homeConfig.brandStory.title}
            </h2>
            <p className="brand-story__lead" style={{ whiteSpace: 'pre-line' }}>
              {homeConfig.brandStory.lead}
            </p>
            <nav className="brand-story__links" aria-label="Pandiones'i tanı">
              <Link href={ALL_PRODUCTS_HREF}>Yeni gelenler</Link>
              <Link href="/stil-rehberi">Stil rehberi</Link>
              <Link href="/bakim-rehberi">Bakım rehberi</Link>
            </nav>
          </div>
        </section>
      )}

      {/* 7. SERVICE STORIES — the four guides */}
      <section className="service-stories" aria-label="Rehberler">
        <Link className="service-tile" href="/stil-rehberi">
          <Image
            src="/assets/home/beyaz-crop-5.webp"
            alt="Kesimler ve stil önerileri"
            loading="lazy"
            width={1086}
            height={1448}
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          <span className="service-label">
            Stil Rehberi <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <Link className="service-tile" href="/bakim-rehberi">
          <Image
            src="/assets/home/beyaz-crop-9.webp"
            alt="Fitilli pamuk kumaşın yakın dokusu"
            loading="lazy"
            width={1254}
            height={1254}
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          <span className="service-label">
            Bakım Rehberi <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <GuideTile guide="size">
          <Image
            src="/assets/home/beyaz-crop-1.webp"
            alt="Kalıp ve beden rehberi"
            loading="lazy"
            width={1086}
            height={1448}
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          <span className="service-label">
            Beden Rehberi <span aria-hidden="true">↗</span>
          </span>
        </GuideTile>
        <GuideTile guide="fabric">
          <Image
            src="/assets/home/siyah-crop-9.webp"
            alt="Siyah fitilli kumaş dokusu"
            loading="lazy"
            width={1122}
            height={1402}
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          <span className="service-label">
            Kumaş Rehberi <span aria-hidden="true">↗</span>
          </span>
        </GuideTile>
      </section>
    </main>
  );
}
