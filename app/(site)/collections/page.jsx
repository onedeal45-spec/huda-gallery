import { headers } from 'next/headers';
import Icon from '@/components/Icon';
import { getSettings, collectionsAll, collectionCover, collectionUrl, excerpt, siteOrigin } from '@/lib/site';

export async function generateMetadata() {
  const origin = siteOrigin(await headers());
  return {
    title: 'Collections',
    description: 'Explore HUDA’s collections — series of artworks grouped by theme, material and meaning.',
    alternates: { canonical: origin + '/collections/' },
  };
}

export default async function Collections() {
  const s = await getSettings();
  const collections = await collectionsAll(s);
  const covers = await Promise.all(collections.map((c) => collectionCover(s, c)));
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <ol className="breadcrumbs" data-reveal="fade"><li><a href="/">Home</a></li><li aria-current="page">Collections</li></ol>
          <h1 className="h1 split" data-split="">Collections</h1>
          <p className="lead" data-reveal="up" style={{ '--d': '.2s' }}>Series of works that belong together — by theme, by material, by the feeling they carry.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 'clamp(96px,12vw,180px)' }}>
        {collections.length ? (
          <div className="collections-track collections-track--grid">
            {collections.map((c, i) => (
              <a key={c.id} className="collection-card" href={collectionUrl(c)} data-reveal="up" style={{ '--d': `${(i % 3) * 0.1}s` }}>
                <div className="collection-card__media">
                  <img src={covers[i].src} srcSet={covers[i].srcset} sizes={covers[i].srcset ? '(max-width: 767px) 92vw, 33vw' : undefined} alt={`${c.name} collection by HUDA`} loading="lazy" decoding="async" />
                  <span className="collection-card__count">{c.artwork_count} {c.artwork_count === 1 ? 'work' : 'works'}</span>
                </div>
                <div className="collection-card__body">
                  <span className="collection-card__num">№ {String(i + 1).padStart(2, '0')}</span>
                  <h2 className="h3" style={{ fontSize: 'clamp(30px,2.6vw,40px)' }}>{c.name}</h2>
                  <p>{excerpt(c.description, 160)}</p>
                  <span className="text-link">Explore <Icon name="arrow" /></span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-state"><h2>The gallery is preparing something new.</h2><p>Collections will appear here soon.</p></div>
        )}
      </section>
    </>
  );
}
