import { GET, POST } from './route';
import { NOVA_SESSION_COOKIE } from '@/lib/auth/session';

function expectSessionCookieCleared(res: Response) {
  const header = res.headers
    .getSetCookie()
    .find((line) => line.startsWith(`${NOVA_SESSION_COOKIE}=`));
  expect(header).toBeDefined();
  expect(header).toMatch(`${NOVA_SESSION_COOKIE}=;`);
  expect(header).toMatch(/Expires=Thu, 01 Jan 1970/);
}

describe('/api/auth/logout', () => {
  it('POST clears the session cookie and returns the default redirect target', async () => {
    const res = await POST(
      new Request('https://app.example.test/api/auth/logout', {
        method: 'POST',
        headers: { cookie: `${NOVA_SESSION_COOKIE}=some-session-value` },
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, redirectTo: '/login?logout=success' });
    expectSessionCookieCleared(res);
  });

  it('POST clears the cookie even when no session cookie was sent', async () => {
    const res = await POST(
      new Request('https://app.example.test/api/auth/logout', { method: 'POST' })
    );

    expect(res.status).toBe(200);
    expectSessionCookieCleared(res);
  });

  it('GET redirects to /login?logout=success and clears the session cookie', async () => {
    const res = await GET(
      new Request('https://app.example.test/api/auth/logout', {
        headers: { cookie: `${NOVA_SESSION_COOKIE}=some-session-value` },
      })
    );

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location') as string);
    expect(location.origin).toBe('https://app.example.test');
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('logout')).toBe('success');
    expectSessionCookieCleared(res);
  });
});
