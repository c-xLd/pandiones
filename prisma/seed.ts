import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

const initialProducts = [
  {
    slug: 'beyaz-crop',
    name: 'Beyaz Crop',
    price: 1590,
    color: 'Beyaz',
    category: 'ic-giyim',
    image: '/assets/beyaz-crop/1.png',
    description: 'Zarif kuplar, nefes alan pamuk dokusu ve beyazın saf zarafetiyle tasarlanmış crop top. Hem iç giyim hem de günlük stilinde eşsiz konfor.',
    details: 'Esnek pamuklu dokuma, ayarlanabilir askılar, dikişsiz bitişler ve tene uyum sağlayan yumuşak kalıp.',
    material: '%90 Pamuk, %10 Elastan',
    care: 'Hassas yıkama programında 30°C’de yıkayınız. Ağartıcı kullanmayınız.',
    featured: true,
  },
  {
    slug: 'siyah-crop',
    name: 'Siyah Crop',
    price: 1590,
    color: 'Siyah',
    category: 'ic-giyim',
    image: '/assets/siyah-crop/1.png',
    description: 'Siyahın zamansız duruşu, modern kuplar ve ince detaylarla buluştu. Günün her anına eşlik eden lüks crop tasarım.',
    details: 'Özel dikiş teknikleriyle güçlendirilmiş kuplar, yumuşak elastik alt bant, nefes alan astar.',
    material: '%90 Pamuk, %10 Elastan',
    care: 'Makinede benzer renklerle 30°C’de yıkayınız. Düşük ısıda tersten ütüleyiniz.',
    featured: true,
  },
  {
    slug: 'askili-crop',
    name: 'Düğmeli Askılı Crop',
    price: 1690,
    color: 'Siyah',
    category: 'ic-giyim',
    image: '/assets/askili-crop/1.png',
    description: 'V yakalı, sedef görünümlü düğme detaylı ve ince askılı fitilli crop top. Hem ev içi dinlenme anlarında hem de şık günlük kombinlerde kusursuz silüet.',
    details: '3 sedef görünümlü düğme, ince spagetti askılar, toparlayıcı fitilli dokuma ve nefes alan iç kuplar.',
    material: '%92 Pamuk Fitil, %8 Elastan',
    care: 'Hassas programda 30°C’de tersten yıkayınız. Sererek kurutunuz.',
    featured: true,
  },
  {
    slug: 'pembe-fitilli-takim',
    name: 'Pembe Fitilli Takım',
    price: 1890,
    color: 'Pudra Pembe',
    category: 'ic-giyim',
    image: '/assets/pembe-fitilli-takim.png',
    description: 'Pudra pembesinin romantik tonu, ince fitilli elastik kumaş ve narin dantel biyeleriyle buluştu. Sütyen ve külot ikilisi.',
    details: 'Balensiz destek kupları, minik altın logo madalyon detayı, zarif dantel geçişli elastik bant ve pamuk ağ.',
    material: '%85 Polyamid Fitil, %15 Elastan (İç Ağ: %100 Pamuk)',
    care: 'Elde ılık suda nazikçe yıkayınız. Sıkmayınız.',
    featured: true,
  },
  {
    slug: 'bebek-mavisi-takim',
    name: 'Bebek Mavisi Fitilli Takım',
    price: 1890,
    color: 'Bebek Mavisi',
    category: 'ic-giyim',
    image: '/assets/bebek-mavisi-takim.jpeg',
    description: 'Pastel bebek mavisi tonunda fitilli dokuma ve zarif minik dantel kenarlarıyla gün boyu ferah ve konforlu kullanım sunan sütyen-külot takımı.',
    details: 'Hafif dolgulu doğal kuplar, minik altın madalyon vurgusu, çift dikiş elastik bel bandı.',
    material: '%85 Polyamid Fitil, %15 Elastan (İç Ağ: %100 Pamuk)',
    care: 'Hassas yıkama programında 30°C’de yıkayınız. Ağartıcı kullanmayınız.',
    featured: true,
  },
  {
    slug: 'pembe-tul-takim',
    name: 'Pembe Tül Fiyonklu Takım',
    price: 1790,
    color: 'Şeker Pembe',
    category: 'ic-giyim',
    image: '/assets/pembe-tul-takim.jpeg',
    description: 'Hafif pembe transparan tül kumaş, canlı kırmızı saten fiyonk detayları ve üçgen kuplu romantik tasarım.',
    details: 'Balensiz üçgen kuplar, ayarlanabilir saten omuz askıları, kırmızı saten fiyonk aplikeleri ve string külot.',
    material: '%90 Polyamid Tül, %10 Elastan',
    care: 'Elde soğuk suda yıkayınız. Ütülemeyiniz.',
    featured: true,
  },
  {
    slug: 'beyaz-fitilli-atlet',
    name: 'Beyaz Fitilli Atlet',
    price: 1290,
    color: 'Beyaz',
    category: 'ev-giyim',
    image: '/assets/beyaz-fitilli-atlet.png',
    description: 'Yüksek yuvarlak yaka, kolsuz sporcu kesim ve dikey fitilli saf pamuk dokuma. Ev giyiminde ve katmanlı giyimde zarif bir temel parça.',
    details: 'Dikişsiz yan hatlar, esnek dikey fitil dokusu, tene oturan rahat kalıp.',
    material: '%95 Penye Pamuk, %5 Elastan',
    care: 'Makinede benzer renklerle 30°C’de yıkayınız.',
    featured: true,
  },
];

