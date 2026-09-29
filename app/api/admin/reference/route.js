import { sql, ensureSchema } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { readFile } from '@/lib/storage';

export const runtime = 'nodejs';

/** Streams a commission reference image to logged-in admins only. */
export async function GET(request) {
  await ensureSchema();
  if (!(await currentAdmin())) return new Response('Not found', { status: 404 });
  const id = Number(new URL(request.url).searchParams.get('id')) || 0;
  const [row] = id ? await sql`SELECT reference_image FROM inquiries WHERE id = ${id}` : [];
  const buf = row?.reference_image ? await readFile(row.reference_image) : null;
  if (!buf) return new Response('Not found', { status: 404 });
  const type = row.reference_image.endsWith('.png') ? 'image/png' : row.reference_image.endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
  return new Response(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
