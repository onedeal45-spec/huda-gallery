import { NextResponse } from 'next/server';

export function isAjax(request) {
  return (request.headers.get('x-requested-with') || '').toLowerCase() === 'xmlhttprequest'
    || (request.headers.get('accept') || '').includes('application/json');
}

export const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/** Absolute URL on the host the visitor actually used (request.url can say "localhost" behind proxies). */
export function absolute(request, path) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '');
  return new URL(path, host ? `${proto}://${host}` : request.url);
}

/** 303 redirect to a local path only (no open redirects). */
export function redirectLocal(request, path, fallback = '/') {
  let p = String(path || '');
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('\\')) p = fallback;
  return NextResponse.redirect(absolute(request, p), 303);
}

/** Clean a string field from FormData. */
export function str(form, key, max = 190) {
  const v = form.get(key);
  return typeof v === 'string' ? v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, max) : '';
}

export function withQuery(path, key, value) {
  const [base, q = ''] = path.split('?');
  const sp = new URLSearchParams(q);
  sp.set(key, value);
  return `${base}?${sp.toString()}`;
}
