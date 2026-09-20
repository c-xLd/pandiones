import type { MediaKind } from '@/lib/products/media-domain';
import type { MediaStorage } from './storage';

const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

const ALLOWED = {
  'image/jpeg': { extension: 'jpg', kind: 'IMAGE', limit: IMAGE_LIMIT },
  'image/png': { extension: 'png', kind: 'IMAGE', limit: IMAGE_LIMIT },
  'image/webp': { extension: 'webp', kind: 'IMAGE', limit: IMAGE_LIMIT },
  'video/mp4': { extension: 'mp4', kind: 'VIDEO', limit: VIDEO_LIMIT },
  'video/webm': { extension: 'webm', kind: 'VIDEO', limit: VIDEO_LIMIT },
} as const;

export class UploadValidationError extends Error {
  constructor(public readonly code: 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE') {
    super(code);
  }
}

function matchesSignature(contentType: keyof typeof ALLOWED, bytes: Uint8Array): boolean {
  if (contentType === 'image/jpeg') {
    return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  }
  if (contentType === 'image/webp') {
    return bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  if (contentType === 'video/mp4') {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
  }
  return bytes.length >= 12 &&
    bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3 &&
    new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096))).includes('webm');
}

export async function validateUpload(file: File): Promise<{
  kind: MediaKind;
  extension: string;
  contentType: string;
  bytes: Uint8Array;
}> {
  const contentType = file.type.toLowerCase() as keyof typeof ALLOWED;
  const allowed = ALLOWED[contentType];
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!allowed || !extension || !(
    extension === allowed.extension || contentType === 'image/jpeg' && extension === 'jpeg'
  )) {
    throw new UploadValidationError('INVALID_FILE_TYPE');
  }
  if (file.size === 0) throw new UploadValidationError('EMPTY_FILE');
  if (file.size > allowed.limit) throw new UploadValidationError('FILE_TOO_LARGE');

  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > allowed.limit) {
        await reader.cancel();
        throw new UploadValidationError('FILE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new UploadValidationError('EMPTY_FILE');
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (!matchesSignature(contentType, bytes)) throw new UploadValidationError('INVALID_FILE_TYPE');
  return { kind: allowed.kind, extension: allowed.extension, contentType, bytes };
}

export async function uploadValidatedFile(file: File, storage: MediaStorage): Promise<{
  key: string;
  url: string;
  kind: MediaKind;
}> {
  const valid = await validateUpload(file);
  const saved = await storage.put(valid.bytes, valid.contentType);
  return { ...saved, kind: valid.kind };
}
