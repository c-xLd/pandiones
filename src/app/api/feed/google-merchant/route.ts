import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import { getStoreSettings } from '@/lib/settings/server';
import { kurusToIyzico } from '@/lib/money';

export const dynamic = 'force-dynamic';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request: Request) {
  try {
    const settings = await getStoreSettings().catch(() => null);

    if (settings && settings.merchantFeedEnabled === false) {
      return new NextResponse('Merchant feed is disabled', { status: 404 });
    }

    const brand = settings?.merchantBrand?.trim() || 'Pandiones';
    const shippingFee = settings?.merchantShippingFee ?? 0;
    const transitDays = settings?.merchantTransitDays ?? 3;

    const products = await prisma.product.findMany({
      where: {
        ...PUBLIC_PRODUCT_WHERE,
        excludeFromFeed: false,
      },
      include: {
        variants: true,
        media: {
          where: { kind: 'IMAGE' },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const url = new URL(request.url);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || `${url.protocol}//${url.host}`;

    const items: string[] = [];

    const eligibleProducts = products.filter(
      (product) => Boolean(product.image) && product.priceKurus > 0 && product.status === 'PUBLISHED'
    );

    for (const product of eligibleProducts) {
      const productUrl = `${origin}/urun/${product.slug}`;
      const imageUrl = product.image.startsWith('http')
        ? product.image
        : `${origin}${product.image.startsWith('/') ? product.image : `/${product.image}`}`;

      const title = escapeXml(product.name);
      const description = escapeXml(product.description || product.name);
      const color = escapeXml(product.color || 'Standart');

      // Category classification according to Google Product Taxonomy
      const googleProductCategory = product.category === 'ev-giyim'
        ? 'Apparel &amp; Accessories &gt; Clothing &gt; Sleepwear &amp; Loungewear'
        : 'Apparel &amp; Accessories &gt; Clothing &gt; Underwear &amp; Socks';

      // Additional images (up to 10)
      const additionalImagesXml = (product.media || [])
        .filter((m) => m.url && m.url !== product.image)
        .slice(0, 10)
        .map((m) => {
          const mediaUrl = m.url.startsWith('http')
            ? m.url
            : `${origin}${m.url.startsWith('/') ? m.url : `/${m.url}`}`;
          return `      <g:additional_image_link>${escapeXml(mediaUrl)}</g:additional_image_link>`;
        })
        .join('\n');

      // Price calculation: if compareAtPrice is greater than price, compareAtPrice is regular and price is sale
      const hasDiscount = product.compareAtPriceKurus != null && product.compareAtPriceKurus > product.priceKurus;
      const regularKurus = hasDiscount ? product.compareAtPriceKurus! : product.priceKurus;
      const saleKurus = hasDiscount ? product.priceKurus : null;

      const priceXml = `<g:price>${kurusToIyzico(regularKurus)} TRY</g:price>${
        saleKurus !== null ? `\n      <g:sale_price>${kurusToIyzico(saleKurus)} TRY</g:sale_price>` : ''
      }`;

      const shippingXml = `      <g:shipping>
        <g:country>TR</g:country>
        <g:service>Standart Teslimat</g:service>
        <g:price>${shippingFee.toFixed(2)} TRY</g:price>
        <g:min_transit_time>1</g:min_transit_time>
        <g:max_transit_time>${transitDays}</g:max_transit_time>
      </g:shipping>`;

      if (product.variants.length === 0) {
        items.push(`    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>${additionalImagesXml ? `\n${additionalImagesXml}` : ''}
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>out_of_stock</g:availability>
      ${priceXml}
      <g:color>${color}</g:color>
      <g:google_product_category>${googleProductCategory}</g:google_product_category>
${shippingXml}
      <g:identifier_exists>no</g:identifier_exists>
    </item>`);
      } else {
        for (const variant of product.variants) {
          const variantId = variant.sku || `${product.id}-${variant.size}`;
          const isAvailable = variant.stock > 0;
          const availability = isAvailable ? 'in_stock' : 'out_of_stock';

          const barcodeXml = variant.barcode
            ? `<g:gtin>${escapeXml(variant.barcode)}</g:gtin>`
            : '<g:identifier_exists>no</g:identifier_exists>';
          const mpnXml = variant.sku ? `\n      <g:mpn>${escapeXml(variant.sku)}</g:mpn>` : '';

          items.push(`    <item>
      <g:id>${escapeXml(variantId)}</g:id>
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>${additionalImagesXml ? `\n${additionalImagesXml}` : ''}
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      ${priceXml}
      <g:size>${escapeXml(variant.size)}</g:size>
      <g:color>${color}</g:color>
      <g:google_product_category>${googleProductCategory}</g:google_product_category>
${shippingXml}
      ${barcodeXml}${mpnXml}
    </item>`);
        }
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(brand)} Ürün Kataloğu</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(brand)} Google Merchant Center XML ürün akışı</description>
${items.join('\n')}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Google Merchant Feed:', error);
    return new NextResponse('Internal Server Error generating feed', { status: 500 });
  }
}
