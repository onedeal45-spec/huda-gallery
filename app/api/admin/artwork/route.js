import { sql } from '@/lib/db';
import { guard } from '@/lib/admin';
import { json, str } from '@/lib/http';
import { slugify, uniqueSlug, CURRENCIES, STATUSES, getSettings } from '@/lib/site';
import { deleteFiles } from '@/lib/storage';

export const runtime = 'nodejs';

/** Create / update an artwork. Images were uploaded beforehand via /api/admin/upload/ and arrive as keys. */
export async function POST(request) {
  const form = await request.formData();
  const g = await guard(request, str(form, 'csrf', 100));
  if (g.response) return g.response;
  const s = await getSettings();

  const id = Number(str(form, 'id', 12)) || 0;
  const isNew = !id;
  if (!isNew) {
    const [exists] = await sql`SELECT id FROM artworks WHERE id = ${id}`;
    if (!exists) return json({ ok: false, message: 'That artwork no longer exists.', redirect: '/admin/artworks/' }, 404);
  }

  const errors = {};
  const title = str(form, 'title', 190);
  const code = str(form, 'artwork_code', 60);
  const slugIn = slugify(str(form, 'slug', 200));
  const yearIn = str(form, 'year', 4);
  const priceIn = str(form, 'price', 20).replace(/[,\s]/g, '');
  const currency = CURRENCIES.includes(str(form, 'currency', 8)) ? str(form, 'currency', 8) : s.default_currency || 'PKR';
  const avail = STATUSES.includes(str(form, 'availability', 12)) ? str(form, 'availability', 12) : 'available';
  let catId = Number(str(form, 'category_id', 12)) || null;
  const featured = form.get('is_featured') === '1';
  const isNewBadge = form.get('is_new') === '1';
  const sort = parseInt(str(form, 'sort_order', 10), 10) || 0;
  let colIds = [...new Set(form.getAll('collections').map(Number).filter(Boolean))];

  if (!title) errors.title = 'Please enter a title.';
  let year = null;
  if (yearIn) {
    year = parseInt(yearIn, 10);
    if (!(year >= 1900 && year <= new Date().getFullYear() + 1)) errors.year = `Enter a year between 1900 and ${new Date().getFullYear() + 1}.`;
  }
  let price = null;
  if (priceIn) {
    const p = Number(priceIn);
    if (!Number.isFinite(p) || p < 0 || p > 9999999999) errors.price = 'Enter a valid price (numbers only), or leave empty for “Price on request”.';
    else price = Math.round(p * 100) / 100;
  }
  if (code) {
    const [dupe] = await sql`SELECT id FROM artworks WHERE artwork_code = ${code} AND id <> ${id}`;
    if (dupe) errors.artwork_code = 'Another artwork already uses this ID.';
  }
  if (catId) { const [c] = await sql`SELECT id FROM categories WHERE id = ${catId}`; if (!c) catId = null; }
  if (colIds.length) colIds = (await sql`SELECT id FROM collections WHERE id IN ${sql(colIds)}`).map((r) => r.id);

  // Images
  const existing = isNew ? [] : await sql`SELECT * FROM artwork_images WHERE artwork_id = ${id}`;
  const existingIds = existing.map((r) => r.id);
  const removeIds = form.getAll('remove_images').map(Number).filter((x) => existingIds.includes(x));
  const keys = form.getAll('uploaded').map(String).filter((k) => /^[a-f0-9]{32}$/.test(k));
  const pending = keys.length ? await sql`SELECT id, upload_key FROM artwork_images WHERE artwork_id IS NULL AND upload_key IN ${sql(keys)}` : [];
  const newIds = keys.map((k) => pending.find((p) => p.upload_key === k)?.id).filter(Boolean);
  if (existingIds.length - removeIds.length + newIds.length < 1) errors.images = 'Please add at least one image (the main image).';

  if (Object.keys(errors).length) return json({ ok: false, message: 'Please fix the highlighted fields.', errors }, 422);

  let artId = id;
  let removedRows = [];
  try {
    await sql.begin(async (tx) => {
      const slug = await uniqueSlug('artworks', slugIn || slugify(title) || 'artwork', isNew ? null : id);
      const f = {
        title, slug, artwork_code: code || null, category_id: catId, description: str(form, 'description', 8000) || null,
        medium: str(form, 'medium', 190) || null, dimensions: str(form, 'dimensions', 120) || null, year, price, currency,
        availability: avail, is_featured: featured, is_new: isNewBadge, sort_order: sort,
      };
      if (isNew) {
        [{ id: artId }] = await tx`INSERT INTO artworks ${tx(f)} RETURNING id`;
      } else {
        await tx`UPDATE artworks SET ${tx(f)}, updated_at = now() WHERE id = ${id}`;
      }
      if (removeIds.length) removedRows = await tx`DELETE FROM artwork_images WHERE artwork_id = ${artId} AND id IN ${tx(removeIds)} RETURNING *`;
      const [{ m }] = await tx`SELECT COALESCE(MAX(sort_order), 0)::int m FROM artwork_images WHERE artwork_id = ${artId}`;
      for (const [i, imgId] of newIds.entries()) {
        await tx`UPDATE artwork_images SET artwork_id = ${artId}, upload_key = NULL, sort_order = ${m + i + 1}, updated_at = now() WHERE id = ${imgId}`;
      }
      // Main image
      const choice = str(form, 'main_choice', 40);
      let mainId = 0;
      let mm;
      if ((mm = choice.match(/^existing:(\d+)$/)) && existingIds.includes(+mm[1]) && !removeIds.includes(+mm[1])) mainId = +mm[1];
      else if ((mm = choice.match(/^new:(\d+)$/)) && newIds[+mm[1]]) mainId = newIds[+mm[1]];
      if (!mainId) {
        const [cur] = await tx`SELECT id FROM artwork_images WHERE artwork_id = ${artId} AND is_main = true LIMIT 1`;
        const [first] = await tx`SELECT id FROM artwork_images WHERE artwork_id = ${artId} ORDER BY sort_order, id LIMIT 1`;
        mainId = cur?.id || newIds[0] || first?.id || 0;
      }
      await tx`UPDATE artwork_images SET is_main = (id = ${mainId}) WHERE artwork_id = ${artId}`;
      await tx`DELETE FROM collection_artworks WHERE artwork_id = ${artId}`;
      for (const cid of colIds) await tx`INSERT INTO collection_artworks (collection_id, artwork_id, sort_order) VALUES (${cid}, ${artId}, ${sort})`;
    });
  } catch (e) {
    console.error('save artwork', e);
    return json({ ok: false, message: 'The artwork could not be saved because of a database error. Please try again.' }, 500);
  }
  // Files for removed images are deleted only after the database commit succeeded.
  await deleteFiles(removedRows.flatMap((r) => [r.url_sm, r.url_md, r.url_lg]));

  const [row] = await sql`SELECT slug, title FROM artworks WHERE id = ${artId}`;
  return json({
    ok: true,
    message: isNew ? `“${row.title}” is published.` : `Changes to “${row.title}” are saved and live.`,
    id: artId,
    redirect: `/admin/edit-artwork/${artId}/`,
    public: `/artwork/${row.slug}/`,
  });
}
