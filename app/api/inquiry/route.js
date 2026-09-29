import { sql, ensureSchema } from '@/lib/db';
import { verifyCsrf, clientIp } from '@/lib/auth';
import { isAjax, json, redirectLocal, str, withQuery } from '@/lib/http';
import { handleSingleUpload, ImageError } from '@/lib/images';

export const runtime = 'nodejs';

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: 'The form could not be read. If you attached an image, try a smaller one.' }, 400);
  }
  const ajax = isAjax(request);
  const back = str(form, 'return', 300) || '/';
  const fail = (message, errors = {}, status = 422) =>
    ajax ? json({ ok: false, message, errors }, status) : redirectLocal(request, withQuery(back, 'error', message));

  if (!(await verifyCsrf(request, str(form, 'csrf', 100)))) {
    return fail('Your session expired. Please refresh the page and try again.', {}, 419);
  }
  await ensureSchema();

  let type = ['contact', 'commission', 'artwork'].includes(str(form, 'type', 20)) ? str(form, 'type', 20) : 'contact';

  // Honeypot: bots fill hidden fields. Pretend success.
  if (str(form, 'website', 200)) {
    return ajax ? json({ ok: true }) : redirectLocal(request, withQuery(back, 'sent', type));
  }

  // Rate limit: 5 submissions per 10 minutes per IP.
  const ip = await clientIp();
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM inquiries WHERE ip_address = ${ip} AND created_at > now() - interval '10 minutes'`;
  if (n >= 5) return fail('You’ve sent several messages in a short time. Please wait a few minutes, or reach HUDA on WhatsApp.', {}, 429);

  const d = {
    name: str(form, 'name', 120),
    email: str(form, 'email', 190),
    whatsapp: str(form, 'whatsapp', 40),
    message: str(form, 'message', 5000),
    artwork_type: str(form, 'artwork_type', 120),
    preferred_size: str(form, 'preferred_size', 120),
    preferred_style: str(form, 'preferred_style', 120),
    budget: str(form, 'budget', 80),
    deadline: str(form, 'deadline', 80),
  };
  const errors = {};
  if (d.name.length < 2) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.email = 'Please enter a valid email address.';
  if (d.whatsapp && !/^\+?[\d\s\-()]{7,20}$/.test(d.whatsapp)) errors.whatsapp = 'Please enter a valid WhatsApp number.';
  if (type === 'commission' && !d.whatsapp) errors.whatsapp = 'Please add your WhatsApp number so HUDA can reach you.';
  if (d.message.length < 5) errors.message = 'Please write a short message.';

  let artwork = null;
  if (type === 'artwork') {
    const id = Number(str(form, 'artwork_id', 12)) || 0;
    [artwork] = id ? await sql`SELECT id, title FROM artworks WHERE id = ${id} AND availability <> 'hidden'` : [];
    if (!artwork) type = 'contact';
  }

  let reference = null;
  if (!Object.keys(errors).length && type === 'commission') {
    try {
      reference = await handleSingleUpload(form.get('reference_image'), 'references', 2000);
    } catch (e) {
      if (e instanceof ImageError) errors.reference_image = e.message;
      else throw e;
    }
  }
  if (Object.keys(errors).length) return fail('Please check the highlighted fields.', errors);

  const subject = type === 'artwork' ? `Artwork inquiry: ${artwork.title}` : type === 'commission' ? 'Commission request' : 'Website message';
  await sql`INSERT INTO inquiries (type, artwork_id, name, email, whatsapp, subject, message, artwork_type, preferred_size,
              preferred_style, budget, deadline, reference_image, ip_address)
            VALUES (${type}, ${artwork?.id || null}, ${d.name}, ${d.email}, ${d.whatsapp || null}, ${subject}, ${d.message},
              ${d.artwork_type || null}, ${d.preferred_size || null}, ${d.preferred_style || null}, ${d.budget || null},
              ${d.deadline || null}, ${reference}, ${ip})`;

  return ajax ? json({ ok: true, message: 'Thank you — your message has reached HUDA.' }) : redirectLocal(request, withQuery(back, 'sent', type));
}
