import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getDallasHost } from '@/lib/auth/dallas';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
function key() {
  // Derive an isolated encryption key from an existing server-only credential
  // when no dedicated session secret is configured. Neither leaves the server.
  const secret = process.env.HALLOWEEN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) throw Error('Configuration missing');
  return createHash('sha256').update('dallas-whip-v1:' + secret).digest();
}
function endpoint() {
  const url = new URL(process.env.HALLOWEEN_DALLAS_WHIP_URL ?? '');
  if (url.protocol !== 'https:' || !/^customer-[a-z0-9-]+\.cloudflarestream\.com$/.test(url.hostname) || !url.pathname.endsWith('/webRTC/publish') || url.port || url.username || url.password || url.search || url.hash) throw Error('Configuration missing');
  return url;
}
function seal(url: string, user: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify({ url, user, expires: Date.now() + 12 * 3600000 })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
function unseal(token: string, user: string) {
  if (token.length > 8192) throw Error();
  const bytes = Buffer.from(token, 'base64url');
  const cipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  const data = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString());
  const url = new URL(data.url);
  if (data.user !== user || data.expires < Date.now() || url.origin !== endpoint().origin) throw Error();
  return url;
}
async function authorize(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin) return null;
  return getDallasHost();
}
export async function POST(req: Request) {
  const user = await authorize(req);
  if (!user) return fail('Sign in with an authorized Dallas host account.', 403);
  if (req.headers.get('content-type')?.split(';')[0] !== 'application/sdp') return fail('Expected a camera connection request.', 415);
  // Read incrementally so an oversized request cannot allocate an unbounded body.
  const reader = req.body?.getReader();
  if (!reader) return fail('Missing connection request.', 400);
  let size = 0; const chunks: Uint8Array[] = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 65536) { await reader.cancel(); return fail('Connection request too large.', 413); } chunks.push(value); }
  const offer = Buffer.concat(chunks).toString();
  if (!offer.startsWith('v=0') || !offer.includes('m=video') || !offer.includes('m=audio')) return fail('Invalid camera connection request.', 400);
  try {
    const url = endpoint(); key();
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return fail('Cloudflare could not start the broadcast. Check the Dallas input and retry.', 502);
    const location = response.headers.get('location');
    if (!location) return fail('Cloudflare did not return a broadcast session.', 502);
    const session = new URL(location, url);
    if (session.origin !== url.origin || session.username || session.password) return fail('Unexpected broadcast session.', 502);
    const answer = await response.text();
    return Response.json({ answer, session: seal(session.href, user.id) }, { headers });
  } catch { return fail('Broadcast service unavailable. Check server configuration or try again.', 503); }
}
export async function DELETE(req: Request) {
  const user = await authorize(req);
  if (!user) return fail('Host access required.', 403);
  try {
    const token = req.headers.get('x-broadcast-session') ?? '';
    const url = unseal(token, user.id);
    const response = await fetch(url, { method: 'DELETE', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok && response.status !== 404 && response.status !== 410) return fail('Camera stopped locally; remote cleanup failed.', 502);
    return new Response(null, { status: 204, headers });
  } catch { return fail('Camera stopped locally; session cleanup unavailable.', 400); }
}
