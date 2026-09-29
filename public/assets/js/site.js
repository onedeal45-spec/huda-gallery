/*!
 * HUDA — Visualize Your Dreams.
 * Public site interactions. Vanilla JS, no build step.
 */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };

  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var FINE = mq('(hover: hover) and (pointer: fine)');
  var DESKTOP = function () { return window.innerWidth >= 1024; };

  /* ------------------------------------------------------------------
   * Toasts
   * ---------------------------------------------------------------- */
  function toast(message, type) {
    var wrap = $('.toasts');
    if (!wrap || !message) return;
    var t = doc.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' is-error' : '');
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.textContent = message;
    wrap.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-out');
      setTimeout(function () { t.remove(); }, 450);
    }, type === 'error' ? 6000 : 4000);
  }
  window.hudaToast = toast;

  /* ------------------------------------------------------------------
   * Loader → entrance sequence
   * ---------------------------------------------------------------- */
  var shell = $('#page-shell');
  function markLoaded() {
    html.classList.add('is-loaded');
    try { sessionStorage.setItem('huda-visited', '1'); } catch (e) {}
  }
  function enterPage() {
    requestAnimationFrame(function () {
      if (shell) shell.classList.remove('is-entering');
    });
  }

  if (html.classList.contains('first-visit')) {
    var loader = $('.loader');
    var line = loader && $('.loader__line i', loader);
    var started = performance.now();
    var progress = 0.08;
    var heroImg = $('.hero img');
    var setP = function (p) { progress = Math.max(progress, p); if (line) line.parentNode.style.setProperty('--progress', progress); if (line) line.style.transform = 'scaleX(' + progress + ')'; };
    setP(0.15);
    var tick = setInterval(function () { setP(Math.min(0.85, progress + 0.07)); }, 160);
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      clearInterval(tick);
      setP(1);
      var wait = Math.max(0, 950 - (performance.now() - started));
      setTimeout(function () {
        if (loader) loader.classList.add('is-done');
        enterPage();
        setTimeout(markLoaded, 250);
        setTimeout(function () { html.classList.remove('first-visit'); }, 1200);
      }, wait);
    };
    if (heroImg && !heroImg.complete) {
      heroImg.addEventListener('load', finish, { once: true });
      heroImg.addEventListener('error', finish, { once: true });
    } else if (doc.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }
    setTimeout(finish, 2600); // never hold visitors longer than this
  } else {
    enterPage();
    requestAnimationFrame(function () { requestAnimationFrame(markLoaded); });
  }

  /* ------------------------------------------------------------------
   * Page transitions (real navigation — back/forward/direct URLs untouched)
   * ---------------------------------------------------------------- */
  window.addEventListener('pageshow', function (e) {
    if (shell) shell.classList.remove('is-leaving', 'is-entering');
    if (e.persisted) html.classList.add('is-loaded');
  });

  doc.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (/\.(jpe?g|png|webp|svg|pdf|xml|txt)$/i.test(url.pathname)) return;
    if (url.pathname.indexOf('/admin') !== -1 || url.pathname.indexOf('/api/') !== -1) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    if (REDUCE || !shell) return;
    e.preventDefault();
    closeMenu();
    shell.classList.add('is-leaving');
    setTimeout(function () { location.href = url.href; }, 380);
  });

  /* ------------------------------------------------------------------
   * Header & mobile menu
   * ---------------------------------------------------------------- */
  var header = $('#site-header');
  var lastY = window.scrollY;
  var menuBtn = $('.menu-toggle');
  var menu = $('#mobile-menu');

  function onHeaderScroll() {
    var y = window.scrollY;
    if (!header) return;
    header.classList.toggle('is-scrolled', y > 40);
    var goingDown = y > lastY + 4;
    var goingUp = y < lastY - 4;
    if (goingDown && y > 500 && !doc.body.classList.contains('menu-open')) header.classList.add('is-hidden');
    if (goingUp || y < 200) header.classList.remove('is-hidden');
    lastY = y;
  }
  function closeMenu() {
    if (!doc.body.classList.contains('menu-open')) return;
    doc.body.classList.remove('menu-open');
    if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); }
    if (menu) menu.setAttribute('aria-hidden', 'true');
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      var open = !doc.body.classList.contains('menu-open');
      doc.body.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!open));
      if (open) { header.classList.remove('is-hidden'); var first = $('a', menu); if (first) setTimeout(function () { first.focus(); }, 300); }
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && doc.body.classList.contains('menu-open')) { closeMenu(); menuBtn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) closeMenu(); });
  }

  /* ------------------------------------------------------------------
   * Split text (words) & reveal-on-scroll
   * ---------------------------------------------------------------- */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var index = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = doc.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span');
            w.className = 'w';
            var inner = doc.createElement('span');
            inner.style.setProperty('--wi', index++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
    el.classList.add('split');
  }

  var revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;

  function initReveal(root) {
    $$('[data-split]', root).forEach(splitWords);
    var els = $$('[data-reveal], .reveal-img, .split', root);
    els.forEach(function (el) {
      if (!revealIO || REDUCE) { el.classList.add('is-in'); return; }
      revealIO.observe(el);
    });
  }

  /* ------------------------------------------------------------------
   * Custom cursor (desktop only)
   * ---------------------------------------------------------------- */
  var cursor = $('.cursor');
  if (cursor && FINE && !REDUCE) {
    html.classList.add('has-cursor');
    var dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor);
    var mx = -100, my = -100, rx = -100, ry = -100, running = false;
    var loop = function () {
      rx = lerp(rx, mx, 0.2); ry = lerp(ry, my, 0.2);
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      if (Math.abs(rx - mx) + Math.abs(ry - my) > 0.1) requestAnimationFrame(loop); else running = false;
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      cursor.classList.remove('is-hidden');
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    doc.addEventListener('pointerover', function (e) {
      var t = e.target;
      var state = '';
      if (t.closest('input, textarea, select, [contenteditable]')) state = 'is-text';
      else if (t.closest('[data-cursor="hide"]') && !t.closest('button')) state = 'is-hidden';
      else if (t.closest('[data-cursor="view"]')) state = 'is-view';
      else if (t.closest('.btn, .icon-btn, button, .chip')) state = 'is-button';
      else if (t.closest('a')) state = 'is-link';
      cursor.className = 'cursor ' + state;
      if (mx < 0) cursor.classList.add('is-hidden');
    });
    doc.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
  }

  /* ------------------------------------------------------------------
   * Magnetic buttons (desktop only)
   * ---------------------------------------------------------------- */
  function initMagnetic(root) {
    if (!FINE || REDUCE) return;
    $$('[data-magnetic]', root).forEach(function (el) {
      if (el.dataset.magDone) return;
      el.dataset.magDone = '1';
      var label = $('.btn__label', el) || $('svg', el);
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      var step = function () {
        cx = lerp(cx, tx, 0.18); cy = lerp(cy, ty, 0.18);
        el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
        if (label) label.style.transform = 'translate3d(' + (cx * 0.35).toFixed(2) + 'px,' + (cy * 0.35).toFixed(2) + 'px,0)';
        if (Math.abs(cx - tx) + Math.abs(cy - ty) > 0.05) raf = requestAnimationFrame(step); else raf = 0;
      };
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = el.getBoundingClientRect();
        var strength = el.classList.contains('icon-btn') || el.classList.contains('wa-float') ? 0.4 : 0.25;
        tx = (e.clientX - (r.left + r.width / 2)) * strength;
        ty = (e.clientY - (r.top + r.height / 2)) * strength;
        if (!raf) raf = requestAnimationFrame(step);
      });
      el.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    });
  }

  /* ------------------------------------------------------------------
   * 3D tilt for artwork cards & frames (CSS 3D, restrained)
   * ---------------------------------------------------------------- */
  function initTilt(root) {
    if (!FINE || REDUCE) return;
    $$('[data-tilt], [data-tilt-frame]', root).forEach(function (card) {
      if (card.dataset.tiltDone) return;
      card.dataset.tiltDone = '1';
      var isFrame = card.hasAttribute('data-tilt-frame');
      var max = isFrame ? 3.5 : 7;
      var target = isFrame ? $('.frame', card) : card;
      var light = isFrame ? $('.frame__mat', card) : $('.art-card__media', card);
      var raf = 0, last = null;
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        last = e;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = card.getBoundingClientRect();
          var px = (last.clientX - r.left) / r.width - 0.5;
          var py = (last.clientY - r.top) / r.height - 0.5;
          card.classList.add('is-tilting');
          target.style.setProperty('--ry', (px * max).toFixed(2) + 'deg');
          target.style.setProperty('--rx', (-py * max).toFixed(2) + 'deg');
          if (light) {
            light.style.setProperty('--lx', ((px + 0.5) * 100).toFixed(1) + '%');
            light.style.setProperty('--ly', ((py + 0.5) * 100).toFixed(1) + '%');
          }
        });
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        target.style.setProperty('--rx', '0deg');
        target.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------
   * Scroll-driven effects (one rAF loop, only while needed)
   * ---------------------------------------------------------------- */
  var scrollTasks = [];
  var scrollQueued = false;
  function runScroll() {
    scrollQueued = false;
    onHeaderScroll();
    for (var i = 0; i < scrollTasks.length; i++) scrollTasks[i]();
  }
  function queueScroll() { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(runScroll); } }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);

  /* ---------- Hero: mouse parallax + cinematic scroll transition ---------- */
  var hero = $('[data-hero]');
  var heroState = { mx: 0, my: 0, tx: 0, ty: 0, visible: true, raf: 0 };
  function heroActive() { return hero && !REDUCE && DESKTOP(); }

  if (hero) {
    var heroMat = $('.frame__mat', hero);
    var heroLoop = function () {
      heroState.raf = 0;
      heroState.mx = lerp(heroState.mx, heroState.tx, 0.06);
      heroState.my = lerp(heroState.my, heroState.ty, 0.06);
      hero.style.setProperty('--mx', heroState.mx.toFixed(4));
      hero.style.setProperty('--my', heroState.my.toFixed(4));
      if (heroMat) {
        heroMat.style.setProperty('--lx', (50 + heroState.mx * 30).toFixed(1) + '%');
        heroMat.style.setProperty('--ly', (30 + heroState.my * 25).toFixed(1) + '%');
      }
      if (Math.abs(heroState.mx - heroState.tx) + Math.abs(heroState.my - heroState.ty) > 0.0005) heroState.raf = requestAnimationFrame(heroLoop);
    };
    if (FINE) {
      window.addEventListener('pointermove', function (e) {
        if (!heroActive() || !heroState.visible || e.pointerType !== 'mouse') return;
        heroState.tx = (e.clientX / window.innerWidth) * 2 - 1;
        heroState.ty = (e.clientY / window.innerHeight) * 2 - 1;
        if (!heroState.raf) heroState.raf = requestAnimationFrame(heroLoop);
      }, { passive: true });
    }
    scrollTasks.push(function () {
      if (!heroActive()) { hero.style.setProperty('--p', 0); return; }
      var r = hero.getBoundingClientRect();
      var range = hero.offsetHeight - window.innerHeight;
      var p = range > 0 ? clamp(-r.top / range, 0, 1) : 0;
      // ease-in-out for a cinematic feel
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      hero.style.setProperty('--p', eased.toFixed(4));
      heroState.visible = r.bottom > 0;
    });
  }

  /* ---------- Three.js gold dust in the hero (desktop + WebGL only) ---------- */
  function hasWebGL() {
    try { var c = doc.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  function initHeroGL() {
    var canvas = hero && $('.hero__gl', hero);
    if (!canvas || !window.HUDA_THREE || REDUCE || !FINE || !DESKTOP() || !hasWebGL()) return;
    var cores = navigator.hardwareConcurrency || 4;
    if (cores < 4 || (navigator.connection && navigator.connection.saveData)) return;

    import(window.HUDA_THREE).then(function (THREE) {
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
      camera.position.z = 12;

      // soft round sprite
      var sc = doc.createElement('canvas'); sc.width = sc.height = 64;
      var g = sc.getContext('2d'); var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,240,205,1)'); grad.addColorStop(0.35, 'rgba(230,200,140,.55)'); grad.addColorStop(1, 'rgba(230,200,140,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      var tex = new THREE.CanvasTexture(sc);

      function makeLayer(count, size, spread, opacity) {
        var pos = new Float32Array(count * 3);
        var speed = new Float32Array(count);
        for (var i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * spread;
          pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.62;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
          speed[i] = 0.2 + Math.random() * 0.8;
        }
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        var mat = new THREE.PointsMaterial({ size: size, map: tex, transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xe8cf98, sizeAttenuation: true });
        var pts = new THREE.Points(geo, mat);
        pts.userData.speed = speed;
        scene.add(pts);
        return pts;
      }
      var dust = makeLayer(520, 0.09, 30, 0.75);
      var bokeh = makeLayer(38, 0.7, 26, 0.16);

      function resize() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);

      var visible = true, rafId = 0, t0 = performance.now();
      var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !rafId) rafId = requestAnimationFrame(frame); }, { threshold: 0 });
      io.observe(hero);

      function drift(layer, dt, k) {
        var p = layer.geometry.attributes.position, s = layer.userData.speed, a = p.array;
        for (var i = 0; i < s.length; i++) {
          a[i * 3 + 1] += dt * 0.18 * s[i] * k;
          a[i * 3] += Math.sin((a[i * 3 + 1] + i) * 0.35) * dt * 0.05;
          if (a[i * 3 + 1] > 9.5) a[i * 3 + 1] = -9.5;
        }
        p.needsUpdate = true;
      }
      function frame(now) {
        rafId = 0;
        if (!visible || doc.hidden) return;
        var dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
        drift(dust, dt, 1); drift(bokeh, dt, 0.5);
        var p = parseFloat(hero.style.getPropertyValue('--p')) || 0;
        camera.position.x = lerp(camera.position.x, heroState.mx * 0.8, 0.05);
        camera.position.y = lerp(camera.position.y, -heroState.my * 0.5, 0.05);
        camera.position.z = 12 - p * 7;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(frame);
      }
      doc.addEventListener('visibilitychange', function () { if (!doc.hidden && visible && !rafId) { t0 = performance.now(); rafId = requestAnimationFrame(frame); } });
      canvas.classList.add('is-ready');
      rafId = requestAnimationFrame(frame);

      window.addEventListener('pagehide', function () {
        cancelAnimationFrame(rafId); io.disconnect();
        [dust, bokeh].forEach(function (l) { l.geometry.dispose(); l.material.dispose(); });
        tex.dispose(); renderer.dispose();
      }, { once: true });
    }).catch(function () { /* CSS-only hero remains */ });
  }

  /* ---------- Pinned horizontal collections (desktop) ---------- */
  var pin = $('[data-pin]');
  if (pin) {
    var track = $('[data-pin-track]', pin);
    var sticky = $('.collections-pin__sticky', pin);
    var overflow = 0;
    var setupPin = function () {
      var want = DESKTOP() && !REDUCE && track.children.length > 2;
      pin.classList.toggle('is-pinned', want);
      track.classList.toggle('collections-track--grid', !want);
      if (!want) { pin.style.removeProperty('--pin-h'); track.style.removeProperty('--tx'); return; }
      var left = track.getBoundingClientRect().left - pin.getBoundingClientRect().left;
      overflow = Math.max(0, track.scrollWidth + left * 2 - window.innerWidth);
      if (overflow < 40) { pin.classList.remove('is-pinned'); track.classList.add('collections-track--grid'); return; }
      pin.style.setProperty('--pin-h', (window.innerHeight + overflow * 1.1) + 'px');
      queueScroll();
    };
    scrollTasks.push(function () {
      if (!pin.classList.contains('is-pinned')) return;
      var r = pin.getBoundingClientRect();
      var range = pin.offsetHeight - window.innerHeight;
      var p = range > 0 ? clamp(-r.top / range, 0, 1) : 0;
      track.style.setProperty('--tx', (-overflow * p).toFixed(1) + 'px');
    });
    var pinTimer;
    window.addEventListener('resize', function () { clearTimeout(pinTimer); pinTimer = setTimeout(setupPin, 150); });
    window.addEventListener('load', setupPin);
    setupPin();
  }

  /* ---------- Artistic statement: words light up while scrolling ---------- */
  var statement = $('[data-statement]');
  if (statement) {
    var textEl = $('[data-statement-text]', statement);
    var words = textEl.textContent.trim().split(/\s+/);
    textEl.setAttribute('aria-label', textEl.textContent.trim());
    textEl.innerHTML = words.map(function (w, i) {
      var span = doc.createElement('span');
      span.className = 'sw' + (i >= words.length - 1 ? ' is-accent' : '');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = w;
      return span.outerHTML;
    }).join(' ');
    var spans = $$('.sw', textEl);
    scrollTasks.push(function () {
      if (REDUCE) { spans.forEach(function (s) { s.classList.add('is-lit'); }); return; }
      var r = statement.getBoundingClientRect();
      var range = statement.offsetHeight - window.innerHeight;
      var p = range > 0 ? clamp((-r.top + window.innerHeight * 0.25) / range, 0, 1) : 1;
      var lit = Math.ceil(p * 1.2 * spans.length);
      spans.forEach(function (s, i) { s.classList.toggle('is-lit', i < lit); });
    });
  }

  /* ---------- Image parallax ---------- */
  var parallaxImgs = $$('[data-parallax]');
  if (parallaxImgs.length) {
    scrollTasks.push(function () {
      if (REDUCE || !DESKTOP()) return;
      parallaxImgs.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var off = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        img.style.setProperty('--py', (off * -60 - 30).toFixed(1) + 'px');
      });
    });
  }

  /* ------------------------------------------------------------------
   * Latest works wall buttons
   * ---------------------------------------------------------------- */
  $$('[data-wall]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wall = $('[data-wall-track]');
      if (wall) wall.scrollBy({ left: parseInt(btn.dataset.wall, 10) * wall.clientWidth * 0.75, behavior: REDUCE ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------------------------------
   * Masonry (uses known aspect ratios, so no layout jumps)
   * ---------------------------------------------------------------- */
  function layoutMasonry(root) {
    $$('[data-masonry]', root).forEach(function (grid) {
      var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      if (cols < 2) { grid.classList.remove('is-masonry'); $$('.art-card', grid).forEach(function (c) { c.style.gridRowEnd = ''; }); return; }
      grid.classList.add('is-masonry');
      $$('.art-card', grid).forEach(function (c) {
        var mb = parseFloat(getComputedStyle(c).marginBottom) || 0;
        c.style.gridRowEnd = 'span ' + Math.ceil((c.offsetHeight + mb) / 8);
      });
    });
  }
  var masonryTimer;
  window.addEventListener('resize', function () { clearTimeout(masonryTimer); masonryTimer = setTimeout(function () { layoutMasonry(doc); }, 120); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { layoutMasonry(doc); });

  /* ------------------------------------------------------------------
   * Fullscreen artwork viewer (FLIP open, zoom, pan, swipe, keyboard)
   * ---------------------------------------------------------------- */
  var viewer = $('#viewer');
  var V = { items: [], index: 0, z: 1, tx: 0, ty: 0, fit: null, origin: null, lastFocus: null, pointers: {}, pinch: null, drag: null, open: false };

  function fitRect(w, h) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var padX = vw < 768 ? 12 : 90, padY = vw < 768 ? 86 : 96;
    var maxW = vw - padX * 2, maxH = vh - padY * 2;
    w = w || 1000; h = h || 1250;
    var s = Math.min(maxW / w, maxH / h);
    var fw = w * s, fh = h * s;
    return { x: (vw - fw) / 2, y: (vh - fh) / 2, w: fw, h: fh };
  }
  function applyTransform(anim) {
    var img = $('.viewer__img', viewer);
    img.classList.toggle('is-anim', !!anim);
    img.style.transform = 'translate3d(' + (V.fit.x + V.tx).toFixed(2) + 'px,' + (V.fit.y + V.ty).toFixed(2) + 'px,0) scale(' + V.z.toFixed(4) + ')';
  }
  function clampPan() {
    if (V.z <= 1) { V.tx = 0; V.ty = 0; return; }
    var w = V.fit.w * V.z, h = V.fit.h * V.z, vw = window.innerWidth, vh = window.innerHeight;
    var minX = Math.min(0, vw - w) - V.fit.x, maxX = Math.max(0, vw - w) - V.fit.x;
    var minY = Math.min(0, vh - h) - V.fit.y, maxY = Math.max(0, vh - h) - V.fit.y;
    if (w <= vw) { V.tx = (vw - w) / 2 - V.fit.x; } else V.tx = clamp(V.tx, minX, maxX);
    if (h <= vh) { V.ty = (vh - h) / 2 - V.fit.y; } else V.ty = clamp(V.ty, minY, maxY);
  }
  function zoomAt(nz, cx, cy, anim) {
    nz = clamp(nz, 1, 4);
    if (cx == null) { cx = window.innerWidth / 2; cy = window.innerHeight / 2; }
    var ux = (cx - (V.fit.x + V.tx)) / V.z, uy = (cy - (V.fit.y + V.ty)) / V.z;
    V.tx = cx - V.fit.x - ux * nz; V.ty = cy - V.fit.y - uy * nz; V.z = nz;
    clampPan(); applyTransform(anim);
  }
  function thumbImg(el) { return el && (el.querySelector('img') || null); }

  function renderItem(anim) {
    var item = V.items[V.index];
    var img = $('.viewer__img', viewer);
    V.z = 1; V.tx = 0; V.ty = 0;
    V.fit = fitRect(item.w, item.h);
    img.style.width = V.fit.w + 'px';
    img.style.height = V.fit.h + 'px';
    img.alt = item.title + ' — artwork by HUDA';
    if (img.getAttribute('src') !== item.src) img.src = item.src;
    $('.viewer__title', viewer).textContent = item.title;
    $('.viewer__meta', viewer).textContent = item.price || '';
    $('.viewer__count', viewer).textContent = V.items.length > 1 ? (V.index + 1) + ' / ' + V.items.length : '';
    var link = $('.viewer__link', viewer);
    if (item.link) { link.href = item.link; link.hidden = false; } else { link.hidden = true; }
    $$('.viewer__nav', viewer).forEach(function (b) { b.hidden = V.items.length < 2; });
    applyTransform(anim);
  }

  function openViewer(trigger) {
    if (!viewer) return;
    var group = trigger.getAttribute('data-lightbox');
    var nodes = $$('[data-lightbox="' + group + '"]').filter(function (n) { return n.offsetParent !== null || n === trigger; });
    V.items = nodes.map(function (n) {
      var isPage = /\/artwork\//.test(n.getAttribute('href') || '');
      return { el: n, src: n.getAttribute('data-full'), title: n.getAttribute('data-title') || '', price: n.getAttribute('data-price') || '', w: +n.getAttribute('data-w') || 0, h: +n.getAttribute('data-h') || 0, link: isPage ? n.href : '' };
    });
    V.index = Math.max(0, nodes.indexOf(trigger));
    V.lastFocus = doc.activeElement;
    viewer.hidden = false;
    viewer.classList.add('is-open');
    doc.body.classList.add('viewer-open');
    V.open = true;

    renderItem(false);
    var img = $('.viewer__img', viewer);
    var from = thumbImg(trigger);
    var r = from ? from.getBoundingClientRect() : null;
    if (r && r.width && !REDUCE) {
      var s = r.width / V.fit.w;
      img.classList.remove('is-anim');
      img.style.transform = 'translate3d(' + r.left + 'px,' + r.top + 'px,0) scale(' + s + ')';
      img.getBoundingClientRect();
      requestAnimationFrame(function () { applyTransform(true); });
    }
    requestAnimationFrame(function () { viewer.classList.add('is-shown'); });
    setTimeout(function () { var c = $('[data-viewer="close"]', viewer); if (c) c.focus({ preventScroll: true }); }, 50);
  }

  function closeViewer() {
    if (!V.open) return;
    V.open = false;
    var img = $('.viewer__img', viewer);
    var item = V.items[V.index];
    var to = item && thumbImg(item.el);
    var r = to ? to.getBoundingClientRect() : null;
    viewer.classList.remove('is-shown');
    if (r && r.width && r.bottom > 0 && r.top < window.innerHeight && !REDUCE) {
      V.z = 1; V.tx = 0; V.ty = 0;
      img.classList.add('is-anim');
      img.style.transform = 'translate3d(' + r.left + 'px,' + r.top + 'px,0) scale(' + (r.width / V.fit.w) + ')';
    } else {
      img.style.opacity = '0';
    }
    setTimeout(function () {
      viewer.classList.remove('is-open'); viewer.hidden = true; img.style.opacity = ''; img.removeAttribute('src');
      doc.body.classList.remove('viewer-open');
      if (doc.fullscreenElement) doc.exitFullscreen().catch(function () {});
      if (V.lastFocus && V.lastFocus.focus) V.lastFocus.focus({ preventScroll: true });
    }, REDUCE ? 0 : 560);
  }

  function step(dir) {
    if (V.items.length < 2) return;
    V.index = (V.index + dir + V.items.length) % V.items.length;
    var img = $('.viewer__img', viewer);
    img.style.opacity = '0';
    setTimeout(function () { renderItem(false); img.onload = function () { img.style.opacity = '1'; }; if (img.complete) img.style.opacity = '1'; }, 180);
  }

  if (viewer) {
    doc.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-lightbox]');
      if (!trigger || e.metaKey || e.ctrlKey || e.shiftKey) return;
      // On artwork cards, the image opens the viewer; the title/info navigates to the page.
      if (trigger.classList.contains('art-card__link') && !e.target.closest('.art-card__media')) return;
      if (!trigger.getAttribute('data-full')) return;
      e.preventDefault();
      openViewer(trigger);
    });
    viewer.addEventListener('click', function (e) {
      var b = e.target.closest('[data-viewer]');
      if (!b) { if (e.target.classList.contains('viewer__stage') && V.z === 1 && !V.moved) closeViewer(); return; }
      var a = b.getAttribute('data-viewer');
      if (a === 'close') closeViewer();
      else if (a === 'prev') step(-1);
      else if (a === 'next') step(1);
      else if (a === 'zoom-in') zoomAt(V.z * 1.6, null, null, true);
      else if (a === 'zoom-out') zoomAt(V.z / 1.6, null, null, true);
      else if (a === 'full') {
        if (doc.fullscreenElement) doc.exitFullscreen().catch(function () {});
        else if (viewer.requestFullscreen) viewer.requestFullscreen().catch(function () {});
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (!V.open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === '+' || e.key === '=') zoomAt(V.z * 1.4, null, null, true);
      else if (e.key === '-') zoomAt(V.z / 1.4, null, null, true);
      else if (e.key === 'Tab') {
        var f = $$('button:not([hidden]), a[href]:not([hidden])', viewer).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    var stage = $('.viewer__stage', viewer);
    stage.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(V.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX, e.clientY, false); }, { passive: false });
    stage.addEventListener('dblclick', function (e) { zoomAt(V.z > 1.2 ? 1 : 2.5, e.clientX, e.clientY, true); });
    stage.addEventListener('pointerdown', function (e) {
      stage.setPointerCapture(e.pointerId);
      V.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(V.pointers);
      V.moved = false;
      if (ids.length === 2) {
        var a = V.pointers[ids[0]], b = V.pointers[ids[1]];
        V.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: V.z };
        V.drag = null;
      } else {
        V.drag = { x: e.clientX, y: e.clientY, tx: V.tx, ty: V.ty, t: performance.now() };
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!V.pointers[e.pointerId]) return;
      V.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(V.pointers);
      if (V.pinch && ids.length === 2) {
        var a = V.pointers[ids[0]], b = V.pointers[ids[1]];
        zoomAt(V.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / V.pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2, false);
        V.moved = true;
        return;
      }
      if (!V.drag) return;
      var dx = e.clientX - V.drag.x, dy = e.clientY - V.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { V.moved = true; stage.classList.add('is-dragging'); }
      if (V.z > 1) { V.tx = V.drag.tx + dx; V.ty = V.drag.ty + dy; clampPan(); applyTransform(false); }
      else { V.tx = dx * 0.6; applyTransform(false); }
    });
    var endPointer = function (e) {
      delete V.pointers[e.pointerId];
      stage.classList.remove('is-dragging');
      if (Object.keys(V.pointers).length < 2) V.pinch = null;
      if (V.drag && V.z === 1) {
        var dx = e.clientX - V.drag.x;
        if (Math.abs(dx) > 70) step(dx < 0 ? 1 : -1);
        else { V.tx = 0; applyTransform(true); }
      }
      V.drag = null;
      setTimeout(function () { V.moved = false; }, 0);
    };
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    window.addEventListener('resize', function () { if (V.open) { var it = V.items[V.index]; V.fit = fitRect(it.w, it.h); var img = $('.viewer__img', viewer); img.style.width = V.fit.w + 'px'; img.style.height = V.fit.h + 'px'; V.z = 1; V.tx = 0; V.ty = 0; applyTransform(false); } });
  }

  /* ------------------------------------------------------------------
   * Artwork detail: thumbnails, inquiry panel, share, copy
   * ---------------------------------------------------------------- */
  var mainLink = $('[data-main-link]');
  $$('[data-thumb]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var img = $('[data-main-img]');
      if (!img || !mainLink) return;
      $$('[data-thumb]').forEach(function (b) { b.setAttribute('aria-current', 'false'); });
      btn.setAttribute('aria-current', 'true');
      img.style.opacity = '0';
      setTimeout(function () {
        img.srcset = btn.dataset.srcset || '';
        img.src = btn.dataset.src;
        var w = +btn.dataset.w, h = +btn.dataset.h;
        if (w && h) { $('.frame', mainLink).style.setProperty('--ar', (w / h).toFixed(4)); img.width = w; img.height = h; }
        mainLink.setAttribute('data-full', btn.dataset.src); mainLink.setAttribute('data-w', w); mainLink.setAttribute('data-h', h);
        mainLink.href = btn.dataset.src;
        img.onload = function () { img.style.opacity = '1'; };
      }, 200);
    });
  });
  var inqBtn = $('[data-inquiry-toggle]');
  if (inqBtn) {
    inqBtn.addEventListener('click', function () {
      var panel = $('#inquiry-panel');
      var open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      inqBtn.setAttribute('aria-expanded', String(open));
      if (open) { var f = $('input[name="name"]', panel); if (f) setTimeout(function () { f.focus(); }, 100); }
    });
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = doc.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
      ta.remove();
    });
  }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () { copyText(b.dataset.copy).then(function () { toast('Link copied.'); }, function () { toast('Couldn’t copy the link.', 'error'); }); });
  });
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var data = { title: b.dataset.shareTitle, url: b.dataset.shareUrl };
      if (navigator.share) navigator.share(data).catch(function () {});
      else copyText(data.url).then(function () { toast('Link copied — share it anywhere.'); });
    });
  });

  /* ------------------------------------------------------------------
   * Forms (AJAX with server-side validation as the source of truth)
   * ---------------------------------------------------------------- */

  /* Large photos are resized in the browser before upload (Vercel accepts ~4.5 MB per request). */
  function downscale(file, maxSide, quality) {
    return new Promise(function (resolve) {
      if (!file || !file.size || !/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return resolve(file);
      createImageBitmap(file).then(function (bmp) {
        var scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.size < 3.5 * 1024 * 1024) { bmp.close && bmp.close(); return resolve(file); }
        var c = doc.createElement('canvas');
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        bmp.close && bmp.close();
        c.toBlob(function (blob) {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', quality || 0.88);
      }).catch(function () { resolve(file); });
    });
  }
  window.hudaDownscale = downscale;
  function prepareFormData(form) {
    var fd = new FormData(form);
    var input = $('input[type="file"]', form);
    if (!input || !input.files || !input.files[0]) { if (input) fd.delete(input.name); return Promise.resolve(fd); }
    return downscale(input.files[0], 2400, 0.88).then(function (f) { fd.set(input.name, f, f.name); return fd; });
  }
  function setErrors(form, errors) {
    $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
    $$('[data-error]', form).forEach(function (s) { s.textContent = ''; });
    var first = null;
    Object.keys(errors || {}).forEach(function (name) {
      var slot = $('[data-error="' + name + '"]', form);
      var input = $('[name="' + name + '"]', form);
      if (slot) slot.textContent = errors[name];
      if (input) { input.closest('.field').classList.add('has-error'); input.setAttribute('aria-invalid', 'true'); first = first || input; }
    });
    if (first) first.focus();
  }
  function clientValidate(form) {
    var errors = {};
    $$('[required]', form).forEach(function (el) {
      if (!el.value.trim()) errors[el.name] = 'This field is required.';
    });
    var email = $('input[type="email"]', form);
    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value)) errors[email.name] = 'Please enter a valid email address.';
    var file = $('input[type="file"]', form);
    if (file && file.files && file.files[0]) {
      var f = file.files[0];
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) errors[file.name] = 'Please choose a JPG, PNG or WEBP image.';
      else if (f.size > 12 * 1024 * 1024) errors[file.name] = 'The image must be 12 MB or smaller.';
    }
    return errors;
  }
  $$('[data-ajax-form]').forEach(function (form) {
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('has-error')) { field.classList.remove('has-error'); var s = $('[data-error]', field); if (s) s.textContent = ''; e.target.removeAttribute('aria-invalid'); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errs = clientValidate(form);
      if (Object.keys(errs).length) { setErrors(form, errs); return; }
      var btn = $('button[type="submit"]', form);
      var label = btn && $('.btn__label', btn);
      var original = label ? label.textContent : '';
      if (btn) btn.disabled = true;
      if (label) label.textContent = 'Sending…';
      prepareFormData(form).then(function (fd) { return fetch(form.action, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }, credentials: 'same-origin' }); })
        .then(function (r) { return r.json().catch(function () { return { ok: false, message: r.status === 413 ? 'That image is too large to send. Please choose a smaller one.' : 'Unexpected response. Please try again.' }; }).then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) {
          if (d.ok) {
            form.reset();
            form.classList.add('is-sent');
            var ok = form.nextElementSibling;
            if (ok && ok.classList.contains('form-success')) ok.focus();
            toast(d.message || 'Thank you — your message has been sent.');
          } else {
            if (d.errors) setErrors(form, d.errors);
            toast(d.message || 'Something went wrong. Please try again.', 'error');
          }
        })
        .catch(function () { toast('Network error — please check your connection and try again, or use WhatsApp.', 'error'); })
        .then(function () { if (btn) btn.disabled = false; if (label) label.textContent = original; });
    });
  });

  /* ------------------------------------------------------------------
   * Gallery: live search, filters and sorting (progressive enhancement)
   * ---------------------------------------------------------------- */
  var filters = $('[data-gallery-filters]');
  if (filters) {
    var results = $('[data-gallery-results]');
    var countEl = $('[data-gallery-count]');
    var ctrl = null, timer = null;
    var toggle = $('[data-filters-toggle]', filters);
    if (toggle) toggle.addEventListener('click', function () { var o = !filters.classList.contains('is-open'); filters.classList.toggle('is-open', o); toggle.setAttribute('aria-expanded', String(o)); });

    var params = function () {
      var p = new URLSearchParams();
      new FormData(filters).forEach(function (v, k) { if (String(v).trim() !== '') p.set(k, String(v).trim()); });
      return p;
    };
    var load = function () {
      var p = params();
      var qs = p.toString();
      history.replaceState(null, '', filters.action + (qs ? '?' + qs : ''));
      if (ctrl) ctrl.abort();
      ctrl = window.AbortController ? new AbortController() : null;
      results.classList.add('is-loading');
      fetch(filters.action + (qs ? '?' + qs : ''), { headers: { 'Accept': 'text/html' }, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('bad'); return r.text(); })
        .then(function (text) {
          var docx = new DOMParser().parseFromString(text, 'text/html');
          var fresh = docx.querySelector('[data-gallery-results]');
          var freshCount = docx.querySelector('[data-gallery-count]');
          if (!fresh) throw new Error('bad');
          results.innerHTML = fresh.innerHTML;
          if (countEl && freshCount) countEl.textContent = freshCount.textContent;
          initDynamic(results);
          results.classList.remove('is-loading');
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          results.classList.remove('is-loading');
          toast('Couldn’t update the gallery. Please check your connection.', 'error');
        });
    };
    filters.addEventListener('submit', function (e) { e.preventDefault(); load(); });
    filters.addEventListener('change', function (e) { if (e.target.name !== 'q') load(); });
    filters.addEventListener('input', function (e) { if (e.target.name === 'q') { clearTimeout(timer); timer = setTimeout(load, 350); } });
    results.addEventListener('click', function (e) {
      if (e.target.closest('[data-gallery-reset]')) { e.preventDefault(); filters.reset(); $$('input[type="search"]', filters).forEach(function (i) { i.value = ''; }); $$('select', filters).forEach(function (s) { s.selectedIndex = 0; }); $$('input[type="checkbox"]', filters).forEach(function (c) { c.checked = false; }); load(); }
    });
  }

  /* ------------------------------------------------------------------
   * Boot
   * ---------------------------------------------------------------- */
  function initDynamic(root) {
    initReveal(root);
    initTilt(root);
    initMagnetic(root);
    layoutMasonry(root);
  }

  doc.addEventListener('error', function (e) {
    var img = e.target;
    if (img && img.tagName === 'IMG' && !img.dataset.fallback && img.closest('.art-card, .frame, .collection-card')) {
      img.dataset.fallback = '1'; img.removeAttribute('srcset'); img.src = '/assets/img/placeholder.svg';
    }
  }, true);
  initDynamic(doc);
  $$('template.flash').forEach(function (t) { toast(t.content.textContent, t.dataset.type === 'error' ? 'error' : 'ok'); });
  runScroll();
  if (hero) {
    if ('requestIdleCallback' in window) requestIdleCallback(initHeroGL, { timeout: 2500 }); else setTimeout(initHeroGL, 1200);
  }
})();
