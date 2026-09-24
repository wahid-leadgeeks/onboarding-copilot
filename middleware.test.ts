import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { encryptSession } from './lib/auth/crypto';
import type { AuthSession } from './lib/auth/types';

const mockSession: AuthSession = {
  user: {
    id: 'google-user-123',
    email: 'employee@company.test',
    name: 'Employee Onboarding',
  },
  tokens: {
    accessToken: 'valid-access-token',
    expiresAt: Date.now() + 3600_000,
    scope: 'openid email profile',
  },
  createdAt: '2026-09-07T12:00:00.000Z',
};


describe('Next.js Middleware Auth Guard', () => {
  const originalEnv = process.env.AUTH_DISABLED;

  beforeEach(() => {
    delete process.env.AUTH_DISABLED;
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.AUTH_DISABLED = originalEnv;
    } else {
      delete process.env.AUTH_DISABLED;
    }
  });

  it('redirects unauthenticated page requests from / to /login', async () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('redirects unauthenticated page requests from /schedule to /login with redirect query', async () => {
    const req = new NextRequest('http://localhost:3000/schedule?tab=done');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fschedule%3Ftab%3Ddone'
    );
  });

  it('returns 401 for unauthenticated API requests', async () => {
    const req = new NextRequest('http://localhost:3000/api/schedule');
    const res = await middleware(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(body.loginUrl).toBe('/login');
  });

  it('allows unauthenticated requests to /login', async () => {
    const req = new NextRequest('http://localhost:3000/login');
    const res = await middleware(req);

    // NextResponse.next() produces an internal 200 without redirect
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows unauthenticated requests to /api/health and /api/auth/*', async () => {
    const healthReq = new NextRequest('http://localhost:3000/api/health');
    const healthRes = await middleware(healthReq);
    expect(healthRes.status).toBe(200);

    const authReq = new NextRequest('http://localhost:3000/api/auth/login');
    const authRes = await middleware(authReq);
    expect(authRes.status).toBe(200);
  });

  it('allows authenticated users to access protected pages and APIs', async () => {
    const encrypted = encryptSession(mockSession);
    const req = new NextRequest('http://localhost:3000/schedule', {
      headers: {
        cookie: `nova_session=${encrypted}`,
      },
    });
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects authenticated users away from /login to dashboard or return destination', async () => {
    const encrypted = encryptSession(mockSession);
    const req = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `nova_session=${encrypted}`,
      },
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');

    const redirectReq = new NextRequest('http://localhost:3000/login?redirect=/diary', {
      headers: {
        cookie: `nova_session=${encrypted}`,
      },
    });
    const redirectRes = await middleware(redirectReq);
    expect(redirectRes.status).toBe(307);
    expect(redirectRes.headers.get('location')).toBe('http://localhost:3000/diary');
  });

  it('allows all requests when AUTH_DISABLED is true', async () => {
    process.env.AUTH_DISABLED = 'true';
    const req = new NextRequest('http://localhost:3000/');
    const res = await middleware(req);

    expect(res.status).toBe(200);
  });
});
