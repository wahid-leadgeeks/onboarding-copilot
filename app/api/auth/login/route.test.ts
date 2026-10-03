import { GET } from './route';
import { NOVA_RETURN_TO_COOKIE, NOVA_STATE_COOKIE } from '@/lib/auth/session';

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
const origin = 'https://app.example.test';

function loginRequest(query = '') {
  return new Request(`${origin}/api/auth/login${query}`);
}

function configureGoogle() {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
}

describe('GET /api/auth/login', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it('redirects to /login?error=oauth_unconfigured and sets no cookies when Google is not configured', async () => {
    const res = await GET(loginRequest());

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location') as string);
    expect(location.origin).toBe(origin);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('error')).toBe('oauth_unconfigured');
    expect(res.cookies.get(NOVA_STATE_COOKIE)).toBeUndefined();
    expect(res.cookies.get(NOVA_RETURN_TO_COOKIE)).toBeUndefined();
  });

  it('redirects to the Google consent screen with a state param equal to the state cookie', async () => {
    configureGoogle();

    const res = await GET(loginRequest());

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location') as string);
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('response_type')).toBe('code');

    const state = location.searchParams.get('state');
    const stateCookie = res.cookies.get(NOVA_STATE_COOKIE);
    expect(stateCookie).toBeDefined();
    expect(state).toBe(stateCookie?.value ?? null);
    expect(state).toMatch(/^[0-9a-f]{48}$/);
    expect(stateCookie?.httpOnly).toBe(true);
    expect(stateCookie?.sameSite).toBe('lax');
  });

  it('generates a fresh state for every login', async () => {
    configureGoogle();

    const first = await GET(loginRequest());
    const second = await GET(loginRequest());

    expect(first.cookies.get(NOVA_STATE_COOKIE)?.value).not.toBe(
      second.cookies.get(NOVA_STATE_COOKIE)?.value
    );
  });

  it('defaults the return-to cookie to /', async () => {
    configureGoogle();

    const res = await GET(loginRequest());

    expect(res.cookies.get(NOVA_RETURN_TO_COOKIE)?.value).toBe('/');
  });

  it('keeps a same-site return-to path from the redirect param', async () => {
    configureGoogle();

    const res = await GET(loginRequest('?redirect=%2Fdiary'));

    expect(res.cookies.get(NOVA_RETURN_TO_COOKIE)?.value).toBe('/diary');
  });

  it('keeps a same-site return-to path from the returnTo param', async () => {
    configureGoogle();

    const res = await GET(loginRequest('?returnTo=%2Fdiary'));

    expect(res.cookies.get(NOVA_RETURN_TO_COOKIE)?.value).toBe('/diary');
  });

  it('replaces a protocol-relative return-to (//evil.example) with /', async () => {
    configureGoogle();

    const res = await GET(loginRequest('?redirect=%2F%2Fevil.example'));

    expect(res.cookies.get(NOVA_RETURN_TO_COOKIE)?.value).toBe('/');
  });

  it('replaces an absolute-URL return-to with /', async () => {
    configureGoogle();

    const res = await GET(loginRequest('?redirect=https%3A%2F%2Fevil.example%2Fphish'));

    expect(res.cookies.get(NOVA_RETURN_TO_COOKIE)?.value).toBe('/');
  });
});
