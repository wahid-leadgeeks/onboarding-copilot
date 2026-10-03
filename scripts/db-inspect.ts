/**
 * Read-only schema introspection. Prints information_schema.columns, pg_constraint and
 * drizzle.__drizzle_migrations (if present) in a stable, diffable format.
 *
 *   pnpm db:inspect [DATABASE_URL]
 *
 * Never writes: the session is default_transaction_read_only (sent as "true"). The URL may come from
 * .env.local (reads are allowed); the target is printed first. It accepts every sync flag
 * (parseSyncArgs) but ignores them all.
 */
import postgres from 'postgres';
import { assertNotUnderJest, openDatabaseTarget, parseSyncArgs, resolveSslOption } from './lib/sync-common';
import { formatInspect, inspectDatabase } from './lib/db-inspect';

async function main(): Promise<number> {
  assertNotUnderJest();
  const args = parseSyncArgs(process.argv.slice(2));
  const { client: sql } = openDatabaseTarget({
    positional: args.url,
    write: false,
    allowEnvFile: args.allowEnvFile,
    createClient: (url) =>
      postgres(url, {
        max: 1,
        ssl: resolveSslOption(url),
        connection: { default_transaction_read_only: true },
      }),
  });
  try {
    process.stdout.write(formatInspect(await inspectDatabase(sql)));
    return 0;
  } finally {
    await sql.end();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`db:inspect failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
