import { cache } from 'react';
import { sql, ensureSchema, DEFAULT_SETTINGS } from './db';

export const WHATSAPP_FALLBACK = '+923037649454';
export const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR', 'CAD', 'AUD'];
export const STATUSES = ['available', 'reserved', 'sold', 'hidden'];

/* ---------------- Settings ---------------- */

export const getSettings = cache(async () => {
  await ensureSchema();
  const rows = await sql`SELECT setting_key, setting_value FROM settings`;
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.setting_key] = r.setting_value ?? '';
  return out;
});

export async function saveSettings(pairs) {
  const rows = Object.entries(pairs).map(([k, v]) => ({ setting_key: k, setting_value: String(v ?? '') }));
  if (!rows.length) return;
  await sql`INSERT INTO settings ${sql(rows, 'setting_key', 'setting_value')}
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()`;
}

export function setting(s, key, fallback = '') {
  const v = s?.[key];
  return v !== undefined && v !== null && v !== '' ? v : fallback;
}

export const tagline = (s) => setting(s, 'tagline', 'Visualize Your Dreams.');

/* ---------------- WhatsApp (single source: the `whatsapp` setting) ---------------- */

export function waDigits(s) {
  let d = String(setting(s, 'whatsapp', WHATSAPP_FALLBACK)).replace(/\D+/g, '');
  if (d.startsWith('0') && d.length === 11) d = '92' + d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  return d || WHATSAPP_FALLBACK.replace(/\D+/g, '');
}
export function waDisplay(s) {
  const d = waDigits(s);
  return d.startsWith('92') && d.length === 12 ? `+92 ${d.slice(2, 5)} ${d.slice(5)}` : '+' + d;
}
export const waLink = (s, msg = '') => `https://wa.me/${waDigits(s)}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
export const waGeneral = (s) => waLink(s, 'Hello HUDA, I would like to know more about your artwork.');
export const waArtwork = (s, title) => waLink(s, `Hello HUDA, I’m interested in the artwork “${title}”. Please share its availability and further details.`);
export const waCommission = (s) => waLink(s, 'Hello HUDA, I’m interested in commissioning a custom artwork. I would like to discuss the details.');

/* ---------------- Text & format ---------------- */

export function slugify(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
}

export async function uniqueSlug(table, base, ignoreId = null) {
  if (!['artworks', 'categories', 'collections'].includes(table)) throw new Error('bad table');
  base = base || 'item';
  let slug = base;
  for (let i = 2; ; i++) {
    const rows = ignoreId
      ? await sql`SELECT id FROM ${sql(table)} WHERE slug = ${slug} AND id <> ${ignoreId}`
      : await sql`SELECT id FROM ${sql(table)} WHERE slug = ${slug}`;
    if (!rows.length) return slug;
    slug = `${base}-${i}`;
  }
}

export function excerpt(text, len = 160) {
  const t = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= len) return t;
  const cut = t.slice(0, len);
  const pos = cut.lastIndexOf(' ');
  return (pos > 0 ? cut.slice(0, pos) : cut).replace(/[ ,.;:]+$/, '') + '…';
}

export function formatPrice(price, currency, s) {
  const p = price === null || price === undefined || price === '' ? 0 : Number(price);
  if (!p || p <= 0) return 'Price on request';
  const cur = currency || setting(s, 'default_currency', 'PKR');
  const num = Number.isInteger(p) ? p.toLocaleString('en-US') : p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${cur} ${num}`;
}

export const availabilityLabel = (st) => ({ available: 'Available', reserved: 'Reserved', sold: 'Sold', hidden: 'Hidden' }[st] || st);

/* ---------------- URLs ---------------- */

export const artworkUrl = (a) => `/artwork/${encodeURIComponent(a.slug)}/`;
export const collectionUrl = (c) => `/collection/${encodeURIComponent(c.slug)}/`;

export function siteOrigin(headersList) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const host = headersList?.get('x-forwarded-host') || headersList?.get('host') || 'localhost:3000';
  const proto = headersList?.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}
