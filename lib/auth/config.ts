export const DEFAULT_GOOGLE_REDIRECT_URI = 'http://localhost:4000/api/auth/callback/google';

export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
] as const;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: readonly string[];
};

/**
 * Resolves the Google OAuth redirect URI in order of priority:
 * 1. Explicit custom redirect URI
 * 2. Explicit GOOGLE_REDIRECT_URI environment variable
 * 3. Incoming HTTP Request headers (x-forwarded-host / host, x-forwarded-proto)
 * 4. Vercel deployment URL (VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL)
 * 5. Default localhost callback URL
 */
export function resolveRedirectUri(request?: Request, customRedirectUri?: string): string {
  if (customRedirectUri?.trim()) {
    return customRedirectUri.trim();
  }

  if (process.env.GOOGLE_REDIRECT_URI?.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }

  if (request) {
    try {
      const url = new URL(request.url);
      const host =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        url.host;
      const proto =
        request.headers.get('x-forwarded-proto') ||
        (url.protocol ? url.protocol.replace(':', '') : 'https');

      if (host) {
        return `${proto}://${host}/api/auth/callback/google`;
      }
    } catch {
      // Fall through on URL parsing error
    }
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const cleanUrl = vercelUrl.replace(/^https?:\/\//, '');
    return `https://${cleanUrl}/api/auth/callback/google`;
  }

  return DEFAULT_GOOGLE_REDIRECT_URI;
}

export function getGoogleOAuthConfig(customRedirectUri?: string): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const redirectUri = resolveRedirectUri(undefined, customRedirectUri);

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: GOOGLE_OAUTH_SCOPES,
  };
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
