import crypto from 'crypto';
import type { AuthSession } from './types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

function deriveKey(secret?: string): Buffer {
  const seed =
    secret ||
    process.env.AUTH_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'nova-dev-local-fallback-secret-key-32-chars!';
  return crypto.createHash('sha256').update(seed).digest();
}

/**
 * Encrypts an AuthSession object into a tamper-proof AES-256-GCM string.
 */
export function encryptSession(session: AuthSession, secret?: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const payload = JSON.stringify(session);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

/**
 * Decrypts and validates an AES-256-GCM encrypted session string.
 * Returns null if the string was tampered with or corrupted.
 */
export function decryptSession(cipherText: string | null | undefined, secret?: string): AuthSession | null {
  if (!cipherText || typeof cipherText !== 'string') return null;

  const parts = cipherText.split('.');
  if (parts.length !== 3) return null;

  try {
    const [ivB64, tagB64, encryptedB64] = parts;
    const key = deriveKey(secret);
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const encrypted = Buffer.from(encryptedB64, 'base64url');

    if (iv.length !== IV_LENGTH || tag.length !== 16) return null;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as unknown;

    if (!parsed || typeof parsed !== 'object') return null;
    const session = parsed as Record<string, unknown>;

    if (!session.user || typeof session.user !== 'object') return null;
    if (!session.tokens || typeof session.tokens !== 'object') return null;

    return parsed as AuthSession;
  } catch {
    return null;
  }
}
