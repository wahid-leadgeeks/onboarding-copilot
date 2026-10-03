/**
 * Seeds catalog rows (schedule activities, diary topics, feedback sessions, timeline stages,
 * monthly reviews, training modules). Assumes `pnpm db:migrate` has run: this script has no DDL.
 *
 *   pnpm db:seed [DATABASE_URL] [--allow-env-file] [--allow-non-empty]
 *
 * Non-destructive: every insert is ON CONFLICT DO NOTHING, so existing rows are never changed.
 * Refuses to run when `activities` already has rows unless --allow-non-empty (the check and the
 * writes share one transaction). URL: positional -> DATABASE_URL -> .env.local in the current
 * directory; a URL from .env.local is refused without --allow-env-file, before any connection.
 * Other sync flags (--apply, --prune, --force, --force-prune, --file) have no effect here.
 */
import postgres from 'postgres';
import { OFFICIAL_SCHEDULE_ACTIVITIES } from '../lib/schedule-catalog';
import { OFFICIAL_DIARY_TOPICS } from '../lib/diary-cockpit';
import { FEEDBACK_SESSIONS } from '../lib/feedback';
import { TIMELINE_STAGES } from '../lib/timeline';
import { OFFICIAL_TRAINING_MODULES } from '../lib/glossary';
import { assertNotUnderJest, openDatabaseTarget, parseSyncArgs, resolveSslOption } from './lib/sync-common';

