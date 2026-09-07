import { decryptSession, encryptSession } from './crypto';
import { refreshGoogleAccessToken } from './google';
import type { AuthSession, SessionResponse } from './types';

export const NOVA_SESSION_COOKIE = 'nova_session';
export const NOVA_STATE_COOKIE = 'nova_oauth_state';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days
};

export const STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 10 * 60, // 10 minutes
};

/**
 * Serializes an AuthSession into an encrypted cookie value.
 */
export function serializeSessionCookie(session: AuthSession): string {
  return encryptSession(session);
}

/**
 * Deserializes an encrypted session cookie value into an AuthSession.
 */
export function deserializeSessionCookie(cookieValue: string | undefined | null): AuthSession | null {
  return decryptSession(cookieValue);
}

/**
 * Validates and resolves a session, refreshing the access token if expired.
 * Returns the active session and whether it was refreshed.
 */
export async function resolveActiveSession(
  cookieValue: string | undefined | null
): Promise<{ session: AuthSession | null; refreshed: boolean }> {
  const session = deserializeSessionCookie(cookieValue);
  if (!session) {
    return { session: null, refreshed: false };
  }

  // If token is still valid (with 60s buffer), return as-is
  if (Date.now() < session.tokens.expiresAt - 60_000) {
    return { session, refreshed: false };
  }

  // If token is expired but we have a refresh token, refresh it
  if (session.tokens.refreshToken) {
    const refreshedTokens = await refreshGoogleAccessToken(session.tokens.refreshToken);
    if (refreshedTokens) {
      const updatedSession: AuthSession = {
        ...session,
        tokens: refreshedTokens,
      };
      return { session: updatedSession, refreshed: true };
    }
  }

  // Token expired and could not be refreshed
  return { session: null, refreshed: false };
}

/**
 * Formats a sanitized session response for client-side consumption (never exposes tokens).
 */
export function toSessionResponse(session: AuthSession | null): SessionResponse {
  if (!session) {
    return { authenticated: false, user: null };
  }

  return {
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.picture,
    },
  };
}

/**
 * Extracts the Google OAuth access token from an incoming Request's cookies, if authenticated.
 */
export async function getSessionAccessToken(request: Request): Promise<string | undefined> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader.split(';').map((pair) => {
      const [k, ...v] = pair.trim().split('=');
      return [k, decodeURIComponent(v.join('='))] as const;
    })
  );
  const sessionCookie = cookies.get(NOVA_SESSION_COOKIE);
  if (!sessionCookie) return undefined;
  const { session } = await resolveActiveSession(sessionCookie);
  return session?.tokens?.accessToken;
}
