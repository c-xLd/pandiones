import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const products = await prisma.product.findMany({
      where: PUBLIC_PRODUCT_WHERE,
      include: {
        variants: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    const itemsXml = products
      .filter((product) => !!product.image)
      .map((product) => {
        const productUrl = `${origin}/koleksiyon/${product.category}/${product.slug}`;
        const imageUrl = product.image.startsWith('http')
          ? product.image
          : `${origin}${product.image.startsWith('/') ? product.image : `/${product.image}`}`;

        const escapeXml = (str: string) =>
          str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        const title = escapeXml(product.name);
        const description = escapeXml(product.description || product.name);
        const color = escapeXml(product.color || 'Standart');
        const price = `${product.price.toFixed(2)} TRY`;
        const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        const availability = totalStock > 0 ? 'in_stock' : 'out_of_stock';

        return `    <item>
      <g:id>${product.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:brand>Pandiones</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:color>${color}</g:color>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Underwear &amp; Socks</g:google_product_category>
    </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Pandiones Lüks İç Giyim &amp; Ev Giyim Ürün Kataloğu</title>
    <link>${origin}</link>
    <description>Pandiones resmi Google Merchant Center ve Google Shopping XML ürün akışı</description>
${itemsXml}
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
