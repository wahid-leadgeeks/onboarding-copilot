/**
 * Prints the SQL that marks an EXISTING database (created by the old seed DDL) as having the
 * baseline migration applied, so `pnpm db:migrate` does not try to re-create its tables.
 *
 *   pnpm -s db:baseline-sql | psql "$URL"
 *
 * Never connects to a database: it only reads drizzle/meta/_journal.json and the .sql files.
 * Follow the full procedure in docs/DATABASE.md; never pipe this into a database you have not
 * inspected first.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { assertNotUnderJest } from './lib/sync-common';
import { buildBaselineSql } from './lib/baseline-sql';

assertNotUnderJest();

// Resolved from this file, not the cwd, so it works from any directory.
const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');

try {
  process.stdout.write(buildBaselineSql(readMigrationFiles({ migrationsFolder })));
} catch (error) {
  console.error(`db:baseline-sql failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
