import { sql } from '@/lib/db';
import { guard } from '@/lib/admin';
import { json, str } from '@/lib/http';
import { STATUSES, availabilityLabel, getSettings, saveSettings } from '@/lib/site';
import { deleteFiles } from '@/lib/storage';

export const runtime = 'nodejs';

/** Inline admin actions (delete, status, featured). POST + CSRF + admin session. */
export async function POST(request) {
  const form = await request.formData();
  const g = await guard(request, str(form, 'csrf', 100));
  if (g.response) return g.response;
  const action = str(form, 'action', 40);
  const id = Number(str(form, 'id', 12)) || 0;
  const value = str(form, 'value', 20);

  switch (action) {
    case 'delete_artwork': {
      const [art] = await sql`SELECT id, title FROM artworks WHERE id = ${id}`;
      if (!art) return json({ ok: false, message: 'That artwork was already deleted.' }, 404);
      const imgs = await sql`SELECT url_sm, url_md, url_lg FROM artwork_images WHERE artwork_id = ${id}`;
      // Images, collection links and featured placement go with the row (cascade); inquiries keep their history.
      await sql`DELETE FROM artworks WHERE id = ${id}`;
      await deleteFiles(imgs.flatMap((r) => [r.url_sm, r.url_md, r.url_lg]));
      const s = await getSettings();
      if (Number(s.hero_artwork_id) === id) await saveSettings({ hero_artwork_id: '' });
      return json({ ok: true, message: `“${art.title}” was deleted.` });
    }
    case 'set_status': {
      if (!STATUSES.includes(value)) return json({ ok: false, message: 'Unknown status.' }, 422);
      const r = await sql`UPDATE artworks SET availability = ${value}, updated_at = now() WHERE id = ${id} RETURNING id`;
      return r.length ? json({ ok: true, message: `Status set to ${availabilityLabel(value)}.` }) : json({ ok: false, message: 'Artwork not found.' }, 404);
    }
    case 'toggle_featured': {
      const on = value === '1';
      await sql`UPDATE artworks SET is_featured = ${on}, updated_at = now() WHERE id = ${id}`;
      return json({ ok: true, message: on ? 'Added to featured works.' : 'Removed from featured works.' });
    }
    case 'delete_category': {
      const [row] = await sql`DELETE FROM categories WHERE id = ${id} RETURNING name, image`;
      if (!row) return json({ ok: false, message: 'That category was already deleted.' }, 404);
      await deleteFiles(row.image);
      return json({ ok: true, message: `Category “${row.name}” deleted.` });
    }
    case 'delete_collection': {
      const [row] = await sql`DELETE FROM collections WHERE id = ${id} RETURNING name, cover_image`;
      if (!row) return json({ ok: false, message: 'That collection was already deleted.' }, 404);
      await deleteFiles(row.cover_image);
      return json({ ok: true, message: `Collection “${row.name}” deleted.` });
    }
    case 'set_inquiry_status': {
      if (!['new', 'contacted', 'completed', 'archived'].includes(value)) return json({ ok: false, message: 'Unknown status.' }, 422);
      await sql`UPDATE inquiries SET status = ${value}, updated_at = now() WHERE id = ${id}`;
      const [{ n }] = await sql`SELECT COUNT(*)::int n FROM inquiries WHERE status = 'new'`;
      return json({ ok: true, message: `Inquiry marked ${value[0].toUpperCase() + value.slice(1)}.`, newCount: n });
    }
    case 'delete_inquiry': {
      const [row] = await sql`DELETE FROM inquiries WHERE id = ${id} RETURNING reference_image`;
      if (!row) return json({ ok: false, message: 'That inquiry was already deleted.' }, 404);
      await deleteFiles(row.reference_image);
      return json({ ok: true, message: 'Inquiry deleted.' });
    }
    default:
      return json({ ok: false, message: 'Unknown action.' }, 400);
  }
}
