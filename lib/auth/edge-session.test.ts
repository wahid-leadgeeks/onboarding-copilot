import { decryptSessionWebCrypto, isSessionValid, base64UrlToUint8Array } from './edge-session';
import { encryptSession } from './crypto';
import type { AuthSession } from './types';

const mockSession: AuthSession = {
  user: {
    id: 'google-user-123',
    email: 'employee@company.test',
    name: 'Employee Onboarding',
    picture: 'https://lh3.googleusercontent.com/a/test',
  },
  tokens: {
    accessToken: 'mock-access-token-12345',
    refreshToken: 'mock-refresh-token-67890',
    expiresAt: Date.now() + 3600_000,
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
  },
  createdAt: '2026-09-07T12:00:00.000Z',
};

describe('Edge Session Utilities (WebCrypto AES-256-GCM)', () => {
  it('converts base64url to Uint8Array accurately', () => {
    const text = 'Hello Edge WebCrypto!';
    const b64 = Buffer.from(text).toString('base64url');
    const bytes = base64UrlToUint8Array(b64);
    const decoded = Buffer.from(bytes).toString('utf8');
    expect(decoded).toBe(text);
  });

  it('decrypts an encrypted session using WebCrypto', async () => {
    const encrypted = encryptSession(mockSession);
    const decrypted = await decryptSessionWebCrypto(encrypted);
    expect(decrypted).toEqual(mockSession);
  });

  it('returns null for tampered ciphertext', async () => {
    const encrypted = encryptSession(mockSession);
    const parts = encrypted.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2]}bad`;
    const decrypted = await decryptSessionWebCrypto(tampered);
    expect(decrypted).toBeNull();
  });

  it('returns null for mismatched secrets', async () => {
    const encrypted = encryptSession(mockSession, 'secret-alpha');
    const decrypted = await decryptSessionWebCrypto(encrypted, 'secret-beta');
    expect(decrypted).toBeNull();
  });

  it('validates active session correctly', () => {
    expect(isSessionValid(mockSession)).toBe(true);

    // Expired but has refresh token -> still valid (can refresh)
    const expiredWithRefresh: AuthSession = {
      ...mockSession,
      tokens: {
        ...mockSession.tokens,
        expiresAt: Date.now() - 10_000,
        refreshToken: 'valid-refresh-token',
      },
    };
    expect(isSessionValid(expiredWithRefresh)).toBe(true);

    // Expired and no refresh token -> invalid
    const expiredWithoutRefresh: AuthSession = {
      ...mockSession,
      tokens: {
        ...mockSession.tokens,
        expiresAt: Date.now() - 10_000,
        refreshToken: undefined,
      },
    };
    expect(isSessionValid(expiredWithoutRefresh)).toBe(false);

    // Null or empty user
    expect(isSessionValid(null)).toBe(false);
    expect(
      isSessionValid({
        ...mockSession,
        user: { id: '', email: '', name: '' },
      })
    ).toBe(false);
  });
});
