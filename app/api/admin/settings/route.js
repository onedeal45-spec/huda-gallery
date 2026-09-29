import { sql } from '@/lib/db';
import { guard } from '@/lib/admin';
import { str } from '@/lib/http';
import { done } from '@/lib/adminform';
import { getSettings, saveSettings, CURRENCIES } from '@/lib/site';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { handleSingleUpload, ImageError } from '@/lib/images';
import { deleteFiles } from '@/lib/storage';

export const runtime = 'nodejs';

const ABOUT = { about_intro: 1200, about_biography: 6000, about_philosophy: 4000, about_journey: 4000, about_interests: 3000, about_achievements: 4000, statement: 300 };

/** Handle an image setting: new upload, removal, or keep. */
async function imageSetting(form, s, key, save, folder, max, png) {
  const up = await handleSingleUpload(form.get(key), folder, max, png);
  if (up) { await deleteFiles(s[key]); save[key] = up; }
  else if (form.get('remove_' + key) === '1') { await deleteFiles(s[key]); save[key] = ''; }
}

export async function POST(request) {
  const form = await request.formData();
  const g = await guard(request, str(form, 'csrf', 100));
  if (g.response) return g.response;
  const s = await getSettings();
  const tab = str(form, 'tab', 20);
  const back = tab === 'about' ? '/admin/about/' : `/admin/settings/?tab=${tab}`;
  const save = {};
  const errors = {};

  try {
    if (tab === 'about') {
      for (const [k, max] of Object.entries(ABOUT)) save[k] = str(form, k, max);
      await imageSetting(form, s, 'about_image', save, 'about', 1600, false);
    } else if (tab === 'branding') {
      save.tagline = str(form, 'tagline', 120) || 'Visualize Your Dreams.';
      await imageSetting(form, s, 'logo', save, 'branding', 600, true);
      await imageSetting(form, s, 'favicon', save, 'branding', 256, true);
    } else if (tab === 'contact') {
      const email = str(form, 'contact_email', 190);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.contact_email = 'Enter a valid email address.';
      const wa = str(form, 'whatsapp', 30);
      const digits = wa.replace(/\D+/g, '');
      if (digits.length < 10 || digits.length > 15) errors.whatsapp = 'Enter a valid WhatsApp number, e.g. 0303 7649454 or +92 303 7649454.';
      for (const k of ['instagram', 'facebook', 'tiktok', 'youtube']) {
        let u = str(form, 'social_' + k, 300);
        if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
        if (u) { try { new URL(u); } catch { errors['social_' + k] = `The ${k} link is not a valid URL.`; } }
        save['social_' + k] = u;
      }
      Object.assign(save, { contact_email: email, contact_phone: str(form, 'contact_phone', 40), whatsapp: wa });
    } else if (tab === 'seo') {
      save.seo_title = str(form, 'seo_title', 120) || 'HUDA — Visualize Your Dreams.';
      save.seo_description = str(form, 'seo_description', 320);
      await imageSetting(form, s, 'og_image', save, 'branding', 1600, false);
    } else if (tab === 'general') {
      save.default_currency = CURRENCIES.includes(str(form, 'default_currency', 8)) ? str(form, 'default_currency', 8) : 'PKR';
      save.footer_text = str(form, 'footer_text', 200);
      save.maintenance_mode = form.get('maintenance_mode') === '1' ? '1' : '0';
      save.show_sold = form.get('show_sold') === '1' ? '1' : '0';
      const hero = Number(str(form, 'hero_artwork_id', 12)) || 0;
      const [h] = hero ? await sql`SELECT id FROM artworks WHERE id = ${hero}` : [];
      save.hero_artwork_id = h ? String(h.id) : '';
    } else if (tab === 'account') {
      const username = str(form, 'username', 60);
      const email = str(form, 'email', 190);
      const current = String(form.get('current_password') || '');
      const next = String(form.get('new_password') || '');
      const confirm = String(form.get('confirm_password') || '');
      const [u] = await sql`SELECT * FROM users WHERE id = ${g.admin.id}`;
      if (!(await verifyPassword(current, u.password_hash))) errors.current_password = 'Your current password is incorrect.';
      if (!/^[A-Za-z0-9_.-]{3,60}$/.test(username)) errors.username = 'Username must be 3–60 letters, numbers, dots, dashes or underscores.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email.';
      const [dupe] = await sql`SELECT id FROM users WHERE (username = ${username} OR email = ${email}) AND id <> ${g.admin.id}`;
      if (dupe) errors.username = 'That username or email is used by another account.';
      if (next && next.length < 10) errors.new_password = 'New password must be at least 10 characters.';
      if (next && next !== confirm) errors.confirm_password = 'The new passwords don’t match.';
      if (Object.keys(errors).length) return done(request, { ok: false, message: Object.values(errors).join(' '), errors, redirect: back });
      await sql`UPDATE users SET username = ${username}, email = ${email}, updated_at = now() WHERE id = ${g.admin.id}`;
      if (next) await sql`UPDATE users SET password_hash = ${await hashPassword(next)} WHERE id = ${g.admin.id}`;
      return done(request, { ok: true, message: 'Your account is updated.', redirect: back });
    } else {
      return done(request, { ok: false, message: 'Unknown settings section.', redirect: '/admin/settings/' });
    }
  } catch (e) {
    if (e instanceof ImageError) return done(request, { ok: false, message: e.message, redirect: back });
    throw e;
  }

  if (Object.keys(errors).length) return done(request, { ok: false, message: Object.values(errors).join(' '), errors, redirect: back });
  await saveSettings(save);
  return done(request, { ok: true, message: tab === 'about' ? 'About HUDA is updated on the website.' : 'Settings saved.', redirect: back });
}
