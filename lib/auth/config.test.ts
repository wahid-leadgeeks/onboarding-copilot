import {
  DEFAULT_GOOGLE_REDIRECT_URI,
  GOOGLE_OAUTH_SCOPES,
  getGoogleOAuthConfig,
  isGoogleAuthConfigured,
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
});