export const absUrl = (origin, path = '/') => (/^https?:\/\//.test(path) ? path : origin + (path.startsWith('/') ? path : '/' + path));

/* ---------------- Images ---------------- */

export const PLACEHOLDER = '/assets/img/placeholder.svg';
export function imgUrl(img, size = 'md') {
  if (!img || !img.url_md) return PLACEHOLDER;
  return img['url_' + size] || img.url_md;
}
export function imgSrcset(img) {
  if (!img || !img.url_md) return undefined;
  const w = Number(img.width) || 0, h = Number(img.height) || 0;
  const sizes = { sm: 560, md: 1100, lg: 1900 };
  return Object.entries(sizes)
    .map(([k, max]) => `${img['url_' + k]} ${w && h ? Math.round(w * Math.min(1, max / Math.max(w, h))) : max}w`)
    .join(', ');
}
export const aspect = (img) => (img && img.width && img.height ? +(img.width / img.height).toFixed(4) : 0.8);

/* ---------------- Queries ---------------- */

function visibilitySql(s, alias = 'a') {
  const a = sql(alias);
  return setting(s, 'show_sold', '1') === '1'
    ? sql`${a}.availability <> 'hidden'`
    : sql`${a}.availability NOT IN ('hidden','sold')`;
}

const ART_SELECT = (s) => sql`
  SELECT a.*, c.name AS category_name, c.slug AS category_slug,
         mi.url_sm, mi.url_md, mi.url_lg, mi.width, mi.height
  FROM artworks a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN LATERAL (
    SELECT i.url_sm, i.url_md, i.url_lg, i.width, i.height FROM artwork_images i
    WHERE i.artwork_id = a.id ORDER BY i.is_main DESC, i.sort_order ASC, i.id ASC LIMIT 1
  ) mi ON true`;

export { ART_SELECT, visibilitySql };

export async function artworkQuery(s, f = {}) {
  const conds = [];
  if (f.public !== false) conds.push(visibilitySql(s));
  if (f.q) {
    const like = '%' + f.q + '%';
    conds.push(sql`(a.title ILIKE ${like} OR a.description ILIKE ${like} OR a.medium ILIKE ${like} OR a.artwork_code ILIKE ${like} OR c.name ILIKE ${like})`);
  }
  if (f.category) conds.push(sql`c.slug = ${f.category}`);
  if (f.collection) conds.push(sql`EXISTS (SELECT 1 FROM collection_artworks ca JOIN collections co ON co.id = ca.collection_id WHERE ca.artwork_id = a.id AND co.slug = ${f.collection})`);
  if (f.availability && STATUSES.includes(f.availability)) conds.push(sql`a.availability = ${f.availability}`);
  if (f.featured) conds.push(sql`a.is_featured = true`);
  if (f.exclude) conds.push(sql`a.id <> ${Number(f.exclude)}`);
  const where = conds.length ? conds.reduce((acc, c, i) => (i === 0 ? sql`WHERE ${c}` : sql`${acc} AND ${c}`), sql``) : sql``;
  const order = {
    newest: sql`a.created_at DESC, a.id DESC`,
    price_asc: sql`(a.price IS NULL OR a.price = 0) ASC, a.price ASC, a.id DESC`,
    price_desc: sql`a.price DESC NULLS LAST, a.id DESC`,
    title: sql`a.title ASC`,
  }[f.sort] || sql`a.is_featured DESC, a.sort_order ASC, a.created_at DESC, a.id DESC`;
  const limit = f.limit ? sql`LIMIT ${Math.max(1, Number(f.limit))}` : sql``;
  return sql`${ART_SELECT(s)} ${where} ORDER BY ${order} ${limit}`;
}

export async function categoriesAll(s) {
  return sql`SELECT c.*, (SELECT COUNT(*)::int FROM artworks a WHERE a.category_id = c.id AND ${visibilitySql(s)}) AS artwork_count
             FROM categories c ORDER BY c.sort_order, c.name`;
}

export async function collectionsAll(s, onlyVisible = true) {
  return sql`SELECT co.*,
               (SELECT COUNT(*)::int FROM collection_artworks ca JOIN artworks a ON a.id = ca.artwork_id
                  WHERE ca.collection_id = co.id AND ${visibilitySql(s)}) AS artwork_count
             FROM collections co ${onlyVisible ? sql`WHERE co.is_visible = true` : sql``}
             ORDER BY co.sort_order, co.name`;
}

export async function collectionCover(s, c) {
  if (c.cover_image) return { src: c.cover_image, srcset: undefined };
  const [row] = await sql`${ART_SELECT(s)} JOIN collection_artworks ca ON ca.artwork_id = a.id
                         WHERE ca.collection_id = ${c.id} AND ${visibilitySql(s)} AND mi.url_md IS NOT NULL
                         ORDER BY a.is_featured DESC, ca.sort_order, a.sort_order LIMIT 1`;
  return { src: imgUrl(row, 'md'), srcset: imgSrcset(row) };
}

export function socialLinks(s) {
  return [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']]
    .map(([k, label]) => ({ key: k, label, url: setting(s, 'social_' + k) }))
    .filter((x) => /^https?:\/\//i.test(x.url));
}

export function paragraphs(text) {
  return String(text || '').trim().split(/\n{2,}/).filter(Boolean);
}
