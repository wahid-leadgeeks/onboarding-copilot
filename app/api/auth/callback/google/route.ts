import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, fetchGoogleUserProfile } from '@/lib/auth/google';
import {
  NOVA_SESSION_COOKIE,
  NOVA_STATE_COOKIE,
  SESSION_COOKIE_OPTIONS,
  serializeSessionCookie,
} from '@/lib/auth/session';
import type { AuthSession } from '@/lib/auth/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const redirectBase = new URL('/settings', request.url);

  // If Google returned an error (e.g. user cancelled)
  if (error) {
    redirectBase.searchParams.set('error', error);
    return NextResponse.redirect(redirectBase);
  }

  // Code and state are required
  if (!code || !state) {
    redirectBase.searchParams.set('error', 'missing_code_or_state');
    return NextResponse.redirect(redirectBase);
  }

  // Validate state from cookie for CSRF protection
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader.split(';').map((pair) => {
      const [k, ...v] = pair.trim().split('=');
      return [k, decodeURIComponent(v.join('='))] as const;
    })
  );

  const storedState = cookies.get(NOVA_STATE_COOKIE);
  if (!storedState || storedState !== state) {
    redirectBase.searchParams.set('error', 'state_mismatch');
    return NextResponse.redirect(redirectBase);
  }

  // Exchange code for tokens
  // Note: redirect_uri must match exactly what was sent in the auth request
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    redirectBase.searchParams.set('error', 'token_exchange_failed');
    return NextResponse.redirect(redirectBase);
  }

  // Fetch user profile
  const user = await fetchGoogleUserProfile(tokens.accessToken);
  if (!user) {
    redirectBase.searchParams.set('error', 'profile_fetch_failed');
    return NextResponse.redirect(redirectBase);
  }

  // Build authenticated session
  const session: AuthSession = {
    user,
    tokens,
    createdAt: new Date().toISOString(),
  };

  const encryptedSession = serializeSessionCookie(session);

  redirectBase.searchParams.set('auth', 'success');
  const response = NextResponse.redirect(redirectBase);

  // Set the secure HTTP-only session cookie
  response.cookies.set(NOVA_SESSION_COOKIE, encryptedSession, SESSION_COOKIE_OPTIONS);

  // Clear the state cookie
  response.cookies.delete(NOVA_STATE_COOKIE);

  return response;
}
