import ArtworkForm from '@/components/ArtworkForm';
import { sql } from '@/lib/db';
import { csrfToken } from '@/lib/auth';
import { getSettings } from '@/lib/site';

export const metadata = { title: 'Add Artwork' };

export default async function AddArtwork() {
  const s = await getSettings();
  const cats = await sql`SELECT id, name FROM categories ORDER BY sort_order, name`;
  const cols = await sql`SELECT id, name, is_visible FROM collections ORDER BY sort_order, name`;
  return (
    <>
      <div className="page-head"><div><h1>Add Artwork</h1><p>Publish a new piece. It appears on the website as soon as you save.</p></div></div>
      <ArtworkForm art={null} cats={cats} cols={cols} csrf={await csrfToken()} defaultCurrency={s.default_currency} />
    </>
  );
}
