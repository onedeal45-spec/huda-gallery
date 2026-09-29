import Script from 'next/script';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AIcon from '@/components/AIcon';
import { sql } from '@/lib/db';
import { currentAdmin, csrfToken } from '@/lib/auth';

const ITEMS = [
  ['dashboard', 'Dashboard', '/admin/'],
  ['artworks', 'Artworks', '/admin/artworks/'],
  ['categories', 'Categories', '/admin/categories/'],
  ['collections', 'Collections', '/admin/collections/'],
  ['inquiries', 'Inquiries', '/admin/inquiries/'],
  ['about', 'About HUDA', '/admin/about/'],
  ['settings', 'Settings', '/admin/settings/'],
];

function activeKey(path) {
  const p = path.replace(/\/+$/, '');
  if (p === '/admin') return 'dashboard';
  if (p.startsWith('/admin/artworks') || p.startsWith('/admin/add-artwork') || p.startsWith('/admin/edit-artwork')) return 'artworks';
  return ITEMS.find(([k]) => p.startsWith('/admin/' + k))?.[0] || '';
}

export default async function Panel({ children }) {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login/');
  const csrf = await csrfToken();
  const path = (await headers()).get('x-pathname') || '/admin/';
  const active = activeKey(path);
  const [{ n: newInq }] = await sql`SELECT COUNT(*)::int AS n FROM inquiries WHERE status = 'new'`;
  const crumb = ITEMS.find(([k]) => k === active)?.[1] || 'Admin';

  return (
    <body data-csrf={csrf} data-api="/api/admin/action/">
      <div className="admin">
        <aside className="sidebar" id="sidebar">
          <a className="sidebar__brand" href="/admin/"><b>HUDA</b><span>Studio admin</span></a>
          <nav aria-label="Admin">
            {ITEMS.map(([key, label, href]) => (
              <a key={key} href={href} className={active === key ? 'is-active' : ''} aria-current={active === key ? 'page' : undefined}>
                <AIcon name={key} />{label}
                {key === 'inquiries' ? <span className="count" title="New inquiries" hidden={!newInq}>{newInq}</span> : null}
              </a>
            ))}
          </nav>
          <div className="sidebar__foot">
            <nav aria-label="Site">
              <a href="/" target="_blank" rel="noopener"><AIcon name="external" />View website</a>
              <form method="post" action="/api/admin/logout/" style={{ margin: 0 }}>
                <input type="hidden" name="csrf" value={csrf} />
                <button type="submit" className="btn btn--ghost" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--side-text)', padding: '11px 12px', minHeight: 0, fontWeight: 500 }}><AIcon name="logout" />Log out</button>
              </form>
            </nav>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <div className="topbar__left">
              <button className="nav-toggle" type="button" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false" data-nav-toggle=""><AIcon name="menu" /></button>
              <div className="topbar__crumb">Admin / {crumb}</div>
            </div>
            <div className="topbar__user"><span>{admin.username}</span><div className="avatar" aria-hidden="true">H</div></div>
          </header>
          <main className="content" id="main">{children}</main>
        </div>
      </div>
      <div className="toasts" aria-live="polite" />
      <Script src="/assets/js/admin.js" strategy="afterInteractive" />
    </body>
  );
}
