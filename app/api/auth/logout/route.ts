import { NextResponse } from 'next/server';
import { NOVA_SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirect') || '/settings?logout=success';

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(NOVA_SESSION_COOKIE);

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirect') || '/settings?logout=success';

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.delete(NOVA_SESSION_COOKIE);

  return response;
}
