import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { toGalleryFrames } from '@/lib/products/media-domain';
import { sortBySize } from '@/lib/products/sizes';
import { categoryHref, productHref } from '@/lib/routes';
import { PHOTO_QUALITY } from '@/lib/images';
import StockAlertForm from './StockAlertForm';
import TermsButton from './TermsButton';

type Props = {
  product: Product;
  relatedProducts: Product[];
};

const categoryLabel = (category: string) => (category === 'ev-giyim' ? 'Ev Giyim' : 'İç Giyim');

/** Everything below the product hero: stock alert (only with sold-out sizes), the story, things to
 *  know, and more from the category. Same voice as the home page: Cormorant headings, hairlines,
 *  photo cards with the name over the image. Only the stock form and terms button are client parts. */
export default function ProductLowerContent({ product, relatedProducts }: Props) {
  const related = relatedProducts.filter((item) => item.id !== product.id).slice(0, 3);
  const soldOutSizes = sortBySize(product.variants ?? []).filter((v) => v.stock <= 0).map((v) => v.size);
  const hasFabricCare = Boolean(product.material?.trim() || product.care?.trim());
  // A second real view of this product if there is one; otherwise its cover. Never another product's photo.
  const frames = toGalleryFrames(product);
  const storyFrame = frames.find((frame, index) => index > 0 && frame.kind === 'IMAGE') ?? frames[0];
  const storySrc = storyFrame ? (storyFrame.kind === 'VIDEO' ? storyFrame.posterSrc : storyFrame.src) : product.image;

  return (
    <div className="pdp-lower">
      <StockAlertForm productId={product.id} productName={product.name} soldOutSizes={soldOutSizes} />

      {/* ── Story: one photo, the description beside it ── */}
      <section className="pdp-lower-about" aria-labelledby="pdp-about-title">
        <div className="pdp-lower-inner pdp-lower-about__inner">
          {storySrc ? (
            <figure className="pdp-lower-about__media">
              <Image
                src={storySrc}
                alt={storyFrame?.alt || `${product.name} yakın görünüm`}
                width={1086}
                height={1448}
                sizes="(max-width: 900px) 200vw, 90vw"
                quality={PHOTO_QUALITY}
                loading="lazy"
              />
            </figure>
          ) : null}
          <div className="pdp-lower-about__copy">
            <span className="pdp-lower-eyebrow">
              {categoryLabel(product.category)} · {product.color}
            </span>
            <h2 id="pdp-about-title">Ürün hakkında</h2>
            {product.description ? <p className="pdp-lower-about__lead">{product.description}</p> : null}
            {product.details?.trim() ? <p className="pdp-lower-about__details">{product.details}</p> : null}
          </div>
        </div>
      </section>

      {/* ── Things to know: heading on the left, a hairline list on the right ── */}
      <section className="pdp-lower-notes" aria-labelledby="pdp-notes-title">
        <div className="pdp-lower-inner pdp-lower-notes__inner">
          <div className="pdp-lower-notes__head">
            <span className="pdp-lower-eyebrow">Bilgi</span>
            <h2 id="pdp-notes-title">Bilmen gerekenler</h2>
          </div>
          <div className="pdp-lower-notes__list">
            {hasFabricCare ? (
              <details>
                <summary>Kumaş ve bakım</summary>
                <div className="pdp-lower-notes__body">
                  {product.material?.trim() ? <p>{product.material}</p> : null}
                  {product.care?.trim() ? <p>{product.care}</p> : null}
                  <p>
                    <Link href="/bakim-rehberi">Bakım rehberine göz at</Link>
                  </p>
                </div>
              </details>
            ) : null}
            <details>
              <summary>Beden ve kalıp</summary>
              <div className="pdp-lower-notes__body">
                <p>Satılan bedenler ve Türkiye ölçüleri beden rehberinde; ölçülerini girerek bedenini hesaplayabilirsin.</p>
                <p>
                  <Link href="/beden-rehberi">Beden rehberini aç</Link>
                </p>
              </div>
            </details>
            <details>
              <summary>Teslimat</summary>
              <div className="pdp-lower-notes__body">
                <p>Sipariş ve teslimat koşullarını satış koşullarında inceleyebilirsin.</p>
              </div>
            </details>
            <details>
              <summary>Değişim ve iade</summary>
              <div className="pdp-lower-notes__body">
                <p>İade ve değişim talepleri ürünün durumuna göre değerlendirilir. Ayrıntılar satış koşullarındadır.</p>
              </div>
            </details>
            <TermsButton />
          </div>
        </div>
      </section>

      {/* ── More from the category: photo cards with the name over the image ── */}
      {related.length > 0 ? (
        <section className="pdp-lower-related" aria-labelledby="pdp-related-title">
          <div className="pdp-lower-inner">
            <div className="pdp-lower-related__head">
              <div>
                <span className="pdp-lower-eyebrow">{categoryLabel(product.category)}</span>
                <h2 id="pdp-related-title">Koleksiyondan</h2>
              </div>
              <Link href={categoryHref(product.category)} className="pdp-lower-more">
                Tümünü gör <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <ul className="pdp-lower-related__grid" data-count={related.length}>
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={productHref(item.slug)} className="pdp-related-tile">
                    <Image
                      src={item.image}
                      alt=""
                      width={768}
                      height={1024}
                      sizes="(max-width: 900px) 100vw, 66vw"
                      quality={PHOTO_QUALITY}
                      loading="lazy"
                    />
                    <span className="pdp-related-tile__overlay">
                      <h3>{item.name}</h3>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
