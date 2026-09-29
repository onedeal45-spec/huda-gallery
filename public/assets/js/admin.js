/* HUDA — admin interactions (vanilla JS). */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var CSRF = doc.body.dataset.csrf;
  var API = doc.body.dataset.api;

  function toast(msg, type) {
    var wrap = $('.toasts');
    if (!wrap || !msg) return;
    var t = doc.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' is-error' : '');
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 400); }, type === 'error' ? 6500 : 3800);
  }
  $$('template.flash').forEach(function (t) { toast(t.content.textContent, t.dataset.type); });
  (function () {
    var q = new URLSearchParams(location.search), changed = false;
    ['ok', 'error'].forEach(function (k) { if (q.get(k)) { toast(q.get(k), k === 'error' ? 'error' : 'ok'); q.delete(k); changed = true; } });
    if (changed) history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
  })();

  /* Resize large photos in the browser before upload (Vercel accepts ~4.5 MB per request). */
  function downscale(file, maxSide, quality, keepPng) {
    return new Promise(function (resolve) {
      if (!file || !file.size || !/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return resolve(file);
      createImageBitmap(file).then(function (bmp) {
        var scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.size < 3.5 * 1024 * 1024) { if (bmp.close) bmp.close(); return resolve(file); }
        var c = doc.createElement('canvas');
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        if (bmp.close) bmp.close();
        var png = keepPng && file.type === 'image/png';
        c.toBlob(function (blob) {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, '') + (png ? '.png' : '.jpg'), { type: png ? 'image/png' : 'image/jpeg' }));
        }, png ? 'image/png' : 'image/jpeg', quality || 0.9);
      }).catch(function () { resolve(file); });
    });
  }

  function showFieldErrors(form, errors) {
    $$('[data-field]', form).forEach(function (l) { l.classList.remove('has-error'); var s = $('.field-error', l); if (s) s.textContent = ''; });
    Object.keys(errors || {}).forEach(function (k) {
      var l = $('[data-field="' + k + '"]', form);
      if (!l) return;
      l.classList.add('has-error');
      var sp = $('.field-error', l); if (sp) sp.textContent = errors[k];
    });
  }

  /* Generic admin forms (categories, collections, about, settings) */
  $$('form[data-admin-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type="submit"]', f), label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
      var fd = new FormData(f);
      var inputs = $$('input[type="file"]', f);
      Promise.all(inputs.map(function (inp) {
        if (!inp.files || !inp.files[0]) { fd.delete(inp.name); return null; }
        return downscale(inp.files[0], 2400, 0.9, true).then(function (file) { fd.set(inp.name, file, file.name); });
      })).then(function () {
        return fetch(f.action, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } });
      }).then(function (r) { return r.json().catch(function () { return { ok: false, message: r.status === 413 ? 'That image is too large. Please choose a smaller one.' : 'Unexpected server response (' + r.status + ').' }; }); })
        .then(function (d) {
          if (d.ok) { try { sessionStorage.setItem('huda-admin-toast', d.message); } catch (x) {} location.href = d.redirect || location.pathname; return; }
          if (btn) { btn.disabled = false; btn.textContent = label; }
          showFieldErrors(f, d.errors);
          toast(d.message || 'Could not save.', 'error');
        })
        .catch(function () { if (btn) { btn.disabled = false; btn.textContent = label; } toast('Network error — nothing was saved. Please try again.', 'error'); });
    });
  });

  function api(action, data) {
    var fd = new FormData();
    fd.append('action', action);
    fd.append('csrf', CSRF);
    Object.keys(data || {}).forEach(function (k) { fd.append(k, data[k]); });
    return fetch(API, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: false, message: 'Unexpected server response (' + r.status + ').' }; }); })
      .catch(function () { return { ok: false, message: 'Network error — please try again.' }; });
  }

  /* Mobile nav */
  var navBtn = $('[data-nav-toggle]');
  if (navBtn) {
    navBtn.addEventListener('click', function () {
      var open = !doc.body.classList.contains('nav-open');
      doc.body.classList.toggle('nav-open', open);
      navBtn.setAttribute('aria-expanded', String(open));
    });
    doc.addEventListener('click', function (e) {
      if (doc.body.classList.contains('nav-open') && !e.target.closest('#sidebar') && !e.target.closest('[data-nav-toggle]')) { doc.body.classList.remove('nav-open'); navBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* Filters: submit on select/checkbox change */
  $$('form[data-autosubmit]').forEach(function (f) {
    f.addEventListener('change', function (e) { if (e.target.matches('select, input[type="checkbox"]')) f.submit(); });
  });

  /* Animated statistics */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('[data-count]').forEach(function (el) {
      var to = parseInt(el.dataset.count, 10) || 0, start = performance.now(), dur = 900 + Math.min(to, 50) * 10;
      if (!to) return;
      (function frame(now) {
        var p = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * eased);
        if (p < 1) requestAnimationFrame(frame);
      })(start);
    });
  }

  /* Confirm modal */
  function confirmBox(title, text, okLabel) {
    return new Promise(function (resolve) {
      var last = doc.activeElement;
      var m = doc.createElement('div');
      m.className = 'modal';
      m.setAttribute('role', 'alertdialog');
      m.setAttribute('aria-modal', 'true');
      m.innerHTML = '<div class="modal__box"><h2></h2><p></p><div class="btn-row"><button class="btn" type="button" data-no>Cancel</button><button class="btn btn--danger" type="button" data-yes></button></div></div>';
      $('h2', m).textContent = title || 'Are you sure?';
      $('p', m).textContent = text || '';
      $('[data-yes]', m).textContent = okLabel || 'Delete permanently';
      doc.body.appendChild(m);
      var done = function (v) { m.remove(); doc.removeEventListener('keydown', key); if (last) last.focus(); resolve(v); };
      var key = function (e) { if (e.key === 'Escape') done(false); if (e.key === 'Tab') { var b = $$('button', m); if (e.shiftKey && doc.activeElement === b[0]) { e.preventDefault(); b[1].focus(); } else if (!e.shiftKey && doc.activeElement === b[1]) { e.preventDefault(); b[0].focus(); } } };
      doc.addEventListener('keydown', key);
      m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-no]')) done(false); if (e.target.closest('[data-yes]')) done(true); });
      $('[data-no]', m).focus();
    });
  }

  /* Delete buttons */
  doc.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-api-delete]');
    if (!btn) return;
    e.preventDefault();
    confirmBox(btn.dataset.confirmTitle, btn.dataset.confirm).then(function (yes) {
      if (!yes) return;
      btn.disabled = true;
      api(btn.dataset.apiDelete, { id: btn.dataset.id }).then(function (d) {
        btn.disabled = false;
        if (!d.ok) { toast(d.message, 'error'); return; }
        if (btn.dataset.redirect) { sessionStorage.setItem('huda-admin-toast', d.message); location.href = btn.dataset.redirect; return; }
        var row = btn.closest('tr');
        if (row) { row.style.transition = 'opacity .3s, transform .3s'; row.style.opacity = '0'; row.style.transform = 'translateX(12px)'; setTimeout(function () { row.remove(); }, 300); }
        toast(d.message);
      });
    });
  });
  try { var pending = sessionStorage.getItem('huda-admin-toast'); if (pending) { sessionStorage.removeItem('huda-admin-toast'); toast(pending); } } catch (e) {}

  /* Inline status / featured changes */
  doc.addEventListener('change', function (e) {
    var el = e.target.closest('[data-api-change]');
    if (!el) return;
    var value = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
    el.disabled = true;
    api(el.dataset.apiChange, { id: el.dataset.id, value: value }).then(function (d) {
      el.disabled = false;
      if (!d.ok) { toast(d.message, 'error'); if (el.type === 'checkbox') el.checked = !el.checked; return; }
      toast(d.message);
      if (typeof d.newCount === 'number') { var c = $('.sidebar .count'); if (c) { c.textContent = d.newCount; c.hidden = !d.newCount; } }
    });
  });

  /* Filterable checkbox list */
  $$('[data-filter-list]').forEach(function (input) {
    var list = $(input.dataset.filterList);
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      $$('label', list).forEach(function (l) { l.hidden = q && l.dataset.name.indexOf(q) === -1; });
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
  });

  /* ------------------------------------------------------------
   * Artwork form: drag & drop uploader with previews + progress
   * ---------------------------------------------------------- */
  var form = $('[data-artwork-form]');
  if (!form) return;

  var MAX = 12 * 1024 * 1024;
  var OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var files = [];
  var drop = $('[data-dropzone]', form);
  var input = $('[data-file-input]', form);
  var previews = $('[data-previews]', form);
  var imgError = $('[data-field-error="images"]', form);
  var hasExistingMain = !!$('input[name="main_choice"][value^="existing:"]:checked', form);

  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }
  function extOk(name) { return /\.(jpe?g|png|webp)$/i.test(name); }

  function render() {
    previews.innerHTML = '';
    var checked = $('input[name="main_choice"]:checked', form);
    files.forEach(function (f, i) {
      var card = doc.createElement('div');
      card.className = 'preview';
      var url = URL.createObjectURL(f);
      card.innerHTML = '<img alt=""><div class="preview__meta"><span></span><em></em></div>' +
        '<div class="preview__tools"><label title="Use as main image"><input type="radio" name="main_choice"> Main</label></div>' +
        '<button type="button" class="preview__remove" aria-label="Remove image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
      var img = $('img', card); img.src = url; img.onload = function () { URL.revokeObjectURL(url); };
      $('.preview__meta span', card).textContent = f.name;
      $('.preview__meta em', card).textContent = fmtSize(f.size);
      var radio = $('input', card);
      radio.value = 'new:' + i;
      if ((!hasExistingMain && !checked && i === 0) || (checked && checked.value === 'new:' + i)) radio.checked = true;
      $('.preview__remove', card).addEventListener('click', function () {
        files.splice(i, 1);
        render();
      });
      previews.appendChild(card);
    });
    imgError.textContent = '';
  }

  function add(list) {
    var rejected = [];
    Array.prototype.forEach.call(list, function (f) {
      if (OK_TYPES.indexOf(f.type) === -1 || !extOk(f.name)) { rejected.push(f.name + ' (not JPG, PNG or WEBP)'); return; }
      if (f.size > MAX) { rejected.push(f.name + ' (larger than 12 MB)'); return; }
      if (files.length >= 12) { rejected.push(f.name + ' (max 12 images per save)'); return; }
      if (files.some(function (x) { return x.name === f.name && x.size === f.size; })) return;
      files.push(f);
    });
    render();
    if (rejected.length) { imgError.textContent = 'Skipped: ' + rejected.join(', '); toast('Some files were skipped: ' + rejected.join(', '), 'error'); }
  }

  input.addEventListener('change', function () { add(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files); });

  $$('[data-remove-existing]', form).forEach(function (cb) {
    cb.addEventListener('change', function () {
      var card = cb.closest('.preview');
      card.classList.toggle('is-removed', cb.checked);
      var radio = $('input[type="radio"]', card);
      if (cb.checked && radio.checked) { radio.checked = false; var next = $('.previews input[type="radio"]:not(:disabled)', form); var alt = $$('input[name="main_choice"]', form).filter(function (r) { var c = r.closest('.preview'); return !c.classList.contains('is-removed'); })[0]; if (alt) alt.checked = true; }
      radio.disabled = cb.checked;
    });
  });

  function showErrors(errors) {
    $$('[data-field]', form).forEach(function (l) { l.classList.remove('has-error'); var s = $('.field-error', l); if (s) s.textContent = ''; });
    imgError.textContent = '';
    var first = null;
    Object.keys(errors || {}).forEach(function (k) {
      if (k === 'images') { imgError.textContent = errors[k]; first = first || drop; return; }
      var l = $('[data-field="' + k + '"]', form);
      if (!l) return;
      l.classList.add('has-error');
      var s = $('.field-error', l); if (s) s.textContent = errors[k];
      first = first || $('input, select, textarea', l);
    });
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (first.focus) first.focus({ preventScroll: true }); }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errBox = $('[data-form-error]', form);
    errBox.hidden = true;
    var title = $('input[name="title"]', form);
    var existingLeft = $$('[data-existing]', form).filter(function (c) { return !c.classList.contains('is-removed'); }).length;
    var local = {};
    if (!title.value.trim()) local.title = 'Please enter a title.';
    if (existingLeft + files.length < 1) local.images = 'Please add at least one image (the main image).';
    if (Object.keys(local).length) { showErrors(local); return; }

    var btn = $('[data-submit]', form);
    var label = btn.textContent;
    btn.disabled = true;
    var prog = $('[data-progress]', form);
    var bar = $('.progress i', prog);
    var status = $('.upload-status', prog);
    var keys = [];
    var fail = function (msg, errors) {
      btn.disabled = false; btn.textContent = label; prog.hidden = true;
      errBox.textContent = msg || 'Could not save.'; errBox.hidden = false;
      showErrors(errors || {});
      toast(msg || 'Could not save.', 'error');
    };

    // Upload each new image on its own (validated, optimised and stored by the server), then save the form.
    var chain = Promise.resolve();
    if (files.length) { prog.hidden = false; bar.style.width = '0%'; }
    files.forEach(function (f, i) {
      chain = chain.then(function () {
        btn.textContent = 'Uploading ' + (i + 1) + ' of ' + files.length + '…';
        status.textContent = 'Preparing “' + f.name + '”…';
        return downscale(f, 3000, 0.9, false).then(function (small) {
          return new Promise(function (resolve, reject) {
            var fd1 = new FormData();
            fd1.append('csrf', CSRF);
            fd1.append('image', small, f.name.replace(/\.[^.]+$/, '') + (small.type === 'image/jpeg' && !/\.jpe?g$/i.test(f.name) ? '.jpg' : f.name.slice(f.name.lastIndexOf('.'))));
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/admin/upload/');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.upload.onprogress = function (ev) {
              if (!ev.lengthComputable) return;
              var p = (i + ev.loaded / ev.total) / files.length;
              bar.style.width = Math.round(p * 100) + '%';
              status.textContent = ev.loaded < ev.total ? 'Uploading “' + f.name + '”… ' + Math.round(ev.loaded / ev.total * 100) + '%' : 'Optimising “' + f.name + '” and creating thumbnails…';
            };
            xhr.onload = function () {
              var d; try { d = JSON.parse(xhr.responseText); } catch (err) { d = { ok: false, message: xhr.status === 413 ? '“' + f.name + '” is too large to upload.' : 'The server returned an unexpected response (' + xhr.status + ').' }; }
              if (d.ok) { keys[i] = d.key; resolve(); } else reject({ message: d.message, errors: { images: d.message } });
            };
            xhr.onerror = function () { reject({ message: 'Network error while uploading “' + f.name + '”. Nothing was saved.' }); };
            xhr.send(fd1);
          });
        });
      });
    });

    chain.then(function () {
      btn.textContent = 'Saving…';
      status.textContent = 'Saving artwork…';
      var fd = new FormData(form);
      keys.forEach(function (k) { fd.append('uploaded', k); });
      return fetch(form.action, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false, message: 'Unexpected server response (' + r.status + ').' }; }); });
    }).then(function (d) {
      if (!d.ok) return fail(d.message, d.errors);
      bar.style.width = '100%'; status.textContent = 'Done.';
      try { sessionStorage.setItem('huda-admin-toast', d.message); } catch (x) {}
      location.href = d.redirect;
    }).catch(function (err) { fail(err && err.message, err && err.errors); });
  });
})();
