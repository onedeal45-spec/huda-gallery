import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * File storage.
 *  - On Vercel: Vercel Blob (set automatically when a Blob store is connected: BLOB_READ_WRITE_TOKEN).
 *  - Locally: public/uploads (served by Next.js).
 * Only processed images (re-encoded by sharp) are ever stored.
 */
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export function randomName(ext) {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `${stamp}-${crypto.randomBytes(12).toString('hex')}.${ext}`;
}

const CONTENT_TYPES = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' };

/** Store a buffer under folder/name. Returns the public URL. */
export async function putFile(folder, name, buffer) {
  folder = folder.replace(/[^a-z0-9_-]/g, '');
  const ext = name.split('.').pop();
  if (useBlob()) {
    const { put } = await import('@vercel/blob');
    const res = await put(`${folder}/${name}`, buffer, {
      access: 'public',
      contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
    return res.url;
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `/uploads/${folder}/${name}`;
}

/** Delete files by URL (ignores anything that isn't ours). */
export async function deleteFiles(urls) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (!list.length) return;
  const blobUrls = list.filter((u) => /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(u));
  const localUrls = list.filter((u) => /^\/uploads\/[a-z0-9_-]+\/[A-Za-z0-9_-]+\.(webp|png|jpg)$/.test(u));
  if (blobUrls.length && useBlob()) {
    try {
      const { del } = await import('@vercel/blob');
      await del(blobUrls);
    } catch (e) {
      console.error('Blob delete failed', e);
    }
  }
  for (const u of localUrls) {
    await fs.unlink(path.join(process.cwd(), 'public', u)).catch(() => {});
  }
}

/** Read back a stored file (used to stream private commission references to the admin). */
export async function readFile(url) {
  if (/^https:\/\//.test(url)) {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  }
  if (/^\/uploads\/[a-z0-9_-]+\/[A-Za-z0-9_-]+\.(webp|png|jpg)$/.test(url)) {
    return fs.readFile(path.join(process.cwd(), 'public', url)).catch(() => null);
  }
  return null;
}
