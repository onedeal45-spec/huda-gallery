import AIcon from '@/components/AIcon';
import { DeleteButton } from '@/components/AdminBits';
import { sql } from '@/lib/db';
import { csrfToken } from '@/lib/auth';
import { getSettings, ART_SELECT, collectionCover, collectionUrl, imgUrl, excerpt } from '@/lib/site';

export const metadata = { title: 'Collections' };

export default async function Collections({ searchParams }) {
  const s = await getSettings();
  const sp = await searchParams;
  const editId = Number(sp.edit) || 0;
  const [edit] = editId ? await sql`SELECT * FROM collections WHERE id = ${editId}` : [];
  const assigned = edit ? (await sql`SELECT artwork_id FROM collection_artworks WHERE collection_id = ${editId}`).map((r) => r.artwork_id) : [];
  const rows = await sql`SELECT co.*, (SELECT COUNT(*)::int FROM collection_artworks ca WHERE ca.collection_id = co.id) AS n FROM collections co ORDER BY co.sort_order, co.name`;
  const covers = await Promise.all(rows.map((c) => collectionCover(s, c)));
  const artworks = await sql`${ART_SELECT(s)} ORDER BY a.title`;
  const csrf = await csrfToken();
  return (
    <>
      <div className="page-head"><div><h1>Collections</h1><p>Curated series shown on the home page and the Collections page.</p></div></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {rows.length ? (
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table>
                <thead><tr><th /><th>Name</th><th>Works</th><th>Visible</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {rows.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ width: 66 }}><img className="thumb" src={covers[i].src} alt="" /></td>
                      <td><div className="cell-title">{c.name}</div><div className="cell-sub">Order {c.sort_order} · {excerpt(c.description, 50)}</div></td>
                      <td>{c.n}</td>
                      <td>{c.is_visible ? <span className="badge badge--ok">Visible</span> : <span className="badge badge--hidden">Hidden</span>}</td>
                      <td><div className="actions">
                        <a className="btn btn--sm btn--icon" href={collectionUrl(c)} target="_blank" rel="noopener" aria-label={`View ${c.name}`} title="View"><AIcon name="eye" /></a>
                        <a className="btn btn--sm btn--icon" href={`?edit=${c.id}`} aria-label={`Edit ${c.name}`} title="Edit"><AIcon name="edit" /></a>
                        <DeleteButton action="delete_collection" id={c.id} label={`Delete ${c.name}`} title={`Delete “${c.name}”?`} confirm="The artworks themselves are not deleted — only this collection." />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty"><h3>No collections yet</h3><p>Create a collection with the form.</p></div>}
        </section>
        <section className="card">
          <div className="card__head"><h2>{edit ? 'Edit collection' : 'Create collection'}</h2>{edit ? <a className="btn btn--sm btn--ghost" href="/admin/collections/">Cancel</a> : null}</div>
          <form method="post" action="/api/admin/collection/" encType="multipart/form-data" className="form-grid" data-admin-form="" key={edit?.id || 'new'}>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="id" value={edit?.id || 0} />
            <label className="span-2" data-field="name">Name<input name="name" defaultValue={edit?.name || ''} required maxLength={120} /></label>
            <label className="span-2">Description<textarea name="description" rows={4} maxLength={3000} defaultValue={edit?.description || ''} /></label>
            <label>Sort order<input type="number" name="sort_order" defaultValue={edit ? edit.sort_order : rows.length + 1} /></label>
            <label className="switch" style={{ alignSelf: 'end', minHeight: 42 }}><input type="checkbox" name="is_visible" value="1" defaultChecked={edit ? edit.is_visible : true} /><i />Visible on website</label>
            <div className="label span-2" data-field="cover">Cover image <small>Optional — otherwise the first artwork is used</small>
              <div className="image-field">
                {edit?.cover_image ? <img src={edit.cover_image} alt="" /> : null}
                <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" />
              </div>
              {edit?.cover_image ? <label className="check"><input type="checkbox" name="remove_cover" value="1" /> Remove cover</label> : null}
            </div>
            <div className="label span-2">Artworks in this collection
              <input type="search" placeholder="Filter artworks…" data-filter-list="#assign-list" aria-label="Filter artworks" />
              <div className="list-check" id="assign-list">
                {artworks.map((a) => (
                  <label key={a.id} data-name={a.title.toLowerCase()}><input type="checkbox" name="artworks" value={a.id} defaultChecked={assigned.includes(a.id)} /><img src={imgUrl(a, 'sm')} alt="" loading="lazy" />{a.title}</label>
                ))}
              </div>
            </div>
            <button className="btn btn--primary span-2" type="submit">{edit ? 'Save collection' : 'Create collection'}</button>
          </form>
        </section>
      </div>
    </>
  );
}
