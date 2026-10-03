/**
 * Sync the diary rows file (default data/private/diary.json) into diary_topics + diary_entries.
 *
 *   pnpm sync:diary [DATABASE_URL] [--file path] [--apply] [--prune] [--force] [--force-prune] [--allow-env-file]
 *
 * DRY RUN by default (read-only transaction). --apply writes inside one transaction after
 * locking the compared rows; the run aborts with exit 1 and zero writes on rejected rows,
 * blockers, or protected-field conflicts without --force. No DDL: run `pnpm db:migrate` first.
 *
 * A DRY RUN also exits 1 (after printing the plan) when the same --apply would abort, so it
 * can gate an --apply in scripts. Output prints DB and file values (up to 80 chars each);
 * never paste it into public issues. See docs/DATABASE.md.
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
  applyDiaryPlan,
  buildDiaryPlan,
  diaryPlanAbortReasons,
  formatDiaryPlan,
  validateDiaryRows,
  type ExistingDiaryEntry,
  type ExistingDiaryTopic,
} from './lib/sync-diary';

const DEFAULT_FILE = 'data/private/diary.json';

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
  const { rejections } = validateDiaryRows(rows);
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
        const topics = await tx<ExistingDiaryTopic[]>`
          SELECT id, row_number, day, week, date, activity_count, pic, topic, default_learned, default_notes
          FROM diary_topics ORDER BY row_number, id`;
        const entries = await tx<ExistingDiaryEntry[]>`
          SELECT id, row_number, learned, notes FROM diary_entries ORDER BY row_number`;
        const plan = buildDiaryPlan(topics, entries, rows, args);
        console.log(formatDiaryPlan(plan));
        return diaryPlanAbortReasons(plan);
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
        const topics = await tx<ExistingDiaryTopic[]>`
          SELECT id, row_number, day, week, date, activity_count, pic, topic, default_learned, default_notes
          FROM diary_topics ORDER BY row_number, id FOR UPDATE`;
        const entries = await tx<ExistingDiaryEntry[]>`
          SELECT id, row_number, learned, notes FROM diary_entries ORDER BY row_number FOR UPDATE`;
        const plan = buildDiaryPlan(topics, entries, rows, args);
        console.log(formatDiaryPlan(plan));
        const reasons = diaryPlanAbortReasons(plan);
        if (reasons.length > 0) throw new AbortSync(`Aborted with zero writes: ${reasons.join('; ')}.`);
        await applyDiaryPlan(tx, plan);
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
    console.error(`Diary sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
