import { NextResponse } from 'next/server';
import { destroySession, verifyCsrf, SESSION_COOKIE } from '@/lib/auth';
import { str, absolute } from '@/lib/http';

export const runtime = 'nodejs';

// POST + CSRF so other sites can't log you out with a link.
export async function POST(request) {
  const form = await request.formData();
  const response = NextResponse.redirect(absolute(request, '/admin/login/'), 303);
  if (await verifyCsrf(request, str(form, 'csrf', 100))) {
    await destroySession();
    response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  }
  return response;
}
