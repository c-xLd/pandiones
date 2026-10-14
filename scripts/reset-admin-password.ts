/**
 * Sets a new password for an ADMIN account in the database DATABASE_URL points at — or, when that
 * database has no admin yet (a fresh Supabase project), creates one. Run it yourself in a terminal:
 *   npm run admin:reset-password
 * It shows which database host it talks to, lists the admin e-mails (or asks for the new admin's e-mail
 * and name), then asks for the password twice without echoing it. The password follows the site policy
 * (10+ characters, not in known breaches). Changing it closes the account's open sessions. 2FA is set up
 * at the first sign-in on /yonetim/giris. Nothing is printed or logged except e-mails and the result.
 */
import readline from 'node:readline';
import { prisma } from '../src/lib/prisma';
import { revokeAllSessions } from '../src/lib/auth';
import { checkNewPassword, hashPassword } from '../src/lib/auth/password-policy';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

function parseArgs(): { email?: string; password?: string; name?: string } {
  const args = process.argv.slice(2);
  const result: { email?: string; password?: string; name?: string } = {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      result.email = args[++i].trim();
    } else if (args[i] === '--password' && args[i + 1]) {
      result.password = args[++i];
    } else if (args[i] === '--name' && args[i + 1]) {
      result.name = args[++i].trim();
    }
  }
  return result;
}

/** Reads a line without echoing the typed characters. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error('Şifre gizli girilebilmesi için betiği bir terminalde çalıştırın veya --email ve --password parametrelerini kullanın.'));
      return;
    }
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function askPassword(email: string, name: string): Promise<string | null> {
  const password = await askHidden(`${email} için şifre (en az 10 karakter): `);
  const problem = await checkNewPassword(password, { email, name });
  if (problem) {
    console.log(`${problem} Hiçbir şey değişmedi.`);
    return null;
  }
  const again = await askHidden('Şifre (tekrar): ');
  if (again !== password) {
    console.log('Şifreler eşleşmiyor; hiçbir şey değişmedi.');
    return null;
  }
  return password;
}

async function createFirstAdmin() {
  console.log('Bu veritabanında yönetici hesabı yok; ilk yönetici oluşturulacak.');
  const email = (await ask('E-posta: ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('Geçerli bir e-posta girin; hiçbir şey değişmedi.');
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log('Bu e-postayla bir müşteri hesabı var; yöneticiye çevrilmez. Başka bir e-posta kullanın.');
    return;
  }
  const name = (await ask('Ad soyad: ')) || 'Yönetici';
  const password = await askPassword(email, name);
  if (!password) return;
  await prisma.user.create({ data: { email, name, role: 'ADMIN', passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } });
  console.log(`Yönetici oluşturuldu. /yonetim/giris adresinde ${email} ile giriş yapın; ilk girişte iki adımlı doğrulama kurulur.`);
}

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').host;
    } catch {
      return 'bilinmiyor';
    }
  })();
  console.log(`Veritabanı: ${host}`);

  const parsed = parseArgs();
  if (parsed.email && parsed.password) {
    const email = parsed.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Geçerli bir e-posta girin.');
    }
    const name = parsed.name || 'Yönetici';
    const problem = await checkNewPassword(parsed.password, { email, name });
    if (problem) {
      throw new Error(`Şifre politikası hatası: ${problem}`);
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== 'ADMIN') {
      throw new Error('Bu e-postayla bir müşteri hesabı var; yöneticiye çevrilmez.');
    }
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await hashPassword(parsed.password),
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await revokeAllSessions(existing.id);
      console.log(`Şifre güncellendi ve açık oturumlar kapatıldı. /yonetim/giris adresinde ${existing.email} ile giriş yapabilirsiniz.`);
    } else {
      await prisma.user.create({
        data: {
          email,
          name,
          role: 'ADMIN',
          passwordHash: await hashPassword(parsed.password),
          emailVerifiedAt: new Date(),
        },
      });
      console.log(`Yönetici oluşturuldu. /yonetim/giris adresinde ${email} ile giriş yapın; ilk girişte iki adımlı doğrulama kurulur.`);
    }
    return;
  }

  const all = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true, name: true }, orderBy: { createdAt: 'asc' } });
  // Test runs leave accounts like admin-stats-1790000000000@pandiones.com behind; they are not listed.
  const admins = all.filter((admin) => !/\d{10,}/.test(admin.email));
  if (all.length > admins.length) console.log(`(${all.length - admins.length} test hesabı gizlendi)`);
  if (admins.length === 0) {
    await createFirstAdmin();
    return;
  }

  console.log('Yönetici hesapları:');
  admins.forEach((admin, index) => console.log(`  ${index + 1}) ${admin.email}  (${admin.name})`));
  const pick = admins.length === 1 ? '1' : await ask(`Hangisi? (1-${admins.length}): `);
  const admin = admins[Number(pick) - 1];
  if (!admin) {
    console.log('Geçersiz seçim; hiçbir şey değişmedi.');
    return;
  }

  const password = await askPassword(admin.email, admin.name);
  if (!password) return;
  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null } });
  await revokeAllSessions(admin.id);
  console.log(`Şifre güncellendi ve açık oturumlar kapatıldı. /yonetim/giris adresinde ${admin.email} ile giriş yapabilirsiniz.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
