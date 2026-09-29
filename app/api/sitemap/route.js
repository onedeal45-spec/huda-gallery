import { getSettings, artworkQuery, collectionsAll, siteOrigin, absUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const day = (d) => new Date(d).toISOString().slice(0, 10);

export async function GET(request) {
  const s = await getSettings();
  const origin = siteOrigin(request.headers);
  const urls = [
    { loc: origin + '/', priority: '1.0', changefreq: 'weekly' },
    { loc: origin + '/gallery/', priority: '0.9', changefreq: 'weekly' },
    { loc: origin + '/collections/', priority: '0.8', changefreq: 'monthly' },
    { loc: origin + '/about/', priority: '0.6', changefreq: 'monthly' },
    { loc: origin + '/commission/', priority: '0.7', changefreq: 'monthly' },
    { loc: origin + '/contact/', priority: '0.6', changefreq: 'yearly' },
  ];
  for (const c of await collectionsAll(s)) urls.push({ loc: `${origin}/collection/${c.slug}/`, lastmod: day(c.updated_at), priority: '0.7' });
  for (const a of await artworkQuery(s)) {
    urls.push({ loc: `${origin}/artwork/${a.slug}/`, lastmod: day(a.updated_at), priority: '0.8', image: a.url_lg ? absUrl(origin, a.url_lg) : '', title: a.title });
  }
  const body = urls.map((u) =>
    `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}<priority>${u.priority}</priority>` +
    (u.image ? `<image:image><image:loc>${esc(u.image)}</image:loc><image:title>${esc(u.title)}</image:title></image:image>` : '') + '</url>'
  ).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
