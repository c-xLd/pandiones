import React from 'react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { loadCollection } from '@/lib/products/load-collection';
import { ALL_PRODUCTS_HREF, categoryHref, productHref, subcategoryHref } from '@/lib/routes';
import HomeProductGrid from './_home/HomeProductGrid';
import GuideTile from './_home/GuideTile';
import HomeVideo from './_home/HomeVideo';

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
      { src: '/assets/pembe-balen/cizgili_balenli_dantelli_pembe(1).png', alt: 'Pembe balenli dantel takım önden' },
      { src: '/assets/pembe-balen/cizgili_balenli_dantelli_pembe(2).png', alt: 'Pembe balenli dantel takımın dantel ve balen detayı' },
    ],
  },
  {
    slug: 'beyaz-crop',
    images: [
      { src: '/assets/beyaz-crop/6.png', alt: 'Beyaz fitilli crop manken üzerinde, oturur poz' },
      { src: '/assets/beyaz-crop/7.png', alt: 'Beyaz fitilli crop yaka ve askı detayı' },
    ],
  },
] as const;

/** Hero, night campaign and story frames are taller than a portrait photo (up to 115svh, 2.5:1 on
 *  phones), so the cover crop is narrower than the file: request more than the slot width.
 *  Next never upscales, so this resolves to at most the ~1100 px source. */
const TALL_FRAME_SIZES = '(max-width: 900px) 200vw, 65vw';

/** The campaign video is a file added by hand; until it exists the section is not rendered. */
const HOME_VIDEO = { src: '/assets/Create_fashion.mp4', poster: '/assets/home/kampanya-poster.jpg' };
const publicFileExists = (publicPath: string) => existsSync(path.join(process.cwd(), 'public', publicPath));

const createdTime = (product: Product) => {
  const value = (product as Product & { createdAt?: string }).createdAt;
  return value ? Date.parse(value) : 0;
};

