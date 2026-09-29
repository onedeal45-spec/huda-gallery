import { NextResponse } from 'next/server';

const CSRF_COOKIE = 'huda_csrf';

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * - Gives every visitor a CSRF token cookie (and passes it to this same request so pages can embed it).
 * - Sends logged-out visitors from /admin to the login page (real session checks happen on the server).
 */
export function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/admin') && pathname.replace(/\/$/, '') !== '/admin/login' && !request.cookies.get('huda_session')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login/';
    url.search = '?next=' + encodeURIComponent(pathname + search);
    return NextResponse.redirect(url);
  }

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-pathname', pathname);
  let token = request.cookies.get(CSRF_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) return NextResponse.next({ request: { headers: reqHeaders } });

  token = randomToken();
  const existing = reqHeaders.get('cookie');
  reqHeaders.set('cookie', (existing ? existing + '; ' : '') + `${CSRF_COOKIE}=${token}`);
  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/|assets/|uploads/|favicon|sitemap.xml|robots.txt).*)'],
};
