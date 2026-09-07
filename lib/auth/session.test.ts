import {
  deserializeSessionCookie,
  serializeSessionCookie,
  toSessionResponse,
} from './session';
import type { AuthSession } from './types';

const sampleSession: AuthSession = {
  user: {
    id: 'user-456',
    email: 'alex@company.test',
    name: 'Alex Rivera',
    picture: 'https://example.com/avatar.jpg',
  },
  tokens: {
    accessToken: 'ya29.secret-access-token',
    refreshToken: '1//refresh-token',
    expiresAt: Date.now() + 3600_000,
    scope: 'openid email profile',
  },
  createdAt: new Date().toISOString(),
};

describe('Session Helpers', () => {
  it('serializes and deserializes session cookies', () => {
    const cookie = serializeSessionCookie(sampleSession);
    const restored = deserializeSessionCookie(cookie);
    expect(restored).toEqual(sampleSession);
  });

  it('toSessionResponse strips tokens and leaves only safe user info', () => {
    const response = toSessionResponse(sampleSession);
    expect(response.authenticated).toBe(true);
    expect(response.user).toEqual({
      id: 'user-456',
      email: 'alex@company.test',
      name: 'Alex Rivera',
      picture: 'https://example.com/avatar.jpg',
    });
    // Ensure tokens are NOT exposed
    expect((response as Record<string, unknown>).tokens).toBeUndefined();
  });

  it('toSessionResponse handles null session', () => {
    const response = toSessionResponse(null);
    expect(response).toEqual({ authenticated: false, user: null });
  });
});
