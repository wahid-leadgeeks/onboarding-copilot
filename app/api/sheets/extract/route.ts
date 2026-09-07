import { NextResponse } from 'next/server';
import fs from 'fs';
import {
  NOVA_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  resolveActiveSession,
  serializeSessionCookie,
} from '@/lib/auth/session';
import { extractGoogleSpreadsheet, extractContentFromWorkbookBytes } from '@/lib/sheets/extractor';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get('id') || process.env.GOOGLE_SHEETS_ID;
  const source = url.searchParams.get('source');

  // Allow explicit testing against local united file
  if (source === 'local') {
    const localPath = '/home/noah/Downloads/Onboarding Kit Final 2026 - IT Staff.xlsx';
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      const result = extractContentFromWorkbookBytes(
        new Uint8Array(buf),
        spreadsheetId || '1X5OKuWjvp6vuqtbdJoBclFrBBmYA60SSvUQfS4B5U7M',
        'United Onboarding Kit (Local Test File)'
      );
      return NextResponse.json({
        success: true,
        source: 'local_file',
        data: result,
      });
    }
  }

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEETS_ID is not configured in .env.local and no id param was provided' },
      { status: 400 }
    );
  }

  // Check user authentication
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader.split(';').map((pair) => {
      const [k, ...v] = pair.trim().split('=');
      return [k, decodeURIComponent(v.join('='))] as const;
    })
  );

  const sessionCookie = cookies.get(NOVA_SESSION_COOKIE);
  const { session, refreshed } = await resolveActiveSession(sessionCookie);

  if (!session || !session.tokens?.accessToken) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        spreadsheetId,
        loginUrl: '/api/auth/login',
        message:
          'Google OAuth authentication is required to access your Google Sheet. Please sign in with Google at /api/auth/login or on Settings.',
      },
      { status: 401 }
    );
  }

  try {
    const data = await extractGoogleSpreadsheet(spreadsheetId, {
      accessToken: session.tokens.accessToken,
    });

    const response = NextResponse.json({
      success: true,
      source: 'google_sheets_api',
      user: session.user,
      data,
    });

    if (refreshed) {
      response.cookies.set(
        NOVA_SESSION_COOKIE,
        serializeSessionCookie(session),
        SESSION_COOKIE_OPTIONS
      );
    }

    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to extract Google Sheet';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        spreadsheetId,
      },
      { status: 502 }
    );
  }
}
