import postgres from 'postgres';

/**
 * Postgres connection (Neon on Vercel, any Postgres locally).
 * Vercel's Neon integration sets DATABASE_URL (or POSTGRES_URL) automatically.
 */
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

const globalForDb = globalThis;
export const sql =
  globalForDb.__hudaSql ||
  (url
    ? postgres(url, {
        max: process.env.VERCEL ? 3 : 10,
        idle_timeout: 20,
        connect_timeout: 15,
        prepare: false, // required for Neon's pooled (pgbouncer) endpoint
        ssl: /sslmode=require|neon\.tech|vercel-storage/.test(url) ? 'require' : false,
        types: { bigint: postgres.BigInt },
        transform: { undefined: null },
        onnotice: () => {},
      })
    : null);
if (process.env.NODE_ENV !== 'production') globalForDb.__hudaSql = sql;

export function dbConfigured() {
  return !!sql;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ua_hash    CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE TABLE IF NOT EXISTS login_attempts (
  id           SERIAL PRIMARY KEY,
  ip_address   VARCHAR(64)  NOT NULL,
  identifier   VARCHAR(190) NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempts_ip_time ON login_attempts (ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_attempts_ident_time ON login_attempts (identifier, attempted_at);
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  image       VARCHAR(500),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories (sort_order);
CREATE TABLE IF NOT EXISTS collections (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  cover_image VARCHAR(500),
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collections_visible_sort ON collections (is_visible, sort_order);
CREATE TABLE IF NOT EXISTS artworks (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(190) NOT NULL,
  slug         VARCHAR(210) NOT NULL UNIQUE,
  artwork_code VARCHAR(60) UNIQUE,
  category_id  INT REFERENCES categories(id) ON DELETE SET NULL,
  description  TEXT,
  medium       VARCHAR(190),
  dimensions   VARCHAR(120),
  year         SMALLINT,
  price        NUMERIC(12,2),
  currency     VARCHAR(8) NOT NULL DEFAULT 'PKR',
  availability VARCHAR(10) NOT NULL DEFAULT 'available' CHECK (availability IN ('available','reserved','sold','hidden')),
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  is_new       BOOLEAN NOT NULL DEFAULT false,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks (category_id);
CREATE INDEX IF NOT EXISTS idx_artworks_avail ON artworks (availability);
CREATE INDEX IF NOT EXISTS idx_artworks_featured ON artworks (is_featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_artworks_created ON artworks (created_at);
CREATE TABLE IF NOT EXISTS artwork_images (
  id         SERIAL PRIMARY KEY,
  artwork_id INT REFERENCES artworks(id) ON DELETE CASCADE,
  url_sm     VARCHAR(500) NOT NULL,
  url_md     VARCHAR(500) NOT NULL,
  url_lg     VARCHAR(500) NOT NULL,
  width      INT NOT NULL DEFAULT 0,
  height     INT NOT NULL DEFAULT 0,
  is_main    BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  upload_key CHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_images_artwork ON artwork_images (artwork_id, is_main, sort_order);
CREATE TABLE IF NOT EXISTS collection_artworks (
  collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  artwork_id    INT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, artwork_id)
);
CREATE INDEX IF NOT EXISTS idx_ca_artwork ON collection_artworks (artwork_id);
CREATE TABLE IF NOT EXISTS inquiries (
  id              SERIAL PRIMARY KEY,
  type            VARCHAR(12) NOT NULL DEFAULT 'contact' CHECK (type IN ('contact','commission','artwork')),
  artwork_id      INT REFERENCES artworks(id) ON DELETE SET NULL,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  whatsapp        VARCHAR(40),
  subject         VARCHAR(190),
  message         TEXT NOT NULL,
  artwork_type    VARCHAR(120),
  preferred_size  VARCHAR(120),
  preferred_style VARCHAR(120),
  budget          VARCHAR(80),
  deadline        VARCHAR(80),
  reference_image VARCHAR(500),
  status          VARCHAR(10) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','completed','archived')),
  ip_address      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status, created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_ip ON inquiries (ip_address, created_at);
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(80) PRIMARY KEY,
  setting_value TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export const DEFAULT_SETTINGS = {
  brand_name: 'HUDA',
  tagline: 'Visualize Your Dreams.',
  logo: '',
  favicon: '',
  contact_email: '',
  contact_phone: '',
  whatsapp: '+923037649454',
  social_instagram: '',
  social_facebook: '',
  social_tiktok: '',
  social_youtube: '',
  seo_title: 'HUDA — Visualize Your Dreams.',
  seo_description: 'Original calligraphy, paintings and commissioned artwork by HUDA. Explore the gallery, collections and available works.',
  og_image: '',
  default_currency: 'PKR',
  footer_text: 'Calligraphy · Colour · Culture',
  maintenance_mode: '0',
  show_sold: '1',
  hero_artwork_id: '',
  statement: 'Art begins where imagination becomes visible.',
  about_image: '',
  about_intro: 'HUDA is an artist working across calligraphy, colour and culture.',
  about_biography: '',
  about_philosophy: '',
  about_journey: '',
  about_interests: '',
  about_achievements: '',
};

let schemaReady = globalForDb.__hudaSchemaReady || null;

/** Creates tables + default settings once per server instance (idempotent). */
export async function ensureSchema() {
  if (!sql) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql.unsafe(SCHEMA);
      const rows = Object.entries(DEFAULT_SETTINGS).map(([k, v]) => ({ setting_key: k, setting_value: v }));
      await sql`INSERT INTO settings ${sql(rows, 'setting_key', 'setting_value')} ON CONFLICT (setting_key) DO NOTHING`;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
    globalForDb.__hudaSchemaReady = schemaReady;
  }
  return schemaReady;
}

export async function isInstalled() {
  if (!sql) return false;
  try {
    await ensureSchema();
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM users`;
    return n > 0;
  } catch {
    return false;
  }
}
