import {
  DEFAULT_GOOGLE_REDIRECT_URI,
  GOOGLE_OAUTH_SCOPES,
  getGoogleOAuthConfig,
  isGoogleAuthConfigured,
  resolveRedirectUri,
} from './config';

describe('Google OAuth Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when credentials are not configured', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(isGoogleAuthConfigured()).toBe(false);
    expect(getGoogleOAuthConfig()).toBeNull();
  });

  it('defaults to port 4000 redirect URI', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    delete process.env.GOOGLE_REDIRECT_URI;

    expect(isGoogleAuthConfigured()).toBe(true);
    const config = getGoogleOAuthConfig();
    expect(config).not.toBeNull();
    expect(config?.redirectUri).toBe(DEFAULT_GOOGLE_REDIRECT_URI);
    expect(config?.redirectUri).toBe('http://localhost:4000/api/auth/callback/google');
    expect(config?.scopes).toEqual(GOOGLE_OAUTH_SCOPES);
  });

  it('respects custom redirect URI from argument or env', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    const configWithArg = getGoogleOAuthConfig('http://custom.test/callback');
    expect(configWithArg?.redirectUri).toBe('http://custom.test/callback');

    process.env.GOOGLE_REDIRECT_URI = 'http://env.test/callback';
    const configWithEnv = getGoogleOAuthConfig();
    expect(configWithEnv?.redirectUri).toBe('http://env.test/callback');
  });

  describe('resolveRedirectUri', () => {
    it('prefers custom argument', () => {
      process.env.GOOGLE_REDIRECT_URI = 'https://env.example.com/callback';
      expect(resolveRedirectUri(undefined, 'https://custom.example.com/callback')).toBe(
        'https://custom.example.com/callback'
      );
    });

    it('prefers GOOGLE_REDIRECT_URI env if present', () => {
      process.env.GOOGLE_REDIRECT_URI = 'https://env.example.com/callback';
      const req = new Request('https://req.example.com/api/auth/login');
      expect(resolveRedirectUri(req)).toBe('https://env.example.com/callback');
    });

    it('derives redirect URI dynamically from request forwarded headers', () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      const req = new Request('http://internal-cluster:3000/api/auth/login', {
        headers: {
          'x-forwarded-host': 'my-app.vercel.app',
          'x-forwarded-proto': 'https',
        },
      });
      expect(resolveRedirectUri(req)).toBe('https://my-app.vercel.app/api/auth/callback/google');
    });

    it('derives redirect URI from request URL when no forwarded headers exist', () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      const req = new Request('https://preview-deploy.vercel.app/api/auth/login');
      expect(resolveRedirectUri(req)).toBe('https://preview-deploy.vercel.app/api/auth/callback/google');
    });

    it('derives redirect URI from VERCEL_URL if no request is provided', () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      process.env.VERCEL_URL = 'my-vercel-app.vercel.app';
      expect(resolveRedirectUri()).toBe('https://my-vercel-app.vercel.app/api/auth/callback/google');
    });

    it('falls back to default localhost callback URI if nothing is specified', () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      delete process.env.VERCEL_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      expect(resolveRedirectUri()).toBe(DEFAULT_GOOGLE_REDIRECT_URI);
    });
  });
});
