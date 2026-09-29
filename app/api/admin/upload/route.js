import crypto from 'node:crypto';
import { sql } from '@/lib/db';
import { guard } from '@/lib/admin';
import { json } from '@/lib/http';
import { validateImage, storeArtworkImage, ImageError } from '@/lib/images';
import { deleteFiles } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Uploads ONE artwork image (keeps each request under Vercel's ~4.5 MB limit).
 * The image is validated, re-encoded to sm/md/lg WebP and stored as a pending row;
 * the artwork save request then attaches it using the returned key.
 */
export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: 'The image is too large to upload. Try a smaller file.' }, 413);
  }
  const g = await guard(request, String(form.get('csrf') || ''));
  if (g.response) return g.response;

  // Clean up abandoned uploads older than a day.
  const stale = await sql`DELETE FROM artwork_images WHERE artwork_id IS NULL AND created_at < now() - interval '1 day' RETURNING url_sm, url_md, url_lg`;
  if (stale.length) await deleteFiles(stale.flatMap((r) => [r.url_sm, r.url_md, r.url_lg]));

  try {
    const { buf } = await validateImage(form.get('image'));
    const img = await storeArtworkImage(buf);
    const key = crypto.randomBytes(16).toString('hex');
    await sql`INSERT INTO artwork_images (artwork_id, url_sm, url_md, url_lg, width, height, is_main, sort_order, upload_key)
              VALUES (NULL, ${img.url_sm}, ${img.url_md}, ${img.url_lg}, ${img.width}, ${img.height}, false, 0, ${key})`;
    return json({ ok: true, key, thumb: img.url_sm });
  } catch (e) {
    if (e instanceof ImageError) return json({ ok: false, message: e.message }, 422);
    console.error(e);
    return json({ ok: false, message: 'The image could not be processed. Please try another file.' }, 500);
  }
}
