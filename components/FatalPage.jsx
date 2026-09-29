export function FatalPage({ title, message }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0e0d0c', color: '#efe8dc', textAlign: 'center', padding: 24, font: '16px/1.6 system-ui, sans-serif' }}>
      <div>
        <h1 style={{ font: '400 44px/1.1 Georgia, serif', margin: '0 0 12px', letterSpacing: '.02em' }}>{title}</h1>
        <p style={{ color: '#a79f93', maxWidth: 460, margin: '0 auto' }}>{message}</p>
        <small style={{ display: 'block', marginTop: 28, letterSpacing: '.4em', color: '#b89a5e' }}>HUDA</small>
      </div>
    </main>
  );
}
