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

export function getGoogleOAuthConfig(customRedirectUri?: string): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const redirectUri =
    customRedirectUri?.trim() ||
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    DEFAULT_GOOGLE_REDIRECT_URI;

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
