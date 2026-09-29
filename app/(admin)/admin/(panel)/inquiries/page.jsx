import AIcon from '@/components/AIcon';
import { DeleteButton } from '@/components/AdminBits';
import { sql } from '@/lib/db';
import { fmtDate } from '@/lib/admin';

export const metadata = { title: 'Inquiries' };
const STATUSES = ['new', 'contacted', 'completed', 'archived'];
const cap = (x) => x[0].toUpperCase() + x.slice(1);

function waReply(num, name) {
  let d = String(num || '').replace(/\D+/g, '');
  if (!d) return '';
  if (d.startsWith('0') && d.length === 11) d = '92' + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(`Hello ${name}, thank you for contacting HUDA. `)}`;
}

export default async function Inquiries({ searchParams }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status) ? sp.status : '';
  const type = ['contact', 'commission', 'artwork'].includes(sp.type) ? sp.type : '';
  const q = String(sp.q || '').trim().slice(0, 80);
  const conds = [status ? sql`i.status = ${status}` : sql`i.status <> 'archived'`];
  if (type) conds.push(sql`i.type = ${type}`);
  if (q) { const like = '%' + q + '%'; conds.push(sql`(i.name ILIKE ${like} OR i.email ILIKE ${like} OR i.message ILIKE ${like} OR i.whatsapp ILIKE ${like})`); }
  const where = conds.reduce((acc, c, i) => (i ? sql`${acc} AND ${c}` : sql`WHERE ${c}`), sql``);
  const rows = await sql`SELECT i.*, a.title AS artwork_title, a.slug AS artwork_slug FROM inquiries i LEFT JOIN artworks a ON a.id = i.artwork_id ${where} ORDER BY i.created_at DESC LIMIT 300`;
  const counts = Object.fromEntries((await sql`SELECT status, COUNT(*)::int n FROM inquiries GROUP BY status`).map((r) => [r.status, r.n]));
  const openCount = Object.entries(counts).reduce((t, [k, n]) => t + (k === 'archived' ? 0 : n), 0);
  const tab = (s, label) => {
    const qs = new URLSearchParams(Object.entries({ status: s, type, q }).filter(([, v]) => v));
    return <a key={label} className={status === s ? 'is-active' : ''} href={'?' + qs.toString()}>{label} <span className="muted">{s ? counts[s] || 0 : openCount}</span></a>;
  };
  const extra = [['artwork_type', 'Artwork type'], ['preferred_size', 'Preferred size'], ['preferred_style', 'Preferred style'], ['budget', 'Budget'], ['deadline', 'Deadline']];

  return (
    <>
      <div className="page-head"><div><h1>Inquiries</h1><p>Messages from the contact, artwork and commission forms.</p></div></div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <nav className="pill-tabs" aria-label="Filter by status">{tab('', 'Open')}{tab('new', 'New')}{tab('contacted', 'Contacted')}{tab('completed', 'Completed')}{tab('archived', 'Archived')}</nav>
        <form method="get" className="btn-row" data-autosubmit="">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label className="sr-only" htmlFor="iq">Search</label><input id="iq" type="search" name="q" defaultValue={q} placeholder="Search name, email, message…" style={{ maxWidth: 240 }} />
          <label className="sr-only" htmlFor="it">Type</label>
          <select id="it" name="type" defaultValue={type} style={{ width: 'auto' }}><option value="">All types</option><option value="contact">Contact</option><option value="artwork">Artwork</option><option value="commission">Commission</option></select>
          <button className="btn" type="submit">Filter</button>
        </form>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>From</th><th className="hide-sm">Type</th><th className="hide-sm">Artwork</th><th>Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const wa = waReply(r.whatsapp, r.name);
                return (
                  <tr key={r.id} id={`inq-${r.id}`} data-row={r.id}>
                    <td>
                      <details className="inq">
                        <summary><div className="cell-title">{r.name}</div><div className="cell-sub">{r.email}{r.whatsapp ? ` · ${r.whatsapp}` : ''} · <u>View message</u></div></summary>
                        <dl className="kv" style={{ marginTop: 12 }}>
                          <dt>Name</dt><dd>{r.name}</dd>
                          <dt>Email</dt><dd><a href={`mailto:${r.email}`}>{r.email}</a></dd>
                          {r.whatsapp ? <><dt>WhatsApp</dt><dd>{r.whatsapp}</dd></> : null}
                          {r.artwork_title ? <><dt>Artwork</dt><dd><a href={`/artwork/${r.artwork_slug}/`} target="_blank" rel="noopener">{r.artwork_title}</a></dd></> : null}
                          {extra.map(([k, label]) => (r[k] ? <span key={k} style={{ display: 'contents' }}><dt>{label}</dt><dd>{r[k]}</dd></span> : null))}
                          {r.reference_image ? <><dt>Reference</dt><dd><a href={`/api/admin/reference/?id=${r.id}`} target="_blank" rel="noopener"><img src={`/api/admin/reference/?id=${r.id}`} alt="Reference image" style={{ maxWidth: 220, borderRadius: 8, border: '1px solid var(--line)' }} /></a></dd></> : null}
                          <dt>Received</dt><dd>{fmtDate(r.created_at)}</dd>
                        </dl>
                        <div className="inquiry-body">{r.message}</div>
                      </details>
                    </td>
                    <td className="hide-sm"><span className="badge badge--plain badge--featured">{cap(r.type)}</span></td>
                    <td className="hide-sm">{r.artwork_title || <span className="muted">—</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at, false)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`is-${r.id}`}>Status</label>
                      <select id={`is-${r.id}`} style={{ minHeight: 32, padding: '4px 8px', width: 'auto' }} data-api-change="set_inquiry_status" data-id={r.id} defaultValue={r.status}>
                        {STATUSES.map((x) => <option key={x} value={x}>{cap(x)}</option>)}
                      </select>
                    </td>
                    <td><div className="actions">
                      <a className="btn btn--sm btn--icon" href={`mailto:${r.email}?subject=${encodeURIComponent('Re: ' + (r.subject || 'Your message to HUDA'))}`} aria-label="Reply by email" title="Reply by email"><AIcon name="mail" /></a>
                      {wa ? <a className="btn btn--sm btn--icon" href={wa} target="_blank" rel="noopener" aria-label="Reply on WhatsApp" title="Reply on WhatsApp"><AIcon name="whatsapp" /></a> : null}
                      <DeleteButton action="delete_inquiry" id={r.id} label="Delete inquiry" title="Delete this inquiry?" confirm={`This permanently removes the message from ${r.name}.`} />
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty"><h3>No inquiries here</h3><p>{status || type || q ? 'Nothing matches these filters.' : 'New messages from the website will appear here.'}</p></div>
      )}
    </>
  );
}
