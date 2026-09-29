import { headers } from 'next/headers';
import Icon from '@/components/Icon';
import ArtworkCard from '@/components/ArtworkCard';
import { JsonLd } from '@/components/Forms';
import { getSettings, artworkQuery, categoriesAll, collectionsAll, waGeneral, siteOrigin } from '@/lib/site';

function readFilters(sp) {
  const str = (v) => (Array.isArray(v) ? v[0] : v) || '';
  return {
    q: str(sp.q).trim().slice(0, 80),
    category: str(sp.category).replace(/[^a-z0-9-]/g, ''),
    collection: str(sp.collection).replace(/[^a-z0-9-]/g, ''),
    availability: ['available', 'reserved', 'sold'].includes(str(sp.availability)) ? str(sp.availability) : '',
    featured: !!str(sp.featured),
    sort: ['newest', 'price_asc', 'price_desc', 'title'].includes(str(sp.sort)) ? str(sp.sort) : '',
  };
}

export async function generateMetadata({ searchParams }) {
  const f = readFilters(await searchParams);
  const origin = siteOrigin(await headers());
  const filtered = f.q || f.category || f.collection || f.availability || f.featured || f.sort;
  return {
    title: 'Gallery',
    description: 'Browse the complete HUDA gallery — calligraphy, landscapes, abstract and modern works with prices and availability.',
    alternates: { canonical: origin + '/gallery/' },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function Gallery({ searchParams }) {
  const s = await getSettings();
  const f = readFilters(await searchParams);
  const origin = siteOrigin(await headers());
  const [artworks, categories, collections] = await Promise.all([artworkQuery(s, f), categoriesAll(s), collectionsAll(s)]);
  const hasFilters = !!(f.q || f.category || f.collection || f.availability || f.featured);
  const count = artworks.length;

  return (
    <>
      <JsonLd data={[{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: 'Gallery', item: origin + '/gallery/' },
      ] }]} />
      <section className="page-hero">
        <div className="container">
          <ol className="breadcrumbs" data-reveal="fade"><li><a href="/">Home</a></li><li aria-current="page">Gallery</li></ol>
          <h1 className="h1 split" data-split="">The <em>Gallery</em></h1>
          <p className="lead" data-reveal="up" style={{ '--d': '.2s' }}>Every work currently hung in HUDA’s digital gallery. Open any piece to see it up close.</p>
        </div>
      </section>

      <form className="filters" method="get" action="/gallery/" data-gallery-filters="" role="search" aria-label="Filter artworks">
        <div className="container filters__row">
          <label className="filters__search">
            <Icon name="search" /><span className="sr-only">Search artworks</span>
            <input type="search" name="q" defaultValue={f.q} placeholder="Search artwork, medium, category…" autoComplete="off" />
          </label>
          <button className="chip filters__toggle" type="button" aria-expanded="false" data-filters-toggle=""><Icon name="filter" /> Filters</button>
          <div className="filters__more">
            <label className="sr-only" htmlFor="fl-cat">Category</label>
            <select id="fl-cat" name="category" defaultValue={f.category}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="fl-col">Collection</label>
            <select id="fl-col" name="collection" defaultValue={f.collection}>
              <option value="">All collections</option>
              {collections.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="fl-av">Availability</label>
            <select id="fl-av" name="availability" defaultValue={f.availability}>
              <option value="">Any availability</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              {s.show_sold === '1' ? <option value="sold">Sold</option> : null}
            </select>
            <label className="chip"><input type="checkbox" name="featured" value="1" defaultChecked={f.featured} /> Featured</label>
            <label className="sr-only" htmlFor="fl-sort">Sort</label>
            <select id="fl-sort" name="sort" defaultValue={f.sort}>
              <option value="">Curated order</option>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
            <noscript><button className="btn btn--sm" type="submit">Apply</button></noscript>
          </div>
          <span className="filters__count" aria-live="polite" data-gallery-count="">{count} {count === 1 ? 'artwork' : 'artworks'}</span>
        </div>
      </form>

      <section className="gallery-results container" data-gallery-results="" aria-label="Artworks">
        {artworks.length ? (
          <div className="masonry" data-masonry="">
            {artworks.map((a, i) => <ArtworkCard key={a.id} a={a} s={s} index={i} />)}
          </div>
        ) : hasFilters ? (
          <div className="empty-state">
            <h2>No artwork found.</h2>
            <p>Try a different search or clear the filters.</p>
            <a className="btn" href="/gallery/" data-gallery-reset=""><span className="btn__label">Clear filters</span></a>
          </div>
        ) : (
          <div className="empty-state">
            <h2>The gallery is preparing something new.</h2>
            <p>New work will be hung here soon.</p>
            <a className="btn btn--wa" href={waGeneral(s)} target="_blank" rel="noopener"><Icon name="whatsapp" /><span className="btn__label">Chat on WhatsApp</span></a>
          </div>
        )}
      </section>
    </>
  );
}
