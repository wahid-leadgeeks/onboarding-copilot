import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, fetchGoogleUserProfile } from '@/lib/auth/google';
import { DEFAULT_GOOGLE_REDIRECT_URI, resolveRedirectUri } from '@/lib/auth/config';
import {
  NOVA_SESSION_COOKIE,
  NOVA_STATE_COOKIE,
  NOVA_RETURN_TO_COOKIE,
  SESSION_COOKIE_OPTIONS,
  serializeSessionCookie,
} from '@/lib/auth/session';
import type { AuthSession } from '@/lib/auth/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader.split(';').map((pair) => {
      const [k, ...v] = pair.trim().split('=');
      return [k, decodeURIComponent(v.join('='))] as const;
    })
  );

  const storedReturnTo = cookies.get(NOVA_RETURN_TO_COOKIE) || '/';
  const targetDestination =
    storedReturnTo.startsWith('/') && !storedReturnTo.startsWith('//')
      ? storedReturnTo
      : '/';

  // Helper to return error redirect to /login
  const errorRedirect = (errorCode: string) => {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', errorCode);
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete(NOVA_STATE_COOKIE);
    res.cookies.delete(NOVA_RETURN_TO_COOKIE);
    return res;
  };

  // If Google returned an error (e.g. user cancelled)
  if (error) {
    return errorRedirect(error);
  }

  // Code and state are required
  if (!code || !state) {
    return errorRedirect('missing_code_or_state');
  }

  // Validate state from cookie for CSRF protection
  const storedState = cookies.get(NOVA_STATE_COOKIE);
  if (!storedState || storedState !== state) {
    return errorRedirect('state_mismatch');
  }

  // Exchange code for tokens
  const redirectUri = resolveRedirectUri(request);
  let tokens = await exchangeCodeForTokens(code, redirectUri);
  if (!tokens && redirectUri !== DEFAULT_GOOGLE_REDIRECT_URI) {
    tokens = await exchangeCodeForTokens(code, DEFAULT_GOOGLE_REDIRECT_URI);
  }
  if (!tokens) {
    return errorRedirect('token_exchange_failed');
  }

  // Fetch user profile
  const user = await fetchGoogleUserProfile(tokens.accessToken);
  if (!user) {
    return errorRedirect('profile_fetch_failed');
  }

  // Build authenticated session
  const session: AuthSession = {
    user,
    tokens,
    createdAt: new Date().toISOString(),
  };

  const encryptedSession = serializeSessionCookie(session);

  // Redirect to target destination (e.g. '/' dashboard or original page)
  const destinationUrl = new URL(targetDestination, request.url);
  const response = NextResponse.redirect(destinationUrl);

  // Set the secure HTTP-only session cookie
  response.cookies.set(NOVA_SESSION_COOKIE, encryptedSession, SESSION_COOKIE_OPTIONS);

  // Clear state and returnTo cookies
  response.cookies.delete(NOVA_STATE_COOKIE);
  response.cookies.delete(NOVA_RETURN_TO_COOKIE);

  return response;
}

