import 'server-only';
import { cookies } from 'next/headers';

// The PIN is a convenience lock layered on top of real authentication (the
// Supabase session). After the PIN is verified in the database, we hand the
// browser a signed, httpOnly cookie saying "unlocked until <time>" for this
// user. It can't be forged without PIN_COOKIE_SECRET, which only exists on
// the server.

const COOKIE = 'np_unlock';
export const UNLOCK_HOURS = 8;

const enc = new TextEncoder();

async function hmac(message: string): Promise<string> {
  const secret = process.env.PIN_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new Error('PIN_COOKIE_SECRET missing or too short');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Buffer.from(sig).toString('base64url');
}

export const pinLockConfigured = () => (process.env.PIN_COOKIE_SECRET?.length ?? 0) >= 32;

export async function grantUnlock(userId: string) {
  const exp = Date.now() + UNLOCK_HOURS * 3_600_000;
  const value = `${userId}.${exp}`;
  (await cookies()).set(COOKIE, `${value}.${await hmac(value)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: UNLOCK_HOURS * 3600,
  });
}

export async function revokeUnlock() {
  (await cookies()).delete(COOKIE);
}

export async function isUnlocked(userId: string): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw || !pinLockConfigured()) return false;
  const [uid, exp, sig] = raw.split('.');
  if (uid !== userId || !exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(`${uid}.${exp}`);
  // constant-time-ish comparison
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
