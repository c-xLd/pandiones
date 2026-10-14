import crypto from 'node:crypto';
import { prisma } from '../src/lib/prisma';

interface EnvCheck {
  variable: string;
  required: boolean;
  status: 'OK' | 'MISSING' | 'INVALID' | 'WARN';
  message: string;
}

function generateCryptographicSecrets() {
  const authSecret = crypto.randomBytes(48).toString('base64url');
  const cronSecret = crypto.randomBytes(36).toString('hex');
  console.log('\n--- ÜRETİLEN GÜVENLİ ANAHTARLAR (Vercel Çevre Değişkenleri İçin) ---');
  console.log(`AUTH_SECRET=${authSecret}`);
  console.log(`CRON_SECRET=${cronSecret}`);
  console.log('--------------------------------------------------------------------\n');
}

async function auditEnvironment() {
  const checks: EnvCheck[] = [];

  // 1. AUTH_SECRET
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    checks.push({ variable: 'AUTH_SECRET', required: true, status: 'MISSING', message: 'Tanımlı değil. Oturum güvenliği için zorunlu (>= 32 karakter).' });
  } else if (authSecret.length < 32 || authSecret.includes('placeholder') || authSecret.includes('change-me')) {
    checks.push({ variable: 'AUTH_SECRET', required: true, status: 'INVALID', message: `Yetersiz uzunluk (${authSecret.length} krk) veya güvensiz şablon.` });
  } else {
    checks.push({ variable: 'AUTH_SECRET', required: true, status: 'OK', message: `Güçlü rastgele anahtar (${authSecret.length} krk).` });
  }

  // 2. CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    checks.push({ variable: 'CRON_SECRET', required: true, status: 'MISSING', message: 'Tanımlı değil. Vercel cron görevleri 401 alır (>= 32 karakter).' });
  } else if (cronSecret.length < 32) {
    checks.push({ variable: 'CRON_SECRET', required: true, status: 'INVALID', message: `Yetersiz uzunluk (${cronSecret.length} krk).` });
  } else {
    checks.push({ variable: 'CRON_SECRET', required: true, status: 'OK', message: `Güçlü rastgele anahtar (${cronSecret.length} krk).` });
  }

  // 3. NEXT_PUBLIC_SITE_URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    checks.push({ variable: 'NEXT_PUBLIC_SITE_URL', required: true, status: 'MISSING', message: 'Tanımlı değil. Ödeme dönüş ve e-posta linkleri çalışmaz.' });
  } else if (!siteUrl.startsWith('https://')) {
    checks.push({ variable: 'NEXT_PUBLIC_SITE_URL', required: true, status: 'WARN', message: `HTTPS ile başlamıyor: ${siteUrl}` });
  } else {
    checks.push({ variable: 'NEXT_PUBLIC_SITE_URL', required: true, status: 'OK', message: `Canlı URL: ${siteUrl}` });
  }

  // 4. DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    checks.push({ variable: 'DATABASE_URL', required: true, status: 'MISSING', message: 'Tanımlı değil. Veritabanına bağlanılamaz.' });
  } else {
    const isSupabasePooler = dbUrl.includes('pooler.supabase.com') || dbUrl.includes(':6543');
    checks.push({
      variable: 'DATABASE_URL',
      required: true,
      status: 'OK',
      message: isSupabasePooler ? 'Supabase Connection Pooler bağlantısı yapılandırılmış.' : 'Veritabanı URL yapılandırılmış.',
    });
  }

  // 5. IYZICO
  const iyzicoKey = process.env.IYZICO_API_KEY;
  const iyzicoSecret = process.env.IYZICO_SECRET_KEY;
  const iyzicoUrl = process.env.IYZICO_BASE_URL;

  if (!iyzicoKey || !iyzicoSecret) {
    checks.push({ variable: 'IYZICO_API_KEY / SECRET', required: true, status: 'MISSING', message: 'Tanımlı değil. Canlı ödeme başlatılamaz.' });
  } else {
    const isSandbox = iyzicoUrl?.includes('sandbox') || iyzicoKey.startsWith('sandbox-');
    if (isSandbox) {
      checks.push({ variable: 'IYZICO', required: true, status: 'WARN', message: 'Sandbox ortamı yapılandırılmış. Canlı satıştan önce canlı anahtarlarla değiştirilmeli.' });
    } else {
      checks.push({ variable: 'IYZICO', required: true, status: 'OK', message: 'Canlı iyzico uç noktası yapılandırılmış.' });
    }
  }

  // 6. RESEND
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!resendKey) {
    checks.push({ variable: 'RESEND_API_KEY', required: true, status: 'MISSING', message: 'Tanımlı değil. Sipariş ve bildirim e-postaları gönderilemez.' });
  } else {
    checks.push({ variable: 'RESEND_API_KEY', required: true, status: 'OK', message: 'Resend API anahtarı yapılandırılmış.' });
  }
  if (!emailFrom) {
    checks.push({ variable: 'EMAIL_FROM', required: true, status: 'WARN', message: 'Tanımlı değil. Varsayılan başlık kullanılır (örn. Pandiones <siparis@pandiones.com>).' });
  } else {
    checks.push({ variable: 'EMAIL_FROM', required: true, status: 'OK', message: `Gönderen: ${emailFrom}` });
  }

  // 7. YASAKLI / TEST DEĞİŞKENLERİ
  if (process.env.PAYMENT_MODE === 'simulator') {
    checks.push({ variable: 'PAYMENT_MODE', required: false, status: 'WARN', message: 'PAYMENT_MODE=simulator tanımlı! Üretimde tanımlanmamalıdır.' });
  }

  // Rapor yazdırma
  console.log('\n========================================');
  console.log('PANDIONES ÜRETİM ORTAM DEĞİŞKENLERİ DENETİMİ');
  console.log('========================================\n');

  for (const c of checks) {
    const icon = c.status === 'OK' ? '✅' : c.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} [${c.status.padEnd(7)}] ${c.variable.padEnd(25)} : ${c.message}`);
  }

  // Veritabanı canlı sorgu testi
  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    console.log(`\n✅ [DB CANLI BAĞLANTI] Başarılı (Kullanıcı Sayısı: ${userCount}, Ürün Sayısı: ${productCount})`);
  } catch (err) {
    console.log(`\n❌ [DB CANLI BAĞLANTI] Hata: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log('\n========================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--generate') || args.includes('--generate-secrets')) {
    generateCryptographicSecrets();
  }
  await auditEnvironment();
}

main().catch(console.error).finally(() => prisma.$disconnect());
