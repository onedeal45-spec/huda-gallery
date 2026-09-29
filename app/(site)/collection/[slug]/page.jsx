import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ArtworkCard from '@/components/ArtworkCard';
import { JsonLd, Paragraphs } from '@/components/Forms';
import { sql } from '@/lib/db';
import { getSettings, artworkQuery, collectionCover, excerpt, siteOrigin, absUrl } from '@/lib/site';

async function load(slug) {
  slug = String(slug || '').replace(/[^A-Za-z0-9-]/g, '');
  const [col] = slug ? await sql`SELECT * FROM collections WHERE slug = ${slug} AND is_visible = true` : [];
  return col || null;
}

export async function generateMetadata({ params }) {
  const col = await load((await params).slug);
  if (!col) return { title: 'Lost in the Gallery', robots: { index: false } };
  const s = await getSettings();
  const origin = siteOrigin(await headers());
  const cover = await collectionCover(s, col);
  return {
    title: `${col.name} — Collection`,
    description: excerpt(col.description || `The ${col.name} collection by HUDA.`, 158),
    alternates: { canonical: `${origin}/collection/${col.slug}/` },
    openGraph: { images: cover.src ? [absUrl(origin, cover.src)] : undefined },
  };
}

export default async function CollectionPage({ params }) {
  const col = await load((await params).slug);
  if (!col) notFound();
  const s = await getSettings();
  const origin = siteOrigin(await headers());
  const artworks = await artworkQuery(s, { collection: col.slug });
  const url = `${origin}/collection/${col.slug}/`;
  return (
    <>
      <JsonLd data={[
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: col.name, url, description: excerpt(col.description, 200) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
          { '@type': 'ListItem', position: 2, name: 'Collections', item: origin + '/collections/' },
          { '@type': 'ListItem', position: 3, name: col.name, item: url },
        ] },
      ]} />
      <section className="page-hero">
        <div className="container">
          <ol className="breadcrumbs" data-reveal="fade"><li><a href="/">Home</a></li><li><a href="/collections/">Collections</a></li><li aria-current="page">{col.name}</li></ol>
          <h1 className="h1 split" data-split="">{col.name}</h1>
          {col.description ? <div className="lead" data-reveal="up" style={{ '--d': '.2s' }}><Paragraphs text={col.description} /></div> : null}
          <p className="eyebrow" data-reveal="fade" style={{ marginTop: 24, '--d': '.3s' }}>{artworks.length} {artworks.length === 1 ? 'work' : 'works'}</p>
        </div>
      </section>
      <section className="gallery-results container" aria-label={`Artworks in ${col.name}`} style={{ paddingTop: 0 }}>
        {artworks.length ? (
          <div className="masonry" data-masonry="">{artworks.map((a, i) => <ArtworkCard key={a.id} a={a} s={s} index={i} />)}</div>
        ) : (
          <div className="empty-state"><h2>The gallery is preparing something new.</h2><p>Works for this collection will be hung soon.</p><a className="btn" href="/gallery/"><span className="btn__label">Explore Artwork</span></a></div>
        )}
      </section>
    </>
  );
}
