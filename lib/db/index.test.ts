jest.mock('postgres', () => ({
  __esModule: true,
  default: jest.fn(() => ({ end: jest.fn() })),
}));

// A bare postgres mock has no `options`, which real drizzle reads at construction, so drizzle is
// stubbed too. It returns a fresh object per call so identity assertions are meaningful.
jest.mock('drizzle-orm/postgres-js', () => ({
  __esModule: true,
  drizzle: jest.fn((client: unknown) => ({ select: () => undefined, $client: client })),
}));

type EnvKey = 'DATABASE_URL' | 'VERCEL' | 'NODE_ENV';
const ENV_KEYS: EnvKey[] = ['DATABASE_URL', 'VERCEL', 'NODE_ENV'];
const env = process.env as Record<string, string | undefined>;
const g = globalThis as unknown as { _novaDb?: unknown; _novaPgClient?: unknown };

const LOCAL_URL = 'postgres://postgres@127.0.0.1:54329/fake_test_db';
const REMOTE_URL = 'postgres://user:pw@db.example.com:5432/fake_test_db';

type PostgresMock = jest.Mock<unknown, [string, Record<string, unknown>]>;

/** Fresh module registry so index.ts and the postgres mock are both brand new per call. */
function loadModules() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgresMock = require('postgres').default as PostgresMock;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./index') as typeof import('./index');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const drizzleMock = require('drizzle-orm/postgres-js').drizzle as jest.Mock<unknown, [unknown, unknown]>;
  return { mod, postgresMock, drizzleMock };
}

