import { headers } from 'next/headers';
import Icon from '@/components/Icon';
import ArtworkCard from '@/components/ArtworkCard';
import { JsonLd, Paragraphs } from '@/components/Forms';
import { sql } from '@/lib/db';
import { getSettings, setting, tagline, artworkQuery, visibilitySql, excerpt, siteOrigin, absUrl } from '@/lib/site';

const BLOCKS = [
  ['about_biography', 'Biography'],
  ['about_philosophy', 'Artistic philosophy'],
  ['about_journey', 'Creative journey'],
  ['about_interests', 'Artistic interests'],
  ['about_achievements', 'Exhibitions & recognition'],
];

export async function generateMetadata() {
  const s = await getSettings();
  const origin = siteOrigin(await headers());
  return {
    title: 'About',
    description: excerpt([s.about_intro, ...BLOCKS.map(([k]) => s[k])].filter(Boolean).join(' '), 158),
    alternates: { canonical: origin + '/about/' },
    openGraph: { type: 'profile', images: s.about_image ? [absUrl(origin, s.about_image)] : undefined },
  };
}

export default async function About() {
  const s = await getSettings();
  const origin = siteOrigin(await headers());
  const img = s.about_image;
  const intro = setting(s, 'about_intro', 'HUDA is an artist working across calligraphy, colour and culture.');
  const blocks = BLOCKS.filter(([k]) => s[k]);
  const [{ n: count }] = await sql`SELECT COUNT(*)::int AS n FROM artworks a WHERE ${visibilitySql(s)}`;
  const recent = await artworkQuery(s, { featured: true, limit: 3 });
  return (
    <>
      <JsonLd data={[{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About HUDA', url: origin + '/about/',
        mainEntity: { '@type': 'Person', name: 'HUDA', description: excerpt(intro, 200), ...(img ? { image: absUrl(origin, img) } : {}) } }]} />
      <section className="page-hero">
        <div className="container">
          <ol className="breadcrumbs" data-reveal="fade"><li><a href="/">Home</a></li><li aria-current="page">About</li></ol>
          <h1 className="h1 split" data-split="">About <em>HUDA</em></h1>
          <p className="lead" data-reveal="up" style={{ '--d': '.2s' }}>{tagline(s)}</p>
        </div>
      </section>
      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container split-layout" style={{ alignItems: 'start' }}>
          <div className={'portrait' + (img ? '' : ' portrait--placeholder')} data-reveal="fade">
            <div className="portrait__img reveal-img" data-parallax-wrap="">
              {img ? <img src={img} alt="HUDA" data-parallax="" /> : <span aria-hidden="true">H</span>}
            </div>
            <div className="portrait__caption" data-reveal="up" style={{ '--d': '.4s' }}>{setting(s, 'footer_text', 'Calligraphy · Colour · Culture')}</div>
          </div>
          <div>
            <div className="prose" data-reveal="up"><div className="lead" style={{ maxWidth: 'none' }}><Paragraphs text={intro} /></div></div>
            {blocks.length ? (
              <div className="prose">
                {blocks.map(([k, title], i) => (
                  <div key={k} data-reveal="up" style={{ '--d': `${(i % 2) * 0.1}s` }}>
                    <h2 className="h3" style={{ margin: '56px 0 18px' }}>{title}</h2>
                    <Paragraphs text={s[k]} />
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 48 }} data-reveal="up">
              <a className="btn btn--solid" href="/gallery/" data-magnetic=""><span className="btn__label">Explore {count} Artworks</span><Icon name="arrow" /></a>
              <a className="btn" href="/contact/" data-magnetic=""><span className="btn__label">Contact HUDA</span></a>
            </div>
          </div>
        </div>
      </section>
      {recent.length ? (
        <section className="section" aria-labelledby="about-works">
          <div className="container">
            <div className="section-head">
              <h2 className="h2 split" id="about-works" data-split="">Selected <em>works</em></h2>
              <a className="text-link" href="/gallery/?featured=1" data-reveal="fade">All featured <Icon name="arrow" /></a>
            </div>
            <div className="masonry">{recent.map((a, i) => <ArtworkCard key={a.id} a={a} s={s} index={i} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
