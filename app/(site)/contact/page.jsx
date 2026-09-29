import { headers } from 'next/headers';
import Icon from '@/components/Icon';
import { ContactForm, JsonLd } from '@/components/Forms';
import { csrfToken } from '@/lib/auth';
import { getSettings, waGeneral, waDisplay, socialLinks, siteOrigin } from '@/lib/site';

export async function generateMetadata() {
  const origin = siteOrigin(await headers());
  return {
    title: 'Contact HUDA',
    description: 'Contact HUDA about an artwork, a commission or delivery — by WhatsApp, email or the contact form.',
    alternates: { canonical: origin + '/contact/' },
  };
}

export default async function Contact({ searchParams }) {
  const s = await getSettings();
  const csrf = await csrfToken();
  const sp = await searchParams;
  const origin = siteOrigin(await headers());
  const social = socialLinks(s);
  return (
    <>
      <JsonLd data={[{ '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact HUDA', url: origin + '/contact/' }]} />
      <section className="page-hero">
        <div className="container">
          <ol className="breadcrumbs" data-reveal="fade"><li><a href="/">Home</a></li><li aria-current="page">Contact</li></ol>
          <h1 className="h1 split" data-split="">Contact <em>HUDA</em></h1>
          <p className="lead" data-reveal="up" style={{ '--d': '.2s' }}>For artwork availability, pricing, commissions or delivery. The quickest reply is usually on WhatsApp.</p>
        </div>
      </section>
      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container contact-grid">
          <div>
            <ul className="contact-list" data-reveal="up" style={{ marginTop: 0 }}>
              <li><a href={waGeneral(s)} target="_blank" rel="noopener"><div><small>WhatsApp</small><strong>{waDisplay(s)}</strong></div><Icon name="arrow-ne" /></a></li>
              {s.contact_email ? <li><a href={`mailto:${s.contact_email}`}><div><small>Email</small><strong>{s.contact_email}</strong></div><Icon name="arrow-ne" /></a></li> : null}
              {s.contact_phone ? <li><a href={`tel:${s.contact_phone.replace(/[^\d+]/g, '')}`}><div><small>Phone</small><strong>{s.contact_phone}</strong></div><Icon name="arrow-ne" /></a></li> : null}
            </ul>
            <a className="btn btn--wa" href={waGeneral(s)} target="_blank" rel="noopener" style={{ marginTop: 36 }} data-magnetic=""><Icon name="whatsapp" /><span className="btn__label">Chat on WhatsApp</span></a>
            {social.length ? (
              <div style={{ marginTop: 48 }} data-reveal="fade">
                <p className="eyebrow">Follow</p>
                <div className="socials" style={{ marginTop: 18 }}>
                  {social.map((x) => <a key={x.key} className="icon-btn" href={x.url} target="_blank" rel="noopener me" aria-label={`HUDA on ${x.label}`} data-magnetic=""><Icon name={x.key} /></a>)}
                </div>
              </div>
            ) : null}
          </div>
          <div data-reveal="up" style={{ '--d': '.15s' }}>
            <h2 className="h3" style={{ marginBottom: 36 }}>Send a message</h2>
            <ContactForm s={s} csrf={csrf} returnTo="/contact/" sent={sp.sent === 'contact'} />
          </div>
        </div>
      </section>
      <section className="band section section--tight">
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 28 }}>
          <h2 className="h2 split" data-split="" style={{ maxWidth: '16ch' }}>Have an idea for a <em>custom</em> piece?</h2>
          <a className="btn btn--solid" href="/commission/" data-reveal="fade" data-magnetic=""><span className="btn__label">Commission Artwork</span><Icon name="arrow" /></a>
        </div>
      </section>
    </>
  );
}