export default async function HomePage() {
  // Read on the server so the first HTML already carries the products (no client fetch).
  const data = await loadCollection();
  const newest = [...data.products].sort((a, b) => createdTime(b) - createdTime(a));
  const stories = PRODUCT_STORIES.flatMap((story) => {
    const product = data.products.find((p) => p.slug === story.slug);
    return product ? [{ ...story, product }] : [];
  });
  const video = publicFileExists(HOME_VIDEO.src)
    ? { src: HOME_VIDEO.src, poster: publicFileExists(HOME_VIDEO.poster) ? HOME_VIDEO.poster : undefined }
    : null;

  return (
    <main id="main">
      {/* 1. HERO CAMPAIGN */}
      <section className="campaign hero" aria-labelledby="hero-title">
        <div className="campaign-pictures">
          <Image
            className="campaign-model"
            src="/assets/siyah-crop/2.png"
            alt="Pandiones yeni sezon siyah fitilli crop"
            priority
            width={1122}
            height={1402}
            sizes={TALL_FRAME_SIZES}
          />
          {/* Hidden below 900px; lazy, so a phone never downloads it. */}
          <Image
            className="campaign-still"
            src="/assets/beyaz-crop/2.png"
            alt="Beyaz crop stüdyo detayı ve kalıp dikişleri"
            loading="lazy"
            width={1536}
            height={1024}
            sizes="65vw"
          />
        </div>
        <div className="campaign-caption">
          <p className="eyebrow">İÇ GİYİM & EV GİYİM</p>
          <h1 id="hero-title">Kendine yakın.</h1>
          <Link className="campaign-link" href={ALL_PRODUCTS_HREF}>
            YENİ GELENLERİ KEŞFET <span>↗</span>
          </Link>
        </div>
        <span className="campaign-side">PANDIONES / YENİ KOLEKSİYON</span>
      </section>

      {/* 3. CATEGORY STORIES */}
      <section className="category-stories" aria-label="Kategorileri keşfet">
        <Link className="category-card" href={categoryHref('ic-giyim')}>
          <Image
            src="/assets/siyah-crop/1.png"
            alt="Siyah crop takım"
            loading="lazy"
            width={1086}
            height={1448}
            sizes="(max-width: 900px) 50vw, 33vw"
          />
          <div>
            <h2>Siyahın zarafeti.</h2>
            <span>İÇ GİYİM ↗</span>
          </div>
        </Link>
        <Link className="category-card" href={categoryHref('ev-giyim')}>
          <Image
            src="/assets/campaign-chocolate.webp"
            alt="Kahve saten sabahlık ev giyim"
            loading="lazy"
            width={1086}
            height={1448}
            sizes="(max-width: 900px) 50vw, 33vw"
          />
          <div>
            <h2>Dingin sadelik.</h2>
            <span>EV GİYİM ↗</span>
          </div>
        </Link>
        <Link className="category-card category-detail" href={subcategoryHref('ic-giyim', 'dantel-takimlar')}>
          <Image
            src="/assets/pembe-balen/cizgili_balenli_dantelli_pembe(3).png"
            alt="Pembe balenli dantel takım detayları"
            loading="lazy"
            width={1024}
            height={1536}
            sizes="(max-width: 900px) 100vw, 33vw"
          />
          <div>
            <h2>İnce ayrıntılar.</h2>
            <span>TAKIMLARI KEŞFET ↗</span>
          </div>
        </Link>
      </section>

      {/* 4. NIGHT CAMPAIGN */}
      <section className="campaign night-campaign" aria-labelledby="night-title">
        <div className="campaign-pictures">
          <Image
            src="/assets/siyah-crop/6.png"
            alt="Siyah fitilli crop ile oturur editoryal poz"
            loading="lazy"
            width={1122}
            height={1402}
            sizes={TALL_FRAME_SIZES}
          />
          <Image
            src="/assets/siyah-crop/7.png"
            alt="Siyah fitilli crop yaka ve askı detayı"
            loading="lazy"
            width={1122}
            height={1402}
            sizes="65vw"
          />
        </div>
        <div className="campaign-caption">
          <p className="eyebrow">DOĞAL VE ÖZGÜR SİLÜETLER</p>
          <h2 id="night-title">Kendi ritminde.</h2>
          <Link className="campaign-link" href={ALL_PRODUCTS_HREF}>
            PARÇALARI KEŞFET <span>↗</span>
          </Link>
        </div>
      </section>

      {/* 5. EDITORIAL COLLECTION GRID — the newest pieces */}
      <section id="collection" className="collection" aria-label="Yeni gelenler">
        <HomeProductGrid
          products={newest.slice(0, HOME_PRODUCT_COUNT)}
          error={data.error}
        />
      </section>

      {/* 5b. PRODUCT STORIES — two large two-up campaigns, each one real product */}
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
                sizes={TALL_FRAME_SIZES}
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

      {/* 5c. CAMPAIGN VIDEO — only when the video file exists */}
      {video ? (
        <HomeVideo src={video.src} poster={video.poster} label="Pandiones kampanya videosu">
          <p className="eyebrow">YENİ SEZON</p>
          <h2>Her adımda sen.</h2>
          <Link className="campaign-link" href={ALL_PRODUCTS_HREF}>
            YENİ GELENLERİ KEŞFET <span>↗</span>
          </Link>
        </HomeVideo>
      ) : null}

      {/* 6. BRAND STORY */}
      <section className="brand-story" id="hikayemiz" aria-labelledby="brand-story-title">
        <div className="brand-story__media" aria-hidden="true">
          <figure className="brand-story__frame brand-story__frame--lace">
            <Image src="/assets/lace.webp" alt="" loading="lazy" width={1086} height={1448} sizes="(max-width: 900px) 60vw, 30vw" />
            <figcaption>Dantel</figcaption>
          </figure>
          <figure className="brand-story__frame brand-story__frame--satin">
            <Image src="/assets/satin.webp" alt="" loading="lazy" width={1086} height={1448} sizes="(max-width: 900px) 60vw, 30vw" />
            <figcaption>Saten</figcaption>
          </figure>
        </div>
        <div className="brand-story__copy">
          <p className="eyebrow">Hikâyemiz</p>
          <h2 id="brand-story-title">
            En güzel his,<br />
            <em>kendin olmak.</em>
          </h2>
          <p className="brand-story__lead">
            Dantelin inceliği, satenin hafifliği.<br />
            Sana ait anların, sana yakın parçaları.
          </p>
          <nav className="brand-story__links" aria-label="Pandiones'i tanı">
            <Link href={ALL_PRODUCTS_HREF}>Yeni gelenler</Link>
            <Link href="/stil-rehberi">Stil rehberi</Link>
            <Link href="/bakim-rehberi">Bakım rehberi</Link>
          </nav>
        </div>
      </section>

      {/* 7. SERVICE STORIES — the four guides */}
      <section className="service-stories" aria-label="Rehberler">
        <Link className="service-tile" href="/stil-rehberi">
          <Image
            src="/assets/beyaz-crop/5.png"
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
            src="/assets/beyaz-crop/9.png"
            alt="Fitilli pamuk kumaşın yakın dokusu"
            loading="lazy"
            width={1254}
            height={1254}
            sizes="(max-width: 900px) 70vw, 34vw"
          />
          <span className="service-label">
            Bakım Rehberi <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <GuideTile guide="size">
          <Image
            src="/assets/beyaz-crop/1.png"
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
            src="/assets/siyah-crop/9.png"
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
