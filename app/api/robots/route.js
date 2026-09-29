import { getSettings, siteOrigin } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const origin = siteOrigin(request.headers);
  let maintenance = false;
  try { maintenance = (await getSettings()).maintenance_mode === '1'; } catch {}
  const lines = ['User-agent: *', ...(maintenance ? ['Disallow: /'] : ['Allow: /', 'Disallow: /admin/', 'Disallow: /api/', 'Disallow: /install/']), '', `Sitemap: ${origin}/sitemap.xml`, ''];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
