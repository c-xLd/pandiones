import { PrismaClient } from '@prisma/client';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function createProductTestDb() {
  const directory = mkdtempSync(path.join(tmpdir(), 'pandiones-media-test-'));
  const dbPath = path.join(directory, 'test.db');
  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec(readFileSync(path.join(process.cwd(), 'prisma/migrations/20260920000000_baseline/migration.sql'), 'utf8'));
  sqlite.exec(readFileSync(path.join(process.cwd(), 'prisma/migrations/20260920010000_product_media/migration.sql'), 'utf8'));
  sqlite.exec(readFileSync(path.join(process.cwd(), 'prisma/migrations/20260923000000_categories/migration.sql'), 'utf8'));
  sqlite.close();
  const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath.replace(/\\/g, '/')}` } } });
  return {
    db,
    async cleanup() {
      await db.$disconnect();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