async function main(): Promise<void> {
  assertNotUnderJest();
  const args = parseSyncArgs(process.argv.slice(2));
  const ignored = (['apply', 'prune', 'force', 'forcePrune'] as const).filter((flag) => args[flag]);
  if (ignored.length > 0 || args.file !== undefined) {
    console.log('Note: --apply/--prune/--force/--force-prune/--file have no effect on db:seed.');
  }

  const { client: sql } = openDatabaseTarget({
    positional: args.url,
    write: true,
    allowEnvFile: args.allowEnvFile,
    createClient: (url) => postgres(url, { max: 1, ssl: resolveSslOption(url), onnotice: () => {} }),
  });

  try {
    await sql.begin(async (tx) => {
      const [{ count: existingActivities }] = await tx<{ count: number }[]>`SELECT count(*)::int AS count FROM activities`;
      if (existingActivities > 0 && !args.allowNonEmpty) {
        throw new Error(
          `Refusing to seed: activities already has ${existingActivities} rows. Pass --allow-non-empty to insert only the missing catalog rows (existing rows are never changed).`,
        );
      }

      console.log('1. Seeding activities (Schedule)...');
      for (const act of OFFICIAL_SCHEDULE_ACTIVITIES) {
        await tx`
          INSERT INTO activities (
            id, row_number, week, day, date, activity_count, pic, topic, main_media,
            duration_minutes, start_time, end_time, progress, materials_link, notes, updated_at
          ) VALUES (
            ${act.id}, ${act.rowNumber}, ${act.week}, ${act.day}, ${act.date},
            ${act.activityCount ?? null}, ${act.pic}, ${act.topic}, ${act.mainMedia},
            ${act.durationMinutes ?? null}, ${act.startTime ?? null}, ${act.endTime ?? null},
            ${act.progress || ''}, ${act.materialsLink || ''}, ${act.notes || ''}, now()
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      console.log('2. Seeding diary topics...');
      for (const dt of OFFICIAL_DIARY_TOPICS) {
        await tx`
          INSERT INTO diary_topics (
            id, row_number, day, week, date, activity_count, pic, topic,
            default_learned, default_notes
          ) VALUES (
            ${dt.id}, ${dt.rowNumber}, ${dt.day}, ${dt.week}, ${dt.date},
            ${dt.activityCount ?? null}, ${dt.pic}, ${dt.topic},
            ${dt.defaultLearned ?? null}, ${dt.defaultNotes ?? null}
          )
          ON CONFLICT (id) DO NOTHING
        `;

        // Also populate default diary entry
        await tx`
          INSERT INTO diary_entries (
            id, row_number, learned, notes, updated_at
          ) VALUES (
            ${`entry-${dt.rowNumber}`}, ${dt.rowNumber},
            ${dt.defaultLearned || ''}, ${dt.defaultNotes || ''},
            ${new Date().toISOString()}
          )
          ON CONFLICT (row_number) DO NOTHING
        `;
      }

      console.log('3. Seeding feedback sessions...');
      for (const fs of FEEDBACK_SESSIONS) {
        await tx`
          INSERT INTO feedback_sessions (
            id, title, topic, pic, row_number, department
          ) VALUES (
            ${fs.id}, ${fs.title}, ${fs.topic || fs.title}, ${fs.pic}, ${fs.rowNumber}, ${fs.department || 'General'}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      console.log('4. Seeding timeline stages...');
      const stageDates: Record<string, { start: string; end: string }> = {
        'stage-1': { start: '01/09/2026', end: '30/09/2026' },
        'stage-2': { start: '01/10/2026', end: '31/10/2026' },
        'stage-3': { start: '01/11/2026', end: '30/11/2026' },
      };

      for (const st of TIMELINE_STAGES) {
        const dates = stageDates[st.id] || {
          start: st.defaultDates?.startDate || '01/09/2026',
          end: st.defaultDates?.endDate || '30/09/2026',
        };
        const outputs = st.evidenceDeliverables?.map((d) => d.text).join('\n') || '';
        await tx`
          INSERT INTO timeline_stages (
            id, stage_number, stage_name, start_date, end_date,
            objective, key_activities, outputs_evidence, minimum_duration,
            completed_evidence, updated_at
          ) VALUES (
            ${st.id}, ${st.stageNumber}, ${st.stageName || st.name}, ${dates.start}, ${dates.end},
            ${st.objective}, ${st.keyActivities}, ${outputs}, ${st.duration || '1 Month'},
            ${JSON.stringify([])}, ${new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      console.log('5. Seeding monthly reviews...');
      for (const month of [1, 2, 3] as const) {
        await tx`
          INSERT INTO monthly_reviews (
            id, month, achievements, challenges, goals_next_month,
            technical_ratings, values_ratings, updated_at
          ) VALUES (
            ${`month-${month}`}, ${month},
            '', '', '',
            ${JSON.stringify({})}, ${JSON.stringify({})},
            ${new Date().toISOString()}
          )
          ON CONFLICT (month) DO NOTHING
        `;
      }

      console.log('6. Seeding training modules (Glossary)...');
      for (const mod of OFFICIAL_TRAINING_MODULES) {
        await tx`
          INSERT INTO training_modules (
            id, topic, pic, objectives, framework_materials, materials,
            media, duration_minutes, material_access, material_links, notes
          ) VALUES (
            ${mod.id}, ${mod.topic}, ${mod.pic}, ${mod.objectives},
            ${mod.frameworkMaterials}, ${mod.materials}, ${mod.media},
            ${mod.durationMinutes}, ${mod.materialAccess ?? null},
            ${JSON.stringify(mod.materialLinks || [])}, ${mod.notes ?? null}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    });

    console.log('--- Verification Counts ---');
    const countActivities = await sql`SELECT count(*)::int FROM activities`;
    const countDiaryTopics = await sql`SELECT count(*)::int FROM diary_topics`;
    const countDiaryEntries = await sql`SELECT count(*)::int FROM diary_entries`;
    const countFeedbackSessions = await sql`SELECT count(*)::int FROM feedback_sessions`;
    const countTimelineStages = await sql`SELECT count(*)::int FROM timeline_stages`;
    const countMonthlyReviews = await sql`SELECT count(*)::int FROM monthly_reviews`;
    const countTrainingModules = await sql`SELECT count(*)::int FROM training_modules`;

    console.log({
      activities: countActivities[0].count,
      diaryTopics: countDiaryTopics[0].count,
      diaryEntries: countDiaryEntries[0].count,
      feedbackSessions: countFeedbackSessions[0].count,
      timelineStages: countTimelineStages[0].count,
      monthlyReviews: countMonthlyReviews[0].count,
      trainingModules: countTrainingModules[0].count,
    });

    console.log('Database seeding completed successfully!');
  } finally {
    await sql.end();
  }
}

main().then(
  () => {
    process.exitCode = 0;
  },
  (error: unknown) => {
    console.error(`db:seed failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
