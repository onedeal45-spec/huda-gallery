export const dynamic = 'force-dynamic';
export const metadata = { title: { default: 'HUDA Admin', template: '%s — HUDA Admin' }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Manrope:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="/assets/css/admin.css" />
      </head>
      {children}
    </html>
  );
}
