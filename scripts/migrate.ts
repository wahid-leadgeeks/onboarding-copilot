/**
 * Applies pending drizzle migrations from drizzle/ (resolved from this file, not the cwd).
 *
 *   pnpm db:migrate [DATABASE_URL] [--allow-env-file]
 *
 * URL: positional -> DATABASE_URL -> .env.local in the current directory. Migrating is a write,
 * so a URL that came from .env.local is refused unless --allow-env-file is given; the refusal
 * happens before any connection. Other sync flags (--apply, --prune, --force, --force-prune,
 * --file, --allow-non-empty) have no effect here.
 *
 * Note: drizzle creates schema `drizzle` and table drizzle.__drizzle_migrations OUTSIDE the
 * migration transaction; the migrations themselves run in one transaction.
 * For an existing database created by the old seed DDL, follow docs/DATABASE.md first.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { assertNotUnderJest, openDatabaseTarget, parseSyncArgs, resolveSslOption } from './lib/sync-common';

const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');

async function countMigrationRows(sql: postgres.Sql): Promise<number> {
  const [{ present }] = await sql<{ present: boolean }[]>`
    SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
  if (!present) return 0;
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
  return count;
}

async function main(): Promise<number> {
  assertNotUnderJest();
  const args = parseSyncArgs(process.argv.slice(2));
  const ignored = (['apply', 'prune', 'force', 'forcePrune'] as const).filter((flag) => args[flag]);
  if (ignored.length > 0 || args.file !== undefined || args.allowNonEmpty) {
    console.log('Note: --apply/--prune/--force/--force-prune/--file/--allow-non-empty have no effect on db:migrate.');
  }
  // Fails before connecting when the journal or a .sql file is missing.
  const journalEntries = readMigrationFiles({ migrationsFolder }).length;
  console.log(`Migrations folder: ${migrationsFolder} (${journalEntries} journal entries)`);

  const { client } = openDatabaseTarget({
    positional: args.url,
    write: true,
    allowEnvFile: args.allowEnvFile,
    createClient: (url) => postgres(url, { max: 1, ssl: resolveSslOption(url), onnotice: () => {} }),
  });
  try {
    const before = await countMigrationRows(client);
    await migrate(drizzle(client), { migrationsFolder });
    const after = await countMigrationRows(client);
    console.log(`Migration rows: ${after} (applied now: ${after - before}).`);
    return 0;
  } finally {
    await client.end();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`db:migrate failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
