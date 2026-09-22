import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type NovaDatabase = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  // eslint-disable-next-line no-var
  var _novaDb: NovaDatabase | undefined;
  // eslint-disable-next-line no-var
  var _novaPgClient: postgres.Sql | undefined;
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || '';
}

export function isDbConfigured(): boolean {
  const url = getDatabaseUrl();
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

export function getClient(): postgres.Sql {
  if (globalThis._novaPgClient) {
    return globalThis._novaPgClient;
  }

  const connectionString = getDatabaseUrl();
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

  const client = postgres(connectionString, {
    max: isServerless ? 2 : 10,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: connectionString.includes('sslmode=disable')
      ? false
      : connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : 'require',
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis._novaPgClient = client;
  }

  return client;
}

export function getDb(): NovaDatabase {
  if (globalThis._novaDb) {
    return globalThis._novaDb;
  }

  const client = getClient();
  const db = drizzle(client, { schema });

  if (process.env.NODE_ENV !== 'production') {
    globalThis._novaDb = db;
  }

  return db;
}

export const db = new Proxy({} as NovaDatabase, {
  get(_target, prop, receiver) {
    const database = getDb();
    const value = Reflect.get(database, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
});

export { schema };
