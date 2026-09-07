import { getGoogleOAuthConfig } from './config';
import type { GoogleTokens, GoogleUser } from './types';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Builds the Google OAuth consent URL.
 */
export function getGoogleAuthUrl(state: string, redirectUri?: string): string | null {
  const config = getGoogleOAuthConfig(redirectUri);
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for Google access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string
): Promise<GoogleTokens | null> {
  const config = getGoogleOAuthConfig(redirectUri);
  if (!config) return null;

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      id_token?: string;
    };

    if (!data.access_token || typeof data.access_token !== 'string') return null;

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    return {
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
      expiresAt,
      scope: typeof data.scope === 'string' ? data.scope : config.scopes.join(' '),
      idToken: typeof data.id_token === 'string' ? data.id_token : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches user profile from Google's userinfo endpoint using the access token.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUser | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!data.sub || !data.email) return null;

    return {
      id: data.sub,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture,
    };
  } catch {
    return null;
  }
}

/**
 * Refreshes an expired Google access token using the stored refresh token.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
  const config = getGoogleOAuthConfig();
  if (!config) return null;

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    if (!data.access_token || typeof data.access_token !== 'string') return null;

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    return {
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : refreshToken,
      expiresAt,
      scope: typeof data.scope === 'string' ? data.scope : config.scopes.join(' '),
    };
  } catch {
    return null;
  }
}
