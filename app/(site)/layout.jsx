import Script from 'next/script';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Icon from '@/components/Icon';
import { dbConfigured, isInstalled } from '@/lib/db';
import { getSettings, setting, tagline, waGeneral, waDisplay, socialLinks } from '@/lib/site';
import { currentAdmin, csrfToken } from '@/lib/auth';
import { FatalPage } from '@/components/FatalPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  if (!dbConfigured()) return { title: 'HUDA' };
  const s = await getSettings().catch(() => null);
  if (!s) return { title: 'HUDA' };
  return {
    title: { default: setting(s, 'seo_title', 'HUDA — ' + tagline(s)), template: '%s — HUDA' },
    description: s.seo_description,
    icons: { icon: setting(s, 'favicon', '/assets/img/favicon.svg') },
    openGraph: { siteName: 'HUDA', type: 'website', images: s.og_image ? [s.og_image] : undefined },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport = { themeColor: '#0d0c0b', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

const NAV = [
  ['home', 'Home', '/'],
  ['gallery', 'Gallery', '/gallery/'],
  ['collections', 'Collections', '/collections/'],
  ['about', 'About', '/about/'],
  ['contact', 'Contact', '/contact/'],
];

function navKey(path) {
  if (path === '/') return 'home';
  if (path.startsWith('/gallery') || path.startsWith('/artwork')) return 'gallery';
  if (path.startsWith('/collection')) return 'collections';
  if (path.startsWith('/about')) return 'about';
  if (path.startsWith('/contact')) return 'contact';
  if (path.startsWith('/commission')) return 'commission';
  return '';
}

const HEAD_SCRIPT = `(function(d){var c=d.documentElement;c.classList.remove('no-js');c.classList.add('js');
try{if(!sessionStorage.getItem('huda-visited')){c.classList.add('first-visit');}}catch(e){}
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){c.classList.add('reduce-motion');c.classList.remove('first-visit');}})(document);`;

function Shell({ children }) {
  return (
    <html lang="en" className="no-js" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Manrope:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="/assets/css/site.css" />
      </head>
      {children}
    </html>
  );
}

export default async function SiteLayout({ children }) {
  if (!dbConfigured()) {
    return <Shell><body><FatalPage title="Almost ready" message="Connect a Postgres database (Vercel → Storage → Neon) and redeploy, then open /install." /></body></Shell>;
  }
  if (!(await isInstalled())) redirect('/install');

  const s = await getSettings();
  if (s.maintenance_mode === '1' && !(await currentAdmin())) {
    return <Shell><body><FatalPage title="HUDA" message="The gallery is being rehung. Please visit again soon." /></body></Shell>;
  }
  const h = await headers();
  const path = h.get('x-pathname') || '/';
  const nav = navKey(path);
  const csrf = await csrfToken();
  const logo = s.logo;
  const social = socialLinks(s);
  const bodyClass = path === '/' ? 'page-home' : path.startsWith('/artwork/') ? 'page-artwork' : path.startsWith('/gallery') ? 'page-gallery' : '';

  return (
    <Shell>
      <body className={bodyClass} data-csrf={csrf} suppressHydrationWarning>
        <a className="skip-link" href="#main">Skip to content</a>

        <div className="loader" aria-hidden="true">
          <div className="loader__inner">
            <div className="loader__word">{'HUDA'.split('').map((ch, i) => <span key={i} style={{ '--i': i }}>{ch}</span>)}</div>
            <div className="loader__tag">{tagline(s)}</div>
            <div className="loader__line"><i /></div>
          </div>
        </div>

        <div className="cursor is-hidden" aria-hidden="true"><div className="cursor__ring"><span className="cursor__label">View</span></div><div className="cursor__dot" /></div>

        <header className="site-header" id="site-header">
          <div className="container">
            <a className="brand" href="/" aria-label="HUDA — home">
              {logo ? <img src={logo} alt="HUDA" width="160" height="44" /> : <><span className="brand__name">HUDA</span><span className="brand__tag">{tagline(s)}</span></>}
            </a>
            <nav className="nav" aria-label="Main">
              {NAV.map(([key, label, href]) => (
                <a key={key} className={'link-underline' + (nav === key ? ' is-active' : '')} href={href} aria-current={nav === key ? 'page' : undefined}>{label}</a>
              ))}
            </nav>
            <div className="header-actions">
              <a className="icon-btn" href={waGeneral(s)} target="_blank" rel="noopener" aria-label="Chat on WhatsApp" data-magnetic=""><Icon name="whatsapp" /></a>
              <a className="btn btn--sm btn--gold" href="/gallery/" data-magnetic=""><span className="btn__label">Explore Artwork</span></a>
              <button className="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu"><span /><span /></button>
            </div>
          </div>
        </header>

        <div className="mobile-menu" id="mobile-menu" aria-hidden="true">
          <nav aria-label="Mobile">
            {[...NAV, ['commission', 'Commission', '/commission/']].map(([key, label, href], i) => (
              <a key={key} style={{ '--i': i }} className={nav === key ? 'is-active' : ''} href={href}>{label}</a>
            ))}
          </nav>
          <div className="mobile-menu__foot">
            <a className="btn btn--wa" href={waGeneral(s)} target="_blank" rel="noopener"><Icon name="whatsapp" /><span className="btn__label">Chat on WhatsApp</span></a>
            <a className="btn" href="/gallery/"><span className="btn__label">Explore Artwork</span></a>
          </div>
        </div>

        <div className="page-shell is-entering" id="page-shell">
          <main id="main">{children}</main>

          <footer className="site-footer">
            <div className="container">
              <p className="footer-word" aria-hidden="true">HUDA</p>
              <div className="footer-grid">
                <div>
                  <p className="footer-tag">{tagline(s)}</p>
                  <p className="muted">{setting(s, 'footer_text', 'Calligraphy · Colour · Culture')}</p>
                  <div className="socials" style={{ marginTop: 22 }}>
                    <a className="icon-btn" href={waGeneral(s)} target="_blank" rel="noopener" aria-label="Chat on WhatsApp" data-magnetic=""><Icon name="whatsapp" /></a>
                    {social.map((x) => (
                      <a key={x.key} className="icon-btn" href={x.url} target="_blank" rel="noopener me" aria-label={`HUDA on ${x.label}`} data-magnetic=""><Icon name={x.key} /></a>
                    ))}
                  </div>
                </div>
                <div>
                  <h4>Explore</h4>
                  <ul>
                    <li><a className="link-underline" href="/">Home</a></li>
                    <li><a className="link-underline" href="/gallery/">Gallery</a></li>
                    <li><a className="link-underline" href="/collections/">Collections</a></li>
                    <li><a className="link-underline" href="/about/">About HUDA</a></li>
                  </ul>
                </div>
                <div>
                  <h4>Work with HUDA</h4>
                  <ul>
                    <li><a className="link-underline" href="/commission/">Commission Artwork</a></li>
                    <li><a className="link-underline" href="/contact/">Contact HUDA</a></li>
                    <li><a className="link-underline" href={waGeneral(s)} target="_blank" rel="noopener">Chat on WhatsApp</a></li>
                  </ul>
                </div>
                <div>
                  <h4>Contact</h4>
                  <ul>
                    {s.contact_email ? <li><a className="link-underline" href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li> : null}
                    {s.contact_phone ? <li><a className="link-underline" href={`tel:${s.contact_phone.replace(/[^\d+]/g, '')}`}>{s.contact_phone}</a></li> : null}
                    <li><a className="link-underline" href={waGeneral(s)} target="_blank" rel="noopener">WhatsApp {waDisplay(s)}</a></li>
                  </ul>
                </div>
              </div>
              <div className="footer-bottom">
                <span>© {new Date().getFullYear()} HUDA. All artworks and images are protected by copyright.</span>
                <span>{tagline(s)}</span>
              </div>
            </div>
          </footer>
        </div>

        <a className="wa-float" href={waGeneral(s)} target="_blank" rel="noopener" aria-label="Chat with HUDA on WhatsApp" data-magnetic="">
          <Icon name="whatsapp" /><span className="wa-float__tip">Chat with HUDA</span>
        </a>

        <div className="viewer" id="viewer" role="dialog" aria-modal="true" aria-label="Artwork viewer" hidden>
          <div className="viewer__bg" />
          <div className="viewer__stage" data-cursor="hide"><img className="viewer__img" alt="" /></div>
          <div className="viewer__bar viewer__top">
            <span className="viewer__count" aria-live="polite" />
            <div className="viewer__controls">
              <button className="icon-btn" type="button" data-viewer="zoom-out" aria-label="Zoom out"><Icon name="zoom-out" /></button>
              <button className="icon-btn" type="button" data-viewer="zoom-in" aria-label="Zoom in"><Icon name="zoom-in" /></button>
              <button className="icon-btn" type="button" data-viewer="full" aria-label="Toggle fullscreen"><Icon name="expand" /></button>
              <button className="icon-btn" type="button" data-viewer="close" aria-label="Close viewer"><Icon name="close" /></button>
            </div>
          </div>
          <button className="icon-btn viewer__nav viewer__prev" type="button" data-viewer="prev" aria-label="Previous artwork"><Icon name="arrow-left" /></button>
          <button className="icon-btn viewer__nav viewer__next" type="button" data-viewer="next" aria-label="Next artwork"><Icon name="arrow" /></button>
          <div className="viewer__bar viewer__bottom">
            <div><div className="viewer__title" /><div className="viewer__meta" /></div>
            <a className="btn btn--sm viewer__link" href="#"><span className="btn__label">View details</span></a>
          </div>
        </div>

        <div className="toasts" aria-live="polite" aria-atomic="false" />
        <script dangerouslySetInnerHTML={{ __html: 'window.HUDA_THREE="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";' }} />
        <Script src="/assets/js/site.js" strategy="afterInteractive" />
      </body>
    </Shell>
  );
}
