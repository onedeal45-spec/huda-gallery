export const metadata = { title: 'Lost in the Gallery', robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <section className="lost">
      <div>
        <div className="lost__num" aria-hidden="true">404</div>
        <h1 className="split" data-split="">Lost in the <em>Gallery</em></h1>
        <p data-reveal="up" style={{ '--d': '.2s' }}>The room you were looking for has been moved or never existed.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', '--d': '.3s' }} data-reveal="up">
          <a className="btn btn--solid" href="/" data-magnetic=""><span className="btn__label">Return Home</span></a>
          <a className="btn" href="/gallery/" data-magnetic=""><span className="btn__label">Explore Artwork</span></a>
        </div>
      </div>
    </section>
  );
}
