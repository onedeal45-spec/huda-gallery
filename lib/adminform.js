import { isAjax, json, redirectLocal, withQuery } from './http';

/** Respond to an admin form: JSON for the admin script, redirect with a message for plain form posts. */
export function done(request, { ok, message, redirect, errors, status }) {
  if (isAjax(request)) return json({ ok, message, redirect, errors }, status || (ok ? 200 : 422));
  const back = redirect || new URL(request.headers.get('referer') || '/admin/', request.url).pathname;
  return redirectLocal(request, withQuery(back, ok ? 'ok' : 'error', message), '/admin/');
}
