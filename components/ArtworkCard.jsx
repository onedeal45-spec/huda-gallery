import Icon from './Icon';
import { artworkUrl, imgUrl, imgSrcset, formatPrice, availabilityLabel, aspect } from '@/lib/site';

export default function ArtworkCard({ a, s, index = 0, sizes = '(max-width: 767px) 50vw, (max-width: 1180px) 45vw, 30vw', reveal = 'up' }) {
  const w = Number(a.width) || 0, h = Number(a.height) || 0;
  const ar = aspect(a);
  const status = a.availability;
  const price = formatPrice(a.price, a.currency, s);
  return (
    <article className="art-card" data-tilt="" data-reveal={reveal} style={{ '--d': `${((index % 3) * 0.08).toFixed(2)}s`, '--ar': ar }} data-ar={ar}>
      <a className="art-card__link" href={artworkUrl(a)} data-cursor="view" data-lightbox="gallery" data-full={imgUrl(a, 'lg')}
        data-title={a.title} data-price={price} data-w={w} data-h={h}>
        <div className="art-card__tilt">
          <div className="art-card__shadow" aria-hidden="true" />
          <div className="art-card__media">
            <img src={imgUrl(a, 'md')} srcSet={imgSrcset(a)} sizes={sizes} width={w || 800} height={h || 1000}
              loading="lazy" decoding="async" alt={`${a.title} — artwork by HUDA`} />
            {(status === 'sold' || status === 'reserved' || a.is_new) ? (
              <div className="badge">
                {status === 'sold' ? <span className="is-sold">Sold</span> : null}
                {status === 'reserved' ? <span className="is-reserved">Reserved</span> : null}
                {a.is_new && status === 'available' ? <span className="is-new">New</span> : null}
              </div>
            ) : null}
            <span className="art-card__view" aria-hidden="true">View <Icon name="arrow" /></span>
          </div>
        </div>
        <div className="art-card__info">
          <h3 className="art-card__title">{a.title}</h3>
          <div className="art-card__price">{status === 'sold' ? 'Sold' : price}</div>
          <div className="art-card__meta">
            {a.category_name ? <span>{a.category_name}</span> : null}
            <span className={`status-dot is-${status}`}>{availabilityLabel(status)}</span>
          </div>
        </div>
      </a>
    </article>
  );
}
