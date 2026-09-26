/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // iyzipay loads its resources with dynamic require(); run it as a plain Node module.
  serverExternalPackages: ['iyzipay'],
  ...(process.env.PANDIONES_LAN_PREVIEW === '1' ? { distDir: '.next-lan-preview' } : {}),
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/collection/:path*',
        destination: '/koleksiyon',
        permanent: true,
      },
      {
        source: '/collections/:path*',
        destination: '/koleksiyon',
        permanent: true,
      },
      {
        source: '/koleksiyon/lingerie',
        destination: '/koleksiyon/ic-giyim',
        permanent: true,
      },
      {
        source: '/koleksiyon/sleep',
        destination: '/koleksiyon/ev-giyim',
        permanent: true,
      },
      {
        source: '/products/:id',
        destination: '/urunler/:id',
        permanent: true,
      },
      {
        source: '/checkout',
        destination: '/odeme',
        permanent: true,
      },
      {
        source: '/order-success/:id',
        destination: '/siparis-onay/:id',
        permanent: true,
      },
      {
        source: '/product-guide-size.html',
        destination: '/beden-rehberi',
        permanent: true,
      },
      {
        source: '/product-guide-style.html',
        destination: '/stil-rehberi',
        permanent: true,
      },
      {
        source: '/product-guide-care.html',
        destination: '/bakim-rehberi',
        permanent: true,
      },
      {
        source: '/orderstatus',
        destination: '/siparis-takip',
        permanent: true,
      },
      {
        source: '/contactform',
        destination: '/iletisim',
        permanent: true,
      },
      {
        source: '/giftcard',
        destination: '/hediye-karti',
        permanent: true,
      },
      {
        source: '/customer-service-general-info.html',
        destination: '/yardim',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
