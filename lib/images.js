import sharp from 'sharp';
import { putFile, deleteFiles, randomName } from './storage';

/**
 * Secure image processing.
 * Every upload is validated (extension, declared type, real format detected by sharp, size, dimensions)
 * and re-encoded. Nothing from the original file except pixels is kept.
 */
export const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp'];
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 12 * 1024 * 1024;
export const SIZES = { sm: 560, md: 1100, lg: 1900 };

export class ImageError extends Error {}

/** Validate a File from FormData and return its buffer + metadata. */
export async function validateImage(file) {
  if (!file || typeof file === 'string' || !file.size) throw new ImageError('No image was selected.');
  const name = String(file.name || 'image');
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (!ALLOWED_EXT.includes(ext)) throw new ImageError(`“${name}” is not allowed. Use JPG, PNG or WEBP images.`);
  if (file.size > MAX_BYTES) throw new ImageError(`“${name}” is larger than 12 MB.`);
  if (file.type && !ALLOWED_MIME.includes(file.type)) throw new ImageError(`“${name}” is not a valid JPG, PNG or WEBP image.`);
  const buf = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(buf, { failOn: 'error', limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new ImageError(`“${name}” is not a valid JPG, PNG or WEBP image.`);
  }
  if (!['jpeg', 'png', 'webp'].includes(meta.format)) throw new ImageError(`“${name}” is not a valid JPG, PNG or WEBP image.`);
  const w = meta.autoOrient?.width || meta.width, h = meta.autoOrient?.height || meta.height;
  if (!w || !h || w < 32 || h < 32 || w > 12000 || h > 12000) throw new ImageError(`“${name}” has unsupported dimensions.`);
  return { buf, name };
}

/** Artwork image → sm/md/lg WebP variants. */
export async function storeArtworkImage(buf) {
  const base = sharp(buf, { limitInputPixels: 60_000_000 }).rotate();
  const out = {};
  const urls = [];
  try {
    for (const [k, max] of Object.entries(SIZES)) {
      const { data, info } = await base.clone()
        .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: k === 'sm' ? 78 : 84 })
        .toBuffer({ resolveWithObject: true });
      const url = await putFile('artworks', randomName('webp').replace('.webp', `-${k}.webp`), data);
      urls.push(url);
      out['url_' + k] = url;
      if (k === 'lg') { out.width = info.width; out.height = info.height; }
    }
  } catch (e) {
    await deleteFiles(urls);
    throw e;
  }
  return out;
}

/** Single image (logo, cover, about photo, favicon, reference). Returns URL. */
export async function storeSingleImage(buf, folder, maxSide = 1800, png = false) {
  let img = sharp(buf, { limitInputPixels: 60_000_000 }).rotate().resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });
  const data = png ? await img.png({ compressionLevel: 8 }).toBuffer() : await img.webp({ quality: 86 }).toBuffer();
  return putFile(folder, randomName(png ? 'png' : 'webp'), data);
}

/** Convenience: FormData file field → stored single image URL, or null if empty. */
export async function handleSingleUpload(file, folder, maxSide = 1800, png = false) {
  if (!file || typeof file === 'string' || !file.size) return null;
  const { buf } = await validateImage(file);
  return storeSingleImage(buf, folder, maxSide, png);
}
