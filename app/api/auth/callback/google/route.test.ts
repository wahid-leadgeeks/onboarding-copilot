import { GET } from './route';
import * as googleModule from '@/lib/auth/google';
import { DEFAULT_GOOGLE_REDIRECT_URI } from '@/lib/auth/config';
import { decryptSession } from '@/lib/auth/crypto';
import {
  NOVA_RETURN_TO_COOKIE,
  NOVA_SESSION_COOKIE,
  NOVA_STATE_COOKIE,
} from '@/lib/auth/session';
import type { GoogleTokens, GoogleUser } from '@/lib/auth/types';

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

const origin = 'https://app.example.test';
// resolveRedirectUri derives this from the request URL; it must differ from the
// localhost default so that the default-URI retry path is reachable.
const resolvedRedirectUri: string = `${origin}/api/auth/callback/google`;

const tokens: GoogleTokens = {
  accessToken: 'ya29.access-token',
  refreshToken: '1//refresh-token',
  expiresAt: Date.now() + 3600_000,
  scope: 'openid email profile',
};

const user: GoogleUser = {
  id: 'google-sub-1',
  email: 'alex@company.test',
  name: 'Alex Rivera',
  picture: 'https://example.com/avatar.jpg',
};

function callbackRequest(query: string, cookies: Record<string, string> = {}) {
  const headers: Record<string, string> = {};
  const pairs = Object.entries(cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  if (pairs.length > 0) headers.cookie = pairs.join('; ');
  return new Request(`${origin}/api/auth/callback/google${query}`, { headers });
}

function validCookies(returnTo?: string) {
  const cookies: Record<string, string> = { [NOVA_STATE_COOKIE]: 'state-123' };
  if (returnTo !== undefined) cookies[NOVA_RETURN_TO_COOKIE] = returnTo;
  return cookies;
}

function expectCleared(res: Response, name: string) {
  const header = res.headers.getSetCookie().find((line) => line.startsWith(`${name}=`));
  expect(header).toBeDefined();
  expect(header).toMatch(`${name}=;`);
  expect(header).toMatch(/Expires=Thu, 01 Jan 1970/);
}

function expectLoginError(res: Response, code: string) {
  expect(res.status).toBe(307);
  const location = new URL(res.headers.get('location') as string);
  expect(location.origin).toBe(origin);
  expect(location.pathname).toBe('/login');
  expect(location.searchParams.get('error')).toBe(code);
}

describe('GET /api/auth/callback/google', () => {
  let fetchMock: jest.Mock;
  let exchangeSpy: jest.SpyInstance;
  let profileSpy: jest.SpyInstance;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env.AUTH_SECRET = 'callback-route-test-secret';

    // No network: the google module is mocked and a stray fetch fails the test below.
    fetchMock = jest.fn(async () => {
      throw new Error('network access is not allowed in tests');
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    exchangeSpy = jest.spyOn(googleModule, 'exchangeCodeForTokens').mockResolvedValue(tokens);
    profileSpy = jest.spyOn(googleModule, 'fetchGoogleUserProfile').mockResolvedValue(user);
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

  it('redirects to /login with the provider error and clears the state cookies', async () => {
    const res = await GET(
      callbackRequest('?error=access_denied&state=state-123', validCookies('/diary'))
    );

    expectLoginError(res, 'access_denied');
    expectCleared(res, NOVA_STATE_COOKIE);
    expectCleared(res, NOVA_RETURN_TO_COOKIE);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
    expect(exchangeSpy.mock.calls.length).toBe(0);
  });

  it('rejects a callback without a code', async () => {
    const res = await GET(callbackRequest('?state=state-123', validCookies()));

    expectLoginError(res, 'missing_code_or_state');
    expectCleared(res, NOVA_STATE_COOKIE);
    expectCleared(res, NOVA_RETURN_TO_COOKIE);
    expect(exchangeSpy.mock.calls.length).toBe(0);
  });

  it('rejects a callback without a state param', async () => {
    const res = await GET(callbackRequest('?code=auth-code', validCookies()));

    expectLoginError(res, 'missing_code_or_state');
    expect(exchangeSpy.mock.calls.length).toBe(0);
  });

  it('rejects a callback when the state cookie is missing', async () => {
    const res = await GET(callbackRequest('?code=auth-code&state=state-123'));

    expectLoginError(res, 'state_mismatch');
    expectCleared(res, NOVA_STATE_COOKIE);
    expectCleared(res, NOVA_RETURN_TO_COOKIE);
    expect(exchangeSpy.mock.calls.length).toBe(0);
    expect(profileSpy.mock.calls.length).toBe(0);
  });

  it('rejects a callback when the state does not match the cookie', async () => {
    const res = await GET(callbackRequest('?code=auth-code&state=other-state', validCookies()));

    expectLoginError(res, 'state_mismatch');
    expectCleared(res, NOVA_STATE_COOKIE);
    expectCleared(res, NOVA_RETURN_TO_COOKIE);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
    expect(exchangeSpy.mock.calls.length).toBe(0);
    expect(profileSpy.mock.calls.length).toBe(0);
  });

  it('retries the token exchange with the default redirect URI when the first attempt fails', async () => {
    exchangeSpy.mockResolvedValueOnce(null).mockResolvedValueOnce(tokens);

    const res = await GET(callbackRequest('?code=auth-code&state=state-123', validCookies('/diary')));

    expect(resolvedRedirectUri).not.toBe(DEFAULT_GOOGLE_REDIRECT_URI);
    expect(exchangeSpy.mock.calls).toEqual([
      ['auth-code', resolvedRedirectUri],
      ['auth-code', DEFAULT_GOOGLE_REDIRECT_URI],
    ]);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/diary');
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeDefined();
  });

  it('does not retry when the first token exchange succeeds', async () => {
    await GET(callbackRequest('?code=auth-code&state=state-123', validCookies()));

    expect(exchangeSpy.mock.calls).toEqual([['auth-code', resolvedRedirectUri]]);
  });

  it('fails with token_exchange_failed after both attempts fail', async () => {
    exchangeSpy.mockResolvedValue(null);

    const res = await GET(callbackRequest('?code=auth-code&state=state-123', validCookies()));

    expect(exchangeSpy.mock.calls.length).toBe(2);
    expectLoginError(res, 'token_exchange_failed');
    expectCleared(res, NOVA_STATE_COOKIE);
    expectCleared(res, NOVA_RETURN_TO_COOKIE);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
    expect(profileSpy.mock.calls.length).toBe(0);
  });

  it('fails with profile_fetch_failed when the profile cannot be fetched', async () => {
    profileSpy.mockResolvedValue(null);

    const res = await GET(callbackRequest('?code=auth-code&state=state-123', validCookies()));

    expect(profileSpy.mock.calls).toEqual([[tokens.accessToken]]);
    expectLoginError(res, 'profile_fetch_failed');
    expectCleared(res, NOVA_STATE_COOKIE);
    expectCleared(res, NOVA_RETURN_TO_COOKIE);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeUndefined();
  });

  it('on success sets a decryptable session cookie, clears state cookies and redirects to the return-to path', async () => {
    const res = await GET(callbackRequest('?code=auth-code&state=state-123', validCookies('/diary')));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(`${origin}/diary`);

    const sessionCookie = res.cookies.get(NOVA_SESSION_COOKIE);
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('lax');
    expect(sessionCookie?.path).toBe('/');
    const session = decryptSession(sessionCookie?.value);
    expect(session?.user).toEqual(user);
    expect(session?.tokens).toEqual(tokens);
    expect(typeof session?.createdAt).toBe('string');

    expectCleared(res, NOVA_STATE_COOKIE);
    expectCleared(res, NOVA_RETURN_TO_COOKIE);
  });

  it('redirects to / when no return-to cookie is present', async () => {
    const res = await GET(callbackRequest('?code=auth-code&state=state-123', validCookies()));

    expect(res.headers.get('location')).toBe(`${origin}/`);
  });

  it('ignores an off-site return-to cookie and redirects to /', async () => {
    const res = await GET(
      callbackRequest('?code=auth-code&state=state-123', validCookies('//evil.example'))
    );

    expect(res.headers.get('location')).toBe(`${origin}/`);
    expect(res.cookies.get(NOVA_SESSION_COOKIE)).toBeDefined();
  });
});
