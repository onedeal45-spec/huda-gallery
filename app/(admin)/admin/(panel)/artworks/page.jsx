import AIcon from '@/components/AIcon';
import { DeleteButton } from '@/components/AdminBits';
import { sql } from '@/lib/db';
import { getSettings, ART_SELECT, STATUSES, imgUrl, formatPrice, availabilityLabel, artworkUrl } from '@/lib/site';

export const metadata = { title: 'Artworks' };
const PER = 30;

export default async function Artworks({ searchParams }) {
  const s = await getSettings();
  const sp = await searchParams;
  const q = String(sp.q || '').trim().slice(0, 80);
  const cat = Number(sp.category) || 0;
  const av = STATUSES.includes(sp.availability) ? sp.availability : '';
  const feat = !!sp.featured;
  const conds = [];
  if (q) { const like = '%' + q + '%'; conds.push(sql`(a.title ILIKE ${like} OR a.artwork_code ILIKE ${like} OR a.medium ILIKE ${like})`); }
  if (cat) conds.push(sql`a.category_id = ${cat}`);
  if (av) conds.push(sql`a.availability = ${av}`);
  if (feat) conds.push(sql`a.is_featured = true`);
  const where = conds.length ? conds.reduce((acc, c, i) => (i ? sql`${acc} AND ${c}` : sql`WHERE ${c}`), sql``) : sql``;
  const [{ total }] = await sql`SELECT COUNT(*)::int total FROM artworks a LEFT JOIN categories c ON c.id = a.category_id ${where}`;
  const pages = Math.max(1, Math.ceil(total / PER));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages);
  const rows = await sql`${ART_SELECT(s)} ${where} ORDER BY a.sort_order ASC, a.created_at DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`;
  const cats = await sql`SELECT id, name FROM categories ORDER BY sort_order, name`;
  const filtered = conds.length > 0;
  const qs = (p) => { const o = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === 'string')); o.set('page', p); return '?' + o.toString(); };

  return (
    <>
      <div className="page-head">
        <div><h1>Artworks</h1><p>{total} {total === 1 ? 'artwork' : 'artworks'}{filtered ? ' match your filters' : ' in the studio'}.</p></div>
        <a className="btn btn--primary" href="/admin/add-artwork/"><AIcon name="plus" />Add Artwork</a>
      </div>
      <form className="toolbar" method="get" data-autosubmit="">
        <label className="sr-only" htmlFor="s-q">Search</label>
        <input id="s-q" type="search" name="q" defaultValue={q} placeholder="Search title, ID or medium…" />
        <label className="sr-only" htmlFor="s-c">Category</label>
        <select id="s-c" name="category" defaultValue={cat || ''}><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label className="sr-only" htmlFor="s-a">Availability</label>
        <select id="s-a" name="availability" defaultValue={av}><option value="">Any status</option>{STATUSES.map((x) => <option key={x} value={x}>{availabilityLabel(x)}</option>)}</select>
        <label className="check"><input type="checkbox" name="featured" value="1" defaultChecked={feat} /> Featured only</label>
        <button className="btn" type="submit">Filter</button>
        {filtered ? <a className="btn btn--ghost" href="/admin/artworks/">Clear</a> : null}
      </form>

      {rows.length ? (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 70 }} /><th>Artwork</th><th className="hide-sm">Category</th><th>Price</th><th>Status</th><th className="hide-sm">Featured</th><th className="hide-sm">Order</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} data-row={a.id}>
                    <td><img className="thumb" src={imgUrl(a, 'sm')} alt="" loading="lazy" /></td>
                    <td>
                      <div className="cell-title"><a href={`/admin/edit-artwork/${a.id}/`}>{a.title}</a></div>
                      <div className="cell-sub">{a.artwork_code || '—'}{a.is_new ? <> · <span className="badge badge--new badge--plain" style={{ padding: '1px 7px' }}>New</span></> : null}</div>
                    </td>
                    <td className="hide-sm">{a.category_name || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatPrice(a.price, a.currency, s)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`st-${a.id}`}>Status of {a.title}</label>
                      <select id={`st-${a.id}`} style={{ minHeight: 32, padding: '4px 8px', width: 'auto' }} data-api-change="set_status" data-id={a.id} defaultValue={a.availability}>
                        {STATUSES.map((x) => <option key={x} value={x}>{availabilityLabel(x)}</option>)}
                      </select>
                    </td>
                    <td className="hide-sm"><label className="switch"><input type="checkbox" data-api-change="toggle_featured" data-id={a.id} defaultChecked={a.is_featured} /><i /><span className="sr-only">Featured</span></label></td>
                    <td className="hide-sm">{a.sort_order}</td>
                    <td>
                      <div className="actions">
                        <a className="btn btn--sm btn--icon" href={artworkUrl(a)} target="_blank" rel="noopener" title="View on site" aria-label={`View ${a.title} on site`}><AIcon name="eye" /></a>
                        <a className="btn btn--sm btn--icon" href={`/admin/edit-artwork/${a.id}/`} title="Edit" aria-label={`Edit ${a.title}`}><AIcon name="edit" /></a>
                        <DeleteButton action="delete_artwork" id={a.id} label={`Delete ${a.title}`} title={`Delete “${a.title}”?`} confirm="Are you sure you want to permanently delete this artwork?" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <div className="btn-row" style={{ marginTop: 16, justifyContent: 'center' }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => <a key={p} className={'btn btn--sm' + (p === page ? ' btn--primary' : '')} href={qs(p)}>{p}</a>)}
            </div>
          ) : null}
        </>
      ) : (
        <div className="card empty">
          <h3>{filtered ? 'No artwork found' : 'No artworks yet'}</h3>
          <p>{filtered ? 'Try a different search or clear the filters.' : 'Add your first artwork and it will appear on the website immediately.'}</p>
          <a className="btn btn--primary" href="/admin/add-artwork/"><AIcon name="plus" />Add Artwork</a>
        </div>
      )}
    </>
  );
}
