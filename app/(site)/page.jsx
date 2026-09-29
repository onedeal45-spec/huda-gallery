import { headers } from 'next/headers';
import Icon from '@/components/Icon';
import ArtworkCard from '@/components/ArtworkCard';
import { ContactForm, JsonLd, Paragraphs } from '@/components/Forms';
import { sql } from '@/lib/db';
import { csrfToken } from '@/lib/auth';
import {
  getSettings, setting, tagline, waGeneral, waCommission, waDisplay, artworkQuery, collectionsAll, collectionCover,
  ART_SELECT, visibilitySql, artworkUrl, collectionUrl, imgUrl, imgSrcset, formatPrice, excerpt, aspect, siteOrigin, absUrl,
} from '@/lib/site';

export async function generateMetadata() {
  const s = await getSettings();
  const origin = siteOrigin(await headers());
  const hero = await pickHero(s);
  return {
    title: { absolute: setting(s, 'seo_title', 'HUDA — ' + tagline(s)) },
    alternates: { canonical: origin + '/' },
    openGraph: { url: origin + '/', images: [s.og_image || (hero ? absUrl(origin, imgUrl(hero, 'lg')) : undefined)].filter(Boolean) },
  };
}

async function pickHero(s) {
  const heroId = Number(s.hero_artwork_id) || 0;
  if (heroId) {
    const [h] = await sql`${ART_SELECT(s)} WHERE a.id = ${heroId} AND ${visibilitySql(s)}`;
    if (h) return h;
  }
  const [f] = await artworkQuery(s, { featured: true, limit: 1 });
  if (f) return f;
  const [n] = await artworkQuery(s, { limit: 1 });
  return n || null;
}

