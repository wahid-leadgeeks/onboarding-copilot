/**
 * Integration test: applies drizzle/ to a real, LOCAL Postgres and round-trips one row.
 *
 * Reads TEST_DATABASE_URL only (never DATABASE_URL). Skipped when it is unset. Any host other
 * than localhost / 127.0.0.1 is refused at module load, before a client is created.
 *
 *   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/ci_test pnpm test lib/db/migrations.integration.test.ts
 */
import path from 'path';
import { randomInt } from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { resolveSslOption } from './ssl';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const testDatabaseUrl = process.env.TEST_DATABASE_URL || undefined;

if (testDatabaseUrl !== undefined) {
  let hostname: string;
  try {
    hostname = new URL(testDatabaseUrl).hostname;
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL; refusing to run the integration test.');
  }
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `TEST_DATABASE_URL host "${hostname}" is not localhost or 127.0.0.1; refusing to connect.`,
    );
  }
}

const migrationsFolder = path.join(__dirname, '..', '..', 'drizzle');
// lib/test-globals.d.ts narrows `describe` to a plain function, so reach jest's typed global for .skip.
const jestDescribe = (globalThis as unknown as { describe: jest.Describe }).describe;
const describeWithDb = testDatabaseUrl === undefined ? jestDescribe.skip : jestDescribe;

describeWithDb('drizzle migrations (integration, TEST_DATABASE_URL)', () => {
  let sql: postgres.Sql;

  beforeAll(async () => {
    const url = testDatabaseUrl as string;
    sql = postgres(url, { max: 1, ssl: resolveSslOption(url), onnotice: () => {} });
    await migrate(drizzle(sql), { migrationsFolder });
  });

  afterAll(async () => {
    await sql?.end();
  });

  it('applies every migration and records exactly one row per journal entry', async () => {
    const journalEntries = readMigrationFiles({ migrationsFolder }).length;
    expect(journalEntries).toBe(1);

    // beforeAll already migrated; a second run on a migrated database must be a no-op.
    await migrate(drizzle(sql), { migrationsFolder });

    const [{ count }] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
    expect(count).toBe(journalEntries);
  });

  it('inserts, selects and deletes a diary_entries row', async () => {
    const rowNumber = 9000 + randomInt(0, 1000);
    const id = `entry-integration-${rowNumber}`;
    try {
      await sql`
        INSERT INTO diary_entries (id, row_number, learned, notes, updated_at)
        VALUES (${id}, ${rowNumber}, ${'learned text'}, ${''}, ${new Date().toISOString()})`;

      const rows = await sql<{ id: string; row_number: number; learned: string; notes: string }[]>`
        SELECT id, row_number, learned, notes FROM diary_entries WHERE row_number = ${rowNumber}`;
      expect(rows).toEqual([{ id, row_number: rowNumber, learned: 'learned text', notes: '' }]);
    } finally {
      await sql`DELETE FROM diary_entries WHERE id = ${id}`;
    }

    const after = await sql`SELECT 1 FROM diary_entries WHERE id = ${id}`;
    expect(after).toHaveLength(0);
  });
});