async function main() {
  // Destructive (deletes users, orders, products): only ever on a local development database.
  const url = process.env.DATABASE_URL ?? '';
  const local = url.startsWith('file:') || /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
  if (process.env.NODE_ENV === 'production' || !local) {
    console.error('GÜVENLİK: Seed yıkıcıdır ve yalnız yerel geliştirme veritabanında çalışır (file: ya da localhost). Durduruldu.');
    process.exit(1);
  }

  console.log('Seeding Pandiones database with Coupons, Newsletter, Users & Products...');

  // Clear existing records
  await prisma.coupon.deleteMany();
  await prisma.newsletter.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();

  // 1. Create Users
  // No fixed passwords in the repository: fresh random ones every run, shown once in this terminal.
  const adminPlain = crypto.randomBytes(12).toString('base64url');
  const customerPlain = crypto.randomBytes(12).toString('base64url');
  const adminPassword = await bcrypt.hash(adminPlain, 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@pandiones.com',
      name: 'Yönetici (Pandiones Admin)',
      passwordHash: adminPassword,
      role: 'ADMIN',
      phone: '0532 000 00 00',
      emailVerifiedAt: new Date(),
    },
  });

  const customerPassword = await bcrypt.hash(customerPlain, 12);
  const customer = await prisma.user.create({
    data: {
      email: 'asli@pandiones.com',
      name: 'Aslı Yılmaz',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      phone: '0555 123 45 67',
      emailVerifiedAt: new Date(),
    },
  });

  // 2. Create Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'PANDIONES10',
        discountType: 'PERCENTAGE',
        discountPercent: 10,
        minSpendKurus: 0,
        maxUses: 500,
        isActive: true,
      },
      {
        code: 'ZARAFET500',
        discountType: 'FIXED',
        discountKurus: 50000,
        minSpendKurus: 300000,
        maxUses: 200,
        isActive: true,
      },
    ],
  });
  console.log('Created Coupons: PANDIONES10, ZARAFET500');

  // 3. Create Products with Variants
  const sizes = ['S', 'M', 'L', 'XL'];
  const createdProducts: any[] = [];

  for (const item of initialProducts) {
    const product = await prisma.product.create({
      data: {
        slug: item.slug,
        name: item.name,
        priceKurus: Math.round(item.price * 100),
        color: item.color,
        category: item.category,
        image: item.image,
        description: item.description,
        details: item.details,
        material: item.material,
        care: item.care,
        featured: item.featured,
        variants: {
          create: sizes.map(size => ({
            size,
            stock: size === 'XL' ? 4 : 14,
          })),
        },
      },
    });
    createdProducts.push(product);
  }

  // 4. Create Sample Orders
  await prisma.order.create({
    data: {
      orderNumber: 'PAN-882104',
      userId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || '0555 123 45 67',
      shippingAddress: 'Tunalı Hilmi Cad. No: 18 D: 6',
      shippingCity: 'Ankara',
      shippingDistrict: 'Çankaya',
      shippingNotes: 'Siyah hediye kurdelesi ekleyiniz',
      couponCode: 'PANDIONES10',
      discountKurus: 31800,
      totalKurus: 286200,
      status: 'KARGODA',
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            productName: createdProducts[0].name,
            size: 'S',
            quantity: 1,
            priceKurus: createdProducts[0].priceKurus,
          },
          {
            productId: createdProducts[1].id,
            productName: createdProducts[1].name,
            size: 'M',
            quantity: 1,
            priceKurus: createdProducts[1].priceKurus,
          },
        ],
      },
    },
  });

  // 5. Sample Wishlist
  await prisma.wishlistItem.create({
    data: {
      userId: customer.id,
      productId: createdProducts[1].id,
    },
  });

  // 6. Sample Newsletter subscriber
  await prisma.newsletter.create({
    data: {
      email: 'vip@pandiones.com',
    },
  });

  console.log('Database seeded with full-stack models successfully!');
  // Shown once, only in this terminal; nothing is written to files or logs.
  console.log(`
Yerel hesaplar (bir kez gösterilir):
  admin@pandiones.com  ${adminPlain}  (ilk girişte 2FA kurulumu istenir)
  asli@pandiones.com   ${customerPlain}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