export default async function Home() {
  const s = await getSettings();
  const csrf = await csrfToken();
  const origin = siteOrigin(await headers());
  const hero = await pickHero(s);
  let featured = (await artworkQuery(s, { featured: true, limit: 7 })).filter((a) => !hero || a.id !== hero.id).slice(0, 6);
  if (!featured.length && hero) featured = [hero];
  const latest = await artworkQuery(s, { sort: 'newest', limit: 10 });
  const collections = await collectionsAll(s);
  const covers = await Promise.all(collections.map((c) => collectionCover(s, c)));
  const [{ n: totalWorks }] = await sql`SELECT COUNT(*)::int AS n FROM artworks a WHERE ${visibilitySql(s)}`;
  const heroAr = aspect(hero);
  const aboutImg = s.about_image;

  return (
    <>
      <JsonLd data={[
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'HUDA', slogan: tagline(s), url: origin + '/', ...(s.logo ? { logo: absUrl(origin, s.logo) } : {}) },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'HUDA', url: origin + '/',
          potentialAction: { '@type': 'SearchAction', target: origin + '/gallery/?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
      ]} />
      {hero ? <link rel="preload" as="image" href={imgUrl(hero, 'lg')} fetchPriority="high" /> : null}

      {/* 1. Cinematic hero */}
      <section className="hero" id="hero" data-hero="" style={{ '--zoom': heroAr < 1 ? '1.75' : '1.35' }}>
        <div className="hero__sticky">
          <div className="hero__bg" aria-hidden="true" />
          <div className="hero__wall" aria-hidden="true" />
          <canvas className="hero__gl" aria-hidden="true" />
          <div className="hero__light" aria-hidden="true" />
          <div className="hero__stage">
            <div className="hero__copy">
              <p className="eyebrow hero__fade" style={{ '--d': '.7s' }}>Contemporary Art Gallery</p>
              <h1 className="hero__title" aria-label="HUDA">
                {'HUDA'.split('').map((ch, i) => <span key={i} className="ch" aria-hidden="true"><span style={{ '--i': i }}>{ch}</span></span>)}
              </h1>
              <p className="hero__tagline hero__fade" style={{ '--d': '.95s' }}>{tagline(s)}</p>
              <p className="hero__intro hero__fade" style={{ '--d': '1.1s' }}>Original artworks in calligraphy, colour and gold — each one made by hand.</p>
              <div className="hero__actions hero__fade" style={{ '--d': '1.25s' }}>
                <a className="btn btn--solid" href="/gallery/" data-magnetic=""><span className="btn__label">Explore Artwork</span><Icon name="arrow" /></a>
                <a className="btn" href="/commission/" data-magnetic=""><span className="btn__label">Commission an Artwork</span></a>
                <a className="icon-btn" href={waGeneral(s)} target="_blank" rel="noopener" aria-label="Chat on WhatsApp" data-magnetic=""><Icon name="whatsapp" /></a>
              </div>
            </div>
            {hero ? (
              <div className="hero__art">
                <div className="hero__frame-wrap">
                  <div className="hero__frame-in">
                    <div className="hero__shadow" aria-hidden="true" />
                    <a className="frame" href={artworkUrl(hero)} data-cursor="view" style={{ '--ar': heroAr }} data-lightbox="hero"
                      data-full={imgUrl(hero, 'lg')} data-title={hero.title} data-price={formatPrice(hero.price, hero.currency, s)}
                      data-w={hero.width || 0} data-h={hero.height || 0}>
                      <div className="frame__mat">
                        <img src={imgUrl(hero, 'lg')} srcSet={imgSrcset(hero)} sizes="(max-width: 1023px) 76vw, 42vw"
                          width={hero.width || 800} height={hero.height || 1000} fetchPriority="high" decoding="async"
                          alt={`${hero.title} — featured artwork by HUDA`} />
                      </div>
                    </a>
                    <div className="hero__caption"><strong>{hero.title}</strong><span>{hero.category_name || ''}</span></div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="hero__veil" aria-hidden="true" />
          <div className="hero__enter" aria-hidden="true">
            <div><p className="eyebrow" style={{ justifyContent: 'center' }}>The Gallery</p><p className="h1" style={{ marginTop: 18 }}>Step <em>inside</em>.</p></div>
          </div>
          <div className="hero__scroll" aria-hidden="true"><span>Scroll</span><i /></div>
        </div>
      </section>

      {/* 2. Featured works */}
      <section className="section" id="featured" aria-labelledby="featured-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow" data-reveal="fade">Selected</p>
              <h2 className="h2 split" id="featured-title" data-split="" style={{ marginTop: 22 }}>Featured Works</h2>
            </div>
            <div data-reveal="up" style={{ '--d': '.15s' }}>
              <p className="lead">Pieces chosen from the studio — gold leaf, texture and sacred script, each one unique.</p>
              <a className="text-link" href="/gallery/?featured=1" style={{ marginTop: 22 }}>View all featured <Icon name="arrow" /></a>
            </div>
          </div>
          {featured.length ? (
            <div className="featured-grid">
              {featured.map((a, i) => <ArtworkCard key={a.id} a={a} s={s} index={i} sizes="(max-width: 767px) 92vw, (max-width: 1023px) 45vw, 36vw" />)}
            </div>
          ) : (
            <div className="empty-state"><h2>The gallery is preparing something new.</h2><p>New work will appear here soon.</p></div>
          )}
        </div>
      </section>

      {/* 3. Latest works */}
      {latest.length ? (
        <section className="section section--tight" id="latest" aria-labelledby="latest-title" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head" style={{ marginBottom: 40 }}>
              <div>
                <p className="eyebrow" data-reveal="fade">From the studio</p>
                <h2 className="h2 split" id="latest-title" data-split="" style={{ marginTop: 22 }}>Latest Works</h2>
              </div>
              <div className="wall-nav" data-reveal="fade">
                <button className="icon-btn" type="button" data-wall="-1" aria-label="Scroll left"><Icon name="arrow-left" /></button>
                <button className="icon-btn" type="button" data-wall="1" aria-label="Scroll right"><Icon name="arrow" /></button>
              </div>
            </div>
          </div>
          <div className="wall" data-wall-track="" tabIndex={0} aria-label="Latest works, scroll horizontally">
            {latest.map((a, i) => <ArtworkCard key={a.id} a={a} s={s} index={i} reveal="fade" sizes="(max-width: 767px) 72vw, 340px" />)}
          </div>
        </section>
      ) : null}

      {/* 4. Collections */}
      {collections.length ? (
        <section className="collections-pin" id="collections" aria-labelledby="collections-title" data-pin="">
          <div className="collections-pin__sticky section">
            <div className="container">
              <div className="section-head">
                <div>
                  <p className="eyebrow" data-reveal="fade">Series</p>
                  <h2 className="h2 split" id="collections-title" data-split="" style={{ marginTop: 22 }}>Collections</h2>
                </div>
                <a className="text-link" href="/collections/" data-reveal="fade">All collections <Icon name="arrow" /></a>
              </div>
            </div>
            <div className="container" data-pin-clip="">
              <div className="collections-track collections-track--grid" data-pin-track="">
                {collections.map((c, i) => (
                  <a key={c.id} className="collection-card" href={collectionUrl(c)} data-reveal="up" style={{ '--d': `${(i % 3) * 0.1}s` }}>
                    <div className="collection-card__media">
                      <img src={covers[i].src} srcSet={covers[i].srcset} sizes={covers[i].srcset ? '(max-width: 1023px) 92vw, 460px' : undefined}
                        alt={`${c.name} collection by HUDA`} loading="lazy" decoding="async" />
                      <span className="collection-card__count">{c.artwork_count} {c.artwork_count === 1 ? 'work' : 'works'}</span>
                    </div>
                    <div className="collection-card__body">
                      <span className="collection-card__num">№ {String(i + 1).padStart(2, '0')}</span>
                      <h3>{c.name}</h3>
                      <p>{excerpt(c.description, 140)}</p>
                      <span className="text-link">Explore <Icon name="arrow" /></span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 5. Artistic statement */}
      <section className="statement" aria-label="Artistic statement" data-statement="">
        <div className="statement__sticky">
          <span className="statement__mark" aria-hidden="true">— HUDA —</span>
          <div className="container"><p className="statement__text" data-statement-text="">{setting(s, 'statement', 'Art begins where imagination becomes visible.')}</p></div>
        </div>
      </section>

      {/* 6. About */}
      <section className="section" id="about" aria-labelledby="about-title">
        <div className="container split-layout">
          <div className={'portrait' + (aboutImg ? '' : ' portrait--placeholder')} data-reveal="fade">
            <div className="portrait__img reveal-img" data-parallax-wrap="">
              {aboutImg ? <img src={aboutImg} alt="HUDA in the studio" loading="lazy" data-parallax="" /> : <span aria-hidden="true">H</span>}
            </div>
            <div className="portrait__caption" data-reveal="up" style={{ '--d': '.4s' }}>{tagline(s)}</div>
          </div>
          <div>
            <p className="eyebrow" data-reveal="fade">The artist</p>
            <h2 className="h2 split" id="about-title" data-split="" style={{ margin: '22px 0 30px' }}>About HUDA</h2>
            <div className="prose" data-reveal="up" style={{ '--d': '.1s' }}>
              <Paragraphs text={s.about_intro || 'HUDA is an artist working across calligraphy, colour and culture.'} />
              {s.about_biography ? <p>{excerpt(s.about_biography, 320)}</p> : null}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 34, '--d': '.2s' }} data-reveal="up">
              <a className="btn" href="/about/" data-magnetic=""><span className="btn__label">Read the story</span></a>
              <a className="text-link" href="/gallery/" style={{ alignSelf: 'center', marginLeft: 10 }}>{totalWorks} works in the gallery <Icon name="arrow" /></a>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Commission */}
      <section className="band section" id="commission" aria-labelledby="commission-title">
        <div className="container band__grid">
          <div>
            <p className="eyebrow" data-reveal="fade">Commissions</p>
            <h2 className="band__title split" id="commission-title" data-split="" style={{ marginTop: 24 }}>Create Something <em>Unique</em> With HUDA</h2>
            <p className="lead" data-reveal="up" style={{ marginTop: 30, '--d': '.2s' }}>A verse for your home, a name for someone you love, a piece shaped for a particular wall — tell HUDA your idea and it becomes a one-of-a-kind artwork.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 36 }} data-reveal="up">
              <a className="btn btn--solid" href="/commission/" data-magnetic=""><span className="btn__label">Request a Custom Artwork</span><Icon name="arrow" /></a>
              <a className="btn btn--wa" href={waCommission(s)} target="_blank" rel="noopener" data-magnetic=""><Icon name="whatsapp" /><span className="btn__label">Discuss Your Artwork</span></a>
            </div>
          </div>
          <ol className="steps" data-reveal="up" style={{ '--d': '.15s' }}>
            <li><div><strong>Share your vision</strong><span>Words, colours, size, space and deadline.</span></div></li>
            <li><div><strong>Agree the details</strong><span>Style, materials and budget, confirmed with you.</span></div></li>
            <li><div><strong>Hand-made for you</strong><span>Your piece is created, then prepared for delivery.</span></div></li>
          </ol>
        </div>
      </section>

      {/* 8. Contact */}
      <section className="section" id="contact" aria-labelledby="contact-title">
        <div className="container contact-grid">
          <div>
            <p className="eyebrow" data-reveal="fade">Get in touch</p>
            <h2 className="h2 split" id="contact-title" data-split="" style={{ marginTop: 22 }}>Contact HUDA</h2>
            <p className="lead" data-reveal="up" style={{ marginTop: 26 }}>Questions about a piece, pricing or delivery — HUDA is happy to help.</p>
            <ul className="contact-list" data-reveal="up" style={{ '--d': '.1s' }}>
              <li><a href={waGeneral(s)} target="_blank" rel="noopener"><div><small>WhatsApp</small><strong>{waDisplay(s)}</strong></div><Icon name="arrow-ne" /></a></li>
              {s.contact_email ? <li><a href={`mailto:${s.contact_email}`}><div><small>Email</small><strong>{s.contact_email}</strong></div><Icon name="arrow-ne" /></a></li> : null}
            </ul>
          </div>
          <div data-reveal="up" style={{ '--d': '.15s' }}>
            <ContactForm s={s} csrf={csrf} idSuffix="-home" returnTo="/" />
          </div>
        </div>
      </section>
    </>
  );
}
