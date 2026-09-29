import { redirect } from 'next/navigation';
import { currentAdmin, csrfToken } from '@/lib/auth';
import { isInstalled } from '@/lib/db';

export const metadata = { title: 'Log in' };

export default async function Login({ searchParams }) {
  if (!(await isInstalled())) redirect('/install/');
  if (await currentAdmin()) redirect('/admin/');
  const sp = await searchParams;
  const csrf = await csrfToken();
  const next = typeof sp.next === 'string' && sp.next.startsWith('/admin') ? sp.next : '/admin/';
  return (
    <body className="auth-page">
      <main className="auth-card">
        <div className="auth-brand">HUDA<span>Visualize Your Dreams.</span></div>
        <h1>Studio admin</h1>
        <p className="muted" style={{ margin: 0 }}>Sign in to manage artworks, collections and inquiries.</p>
        {sp.error ? <div className="alert alert--error" role="alert" style={{ marginTop: 18 }}>{String(sp.error).slice(0, 200)}</div> : null}
        <form method="post" action="/api/admin/login/" autoComplete="on">
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="next" value={next} />
          <label>Username or email<input name="identifier" defaultValue={typeof sp.u === 'string' ? sp.u.slice(0, 190) : ''} autoComplete="username" required autoFocus /></label>
          <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
          <button className="btn btn--primary" type="submit" style={{ minHeight: 46 }}>Log in</button>
        </form>
        <p className="muted" style={{ margin: '18px 0 0', fontSize: 12.5 }}><a href="/">← Back to the website</a></p>
      </main>
    </body>
  );
}
