import type { AuthSession } from './types';

/**
 * Converts a base64url string to Uint8Array using standard Web APIs.
 * Runs in Edge Runtime, Node.js, and Browsers without Node Buffer.
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decrypts an AES-256-GCM encrypted session string using standard WebCrypto.
 * Runs in Edge Runtime, Node.js, and Browsers.
 */
export async function decryptSessionWebCrypto(
  cipherText: string | null | undefined,
  secret?: string
): Promise<AuthSession | null> {
  if (!cipherText || typeof cipherText !== 'string') return null;

  const parts = cipherText.split('.');
  if (parts.length !== 3) return null;

  try {
    const [ivB64, tagB64, encB64] = parts;
    const iv = base64UrlToUint8Array(ivB64);
    const tag = base64UrlToUint8Array(tagB64);
    const enc = base64UrlToUint8Array(encB64);

    if (iv.length !== 12 || tag.length !== 16) return null;

    // Web Crypto AES-GCM expects ciphertext + authentication tag concatenated
    const data = new Uint8Array(enc.length + tag.length);
    data.set(enc, 0);
    data.set(tag, enc.length);

    const seed =
      secret ||
      process.env.AUTH_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      'nova-dev-local-fallback-secret-key-32-chars!';

    const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
    const cryptoKey = await crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['decrypt']);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      cryptoKey,
      data as unknown as BufferSource
    );
    const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as unknown;

    if (!parsed || typeof parsed !== 'object') return null;
    const session = parsed as Record<string, unknown>;
    if (!session.user || typeof session.user !== 'object') return null;
    if (!session.tokens || typeof session.tokens !== 'object') return null;

    return parsed as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Determines whether a session is currently active and valid.
 * A session is valid if it has valid user/tokens and either:
 * - The access token is not expired (has time remaining)
 * - OR a refresh token is present to renew the session
 */
export function isSessionValid(session: AuthSession | null): boolean {
  if (!session || !session.user || !session.tokens) return false;
  if (!session.user.email && !session.user.id) return false;

  const { expiresAt, refreshToken } = session.tokens;

  // If there is still time on the access token, it's valid
  if (typeof expiresAt === 'number' && Date.now() < expiresAt) {
    return true;
  }

  // If the access token is expired, but we have a refresh token, the session can be renewed
  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    return true;
  }

  return false;
}
