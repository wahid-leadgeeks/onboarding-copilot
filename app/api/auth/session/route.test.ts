import { GET } from './route';
import * as googleModule from '@/lib/auth/google';
import { decryptSession } from '@/lib/auth/crypto';
import { NOVA_SESSION_COOKIE, serializeSessionCookie } from '@/lib/auth/session';
import type { AuthSession, GoogleTokens } from '@/lib/auth/types';

const ENV_KEYS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'AUTH_SECRET',
  'AUTH_DISABLED',
  'VERCEL',
  'VERCEL_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
] as const;

const savedEnv: Record<string, string | undefined> = {};
const originalFetch = global.fetch;

function buildSession(tokens: Partial<GoogleTokens> = {}): AuthSession {
  return {
    user: {
      id: 'user-1',
      email: 'alex@company.test',
      name: 'Alex Rivera',
      picture: 'https://example.com/avatar.jpg',
    },
    tokens: {
      accessToken: 'ya29.old-access-token',
      refreshToken: '1//old-refresh-token',
      expiresAt: Date.now() + 3600_000,
      scope: 'openid email profile',
      ...tokens,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function sessionRequest(cookieValue?: string) {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `${NOVA_SESSION_COOKIE}=${encodeURIComponent(cookieValue)}`;
  }
  return new Request('https://app.example.test/api/auth/session', { headers });
}

describe('GET /api/auth/session', () => {
  let fetchMock: jest.Mock;
  let refreshSpy: jest.SpyInstance;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env.AUTH_SECRET = 'session-route-test-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    // No network: any accidental fetch fails the test through the call count below.
    fetchMock = jest.fn(async () => {
      throw new Error('network access is not allowed in tests');
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    refreshSpy = jest.spyOn(googleModule, 'refreshGoogleAccessToken');
  });

  afterEach(() => {
    expect(fetchMock.mock.calls.length).toBe(0);
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it('returns unauthenticated when there is no session cookie', async () => {
    const res = await GET(sessionRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ authenticated: false, user: null });
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
    expect(refreshSpy.mock.calls.length).toBe(0);
  });

  it('returns unauthenticated for a tampered or garbage cookie', async () => {
    const valid = serializeSessionCookie(buildSession());
    const tampered = `${valid.slice(0, -2)}xx`;

    const garbage = await GET(sessionRequest('not-a-session'));
    const bad = await GET(sessionRequest(tampered));

    expect(await garbage.json()).toEqual({ authenticated: false, user: null });
    expect(await bad.json()).toEqual({ authenticated: false, user: null });
  });

  it('returns the user for a valid cookie and never exposes tokens', async () => {
    const cookie = serializeSessionCookie(buildSession());

    const res = await GET(sessionRequest(cookie));

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      authenticated: true,
      user: {
        id: 'user-1',
        email: 'alex@company.test',
        name: 'Alex Rivera',
        picture: 'https://example.com/avatar.jpg',
      },
    });
    expect(text).not.toContain('ya29.old-access-token');
    expect(text).not.toContain('1//old-refresh-token');
    expect(text).not.toContain('tokens');
    expect(refreshSpy.mock.calls.length).toBe(0);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
  });

  it('returns unauthenticated for an expired session without a refresh token', async () => {
    const cookie = serializeSessionCookie(
      buildSession({ expiresAt: Date.now() - 1000, refreshToken: undefined })
    );

    const res = await GET(sessionRequest(cookie));

    expect(await res.json()).toEqual({ authenticated: false, user: null });
    expect(refreshSpy.mock.calls.length).toBe(0);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
  });

  it('refreshes an expired session and sets a new decryptable session cookie', async () => {
    const newTokens: GoogleTokens = {
      accessToken: 'ya29.new-access-token',
      refreshToken: '1//old-refresh-token',
      expiresAt: Date.now() + 3600_000,
      scope: 'openid email profile',
    };
    refreshSpy.mockResolvedValue(newTokens);
    const cookie = serializeSessionCookie(buildSession({ expiresAt: Date.now() - 1000 }));

    const res = await GET(sessionRequest(cookie));

    expect(refreshSpy.mock.calls).toEqual([['1//old-refresh-token']]);
    const text = await res.text();
    expect(JSON.parse(text).authenticated).toBe(true);
    expect(JSON.parse(text).user.email).toBe('alex@company.test');
    expect(text).not.toContain('ya29.new-access-token');

    const newCookie = res.cookies.get(NOVA_SESSION_COOKIE);
    expect(newCookie).toBeDefined();
    expect(newCookie?.value).not.toBe(cookie);
    expect(newCookie?.httpOnly).toBe(true);
    const restored = decryptSession(newCookie?.value);
    expect(restored?.tokens).toEqual(newTokens);
    expect(restored?.user.id).toBe('user-1');
  });

  it('treats a session as expired inside the 60s buffer and refreshes it', async () => {
    refreshSpy.mockResolvedValue({
      accessToken: 'ya29.new-access-token',
      expiresAt: Date.now() + 3600_000,
      scope: 'openid',
    });
    const cookie = serializeSessionCookie(buildSession({ expiresAt: Date.now() + 30_000 }));

    const res = await GET(sessionRequest(cookie));

    expect(refreshSpy.mock.calls.length).toBe(1);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeDefined();
  });

  it('returns unauthenticated and sets no cookie when the refresh fails', async () => {
    refreshSpy.mockResolvedValue(null);
    const cookie = serializeSessionCookie(buildSession({ expiresAt: Date.now() - 1000 }));

    const res = await GET(sessionRequest(cookie));

    expect(refreshSpy.mock.calls.length).toBe(1);
    expect(await res.json()).toEqual({ authenticated: false, user: null });
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
  });

  it('reports the local user when AUTH_DISABLED=true and there is no session', async () => {
    process.env.AUTH_DISABLED = 'true';

    const res = await GET(sessionRequest());

    expect(await res.json()).toEqual({
      authenticated: true,
      user: {
        id: 'leadgeeks-user',
        email: 'onboarding@leadgeeks.com',
        name: 'Leadgeeks Onboarding',
      },
    });
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
  });

  it('prefers the real session user over the AUTH_DISABLED identity', async () => {
    process.env.AUTH_DISABLED = 'true';
    const cookie = serializeSessionCookie(buildSession());

    const res = await GET(sessionRequest(cookie));

    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.id).toBe('user-1');
  });

  it('does not treat AUTH_DISABLED values other than "true" as disabled', async () => {
    process.env.AUTH_DISABLED = 'false';

    const res = await GET(sessionRequest());

    expect(await res.json()).toEqual({ authenticated: false, user: null });
  });
});
