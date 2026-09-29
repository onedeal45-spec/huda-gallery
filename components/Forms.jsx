import Icon from './Icon';
import { waArtwork, waGeneral, waCommission } from '@/lib/site';

function Honeypot() {
  return <div className="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>;
}

function SentBanner({ show }) {
  if (!show) return null;
  return <p className="form-note" role="status" style={{ color: 'var(--gold-2)', marginBottom: 24 }}>Thank you — your message has reached HUDA. You’ll hear back soon.</p>;
}

export function ContactForm({ s, csrf, artwork = null, idSuffix = '', returnTo = '/', sent = false }) {
  const type = artwork ? 'artwork' : 'contact';
  const id = `f-${type}${idSuffix}`;
  return (
    <>
      <SentBanner show={sent} />
      <form className="form" method="post" action="/api/inquiry/" data-ajax-form="" noValidate>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="return" value={returnTo} />
        <Honeypot />
        <input type="hidden" name="type" value={type} />
        {artwork ? <input type="hidden" name="artwork_id" value={artwork.id} /> : null}
        <div className="field">
          <label htmlFor={`${id}-name`}>Name <span className="req">*</span></label>
          <input id={`${id}-name`} name="name" autoComplete="name" required maxLength={120} />
          <span className="error" data-error="name" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-email`}>Email <span className="req">*</span></label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={190} />
          <span className="error" data-error="email" />
        </div>
        <div className="field span-2">
          <label htmlFor={`${id}-wa`}>WhatsApp <span className="muted">(optional)</span></label>
          <input id={`${id}-wa`} name="whatsapp" type="tel" autoComplete="tel" maxLength={40} placeholder="+92 3xx xxxxxxx" />
          <span className="error" data-error="whatsapp" />
        </div>
        <div className="field span-2">
          <label htmlFor={`${id}-msg`}>Message <span className="req">*</span></label>
          <textarea id={`${id}-msg`} name="message" required maxLength={5000} rows={5} defaultValue={artwork ? `I’m interested in “${artwork.title}”. ` : ''} />
          <span className="error" data-error="message" />
        </div>
        <div className="span-2" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <button className="btn btn--solid" type="submit" data-magnetic=""><span className="btn__label">{artwork ? 'Send Inquiry' : 'Contact HUDA'}</span><Icon name="arrow" /></button>
          <span className="form-note">Or reply faster on <a className="link-underline gold" href={artwork ? waArtwork(s, artwork.title) : waGeneral(s)} target="_blank" rel="noopener">WhatsApp</a>.</span>
        </div>
      </form>
      <div className="form-success" role="status" tabIndex={-1}>
        <h3 className="h3">Thank you.</h3>
        <p className="muted" style={{ marginTop: 12 }}>Your message has reached HUDA. You’ll hear back soon.</p>
      </div>
    </>
  );
}

const TYPES = ['Calligraphy', 'Painting', 'Abstract', 'Portrait', 'Landscape', 'Wall art / installation', 'Gift piece', 'Other'];

export function CommissionForm({ s, csrf, sent = false }) {
  return (
    <>
      <SentBanner show={sent} />
      <form className="form" method="post" action="/api/inquiry/" encType="multipart/form-data" data-ajax-form="" noValidate>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="return" value="/commission/" />
        <Honeypot />
        <input type="hidden" name="type" value="commission" />
        <div className="field">
          <label htmlFor="c-name">Name <span className="req">*</span></label>
          <input id="c-name" name="name" autoComplete="name" required maxLength={120} />
          <span className="error" data-error="name" />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email <span className="req">*</span></label>
          <input id="c-email" name="email" type="email" autoComplete="email" required maxLength={190} />
          <span className="error" data-error="email" />
        </div>
        <div className="field">
          <label htmlFor="c-wa">WhatsApp <span className="req">*</span></label>
          <input id="c-wa" name="whatsapp" type="tel" autoComplete="tel" required maxLength={40} placeholder="+92 3xx xxxxxxx" />
          <span className="error" data-error="whatsapp" />
        </div>
        <div className="field">
          <label htmlFor="c-type">Artwork type</label>
          <select id="c-type" name="artwork_type" defaultValue="">
            <option value="">Choose…</option>
            {TYPES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="c-size">Preferred size</label><input id="c-size" name="preferred_size" maxLength={120} placeholder="e.g. 24 × 36 in" /></div>
        <div className="field"><label htmlFor="c-style">Preferred style</label><input id="c-style" name="preferred_style" maxLength={120} placeholder="e.g. gold leaf, modern, minimal" /></div>
        <div className="field"><label htmlFor="c-budget">Budget</label><input id="c-budget" name="budget" maxLength={80} placeholder="e.g. PKR 50,000" /></div>
        <div className="field"><label htmlFor="c-deadline">Deadline</label><input id="c-deadline" name="deadline" maxLength={80} placeholder="e.g. by 15 December" /></div>
        <div className="field span-2">
          <label htmlFor="c-msg">Tell HUDA about your idea <span className="req">*</span></label>
          <textarea id="c-msg" name="message" required maxLength={5000} rows={5} placeholder="The words, colours, space and feeling you have in mind…" />
          <span className="error" data-error="message" />
        </div>
        <div className="field field--file span-2">
          <label htmlFor="c-ref">Reference image <span className="muted">(optional · JPG, PNG or WEBP, max 12 MB)</span></label>
          <input id="c-ref" name="reference_image" type="file" accept="image/jpeg,image/png,image/webp" />
          <span className="error" data-error="reference_image" />
        </div>
        <div className="span-2" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <button className="btn btn--solid" type="submit" data-magnetic=""><span className="btn__label">Request a Custom Artwork</span><Icon name="arrow" /></button>
          <a className="btn btn--wa" href={waCommission(s)} target="_blank" rel="noopener" data-magnetic=""><Icon name="whatsapp" /><span className="btn__label">Discuss Your Artwork</span></a>
        </div>
      </form>
      <div className="form-success" role="status" tabIndex={-1}>
        <h3 className="h3">Your idea is on its way.</h3>
        <p className="muted" style={{ marginTop: 12 }}>HUDA will review your request and reply by email or WhatsApp.</p>
      </div>
    </>
  );
}

export function JsonLd({ data }) {
  return (data || []).map((d, i) => (
    <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }} />
  ));
}

export function Paragraphs({ text }) {
  return String(text || '').trim().split(/\n{2,}/).filter(Boolean).map((p, i) => (
    <p key={i}>{p.split('\n').map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 ? <br /> : null}</span>)}</p>
  ));
}
