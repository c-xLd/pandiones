import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import crypto from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * An empty, isolated database for one test: a fresh PostgreSQL schema in the local test database with the
 * full migration applied. cleanup() drops the schema.
 */
/** Publishing needs the product's category to be a top-level category in the database (getPublishErrors). */
export async function addRootCategories(db: PrismaClient, ...slugs: string[]) {
  await db.category.createMany({ data: slugs.map((slug, displayOrder) => ({ slug, name: slug, displayOrder })) });
}

export async function createProductTestDb() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set (tests/helpers/test-env.mjs)');
  const schema = `t_${crypto.randomBytes(6).toString('hex')}`;
  // Every migration in order, so tables added after the initial one exist too.
  const dir = path.join(process.cwd(), 'prisma/migrations');
  const migration = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => readFileSync(path.join(dir, name, 'migration.sql'), 'utf8'))
    .join('\n')
    .replace(/CREATE SCHEMA IF NOT EXISTS "public";/, '');

  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.query(`SET search_path TO "${schema}"`);
    await admin.query(migration);
  } finally {
    await admin.end();
  }

  const url = new URL(base);
  url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  return {
    db,
    async cleanup() {
      await db.$disconnect();
      const drop = new pg.Client({ connectionString: base });
      await drop.connect();
      await drop.query(`DROP SCHEMA "${schema}" CASCADE`).finally(() => drop.end());
    },
  };
}
