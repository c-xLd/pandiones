import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadValidatedFile, validateUpload } from '../src/lib/media/validate-upload';
import { createMediaStorage } from '../src/lib/media/storage';

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);

test('fake JPEG MIME with executable bytes never reaches storage', async () => {
  let writes = 0;
  const storage = {
    async put() { writes++; return { key: 'x', url: '/x' }; },
    async delete() {},
  };
  const file = new File([new Uint8Array([0x4d, 0x5a, 0x00])], 'look.jpg', { type: 'image/jpeg' });
  await assert.rejects(() => uploadValidatedFile(file, storage), { code: 'INVALID_FILE_TYPE' });
  assert.equal(writes, 0);
});

test('mismatched extension and MIME is rejected before storage', async () => {
  const file = new File([jpegBytes], 'look.png', { type: 'image/jpeg' });
  await assert.rejects(() => validateUpload(file), { code: 'INVALID_FILE_TYPE' });
});

test('valid JPEG reaches storage under an opaque key', async () => {
  let acceptedType = '';
  const storage = {
    async put(bytes: Uint8Array, contentType: string) {
      assert.deepEqual(bytes, jpegBytes);
      acceptedType = contentType;
      return { key: 'products/opaque-id.jpg', url: '/media/opaque-id.jpg' };
    },
    async delete() {},
  };
  const file = new File([jpegBytes], 'model.jpg', { type: 'image/jpeg' });
  const result = await uploadValidatedFile(file, storage);
  assert.equal(acceptedType, 'image/jpeg');
  assert.deepEqual(result, { key: 'products/opaque-id.jpg', url: '/media/opaque-id.jpg', kind: 'IMAGE' });
});

test('oversized images and videos are refused from declared size', async () => {
  const image = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'x.jpg', { type: 'image/jpeg' });
  const video = new File([new Uint8Array(50 * 1024 * 1024 + 1)], 'x.mp4', { type: 'video/mp4' });
  await assert.rejects(() => validateUpload(image), { code: 'FILE_TOO_LARGE' });
  await assert.rejects(() => validateUpload(video), { code: 'FILE_TOO_LARGE' });
});

test('stream exceeding its declared size limit is cancelled', async () => {
  let cancelled = false;
  const forged = {
    name: 'x.jpg', type: 'image/jpeg', size: 12,
    stream: () => new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(10 * 1024 * 1024 + 1)); },
      cancel() { cancelled = true; },
    }),
  } as File;
  await assert.rejects(() => validateUpload(forged), { code: 'FILE_TOO_LARGE' });
  assert.equal(cancelled, true);
});

test('production without complete S3 settings never falls back to public uploads', () => {
  assert.throws(() => createMediaStorage({ mode: 'production', s3: null }), { code: 'STORAGE_UNAVAILABLE' });
});
