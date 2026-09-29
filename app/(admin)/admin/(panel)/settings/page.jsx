import { sql } from '@/lib/db';
import { csrfToken, currentAdmin } from '@/lib/auth';
import { getSettings, CURRENCIES, waGeneral, waLink } from '@/lib/site';

export const metadata = { title: 'Settings' };
const TABS = { branding: 'Branding', contact: 'Contact & social', seo: 'SEO', general: 'General', account: 'Account' };

function ImageSetting({ s, k, label, contain }) {
  return (
    <div className="label span-2" data-field={k}>{label}
      <div className="image-field">{s[k] ? <img className={contain ? 'is-contain' : ''} src={s[k]} alt="" /> : null}<input type="file" name={k} accept="image/png,image/jpeg,image/webp" /></div>
      {s[k] ? <label className="check"><input type="checkbox" name={`remove_${k}`} value="1" /> Remove</label> : null}
    </div>
  );
}

export default async function Settings({ searchParams }) {
  const sp = await searchParams;
  const tab = TABS[sp.tab] ? sp.tab : 'branding';
  const s = await getSettings();
  const admin = await currentAdmin();
  const artworks = tab === 'general' ? await sql`SELECT id, title FROM artworks WHERE availability <> 'hidden' ORDER BY title` : [];
  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p>Branding, contact details, SEO and site options.</p></div></div>
      <nav className="pill-tabs" style={{ marginBottom: 20 }} aria-label="Settings sections">
        {Object.entries(TABS).map(([k, label]) => <a key={k} className={tab === k ? 'is-active' : ''} href={`?tab=${k}`}>{label}</a>)}
      </nav>
      <form method="post" action="/api/admin/settings/" encType="multipart/form-data" className="card" style={{ maxWidth: 820 }} data-admin-form="">
        <input type="hidden" name="csrf" value={await csrfToken()} />
        <input type="hidden" name="tab" value={tab} />
        {tab === 'branding' ? (
          <div className="form-grid">
            <div className="label span-2">Brand name <small>The public artist identity is always “HUDA”.</small><input value="HUDA" disabled /></div>
            <label className="span-2">Tagline<input name="tagline" defaultValue={s.tagline} maxLength={120} /></label>
            <ImageSetting s={s} k="logo" label="Logo (optional — replaces the HUDA wordmark in the header; transparent PNG works best)" contain />
            <ImageSetting s={s} k="favicon" label="Favicon (square, 256 × 256 PNG)" contain />
          </div>
        ) : tab === 'contact' ? (
          <div className="form-grid">
            <label data-field="whatsapp">WhatsApp number <small>Used by every WhatsApp button on the site</small><input name="whatsapp" defaultValue={s.whatsapp || '+923037649454'} required /><span className="field-error" /></label>
            <div className="label">Current WhatsApp link<a className="btn btn--sm" href={waGeneral(s)} target="_blank" rel="noopener" style={{ justifyContent: 'flex-start' }}>{waLink(s)}</a></div>
            <label data-field="contact_email">Email <small>Shown on the site</small><input type="email" name="contact_email" defaultValue={s.contact_email} /><span className="field-error" /></label>
            <label>Phone <small>Optional</small><input name="contact_phone" defaultValue={s.contact_phone} /></label>
            {[['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']].map(([k, label]) => (
              <label key={k} data-field={`social_${k}`}>{label} URL<input name={`social_${k}`} defaultValue={s['social_' + k]} placeholder="https://" /><span className="field-error" /></label>
            ))}
          </div>
        ) : tab === 'seo' ? (
          <div className="form-grid">
            <label className="span-2">Website title <small>Browser tab & search result title for the home page</small><input name="seo_title" defaultValue={s.seo_title} maxLength={120} /></label>
            <label className="span-2">Meta description <small>~155 characters</small><textarea name="seo_description" rows={3} maxLength={320} defaultValue={s.seo_description} /></label>
            <ImageSetting s={s} k="og_image" label="Default social share image (Open Graph) — 1200 × 630 recommended" />
            <p className="help span-2" style={{ margin: 0 }}>Sitemap: <a href="/sitemap.xml" target="_blank" rel="noopener">/sitemap.xml</a> · Robots: <a href="/robots.txt" target="_blank" rel="noopener">/robots.txt</a></p>
          </div>
        ) : tab === 'general' ? (
          <div className="form-grid">
            <label>Default currency<select name="default_currency" defaultValue={s.default_currency || 'PKR'}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Hero artwork <small>The framed piece in the home page hero</small>
              <select name="hero_artwork_id" defaultValue={s.hero_artwork_id || ''}><option value="">Automatic (first featured)</option>{artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
            <label className="span-2">Footer text<input name="footer_text" defaultValue={s.footer_text} maxLength={200} /></label>
            <label className="switch span-2"><input type="checkbox" name="show_sold" value="1" defaultChecked={s.show_sold === '1'} /><i />Keep sold artworks visible on the website (with a “Sold” badge)</label>
            <label className="switch span-2"><input type="checkbox" name="maintenance_mode" value="1" defaultChecked={s.maintenance_mode === '1'} /><i />Maintenance mode — visitors see a holding page (you still see the site while logged in)</label>
          </div>
        ) : (
          <div className="form-grid">
            <label data-field="username">Username<input name="username" defaultValue={admin.username} autoComplete="username" required /><span className="field-error" /></label>
            <label data-field="email">Email<input type="email" name="email" defaultValue={admin.email} required /><span className="field-error" /></label>
            <label className="span-2" data-field="current_password">Current password <small>Required to save changes</small><input type="password" name="current_password" autoComplete="current-password" required /><span className="field-error" /></label>
            <label data-field="new_password">New password <small>Optional, 10+ characters</small><input type="password" name="new_password" autoComplete="new-password" minLength={10} /><span className="field-error" /></label>
            <label data-field="confirm_password">Confirm new password<input type="password" name="confirm_password" autoComplete="new-password" /><span className="field-error" /></label>
          </div>
        )}
        <div className="btn-row" style={{ marginTop: 22, justifyContent: 'flex-end' }}><button className="btn btn--primary" type="submit">Save {TABS[tab].toLowerCase()}</button></div>
      </form>
    </>
  );
}
