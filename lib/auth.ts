/**
 * Login + sessions for the Commission Calculator.
 *
 * Two kinds of accounts:
 *  - The env admin: credentials from APP_USERNAME / APP_PASSWORD in
 *    .env.local (defaults ashikur / commission123). userId is 'admin'.
 *  - Database users: created on /signup, stored in MongoDB (see
 *    lib/users.ts for password hashing). userId is their Mongo _id.
 *
 * The session cookie is HMAC-signed (no password in the cookie, no
 * server-side session store): payload is base64url("<userId>:<role>"),
 * signature is HMAC-SHA256 over the payload with a secret from
 * SESSION_SECRET (or APP_PASSWORD as a fallback). It is httpOnly and
 * valid for 7 days. This file is Edge-safe (WebCrypto only) so the
 * middleware can import it — it must NOT import node:crypto or mongoose.
 */

export const SESSION_COOKIE_NAME = 'cc_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionRole = 'admin' | 'user';

export interface SessionPayload {
  userId: string;
  role: SessionRole;
}

export function getCredentials(): { username: string; password: string } {
  return {
    username: (process.env.APP_USERNAME ?? '').trim() || 'ashikur',
    password: process.env.APP_PASSWORD || 'commission123',
  };
}

export function verifyCredentials(username: string, password: string): boolean {
  const expected = getCredentials();
  return username === expected.username && password === expected.password;
}

/** HMAC secret: SESSION_SECRET, or the admin password as a fallback. */
function getSessionSecret(): string {
  return process.env.SESSION_SECRET || getCredentials().password;
}

function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): Uint8Array<ArrayBuffer> {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = new TextEncoder().encode(getSessionSecret());
  return globalThis.crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signPayload(payload: string): Promise<string> {
  const key = await hmacKey();
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return base64urlEncode(new Uint8Array(signature));
}

/** Session token for any user (env admin or DB user). */
export async function createSessionTokenFor(payload: SessionPayload): Promise<string> {
  const encoded = base64urlEncode(new TextEncoder().encode(`${payload.userId}:${payload.role}`));
  const signature = await signPayload(encoded);
  return `${encoded}.${signature}`;
}

/** The session token for the env admin (userId 'admin', role 'admin'). */
export async function createSessionToken(): Promise<string> {
  return createSessionTokenFor({ userId: 'admin', role: 'admin' });
}

/** Verify the HMAC signature and decode the payload. Returns null when the
 *  cookie is missing, malformed or the signature does not match. This only
 *  checks the signature — callers must still load the user (lib/users.ts)
 *  to check the account is not disabled and the role is still current. */
export async function parseSessionCookie(value: string | undefined): Promise<SessionPayload | null> {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  try {
    const key = await hmacKey();
    const ok = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(signature),
      new TextEncoder().encode(payload),
    );
    if (!ok) return null;
    const decoded = new TextDecoder().decode(base64urlDecode(payload));
    const sep = decoded.lastIndexOf(':');
    if (sep === -1) return null;
    const userId = decoded.slice(0, sep);
    const role = decoded.slice(sep + 1);
    if (!userId || (role !== 'admin' && role !== 'user')) return null;
    return { userId, role: role as SessionRole };
  } catch {
    return null;
  }
}

/** Backwards-compatible helper: is this cookie a valid session at all? */
export async function isSessionCookieValid(value: string | undefined): Promise<boolean> {
  return (await parseSessionCookie(value)) !== null;
}
