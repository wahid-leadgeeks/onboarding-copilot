import { decryptSession, encryptSession } from './crypto';
import type { AuthSession } from './types';

const mockSession: AuthSession = {
  user: {
    id: 'google-user-123',
    email: 'noah@company.test',
    name: 'Noah',
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

describe('Session Crypto (AES-256-GCM)', () => {
  it('encrypts and decrypts an AuthSession cleanly', () => {
    const encrypted = encryptSession(mockSession);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.split('.')).toHaveLength(3);

    const decrypted = decryptSession(encrypted);
    expect(decrypted).toEqual(mockSession);
  });

  it('fails decryption gracefully when tampered with', () => {
    const encrypted = encryptSession(mockSession);
    const parts = encrypted.split('.');
    // Tamper with the ciphertext
    const tampered = `${parts[0]}.${parts[1]}.${parts[2]}tampered`;

    expect(decryptSession(tampered)).toBeNull();
  });

  it('fails decryption with an incorrect secret', () => {
    const encrypted = encryptSession(mockSession, 'secret-a');
    expect(decryptSession(encrypted, 'secret-b')).toBeNull();
  });

  it('returns null for null, empty or invalid strings', () => {
    expect(decryptSession(null)).toBeNull();
    expect(decryptSession('')).toBeNull();
    expect(decryptSession('invalid.format')).toBeNull();
    expect(decryptSession('a.b.c')).toBeNull();
  });
});
