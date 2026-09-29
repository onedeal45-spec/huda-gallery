import fs from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db';
import { slugify, uniqueSlug, getSettings, saveSettings } from './site';
import { storeArtworkImage } from './images';
import seed from './seed.json';

/** Categories + collections (fast). */
export async function seedTaxonomy() {
  for (const [i, c] of seed.categories.entries()) {
    await sql`INSERT INTO categories (name, slug, description, sort_order) VALUES (${c.name}, ${slugify(c.name)}, ${c.description}, ${i + 1})
              ON CONFLICT (slug) DO NOTHING`;
  }
  for (const [i, c] of seed.collections.entries()) {
    await sql`INSERT INTO collections (name, slug, description, is_visible, sort_order) VALUES (${c.name}, ${slugify(c.name)}, ${c.description}, true, ${i + 1})
              ON CONFLICT (slug) DO NOTHING`;
  }
}

/** Imports up to `batch` artworks that aren't imported yet. Returns { imported, remaining, total }. */
export async function seedArtworks(batch = 3) {
  const s = await getSettings();
  const total = seed.artworks.length;
  const codes = seed.artworks.map((a) => a.code);
  const existing = new Set((await sql`SELECT artwork_code FROM artworks WHERE artwork_code IN ${sql(codes)}`).map((r) => r.artwork_code));
  const todo = seed.artworks.filter((a) => !existing.has(a.code));
  let imported = 0;
  for (const a of todo.slice(0, batch)) {
    const buf = await fs.readFile(path.join(process.cwd(), 'seed', path.basename(a.file)));
    const img = await storeArtworkImage(buf);
    const [cat] = await sql`SELECT id FROM categories WHERE slug = ${slugify(a.category)}`;
    const slug = await uniqueSlug('artworks', slugify(a.title));
    const [row] = await sql`
      INSERT INTO artworks (title, slug, artwork_code, category_id, description, year, price, currency, availability, is_featured, is_new, sort_order)
      VALUES (${a.title}, ${slug}, ${a.code}, ${cat?.id || null}, ${a.description}, ${a.year}, NULL, ${s.default_currency || 'PKR'}, 'available',
              ${!!a.featured}, ${a.sort <= 3}, ${a.sort})
      ON CONFLICT (artwork_code) DO NOTHING RETURNING id`;
    if (!row) continue;
    await sql`INSERT INTO artwork_images (artwork_id, url_sm, url_md, url_lg, width, height, is_main, sort_order)
              VALUES (${row.id}, ${img.url_sm}, ${img.url_md}, ${img.url_lg}, ${img.width}, ${img.height}, true, 0)`;
    for (const name of a.collections) {
      const [col] = await sql`SELECT id FROM collections WHERE slug = ${slugify(name)}`;
      if (col) await sql`INSERT INTO collection_artworks (collection_id, artwork_id, sort_order) VALUES (${col.id}, ${row.id}, ${a.sort}) ON CONFLICT DO NOTHING`;
    }
    if (seed.hero_code === a.code) await saveSettings({ hero_artwork_id: String(row.id) });
    imported++;
  }
  return { imported, remaining: Math.max(0, todo.length - imported), total };
}