describe('lib/db', () => {
  const saved: Record<string, string | undefined> = {};
  let savedGlobals: { db: unknown; client: unknown };

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = env[key];
    savedGlobals = { db: g._novaDb, client: g._novaPgClient };
    delete env.DATABASE_URL;
    delete env.VERCEL;
    delete g._novaDb;
    delete g._novaPgClient;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete env[key];
      else env[key] = saved[key];
    }
    if (savedGlobals.db === undefined) delete g._novaDb;
    else g._novaDb = savedGlobals.db;
    if (savedGlobals.client === undefined) delete g._novaPgClient;
    else g._novaPgClient = savedGlobals.client;
  });

  describe('isDbConfigured', () => {
    it('is false when DATABASE_URL is unset', () => {
      const { mod } = loadModules();
      expect(mod.isDbConfigured()).toBe(false);
    });

    it('is false when DATABASE_URL is empty', () => {
      env.DATABASE_URL = '';
      const { mod } = loadModules();
      expect(mod.isDbConfigured()).toBe(false);
    });

    it('is true for a postgres:// url', () => {
      env.DATABASE_URL = LOCAL_URL;
      const { mod } = loadModules();
      expect(mod.isDbConfigured()).toBe(true);
    });

    it('is true for a postgresql:// url', () => {
      env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:54329/fake_test_db';
      const { mod } = loadModules();
      expect(mod.isDbConfigured()).toBe(true);
    });

    it('is false for other schemes', () => {
      env.DATABASE_URL = 'mysql://u@127.0.0.1/fake_test_db';
      const { mod } = loadModules();
      expect(mod.isDbConfigured()).toBe(false);
    });

    it('is false for a bare string that is not a url', () => {
      env.DATABASE_URL = 'not-a-url';
      const { mod } = loadModules();
      expect(mod.isDbConfigured()).toBe(false);
    });

    it('reads the env at call time, not at import time', () => {
      const { mod } = loadModules();
      expect(mod.isDbConfigured()).toBe(false);
      env.DATABASE_URL = LOCAL_URL;
      expect(mod.isDbConfigured()).toBe(true);
    });

    it('getDatabaseUrl returns the env value, or an empty string when unset', () => {
      const { mod } = loadModules();
      expect(mod.getDatabaseUrl()).toBe('');
      env.DATABASE_URL = LOCAL_URL;
      expect(mod.getDatabaseUrl()).toBe(LOCAL_URL);
    });
  });

  describe('getClient', () => {
    it('creates the postgres client with pool max 10 and resolved ssl outside serverless', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      const { mod, postgresMock } = loadModules();

      mod.getClient();

      expect(postgresMock.mock.calls).toHaveLength(1);
      expect(postgresMock.mock.calls[0][0]).toBe(LOCAL_URL);
      expect(postgresMock.mock.calls[0][1]).toEqual({
        max: 10,
        idle_timeout: 20,
        connect_timeout: 15,
        ssl: false,
      });
    });

    it("passes ssl 'require' for a remote url", () => {
      env.DATABASE_URL = REMOTE_URL;
      env.NODE_ENV = 'test';
      const { mod, postgresMock } = loadModules();

      mod.getClient();

      expect(postgresMock.mock.calls[0][0]).toBe(REMOTE_URL);
      expect(postgresMock.mock.calls[0][1].ssl).toBe('require');
    });

    it('caches the client on globalThis in the test env and reuses it', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      const { mod, postgresMock } = loadModules();

      const first = mod.getClient();
      const second = mod.getClient();

      expect(second).toBe(first);
      expect(g._novaPgClient).toBe(first);
      expect(postgresMock.mock.calls).toHaveLength(1);
    });

    it('reuses a client already placed on globalThis without calling postgres', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      const existing = { end: () => undefined };
      g._novaPgClient = existing as unknown;
      const { mod, postgresMock } = loadModules();

      expect(mod.getClient() as unknown).toBe(existing);
      expect(postgresMock.mock.calls).toHaveLength(0);
    });

    it('uses max 2 when VERCEL=1', () => {
      env.DATABASE_URL = REMOTE_URL;
      env.NODE_ENV = 'test';
      env.VERCEL = '1';
      const { mod, postgresMock } = loadModules();

      mod.getClient();

      expect(postgresMock.mock.calls[0][1].max).toBe(2);
    });

    it('still caches on globalThis when VERCEL=1 and NODE_ENV is not production', () => {
      env.DATABASE_URL = REMOTE_URL;
      env.NODE_ENV = 'test';
      env.VERCEL = '1';
      const { mod } = loadModules();

      const client = mod.getClient();

      expect(g._novaPgClient).toBe(client);
    });

    it('uses max 10 when VERCEL is set to something other than "1"', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      env.VERCEL = '0';
      const { mod, postgresMock } = loadModules();

      mod.getClient();

      expect(postgresMock.mock.calls[0][1].max).toBe(10);
    });

    it('uses max 2 and does not cache on globalThis when NODE_ENV=production', () => {
      env.DATABASE_URL = REMOTE_URL;
      env.NODE_ENV = 'production';
      const { mod, postgresMock } = loadModules();

      const first = mod.getClient();
      const second = mod.getClient();

      expect(postgresMock.mock.calls).toHaveLength(2);
      expect(postgresMock.mock.calls[0][1].max).toBe(2);
      expect(postgresMock.mock.calls[1][1].max).toBe(2);
      expect(second).not.toBe(first);
      expect(g._novaPgClient).toBeUndefined();
    });
  });

  describe('getDb', () => {
    it('returns the same instance on repeated calls outside production', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      const { mod, postgresMock, drizzleMock } = loadModules();

      const first = mod.getDb();
      const second = mod.getDb();

      expect(second).toBe(first);
      expect(g._novaDb).toBe(first);
      expect(postgresMock.mock.calls).toHaveLength(1);
      expect(drizzleMock.mock.calls).toHaveLength(1);
      expect(drizzleMock.mock.calls[0][0]).toBe(g._novaPgClient);
    });

    it('does not cache the db or the client on globalThis when NODE_ENV=production', () => {
      env.DATABASE_URL = REMOTE_URL;
      env.NODE_ENV = 'production';
      const { mod, postgresMock } = loadModules();

      const first = mod.getDb();
      const second = mod.getDb();

      expect(second).not.toBe(first);
      expect(g._novaDb).toBeUndefined();
      expect(g._novaPgClient).toBeUndefined();
      expect(postgresMock.mock.calls).toHaveLength(2);
    });

    it('returns a db already placed on globalThis without creating a client', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      const existing = { marker: 'existing-db' };
      g._novaDb = existing;
      const { mod, postgresMock } = loadModules();

      expect(mod.getDb() as unknown).toBe(existing);
      expect(postgresMock.mock.calls).toHaveLength(0);
    });
  });

  describe('db proxy', () => {
    it('does not create a client at import time', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      const { postgresMock } = loadModules();

      expect(postgresMock.mock.calls).toHaveLength(0);
    });

    it('lazily resolves the shared db instance on property access', () => {
      env.DATABASE_URL = LOCAL_URL;
      env.NODE_ENV = 'test';
      const { mod, postgresMock } = loadModules();

      const viaProxy = (mod.db as unknown as Record<string, unknown>).select;
      expect(typeof viaProxy).toBe('function');
      expect(postgresMock.mock.calls).toHaveLength(1);
      expect(g._novaDb).toBeDefined();
    });
  });
});
