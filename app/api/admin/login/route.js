import { NextResponse } from 'next/server';
import { attemptLogin, verifyCsrf, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { str, absolute } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(request) {
  const form = await request.formData();
  const identifier = str(form, 'identifier', 190);
  const next = str(form, 'next', 300);
  const back = (msg) => NextResponse.redirect(absolute(request, `/admin/login/?error=${encodeURIComponent(msg)}&u=${encodeURIComponent(identifier)}&next=${encodeURIComponent(next)}`), 303);

  if (!(await verifyCsrf(request, str(form, 'csrf', 100)))) return back('Your session expired. Please try again.');
  const res = await attemptLogin(identifier, String(form.get('password') || ''));
  if (!res.ok) return back(res.message);

  const dest = next.startsWith('/admin') && !next.startsWith('//') && !next.includes('login') ? next : '/admin/';
  const response = NextResponse.redirect(absolute(request, dest), 303);
  response.cookies.set(SESSION_COOKIE, res.token, await sessionCookieOptions());
  return response;
}
