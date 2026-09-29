import AIcon from '@/components/AIcon';
import { csrfToken } from '@/lib/auth';
import { getSettings } from '@/lib/site';

export const metadata = { title: 'About HUDA' };

const ABOUT_FIELDS = [
  ['about_intro', 'Introduction', 'Shown on the home page and at the top of the About page.', 1200],
  ['about_biography', 'Biography', '', 6000],
  ['about_philosophy', 'Artistic philosophy', '', 4000],
  ['about_journey', 'Creative journey', '', 4000],
  ['about_interests', 'Artistic interests', '', 3000],
  ['about_achievements', 'Exhibitions & achievements', 'Only list real exhibitions or recognition. Leave empty to hide this section.', 4000],
  ['statement', 'Artistic statement', 'The large line that lights up word by word on the home page.', 300],
];

export default async function AboutAdmin() {
  const s = await getSettings();
  const img = s.about_image;
  return (
    <>
      <div className="page-head">
        <div><h1>About HUDA</h1><p>Everything on the About page. Empty sections are hidden automatically.</p></div>
        <a className="btn" href="/about/" target="_blank" rel="noopener"><AIcon name="eye" />View page</a>
      </div>
      <form method="post" action="/api/admin/settings/" encType="multipart/form-data" data-admin-form="">
        <input type="hidden" name="csrf" value={await csrfToken()} />
        <input type="hidden" name="tab" value="about" />
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="card">
            <div className="form-grid">
              {ABOUT_FIELDS.map(([k, label, help, max]) => (
                <label key={k} className="span-2">{label}{help ? <small> {help}</small> : null}
                  <textarea name={k} rows={k === 'statement' ? 2 : k === 'about_biography' ? 8 : 5} maxLength={max} defaultValue={s[k] || ''} />
                </label>
              ))}
            </div>
          </section>
          <section className="card">
            <div className="card__head"><h2>Artist image</h2></div>
            <div className="label" data-field="about_image">
              {img ? <img src={img} alt="Current artist image" style={{ width: '100%', maxWidth: 320, borderRadius: 10, border: '1px solid var(--line)', marginBottom: 12 }} /> : <p className="muted" style={{ margin: '0 0 10px' }}>No image yet — an elegant monogram is shown instead.</p>}
              <input type="file" name="about_image" accept="image/jpeg,image/png,image/webp" aria-label="Upload artist image" />
              {img ? <label className="check" style={{ marginTop: 8 }}><input type="checkbox" name="remove_about_image" value="1" /> Remove image</label> : null}
              <small>Portrait orientation works best (4:5). The name shown with it is always “HUDA”.</small>
            </div>
          </section>
        </div>
        <div className="sticky-actions"><button className="btn btn--primary" type="submit">Save About page</button></div>
      </form>
    </>
  );
}
