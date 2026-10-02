/**
 * Local PostgreSQL for development and tests — no Docker. `npm run db:dev` starts a Postgres 17 cluster in
 * `.pg-data/` on 127.0.0.1:54329, creates `pandiones_dev` and `pandiones_test`, applies the migrations to both,
 * and keeps running until Ctrl+C. Local only: the password is a fixed development value and the server listens
 * on loopback.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export const LOCAL_PG = { port: 54329, user: 'postgres', password: 'postgres', databases: ['pandiones_dev', 'pandiones_test'] };
export const localUrl = (database) => `postgresql://${LOCAL_PG.user}:${LOCAL_PG.password}@127.0.0.1:${LOCAL_PG.port}/${database}`;

const dataDir = path.join(process.cwd(), '.pg-data');
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: LOCAL_PG.user,
  password: LOCAL_PG.password,
  port: LOCAL_PG.port,
  persistent: true,
  // The Windows locale name (e.g. "Turkish_Türkiye.1254") is not ASCII and initdb refuses it; collation
  // follows Supabase (UTF8, C).
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
  onLog: () => {},
});

if (!existsSync(path.join(dataDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();

const client = pg.getPgClient();
await client.connect();
for (const name of LOCAL_PG.databases) {
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (rowCount === 0) await pg.createDatabase(name);
}
await client.end();

for (const name of LOCAL_PG.databases) {
  const url = localUrl(name);
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url } });
}

console.log(`\nYerel PostgreSQL hazır: ${localUrl('pandiones_dev')}\nDurdurmak için Ctrl+C.`);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
