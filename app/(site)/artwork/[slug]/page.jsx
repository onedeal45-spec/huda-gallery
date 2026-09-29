import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ArtworkCard from '@/components/ArtworkCard';
import { ContactForm, JsonLd, Paragraphs } from '@/components/Forms';
import { sql } from '@/lib/db';
import { csrfToken } from '@/lib/auth';
import {
  getSettings, ART_SELECT, visibilitySql, artworkQuery, waArtwork, formatPrice, availabilityLabel, imgUrl, imgSrcset,
  aspect, excerpt, collectionUrl, siteOrigin, absUrl,
} from '@/lib/site';

async function load(slug) {
  const s = await getSettings();
  slug = String(slug || '').replace(/[^A-Za-z0-9-]/g, '');
  if (!slug) return null;
  const [art] = await sql`${ART_SELECT(s)} WHERE a.slug = ${slug} AND ${visibilitySql(s)}`;
  return art ? { s, art } : null;
}

function describe(art) {
  return art.description || `${art.title} — an original artwork by HUDA${art.category_name ? ' in the ' + art.category_name + ' category' : ''}.`;
}

export async function generateMetadata({ params }) {
  const d = await load((await params).slug);
  if (!d) return { title: 'Lost in the Gallery', robots: { index: false } };
  const origin = siteOrigin(await headers());
  const url = `${origin}/artwork/${d.art.slug}/`;
  const img = d.art.url_lg ? absUrl(origin, d.art.url_lg) : undefined;
  return {
    title: d.art.title,
    description: excerpt(describe(d.art), 158),
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: `${d.art.title} — HUDA`, description: excerpt(describe(d.art), 200), images: img ? [img] : undefined },
    twitter: { card: 'summary_large_image', images: img ? [img] : undefined },
  };
}

