import AIcon from '@/components/AIcon';
import { DeleteButton } from '@/components/AdminBits';
import { sql } from '@/lib/db';
import { csrfToken } from '@/lib/auth';
import { excerpt } from '@/lib/site';

export const metadata = { title: 'Categories' };

export default async function Categories({ searchParams }) {
  const sp = await searchParams;
  const editId = Number(sp.edit) || 0;
  const [edit] = editId ? await sql`SELECT * FROM categories WHERE id = ${editId}` : [];
  const rows = await sql`SELECT c.*, (SELECT COUNT(*)::int FROM artworks a WHERE a.category_id = c.id) AS n FROM categories c ORDER BY c.sort_order, c.name`;
  const csrf = await csrfToken();
  return (
    <>
      <div className="page-head"><div><h1>Categories</h1><p>Categories group artworks on the website and power the gallery filter.</p></div></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {rows.length ? (
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table>
                <thead><tr><th /><th>Name</th><th>Artworks</th><th className="hide-sm">Order</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td style={{ width: 66 }}>{c.image ? <img className="thumb" src={c.image} alt="" /> : <div className="thumb" />}</td>
                      <td><div className="cell-title">{c.name}</div><div className="cell-sub">{excerpt(c.description, 70)}</div></td>
                      <td><a href={`/admin/artworks/?category=${c.id}`}>{c.n}</a></td>
                      <td className="hide-sm">{c.sort_order}</td>
                      <td><div className="actions">
                        <a className="btn btn--sm btn--icon" href={`?edit=${c.id}`} aria-label={`Edit ${c.name}`} title="Edit"><AIcon name="edit" /></a>
                        <DeleteButton action="delete_category" id={c.id} label={`Delete ${c.name}`} title={`Delete “${c.name}”?`} confirm={`${c.n} artwork(s) in this category will stay published but become uncategorised.`} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty"><h3>No categories yet</h3><p>Create your first category with the form.</p></div>}
        </section>
        <section className="card">
          <div className="card__head"><h2>{edit ? 'Edit category' : 'Add category'}</h2>{edit ? <a className="btn btn--sm btn--ghost" href="/admin/categories/">Cancel</a> : null}</div>
          <form method="post" action="/api/admin/category/" encType="multipart/form-data" className="form-grid" data-admin-form="" key={edit?.id || 'new'}>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="id" value={edit?.id || 0} />
            <label className="span-2" data-field="name">Name<input name="name" defaultValue={edit?.name || ''} required maxLength={120} /></label>
            <label className="span-2">Description<textarea name="description" rows={4} maxLength={2000} defaultValue={edit?.description || ''} /></label>
            <label>Sort order<input type="number" name="sort_order" defaultValue={edit ? edit.sort_order : rows.length + 1} /></label>
            <div className="label" data-field="image">Image <small>Optional</small>
              <div className="image-field">
                {edit?.image ? <img src={edit.image} alt="" /> : null}
                <input type="file" name="image" accept="image/jpeg,image/png,image/webp" />
              </div>
              {edit?.image ? <label className="check"><input type="checkbox" name="remove_image" value="1" /> Remove image</label> : null}
            </div>
            <button className="btn btn--primary span-2" type="submit">{edit ? 'Save category' : 'Add category'}</button>
          </form>
        </section>
      </div>
    </>
  );
}
