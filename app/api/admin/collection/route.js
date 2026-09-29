import { sql } from '@/lib/db';
import { guard } from '@/lib/admin';
import { str } from '@/lib/http';
import { done } from '@/lib/adminform';
import { slugify, uniqueSlug } from '@/lib/site';
import { handleSingleUpload, ImageError } from '@/lib/images';
import { deleteFiles } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(request) {
  const form = await request.formData();
  const g = await guard(request, str(form, 'csrf', 100));
  if (g.response) return g.response;
  const id = Number(str(form, 'id', 12)) || 0;
  const [row] = id ? await sql`SELECT * FROM collections WHERE id = ${id}` : [];
  const name = str(form, 'name', 120);
  const description = str(form, 'description', 3000) || null;
  const sort = parseInt(str(form, 'sort_order', 10), 10) || 0;
  const visible = form.get('is_visible') === '1';
  const artIds = [...new Set(form.getAll('artworks').map(Number).filter(Boolean))];
  const back = id ? `/admin/collections/?edit=${id}` : '/admin/collections/';

  if (!name) return done(request, { ok: false, message: 'Please enter a collection name.', errors: { name: 'Required' }, redirect: back });
  const [dupe] = await sql`SELECT id FROM collections WHERE lower(name) = lower(${name}) AND id <> ${id}`;
  if (dupe) return done(request, { ok: false, message: 'A collection with this name already exists.', errors: { name: 'Duplicate' }, redirect: back });

  let cover = row?.cover_image || null;
  try {
    const up = await handleSingleUpload(form.get('cover'), 'covers', 1600);
    if (up) { await deleteFiles(cover); cover = up; }
    else if (form.get('remove_cover') === '1') { await deleteFiles(cover); cover = null; }
  } catch (e) {
    if (e instanceof ImageError) return done(request, { ok: false, message: e.message, errors: { cover: e.message }, redirect: back });
    throw e;
  }

  let colId = id;
  await sql.begin(async (tx) => {
    if (row) {
      const slug = row.name === name ? row.slug : await uniqueSlug('collections', slugify(name) || 'collection', id);
      await tx`UPDATE collections SET name=${name}, slug=${slug}, description=${description}, cover_image=${cover}, is_visible=${visible}, sort_order=${sort}, updated_at=now() WHERE id=${id}`;
    } else {
      [{ id: colId }] = await tx`INSERT INTO collections (name, slug, description, cover_image, is_visible, sort_order)
        VALUES (${name}, ${await uniqueSlug('collections', slugify(name) || 'collection')}, ${description}, ${cover}, ${visible}, ${sort}) RETURNING id`;
    }
    await tx`DELETE FROM collection_artworks WHERE collection_id = ${colId}`;
    for (const [i, aid] of artIds.entries()) {
      await tx`INSERT INTO collection_artworks (collection_id, artwork_id, sort_order) SELECT ${colId}, id, ${i} FROM artworks WHERE id = ${aid} ON CONFLICT DO NOTHING`;
    }
  });
  return done(request, { ok: true, message: `Collection “${name}” ${row ? 'updated' : 'created'}.`, redirect: '/admin/collections/' });
}