export default async function ArtworkPage({ params, searchParams }) {
  const d = await load((await params).slug);
  if (!d) notFound();
  const { s, art } = d;
  const sp = await searchParams;
  const csrf = await csrfToken();
  const origin = siteOrigin(await headers());
  const images = await sql`SELECT * FROM artwork_images WHERE artwork_id = ${art.id} ORDER BY is_main DESC, sort_order ASC, id ASC`;
  const main = images[0] || null;
  const collections = await sql`SELECT co.* FROM collections co JOIN collection_artworks ca ON ca.collection_id = co.id
                                WHERE ca.artwork_id = ${art.id} AND co.is_visible = true ORDER BY co.sort_order`;
  let related = art.category_slug ? await artworkQuery(s, { category: art.category_slug, exclude: art.id, limit: 3 }) : [];
  if (related.length < 3) {
    const ids = related.map((r) => r.id);
    const more = (await artworkQuery(s, { exclude: art.id, limit: 8 })).filter((r) => !ids.includes(r.id));
    related = [...related, ...more].slice(0, 3);
  }
  const status = art.availability;
  const priceTxt = status === 'sold' ? 'Sold' : formatPrice(art.price, art.currency, s);
  const ar = aspect(main);
  const url = `${origin}/artwork/${art.slug}/`;

  const artLd = {
    '@context': 'https://schema.org', '@type': 'VisualArtwork', name: art.title, url,
    image: images.map((i) => absUrl(origin, i.url_lg)), description: excerpt(describe(art), 300),
    creator: { '@type': 'Person', name: 'HUDA' },
    ...(art.category_name ? { genre: art.category_name } : {}),
    ...(art.medium ? { artMedium: art.medium } : {}),
    ...(art.year ? { dateCreated: String(art.year) } : {}),
    ...(art.artwork_code ? { identifier: art.artwork_code } : {}),
  };
  if (art.price && Number(art.price) > 0) {
    artLd.offers = {
      '@type': 'Offer', price: Number(art.price).toFixed(2), priceCurrency: art.currency, url,
      availability: { available: 'https://schema.org/InStock', reserved: 'https://schema.org/LimitedAvailability', sold: 'https://schema.org/SoldOut' }[status],
      seller: { '@type': 'Organization', name: 'HUDA' },
    };
  }

  return (
    <>
      <JsonLd data={[artLd, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: 'Gallery', item: origin + '/gallery/' },
        { '@type': 'ListItem', position: 3, name: art.title, item: url },
      ] }]} />
      {main ? <link rel="preload" as="image" href={imgUrl(main, 'lg')} fetchPriority="high" /> : null}
      <article className="artwork" data-artwork="">
        <div className="container">
          <ol className="breadcrumbs" data-reveal="fade">
            <li><a href="/">Home</a></li><li><a href="/gallery/">Gallery</a></li><li aria-current="page">{art.title}</li>
          </ol>
          <div className="artwork__grid" style={{ marginTop: 40 }}>
            <div className="artwork__media">
              <a className="artwork__main" href={imgUrl(main, 'lg')} data-cursor="view" data-tilt-frame="" data-reveal="scale"
                data-lightbox="artwork" data-full={imgUrl(main, 'lg')} data-title={art.title} data-price={priceTxt}
                data-w={main?.width || 0} data-h={main?.height || 0} data-main-link="">
                <div className="frame" style={{ '--ar': ar }}>
                  <div className="frame__mat">
                    <img src={imgUrl(main, 'lg')} srcSet={imgSrcset(main)} sizes="(max-width: 1023px) 92vw, 56vw"
                      width={main?.width || 800} height={main?.height || 1000} fetchPriority="high" decoding="async"
                      alt={`${art.title} — artwork by HUDA`} data-main-img="" />
                  </div>
                </div>
                <span className="icon-btn artwork__zoom" aria-hidden="true"><Icon name="expand" /></span>
                <span className="sr-only">Open {art.title} fullscreen</span>
              </a>
              {images.length > 1 ? (
                <div className="artwork__thumbs" role="list" aria-label="More images">
                  {images.map((img, i) => (
                    <button key={img.id} type="button" role="listitem" aria-current={i === 0 ? 'true' : 'false'} aria-label={`Show image ${i + 1}`}
                      data-thumb="" data-src={imgUrl(img, 'lg')} data-srcset={imgSrcset(img)} data-w={img.width} data-h={img.height}>
                      <img src={imgUrl(img, 'sm')} alt="" loading="lazy" width="84" height="84" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="artwork__info">
              {art.category_name ? <p className="eyebrow" data-reveal="fade">{art.category_name}</p> : null}
              <h1 className="artwork__title split" data-split="">{art.title}</h1>
              <div data-reveal="up" style={{ '--d': '.15s' }}>
                <p className="artwork__price">{priceTxt}</p>
                <p className="artwork__status"><span className={`status-dot is-${status}`}>{availabilityLabel(status)}</span></p>
              </div>
              {art.description ? <div className="artwork__desc" data-reveal="up" style={{ '--d': '.2s' }}><Paragraphs text={art.description} /></div> : null}
              <dl className="spec" data-reveal="up" style={{ '--d': '.25s' }}>
                {art.medium ? <><dt>Medium</dt><dd>{art.medium}</dd></> : null}
                {art.dimensions ? <><dt>Dimensions</dt><dd>{art.dimensions}</dd></> : null}
                {art.year ? <><dt>Year</dt><dd>{art.year}</dd></> : null}
                {art.category_name ? <><dt>Category</dt><dd><a href={`/gallery/?category=${art.category_slug}`}>{art.category_name}</a></dd></> : null}
                {collections.length ? <><dt>Collection</dt><dd>{collections.map((c, k) => <span key={c.id}>{k ? ', ' : ''}<a href={collectionUrl(c)}>{c.name}</a></span>)}</dd></> : null}
                {art.artwork_code ? <><dt>Artwork ID</dt><dd>{art.artwork_code}</dd></> : null}
                <dt>Availability</dt><dd>{availabilityLabel(status)}</dd>
              </dl>
              <div className="artwork__ctas" data-reveal="up" style={{ '--d': '.3s' }}>
                <a className="btn btn--solid btn--wa btn--block" href={waArtwork(s, art.title)} target="_blank" rel="noopener" data-magnetic=""><Icon name="whatsapp" /><span className="btn__label">Inquire on WhatsApp</span></a>
                <button className="btn btn--block" type="button" data-inquiry-toggle="" aria-expanded="false" aria-controls="inquiry-panel"><span className="btn__label">{status === 'sold' ? 'Ask about a similar piece' : 'Send an Inquiry'}</span></button>
              </div>
              <div className={'inquiry-panel' + (sp.sent === 'artwork' ? ' is-open' : '')} id="inquiry-panel">
                <ContactForm s={s} csrf={csrf} artwork={art} returnTo={`/artwork/${art.slug}/`} sent={sp.sent === 'artwork'} />
              </div>
              <div className="share" data-reveal="fade" style={{ '--d': '.35s' }}>
                <span>Share</span>
                <button className="icon-btn" type="button" data-share="" data-share-title={`${art.title} — HUDA`} data-share-url={url} aria-label="Share this artwork"><Icon name="share" /></button>
                <a className="icon-btn" href={`https://wa.me/?text=${encodeURIComponent(art.title + ' — HUDA ' + url)}`} target="_blank" rel="noopener" aria-label="Share on WhatsApp"><Icon name="whatsapp" /></a>
                <a className="icon-btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener" aria-label="Share on Facebook"><Icon name="facebook" /></a>
                <button className="icon-btn" type="button" data-copy={url} aria-label="Copy link"><Icon name="link" /></button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {related.length ? (
        <section className="section" aria-labelledby="related-title">
          <div className="container">
            <div className="section-head">
              <h2 className="h2 split" id="related-title" data-split="">More from <em>HUDA</em></h2>
              <a className="text-link" href="/gallery/" data-reveal="fade">Back to the gallery <Icon name="arrow" /></a>
            </div>
            <div className="masonry">
              {related.map((a, i) => <ArtworkCard key={a.id} a={a} s={s} index={i} />)}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
