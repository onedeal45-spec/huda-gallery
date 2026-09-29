import { cookies } from 'next/headers';
import { sql, ensureSchema, dbConfigured, isInstalled } from '@/lib/db';
import { hashPassword, attemptLogin, verifyCsrf, currentAdmin, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { saveSettings } from '@/lib/site';
import { seedTaxonomy, seedArtworks } from '@/lib/seed';
import { json, str } from '@/lib/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/install/            → create the first admin account (only while no admin exists)
 * POST /api/install/?step=seed  → import a few starter artworks (admin only; call until remaining = 0)
 */
export async function POST(request) {
  if (!dbConfigured()) return json({ ok: false, message: 'No database is connected yet. Add Neon Postgres in Vercel → Storage, then redeploy.' }, 503);
  const step = new URL(request.url).searchParams.get('step');

  if (step === 'seed') {
    if (!(await currentAdmin())) return json({ ok: false, message: 'Please log in again.' }, 401);
    if (!(await verifyCsrf(request, request.headers.get('x-csrf-token')))) return json({ ok: false, message: 'Session expired — refresh the page.' }, 419);
    await seedTaxonomy();
    const r = await seedArtworks(3);
    return json({ ok: true, ...r });
  }

  const form = await request.formData();
  if (!(await verifyCsrf(request, str(form, 'csrf', 100)))) return json({ ok: false, message: 'Your session expired. Refresh the page and try again.' }, 419);
  await ensureSchema();
  if (await isInstalled()) return json({ ok: false, message: 'HUDA is already installed. Log in at /admin.' }, 409);

  const username = str(form, 'username', 60);
  const email = str(form, 'email', 190);
  const password = String(form.get('password') || '');
  const errors = {};
  if (!/^[A-Za-z0-9_.-]{3,60}$/.test(username)) errors.username = 'Username must be 3–60 letters, numbers, dots, dashes or underscores.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email address.';
  if (password.length < 10) errors.password = 'Password must be at least 10 characters.';
  if (Object.keys(errors).length) return json({ ok: false, message: Object.values(errors).join(' '), errors }, 422);

  // Guard against two installers racing: only insert while the table is empty.
  const inserted = await sql`INSERT INTO users (username, email, password_hash)
                             SELECT ${username}, ${email}, ${await hashPassword(password)}
                             WHERE NOT EXISTS (SELECT 1 FROM users) RETURNING id`;
  if (!inserted.length) return json({ ok: false, message: 'HUDA is already installed.' }, 409);
  await saveSettings({ contact_email: email });

  const login = await attemptLogin(username, password);
  const jar = await cookies();
  if (login.ok) jar.set(SESSION_COOKIE, login.token, await sessionCookieOptions());
  return json({ ok: true, seed: form.get('seed') === '1' });
}
