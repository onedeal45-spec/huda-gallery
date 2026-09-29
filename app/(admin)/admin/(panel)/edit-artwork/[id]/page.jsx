import { notFound } from 'next/navigation';
import ArtworkForm from '@/components/ArtworkForm';
import { AvailBadge, DeleteButton } from '@/components/AdminBits';
import { sql } from '@/lib/db';
import { csrfToken } from '@/lib/auth';
import { getSettings } from '@/lib/site';
import { fmtDate } from '@/lib/admin';

export const metadata = { title: 'Edit Artwork' };

export default async function EditArtwork({ params }) {
  const id = Number((await params).id) || 0;
  const [art] = id ? await sql`SELECT * FROM artworks WHERE id = ${id}` : [];
  if (!art) notFound();
  const s = await getSettings();
  const images = await sql`SELECT * FROM artwork_images WHERE artwork_id = ${id} ORDER BY is_main DESC, sort_order, id`;
  const artCollections = (await sql`SELECT collection_id FROM collection_artworks WHERE artwork_id = ${id}`).map((r) => r.collection_id);
  const cats = await sql`SELECT id, name FROM categories ORDER BY sort_order, name`;
  const cols = await sql`SELECT id, name, is_visible FROM collections ORDER BY sort_order, name`;
  return (
    <>
      <div className="page-head">
        <div><h1>{art.title}</h1><p>Last updated {fmtDate(art.updated_at)} · <AvailBadge s={art.availability} /></p></div>
        <DeleteButton action="delete_artwork" id={art.id} small={false} redirect="/admin/artworks/" title={`Delete “${art.title}”?`} confirm="Are you sure you want to permanently delete this artwork?" />
      </div>
      <ArtworkForm art={art} images={images} artCollections={artCollections} cats={cats} cols={cols} csrf={await csrfToken()} defaultCurrency={s.default_currency} />
    </>
  );
}
