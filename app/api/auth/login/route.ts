import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGoogleAuthUrl } from '@/lib/auth/google';
import { resolveRedirectUri } from '@/lib/auth/config';
import {
  NOVA_STATE_COOKIE,
  NOVA_RETURN_TO_COOKIE,
  STATE_COOKIE_OPTIONS,
} from '@/lib/auth/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customRedirect = url.searchParams.get('redirect_uri') || undefined;
  const returnTo =
    url.searchParams.get('redirect') || url.searchParams.get('returnTo') || '/';

  // Generate a random CSRF state token
  const state = crypto.randomBytes(24).toString('hex');

  const redirectUri = resolveRedirectUri(request, customRedirect);
  const authUrl = getGoogleAuthUrl(state, redirectUri);
  if (!authUrl) {
    return NextResponse.redirect(
      new URL('/login?error=oauth_unconfigured', request.url)
    );
  }

  const response = NextResponse.redirect(authUrl);

  // Store state in an HTTP-only temporary cookie
  response.cookies.set(NOVA_STATE_COOKIE, state, STATE_COOKIE_OPTIONS);

  // Store returnTo in a temporary cookie so callback knows where to redirect
  const safeReturnTo =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  response.cookies.set(NOVA_RETURN_TO_COOKIE, safeReturnTo, STATE_COOKIE_OPTIONS);

  return response;
}

