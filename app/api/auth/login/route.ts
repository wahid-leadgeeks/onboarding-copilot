import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGoogleAuthUrl } from '@/lib/auth/google';
import { NOVA_STATE_COOKIE, STATE_COOKIE_OPTIONS } from '@/lib/auth/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customRedirect = url.searchParams.get('redirect_uri') || undefined;

  // Generate a random CSRF state token
  const state = crypto.randomBytes(24).toString('hex');

  const authUrl = getGoogleAuthUrl(state, customRedirect);
  if (!authUrl) {
    return NextResponse.redirect(new URL('/settings?error=oauth_unconfigured', request.url));
  }

  const response = NextResponse.redirect(authUrl);

  // Store state in an HTTP-only temporary cookie
  response.cookies.set(NOVA_STATE_COOKIE, state, STATE_COOKIE_OPTIONS);

  return response;
}
