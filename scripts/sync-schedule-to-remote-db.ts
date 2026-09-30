/**
 * Sync the schedule rows file (default data/private/schedule.json) into activities.
 *
 *   pnpm sync:schedule [DATABASE_URL] [--file path] [--apply] [--prune] [--force] [--allow-env-file]
 *
 * DRY RUN by default (read-only transaction). --apply writes inside one transaction after
 * locking the compared rows; the run aborts with exit 1 and zero writes on rejected rows,
 * blockers (including stale activities referenced by session_logs), or protected-field
 * conflicts without --force. --force-prune is accepted but has no effect here. No DDL: run
 * `pnpm db:migrate` first.
 */
import postgres from 'postgres';
import {
  assertNotUnderJest,
  emptyPlan,
  formatPlan,
  loadRowsFile,
  openDatabaseTarget,
  parseSyncArgs,
  resolveSslOption,
} from './lib/sync-common';
import {
  applySchedulePlan,
  buildSchedulePlan,
  formatSchedulePlan,
  schedulePlanAbortReasons,
  validateScheduleRows,
  type ExistingActivity,
} from './lib/sync-schedule';

const DEFAULT_FILE = 'data/private/schedule.json';

/** Thrown inside the transaction to roll it back before any write. */
class AbortSync extends Error {}

async function main(): Promise<number> {
  assertNotUnderJest();
  const args = parseSyncArgs(process.argv.slice(2));
  const file = args.file ?? DEFAULT_FILE;
  const rows = loadRowsFile(file);
  console.log(`File: ${file} (${rows.length} rows)`);
  console.log(args.apply ? 'Mode: APPLY' : 'Mode: DRY RUN (pass --apply to write)');

  // Reject a bad file before connecting at all.
  const { rejections } = validateScheduleRows(rows);
  if (rejections.length > 0) {
    console.error(formatPlan({ ...emptyPlan(), rejections }));
    console.error(`Aborted before connecting: ${rejections.length} rejected row(s) in ${file}.`);
    return 1;
  }

  const { client: sql } = openDatabaseTarget({
    positional: args.url,
    write: args.apply,
    allowEnvFile: args.allowEnvFile,
    createClient: (url) => postgres(url, { max: 1, ssl: resolveSslOption(url) }),
  });

  try {
    if (!args.apply) {
      const reasons = await sql.begin('read only', async (tx) => {
        const existing = await tx<ExistingActivity[]>`
          SELECT id, row_number, week, day, date, activity_count, pic, topic, main_media,
                 duration_minutes, start_time, end_time, progress, materials_link, notes
          FROM activities ORDER BY row_number, id`;
        const referenced = args.prune
          ? (await tx<{ activity_id: string }[]>`SELECT DISTINCT activity_id FROM session_logs`).map(
              (r) => r.activity_id,
            )
          : [];
        const plan = buildSchedulePlan(existing, referenced, rows, args);
        console.log(formatSchedulePlan(plan));
        return schedulePlanAbortReasons(plan);
      });
      if (reasons.length > 0) {
        console.error(`An --apply run would abort: ${reasons.join('; ')}.`);
        return 1;
      }
      console.log('Dry run complete. Nothing was written.');
      return 0;
    }

    try {
      await sql.begin(async (tx) => {
        const existing = await tx<ExistingActivity[]>`
          SELECT id, row_number, week, day, date, activity_count, pic, topic, main_media,
                 duration_minutes, start_time, end_time, progress, materials_link, notes
          FROM activities ORDER BY row_number, id FOR UPDATE`;
        let referenced: string[] = [];
        if (args.prune) {
          // Block concurrent session_logs inserts until commit, so a row about to be pruned
          // cannot gain a reference after the check (SHARE mode still allows reads).
          await tx`LOCK TABLE session_logs IN SHARE MODE`;
          referenced = (await tx<{ activity_id: string }[]>`SELECT DISTINCT activity_id FROM session_logs`).map(
            (r) => r.activity_id,
          );
        }
        const plan = buildSchedulePlan(existing, referenced, rows, args);
        console.log(formatSchedulePlan(plan));
        const reasons = schedulePlanAbortReasons(plan);
        if (reasons.length > 0) throw new AbortSync(`Aborted with zero writes: ${reasons.join('; ')}.`);
        await applySchedulePlan(tx, plan);
      });
    } catch (error) {
      if (error instanceof AbortSync) {
        console.error(error.message);
        return 1;
      }
      throw error;
    }
    console.log('Applied in one transaction.');
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
    console.error(`Schedule sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
