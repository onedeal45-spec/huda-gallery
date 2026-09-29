export default function InstallLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Manrope:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="/assets/css/admin.css" />
      </head>
      <body className="auth-page">{children}</body>
    </html>
  );
}
