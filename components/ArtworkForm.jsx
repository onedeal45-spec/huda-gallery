import AIcon from './AIcon';
import { CURRENCIES, STATUSES, availabilityLabel, artworkUrl, imgUrl } from '@/lib/site';

export default function ArtworkForm({ art, images = [], artCollections = [], cats, cols, csrf, defaultCurrency }) {
  const isEdit = !!art?.id;
  const v = (k, d = '') => (art && art[k] !== null && art[k] !== undefined ? art[k] : d);
  const price = art?.price !== null && art?.price !== undefined ? String(Number(art.price)) : '';
  const currency = v('currency', defaultCurrency || 'PKR');
  const year = new Date().getFullYear();

  return (
    <form className="artwork-form" method="post" action="/api/admin/artwork/" data-artwork-form="" noValidate>
      <input type="hidden" name="csrf" value={csrf} />
      {isEdit ? <input type="hidden" name="id" value={art.id} /> : null}
      <div className="alert alert--error" data-form-error="" hidden role="alert" />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <section className="card">
            <div className="card__head"><h2>Details</h2></div>
            <div className="form-grid">
              <label className="span-2" data-field="title">Artwork title <input name="title" defaultValue={v('title')} required maxLength={190} /><span className="field-error" /></label>
              <label data-field="artwork_code">Artwork ID <small>Unique, e.g. HUDA-020</small><input name="artwork_code" defaultValue={v('artwork_code')} maxLength={60} /><span className="field-error" /></label>
              <label data-field="slug">URL slug <small>Leave empty to create from the title</small><input name="slug" defaultValue={v('slug')} maxLength={200} /><span className="field-error" /></label>
              <label className="span-2" data-field="description">Description<textarea name="description" rows={6} maxLength={8000} defaultValue={v('description')} /></label>
              <label data-field="medium">Medium <small>e.g. Acrylic and gold leaf on canvas</small><input name="medium" defaultValue={v('medium')} maxLength={190} /></label>
              <label data-field="dimensions">Dimensions <small>e.g. 24 × 36 in</small><input name="dimensions" defaultValue={v('dimensions')} maxLength={120} /></label>
              <label data-field="year">Year<input name="year" type="number" min={1900} max={year + 1} defaultValue={v('year')} /><span className="field-error" /></label>
              <label data-field="category_id">Category
                <select name="category_id" defaultValue={v('category_id', '')}>
                  <option value="">— None —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="card">
            <div className="card__head"><h2>Images</h2><span className="muted" style={{ fontSize: 12.5 }}>JPG, JPEG, PNG or WEBP · max 12 MB each</span></div>
            {images.length ? (
              <>
                <p className="label" style={{ margin: '0 0 8px' }}>Current images</p>
                <div className="previews" style={{ margin: '0 0 18px' }}>
                  {images.map((img) => (
                    <div className="preview" data-existing={img.id} key={img.id}>
                      {img.is_main ? <span className="preview__main">Main</span> : null}
                      <img src={imgUrl(img, 'sm')} alt="" />
                      <div className="preview__tools">
                        <label title="Use as main image"><input type="radio" name="main_choice" value={`existing:${img.id}`} defaultChecked={img.is_main} /> Main</label>
                        <label title="Remove this image when saving"><input type="checkbox" name="remove_images" value={img.id} data-remove-existing="" /> Remove</label>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            <div className="dropzone" data-dropzone="">
              <AIcon name="upload" />
              <strong>{images.length ? 'Add or replace images' : 'Drop the main image and any additional images here'}</strong>
              <span className="muted">or click to choose files — the first new image becomes the main image{images.length ? ' if you select it below' : ''}.</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple data-file-input="" aria-label="Choose images" />
            </div>
            <div className="previews" data-previews="" />
            <div className="field-error" data-field-error="images" />
            <div data-progress="" hidden><div className="progress"><i /></div><div className="upload-status" aria-live="polite" /></div>
          </section>
        </div>

        <div>
          <section className="card">
            <div className="card__head"><h2>Price &amp; status</h2></div>
            <div className="form-grid">
              <label data-field="price">Price <small>Empty = “Price on request”</small><input name="price" type="number" min={0} step="0.01" defaultValue={price} /><span className="field-error" /></label>
              <label data-field="currency">Currency<select name="currency" defaultValue={currency}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="span-2" data-field="availability">Availability
                <select name="availability" defaultValue={v('availability', 'available')}>{STATUSES.map((x) => <option key={x} value={x}>{availabilityLabel(x)}</option>)}</select>
                <small>Hidden works are not shown on the website.</small>
              </label>
              <label className="switch span-2"><input type="checkbox" name="is_featured" value="1" defaultChecked={!!v('is_featured', false)} /><i />Featured on the home page</label>
              <label className="switch span-2"><input type="checkbox" name="is_new" value="1" defaultChecked={isEdit ? !!art.is_new : true} /><i />Show “New” badge</label>
              <label className="span-2" data-field="sort_order">Sort order <small>Lower numbers appear first</small><input name="sort_order" type="number" defaultValue={v('sort_order', 0)} /></label>
            </div>
          </section>
          <section className="card">
            <div className="card__head"><h2>Collections</h2><a className="btn btn--sm btn--ghost" href="/admin/collections/">Manage</a></div>
            {cols.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {cols.map((c) => (
                  <label className="check" key={c.id}><input type="checkbox" name="collections" value={c.id} defaultChecked={artCollections.includes(c.id)} /> {c.name}{c.is_visible ? '' : <span className="muted"> (hidden)</span>}</label>
                ))}
              </div>
            ) : <p className="muted" style={{ margin: 0 }}>No collections yet.</p>}
          </section>
        </div>
      </div>

      <div className="sticky-actions">
        <a className="btn" href="/admin/artworks/">Cancel</a>
        {isEdit ? <a className="btn" href={artworkUrl(art)} target="_blank" rel="noopener"><AIcon name="eye" />View</a> : null}
        <button className="btn btn--primary" type="submit" data-submit="">{isEdit ? 'Save Changes' : 'Publish Artwork'}</button>
      </div>
    </form>
  );
}
