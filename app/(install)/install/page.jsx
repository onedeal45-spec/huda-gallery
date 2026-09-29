import { dbConfigured, isInstalled } from '@/lib/db';
import { csrfToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Install — HUDA', robots: { index: false, follow: false } };

const SCRIPT = `
(function(){
  var f=document.getElementById('install-form'); if(!f) return;
  var err=document.getElementById('install-error'), btn=f.querySelector('button[type=submit]');
  var box=document.getElementById('install-progress'), bar=box&&box.querySelector('.progress i'), txt=box&&box.querySelector('.upload-status');
  function seed(){
    return fetch('/api/install/?step=seed',{method:'POST',headers:{'x-csrf-token':f.csrf.value,'Accept':'application/json'}})
      .then(function(r){return r.json();}).then(function(d){
        if(!d.ok) throw new Error(d.message||'Import failed');
        var done=d.total-d.remaining; bar.style.width=Math.round(done/d.total*100)+'%'; txt.textContent='Imported '+done+' of '+d.total+' artworks…';
        return d.remaining>0?seed():null;
      });
  }
  f.addEventListener('submit',function(e){
    e.preventDefault(); err.hidden=true; btn.disabled=true; btn.textContent='Installing…';
    fetch('/api/install/',{method:'POST',body:new FormData(f),headers:{'Accept':'application/json'}})
      .then(function(r){return r.json();}).then(function(d){
        if(!d.ok) throw new Error(d.message);
        if(!d.seed) return;
        f.hidden=true; box.hidden=false; return seed();
      }).then(function(){ location.href='/admin/'; })
      .catch(function(e2){ err.textContent=e2.message||'Installation failed.'; err.hidden=false; btn.disabled=false; btn.textContent='Install HUDA'; });
  });
})();`;

export default async function Install() {
  const configured = dbConfigured();
  const installed = configured && (await isInstalled());
  const csrf = await csrfToken();
  return (
    <>
        <main className="auth-card auth-card--wide">
          <div className="auth-brand">HUDA<span>Visualize Your Dreams.</span></div>
          {!configured ? (
            <>
              <h1>Connect a database</h1>
              <p className="muted">In your Vercel project open <b>Storage → Create Database → Neon (Postgres)</b> and connect it to this project, then <b>Storage → Blob</b> for images. Redeploy, and open this page again.</p>
            </>
          ) : installed ? (
            <>
              <h1>Already installed</h1>
              <p className="muted">This site is set up.</p>
              <a className="btn btn--primary" href="/admin/login/">Go to admin</a>
            </>
          ) : (
            <>
              <h1>Install</h1>
              <p className="muted">The database is connected. Create the admin account to finish setup.</p>
              {!process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL ? (
                <div className="alert alert--error">Image storage isn’t connected. In Vercel open <b>Storage → Create → Blob</b>, connect it to this project and redeploy before installing — otherwise images can’t be saved.</div>
              ) : null}
              <div className="alert alert--error" id="install-error" hidden role="alert" />
              <form id="install-form" className="form-grid" autoComplete="off">
                <input type="hidden" name="csrf" value={csrf} />
                <label>Username<input name="username" defaultValue="admin" required /></label>
                <label>Email<input type="email" name="email" required /></label>
                <label className="span-2">Password <small>(10+ characters)</small><input type="password" name="password" minLength={10} required /></label>
                <label className="check span-2"><input type="checkbox" name="seed" value="1" defaultChecked /> Import the 19 starter artworks (you can edit or delete them later)</label>
                <button className="btn btn--primary span-2" type="submit">Install HUDA</button>
              </form>
              <div id="install-progress" hidden>
                <p className="muted">Account created. Importing starter artworks — keep this tab open…</p>
                <div className="progress"><i /></div>
                <div className="upload-status" aria-live="polite">Starting…</div>
              </div>
              <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
            </>
          )}
        </main>
    </>
  );
}
