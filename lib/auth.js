import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, headers } from 'next/headers';
import { sql, ensureSchema } from './db';

const scrypt = promisify(crypto.scrypt);
export const SESSION_COOKIE = 'huda_session';
export const CSRF_COOKIE = 'huda_csrf';
const IDLE_MS = 2 * 60 * 60 * 1000; // 2 hours idle timeout
const LOGIN_MAX = 5;
const LOGIN_WINDOW_MIN = 15;

/* ---------- Passwords (scrypt, salted) ---------- */
export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}
export async function verifyPassword(pw, stored) {
  const [alg, saltHex, keyHex] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = await scrypt(pw, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(keyHex, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

export async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || '0.0.0.0';
}
async function uaHash() {
  const h = await headers();
  return sha256(h.get('user-agent') || '');
}

/* ---------- Sessions ---------- */
export async function currentAdmin() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const [row] = await sql`
    SELECT u.id, u.username, u.email, s.ua_hash, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256(token)}`;
  if (!row) return null;
  if (new Date(row.expires_at) < new Date() || row.ua_hash !== (await uaHash())) {
    await sql`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
    return null;
  }
  // sliding expiry
  await sql`UPDATE sessions SET expires_at = ${new Date(Date.now() + IDLE_MS)} WHERE token_hash = ${sha256(token)}`;
  return { id: row.id, username: row.username, email: row.email };
}

export async function loginIsLocked(identifier) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MIN * 60000);
  const ip = await clientIp();
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM login_attempts
                            WHERE attempted_at > ${since} AND (ip_address = ${ip} OR identifier = ${identifier.toLowerCase()})`;
  return n >= LOGIN_MAX;
}

/** Returns { ok: true, token } or { ok: false, message } */
export async function attemptLogin(identifier, password) {
  identifier = String(identifier || '').trim();
  if (!identifier || !password) return { ok: false, message: 'Enter your username or email and password.' };
  await ensureSchema();
  if (await loginIsLocked(identifier)) {
    return { ok: false, message: `Too many attempts. Please wait ${LOGIN_WINDOW_MIN} minutes and try again.` };
  }
  const [user] = await sql`SELECT * FROM users WHERE username = ${identifier} OR email = ${identifier} LIMIT 1`;
  // Verify against a dummy hash when the user doesn't exist, to keep timing similar.
  const valid = await verifyPassword(password, user?.password_hash || 'scrypt$00$00');
  const ip = await clientIp();
  if (!user || !valid) {
    await sql`INSERT INTO login_attempts (ip_address, identifier) VALUES (${ip}, ${identifier.toLowerCase()})`;
    return { ok: false, message: 'Those details don’t match an admin account.' };
  }
  await sql`DELETE FROM login_attempts WHERE ip_address = ${ip} OR identifier = ${identifier.toLowerCase()}`;
  await sql`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`;
  await sql`DELETE FROM sessions WHERE expires_at < now()`;
  await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;
  const token = crypto.randomBytes(32).toString('hex');
  await sql`INSERT INTO sessions (token_hash, user_id, ua_hash, expires_at)
            VALUES (${sha256(token)}, ${user.id}, ${await uaHash()}, ${new Date(Date.now() + IDLE_MS)})`;
  return { ok: true, token };
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
}

export async function sessionCookieOptions() {
  const h = await headers();
  const secure = (h.get('x-forwarded-proto') || '').includes('https') || !!process.env.VERCEL;
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

/* ---------- CSRF (token cookie set by middleware + same-origin check) ---------- */
export async function csrfToken() {
  const jar = await cookies();
  return jar.get(CSRF_COOKIE)?.value || '';
}

export async function verifyCsrf(request, formToken) {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value || '';
  const sent = formToken || request.headers.get('x-csrf-token') || '';
  if (!cookie || !sent || cookie.length !== sent.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(sent))) return false;
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    try { if (new URL(origin).host !== host) return false; } catch { return false; }
  }
  return true;
}
