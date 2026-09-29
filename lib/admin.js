import { currentAdmin, verifyCsrf } from './auth';
import { json } from './http';
import { ensureSchema } from './db';

/** For admin API routes: returns { admin } or { response } (401/419). */
export async function guard(request, formToken) {
  await ensureSchema();
  const admin = await currentAdmin();
  if (!admin) return { response: json({ ok: false, message: 'Please log in again.' }, 401) };
  if (!(await verifyCsrf(request, formToken))) return { response: json({ ok: false, message: 'Your session expired. Please refresh the page and try again.' }, 419) };
  return { admin };
}

export const fmtDate = (d, withTime = true) =>
  new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}) });
