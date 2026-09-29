import AIcon from '@/components/AIcon';
import { AvailBadge, InqBadge } from '@/components/AdminBits';
import { sql } from '@/lib/db';
import { getSettings, ART_SELECT, imgUrl, formatPrice } from '@/lib/site';
import { fmtDate } from '@/lib/admin';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard() {
  const s = await getSettings();
  const [c] = await sql`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE availability='available')::int available, COUNT(*) FILTER (WHERE availability='sold')::int sold,
      COUNT(*) FILTER (WHERE availability='reserved')::int reserved, COUNT(*) FILTER (WHERE is_featured)::int featured FROM artworks`;
  const [{ cats }] = await sql`SELECT COUNT(*)::int cats FROM categories`;
  const [{ cols }] = await sql`SELECT COUNT(*)::int cols FROM collections`;
  const [{ inq }] = await sql`SELECT COUNT(*)::int inq FROM inquiries WHERE status='new'`;
  const stats = [
    ['Total Artworks', c.total, '/admin/artworks/', 'var(--ink)'],
    ['Available', c.available, '/admin/artworks/?availability=available', 'var(--ok)'],
    ['Sold', c.sold, '/admin/artworks/?availability=sold', 'var(--danger)'],
    ['Reserved', c.reserved, '/admin/artworks/?availability=reserved', 'var(--warn)'],
    ['Featured', c.featured, '/admin/artworks/?featured=1', 'var(--gold)'],
    ['Categories', cats, '/admin/categories/', 'var(--gold-2)'],
    ['Collections', cols, '/admin/collections/', 'var(--ink-2)'],
    ['New Inquiries', inq, '/admin/inquiries/?status=new', 'var(--info)'],
  ];
  const recentArt = await sql`${ART_SELECT(s)} ORDER BY a.updated_at DESC LIMIT 6`;
  const recentInq = await sql`SELECT i.*, a.title AS artwork_title FROM inquiries i LEFT JOIN artworks a ON a.id = i.artwork_id ORDER BY i.created_at DESC LIMIT 6`;

  return (
    <>
      <div className="page-head">
        <div><h1>Welcome back</h1><p>Here’s what’s happening in the gallery.</p></div>
        <div className="btn-row">
          <a className="btn" href="/" target="_blank" rel="noopener"><AIcon name="external" />View site</a>
          <a className="btn btn--primary" href="/admin/add-artwork/"><AIcon name="plus" />Add Artwork</a>
        </div>
      </div>
      <div className="stats">
        {stats.map(([label, value, href, color], i) => (
          <a key={label} className="stat" href={href} style={{ '--i': i, '--c': color }}>
            <div className="stat__label">{label}</div>
            <div className="stat__value" data-count={value}>{value}</div>
            <span className="stat__bar" aria-hidden="true" />
          </a>
        ))}
      </div>
      <div className="grid-2">
        <section className="card">
          <div className="card__head"><h2>Recently updated</h2><a className="btn btn--sm" href="/admin/artworks/">All artworks</a></div>
          {recentArt.length ? (
            <div className="table-wrap" style={{ border: 0 }}>
              <table><tbody>
                {recentArt.map((a) => (
                  <tr key={a.id}>
                    <td style={{ width: 66 }}><img className="thumb" src={imgUrl(a, 'sm')} alt="" loading="lazy" /></td>
                    <td><div className="cell-title"><a href={`/admin/edit-artwork/${a.id}/`}>{a.title}</a></div>
                      <div className="cell-sub">{a.category_name || 'Uncategorised'} · {formatPrice(a.price, a.currency, s)}</div></td>
                    <td className="hide-sm"><AvailBadge s={a.availability} /></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          ) : (
            <div className="empty"><h3>No artworks yet</h3><p>Add the first piece to open the gallery.</p><a className="btn btn--primary" href="/admin/add-artwork/"><AIcon name="plus" />Add Artwork</a></div>
          )}
        </section>
        <section className="card">
          <div className="card__head"><h2>Latest inquiries</h2><a className="btn btn--sm" href="/admin/inquiries/">All inquiries</a></div>
          {recentInq.length ? (
            <div style={{ display: 'grid', gap: 4 }}>
              {recentInq.map((q) => (
                <a key={q.id} href={`/admin/inquiries/#inq-${q.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 8, textDecoration: 'none', border: '1px solid var(--line)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="cell-title">{q.name}</div>
                    <div className="cell-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.artwork_title ? `“${q.artwork_title}”` : q.type[0].toUpperCase() + q.type.slice(1)} · {fmtDate(q.created_at)}</div>
                  </div>
                  <InqBadge s={q.status} />
                </a>
              ))}
            </div>
          ) : (
            <div className="empty"><h3>No inquiries yet</h3><p>Messages from the contact, artwork and commission forms appear here.</p></div>
          )}
        </section>
      </div>
    </>
  );
}
