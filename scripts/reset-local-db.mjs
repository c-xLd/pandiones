/**
 * Drops and recreates the local development and test databases (embedded Postgres from `npm run db:dev`,
 * which must be running), applies the migrations and loads the catalog. Refuses anything but loopback.
 */
import { execSync } from 'node:child_process';
import pg from 'pg';

const base = 'postgresql://postgres:postgres@127.0.0.1:54329';
const client = new pg.Client({ connectionString: `${base}/postgres` });
await client.connect();
for (const name of ['pandiones_dev', 'pandiones_test']) {
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  const url = `${base}/${name}`;
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx tsx scripts/import-catalog.ts', { stdio: 'inherit', env });
}
await client.end();
console.log('Yerel veritabanları sıfırlandı.');
