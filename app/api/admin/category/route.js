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
  const [row] = id ? await sql`SELECT * FROM categories WHERE id = ${id}` : [];
  const name = str(form, 'name', 120);
  const description = str(form, 'description', 2000) || null;
  const sort = parseInt(str(form, 'sort_order', 10), 10) || 0;
  const back = id ? `/admin/categories/?edit=${id}` : '/admin/categories/';

  if (!name) return done(request, { ok: false, message: 'Please enter a category name.', errors: { name: 'Required' }, redirect: back });
  const [dupe] = await sql`SELECT id FROM categories WHERE lower(name) = lower(${name}) AND id <> ${id}`;
  if (dupe) return done(request, { ok: false, message: 'A category with this name already exists.', errors: { name: 'Duplicate' }, redirect: back });

  let image = row?.image || null;
  try {
    const up = await handleSingleUpload(form.get('image'), 'covers', 1400);
    if (up) { await deleteFiles(image); image = up; }
    else if (form.get('remove_image') === '1') { await deleteFiles(image); image = null; }
  } catch (e) {
    if (e instanceof ImageError) return done(request, { ok: false, message: e.message, errors: { image: e.message }, redirect: back });
    throw e;
  }

  if (row) {
    const slug = row.name === name ? row.slug : await uniqueSlug('categories', slugify(name) || 'category', id);
    await sql`UPDATE categories SET name=${name}, slug=${slug}, description=${description}, image=${image}, sort_order=${sort}, updated_at=now() WHERE id=${id}`;
    return done(request, { ok: true, message: `Category “${name}” updated.`, redirect: '/admin/categories/' });
  }
  await sql`INSERT INTO categories (name, slug, description, image, sort_order) VALUES (${name}, ${await uniqueSlug('categories', slugify(name) || 'category')}, ${description}, ${image}, ${sort})`;
  return done(request, { ok: true, message: `Category “${name}” added.`, redirect: '/admin/categories/' });
}
