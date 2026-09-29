import { headers } from 'next/headers';
import Icon from '@/components/Icon';
import ArtworkCard from '@/components/ArtworkCard';
import { CommissionForm } from '@/components/Forms';
import { csrfToken } from '@/lib/auth';
import { getSettings, artworkQuery, waCommission, siteOrigin } from '@/lib/site';

export async function generateMetadata() {
  const origin = siteOrigin(await headers());
  return {
    title: 'Commission an Artwork',
    description: 'Request a custom artwork from HUDA — calligraphy, paintings and wall pieces made for your space, your words and your moment.',
    alternates: { canonical: origin + '/commission/' },
  };
}

export default async function Commission({ searchParams }) {
  const s = await getSettings();
  const csrf = await csrfToken();
  const sp = await searchParams;
  const examples = await artworkQuery(s, { featured: true, limit: 3 });
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <ol className="breadcrumbs" data-reveal="fade"><li><a href="/">Home</a></li><li aria-current="page">Commission</li></ol>
          <h1 className="h1 split" data-split="">Create Something <em>Unique</em> With HUDA</h1>
          <p className="lead" data-reveal="up" style={{ '--d': '.2s' }}>Share the words, colours and feeling you have in mind. HUDA will reply to shape the idea with you — size, style, budget and timing.</p>
        </div>
      </section>
      <section className="band section" id="request" aria-labelledby="request-title">
        <div className="container band__grid" style={{ alignItems: 'start' }}>
          <div>
            <p className="eyebrow" data-reveal="fade">How it works</p>
            <h2 className="h2 split" id="request-title" data-split="" style={{ margin: '22px 0 36px' }}>Request a Custom Artwork</h2>
            <ol className="steps" data-reveal="up">
              <li><div><strong>Share your vision</strong><span>Tell HUDA about the words, colours, size and space.</span></div></li>
              <li><div><strong>Agree the details</strong><span>Style, materials, budget and timeline are confirmed with you.</span></div></li>
              <li><div><strong>Hand-made for you</strong><span>Your artwork is created and prepared for delivery.</span></div></li>
            </ol>
            <a className="btn btn--wa" href={waCommission(s)} target="_blank" rel="noopener" style={{ marginTop: 36 }} data-magnetic=""><Icon name="whatsapp" /><span className="btn__label">Discuss Your Artwork</span></a>
          </div>
          <div data-reveal="up" style={{ '--d': '.15s' }}>
            <CommissionForm s={s} csrf={csrf} sent={sp.sent === 'commission'} />
          </div>
        </div>
      </section>
      {examples.length ? (
        <section className="section" aria-labelledby="inspiration">
          <div className="container">
            <div className="section-head">
              <h2 className="h2 split" id="inspiration" data-split="">For <em>inspiration</em></h2>
              <a className="text-link" href="/gallery/" data-reveal="fade">Browse the gallery <Icon name="arrow" /></a>
            </div>
            <div className="masonry">{examples.map((a, i) => <ArtworkCard key={a.id} a={a} s={s} index={i} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
