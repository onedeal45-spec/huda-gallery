# HUDA — Visualize Your Dreams.

Artist portfolio and artwork store with a full admin dashboard, built for **Vercel**.
Next.js 15 · Neon Postgres · Vercel Blob (images) · sharp (image optimisation).

## Deploy on Vercel (about 10 minutes)

1. **Put the code on GitHub** — create a new repository and upload everything in this folder.
2. **Import it in Vercel** — vercel.com → *Add New → Project* → pick the repository → **Deploy**.
   (The first visit will say “Almost ready” until the next two steps are done.)
3. **Add the database** — in the project: *Storage → Create Database → Neon (Serverless Postgres)* → *Connect to project*.
   This adds `DATABASE_URL` automatically. The tables are created on first use.
4. **Add image storage** — *Storage → Create → Blob* → *Connect to project*. This adds `BLOB_READ_WRITE_TOKEN`.
5. **Redeploy** — *Deployments → ⋯ → Redeploy* (so the new settings are picked up).
6. Open **`https://your-project.vercel.app/install/`**, create the admin account, and leave
   “Import the 19 starter artworks” ticked. Keep the tab open until the import finishes (about a minute).
7. Log in at **`/admin/`**. To use your own domain: *Settings → Domains*.

Both Neon and Blob have free tiers that comfortably cover a portfolio site.

Optional environment variable: `SITE_URL=https://your-domain.com` (used for canonical links and the sitemap;
detected automatically otherwise).

## Admin
| Section | What you can do |
|---|---|
| Dashboard | Totals for artworks, available, sold, reserved, featured, categories, collections, new inquiries |
| Artworks | Search, filter, change status / featured inline, edit, delete with confirmation |
| Add / Edit Artwork | Drag & drop images (main + extra), price, currency, category, collections, description, medium, dimensions, year, artwork ID, availability, featured, “New”, sort order — **Publish Artwork** makes it live instantly |
| Categories / Collections | Add, edit, delete, images/covers, order, show/hide, assign artworks |
| Inquiries | Contact, artwork and commission messages with reference images; New → Contacted → Completed → Archived; reply by email or WhatsApp |
| About HUDA | Intro, biography, philosophy, journey, interests, exhibitions, artistic statement, artist photo |
| Settings | Tagline, logo, favicon · WhatsApp, email, phone, socials · SEO title/description/share image · currency, hero artwork, footer, show sold works, maintenance mode · your login |

**WhatsApp** — every button reads the single number in *Settings → Contact & social* (default `+92 303 7649454`).

## How uploads work on Vercel
Vercel accepts about 4.5 MB per request, so large photos are resized in the browser first and each artwork image is
uploaded on its own. The server then checks it is a real JPG/PNG/WEBP, re-encodes it and stores three WebP sizes
(560 / 1100 / 1900 px) in Vercel Blob. The original file is never stored.

Commission reference images are stored under long random file names that are never shown on the public site;
the admin views them through a logged-in-only link.

## Security
Salted scrypt password hashing, database-backed sessions with 2-hour idle timeout, CSRF tokens + same-origin checks
on every form and admin action, parameterised SQL, React output escaping, login rate limiting (5 tries / 15 minutes),
inquiry rate limiting and a spam honeypot, strict image validation and re-encoding.

## Run locally
```
npm install
echo "DATABASE_URL=postgres://user:pass@localhost:5432/huda" > .env.local
npm run dev
```
Without `BLOB_READ_WRITE_TOKEN`, images are saved to `public/uploads/`.
