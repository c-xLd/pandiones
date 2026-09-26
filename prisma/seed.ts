import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_SEED) {
    console.error('CRITICAL SAFETY GUARD: Seeding is destructive and strictly forbidden in production.');
    process.exit(1);
  }

  console.log('Seeding Pandiones database with Coupons, Reviews, Newsletter, Users & Products...');

  // Clear existing records
  await prisma.review.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.newsletter.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();

  // 1. Create Users
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@pandiones.com',
      name: 'Yönetici (Maison Admin)',
      passwordHash: adminPassword,
      role: 'ADMIN',
      phone: '0532 000 00 00',
    },
  });

  const customerPassword = await bcrypt.hash('Asli123!', 10);
  const customer = await prisma.user.create({
    data: {
      email: 'asli@pandiones.com',
      name: 'Aslı Yılmaz',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      phone: '0555 123 45 67',
    },
  });

  // 2. Create Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'PANDIONES10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minSpend: 0,
        maxUses: 500,
        isActive: true,
      },
      {
        code: 'ZARAFET500',
        discountType: 'FIXED',
        discountValue: 500,
        minSpend: 3000,
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
        price: item.price,
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

  // 4. Create Authentic Reviews
  await prisma.review.createMany({
    data: [
      {
        productId: createdProducts[0].id,
        userName: 'Selin K.',
        rating: 5,
        comment: 'Kumaşın esnek dokusu tek kelimeyle kusursuz. Kalıbı tam oturuyor, dikiş kalitesi harika.',
      },
      {
        productId: createdProducts[0].id,
        userName: 'Ceyda B.',
        rating: 5,
        comment: 'Kutulama ve lüks ambalaj özeni çok şık. Kendi bedeninizi güvenle alabilirsiniz.',
      },
      {
        productId: createdProducts[1].id,
        userName: 'Zeynep T.',
        rating: 5,
        comment: 'Siyah crop inanılmaz toparlayıcı ve kumaşın kalitesi tam lüks bir maison havasında.',
      },
      {
        productId: createdProducts[2].id,
        userName: 'Ece V.',
        rating: 5,
        comment: 'Düğmeli askılı crop hem evde hem dışarıda kombinlemek için biçilmiş kaftan.',
      },
    ],
  });
  console.log('Created Sample Product Reviews');

  // 5. Create Sample Orders
  await prisma.order.create({
    data: {
      orderNumber: 'PAN-882104',
      userId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || '0555 123 45 67',
      shippingAddress: 'Abdi İpekçi Cad. No: 18 D: 6',
      shippingCity: 'İstanbul',
      shippingDistrict: 'Nişantaşı',
      shippingNotes: 'Siyah hediye kurdelesi ekleyiniz',
      couponCode: 'PANDIONES10',
      discountAmount: 318,
      totalAmount: 2862,
      status: 'KARGODA',
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            productName: createdProducts[0].name,
            size: 'S',
            quantity: 1,
            price: createdProducts[0].price,
          },
          {
            productId: createdProducts[1].id,
            productName: createdProducts[1].name,
            size: 'M',
            quantity: 1,
            price: createdProducts[1].price,
          },
        ],
      },
    },
  });

  // 6. Sample Wishlist
  await prisma.wishlistItem.create({
    data: {
      userId: customer.id,
      productId: createdProducts[1].id,
    },
  });

  // 7. Sample Newsletter subscriber
  await prisma.newsletter.create({
    data: {
      email: 'vip@pandiones.com',
    },
  });

  console.log('Database seeded with full-stack models successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
