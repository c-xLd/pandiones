import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface MediaStorage {
  put(bytes: Uint8Array, contentType: string): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
}

export type S3Config = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

export class StorageUnavailableError extends Error {
  readonly code = 'STORAGE_UNAVAILABLE';
  constructor() { super('Kalıcı medya depolaması yapılandırılmamış.'); }
}

const CONTENT_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

function makeKey(contentType: string): string {
  const extension = CONTENT_EXTENSIONS[contentType];
  if (!extension) throw new StorageUnavailableError();
  return `products/${randomUUID()}.${extension}`;
}

/** Keys this storage created (uploads). Catalogue media under `assets/...` are files in the repository. */
export function isManagedMediaKey(key: string): boolean {
  return /^products\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/.test(key);
}

function assertManagedKey(key: string): void {
  if (!isManagedMediaKey(key)) {
    throw new Error('Geçersiz medya anahtarı.');
  }
}

export function createMediaStorage(config: { mode: 'production' | 'development'; s3: S3Config | null }): MediaStorage {
  if (config.mode === 'production') {
    const settings = config.s3;
    if (!settings || Object.values(settings).some((value) => !value?.trim())) {
      throw new StorageUnavailableError();
    }
    const s3 = new S3Client({
      endpoint: settings.endpoint,
      region: settings.region,
      forcePathStyle: true,
      credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    });
    return {
      async put(bytes, contentType) {
        const key = makeKey(contentType);
        await s3.send(new PutObjectCommand({ Bucket: settings.bucket, Key: key, Body: bytes, ContentType: contentType }));
        return { key, url: `${settings.publicBaseUrl.replace(/\/$/, '')}/${key}` };
      },
      async delete(key) {
        assertManagedKey(key);
        await s3.send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
      },
    };
  }
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
  return {
    async put(bytes, contentType) {
      const key = makeKey(contentType);
      const absolute = path.join(uploadRoot, key);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, bytes, { flag: 'wx' });
      return { key, url: `/uploads/${key}` };
    },
    async delete(key) {
      assertManagedKey(key);
      await unlink(path.join(uploadRoot, key));
    },
  };
}

/**
 * S3 whenever it is configured, also under `next dev`: the local database may be the live one, and a
 * `/uploads/...` file on this computer would be a broken image on the live site. Local disk only in
 * development without S3 settings; production without them refuses to upload.
 */
export function mediaStorageFromEnvironment(): MediaStorage {
  const env = process.env;
  const s3: S3Config | null = env.MEDIA_S3_ENDPOINT && env.MEDIA_S3_BUCKET && env.MEDIA_S3_REGION &&
      env.MEDIA_S3_ACCESS_KEY_ID && env.MEDIA_S3_SECRET_ACCESS_KEY && env.MEDIA_PUBLIC_BASE_URL
      ? {
          endpoint: env.MEDIA_S3_ENDPOINT,
          bucket: env.MEDIA_S3_BUCKET,
          region: env.MEDIA_S3_REGION,
          accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID,
          secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY,
          publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL,
        }
      : null;
  return createMediaStorage({ mode: env.NODE_ENV === 'production' || s3 ? 'production' : 'development', s3 });
}
