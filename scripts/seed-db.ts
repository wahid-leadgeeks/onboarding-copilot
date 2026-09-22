import postgres from 'postgres';
import { OFFICIAL_SCHEDULE_ACTIVITIES } from '../lib/schedule-catalog';
import { OFFICIAL_DIARY_TOPICS } from '../lib/diary-cockpit';
import { FEEDBACK_SESSIONS } from '../lib/feedback';
import { TIMELINE_STAGES } from '../lib/timeline';
import { OFFICIAL_TRAINING_MODULES } from '../lib/glossary';

const targetUrl = process.argv[2] || process.env.DATABASE_URL;

if (!targetUrl) {
  console.error('DATABASE_URL is required. Provide it as an argument or set DATABASE_URL environment variable.');
  process.exit(1);
}

console.log(`Connecting to PostgreSQL: ${targetUrl.replace(/:[^:@]+@/, ':****@')}`);

const sql = postgres(targetUrl, {
  ssl: 'require',
  max: 1,
});

async function main() {
  console.log('1. Creating tables if not exist...');

  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id text PRIMARY KEY,
      row_number integer NOT NULL,
      week text NOT NULL,
      day text NOT NULL,
      date text NOT NULL,
      activity_count integer NOT NULL,
      pic text NOT NULL,
      topic text NOT NULL,
      main_media text NOT NULL,
      duration_minutes integer,
      start_time text,
      end_time text,
      progress text DEFAULT '',
      notes text DEFAULT '',
      actual_start text,
      actual_end text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS diary_topics (
      id text PRIMARY KEY,
      row_number integer NOT NULL,
      day text NOT NULL,
      week text NOT NULL,
      date text NOT NULL,
      activity_count text,
      pic text NOT NULL,
      topic text NOT NULL,
      default_learned text,
      default_notes text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS diary_entries (
      id text PRIMARY KEY,
      row_number integer NOT NULL UNIQUE,
      learned text DEFAULT '' NOT NULL,
      notes text DEFAULT '' NOT NULL,
      updated_at text NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS feedback_sessions (
      id text PRIMARY KEY,
      title text NOT NULL,
      topic text NOT NULL,
      pic text NOT NULL,
      row_number integer NOT NULL,
      department text NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS feedback_entries (
      id text PRIMARY KEY,
      session_id text NOT NULL UNIQUE,
      row_number integer NOT NULL,
      date text,
      pic text,
      topic text,
      ratings jsonb,
      has_questions boolean DEFAULT false,
      question_explanation text DEFAULT '',
      question_addressing text DEFAULT '',
      suggestions text DEFAULT '',
      updated_at text NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS timeline_stages (
      id text PRIMARY KEY,
      stage_number text NOT NULL,
      stage_name text NOT NULL,
      start_date text NOT NULL,
      end_date text NOT NULL,
      objective text NOT NULL,
      key_activities text NOT NULL,
      outputs_evidence text NOT NULL,
      minimum_duration text NOT NULL,
      completed_evidence jsonb,
      updated_at text
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS monthly_reviews (
      id text PRIMARY KEY,
      month integer NOT NULL UNIQUE,
      achievements text DEFAULT '' NOT NULL,
      challenges text DEFAULT '' NOT NULL,
      goals_next_month text DEFAULT '' NOT NULL,
      technical_ratings jsonb,
      values_ratings jsonb,
      updated_at text NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS training_modules (
      id text PRIMARY KEY,
      topic text NOT NULL,
      pic text NOT NULL,
      objectives text NOT NULL,
      framework_materials text NOT NULL,
      materials text NOT NULL,
      media text NOT NULL,
      duration_minutes integer NOT NULL,
      material_access text,
      material_links jsonb,
      notes text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS session_logs (
      id text PRIMARY KEY,
      activity_id text NOT NULL,
      name text NOT NULL,
      started_at bigint NOT NULL,
      finished_at bigint NOT NULL,
      duration_minutes integer NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  console.log('2. Seeding activities (Schedule)...');
  for (const act of OFFICIAL_SCHEDULE_ACTIVITIES) {
    await sql`
      INSERT INTO activities (
        id, row_number, week, day, date, activity_count, pic, topic, main_media,
        duration_minutes, start_time, end_time, progress, notes, updated_at
      ) VALUES (
        ${act.id}, ${act.rowNumber}, ${act.week}, ${act.day}, ${act.date},
        ${act.activityCount}, ${act.pic}, ${act.topic}, ${act.mainMedia},
        ${act.durationMinutes ?? null}, ${act.startTime ?? null}, ${act.endTime ?? null},
        ${act.progress || ''}, ${act.notes || ''}, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        row_number = EXCLUDED.row_number,
        week = EXCLUDED.week,
        day = EXCLUDED.day,
        date = EXCLUDED.date,
        activity_count = EXCLUDED.activity_count,
        pic = EXCLUDED.pic,
        topic = EXCLUDED.topic,
        main_media = EXCLUDED.main_media,
        duration_minutes = EXCLUDED.duration_minutes,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        progress = EXCLUDED.progress,
        notes = EXCLUDED.notes;
    `;
  }

  console.log('3. Seeding diary topics...');
  for (const dt of OFFICIAL_DIARY_TOPICS) {
    await sql`
      INSERT INTO diary_topics (
        id, row_number, day, week, date, activity_count, pic, topic,
        default_learned, default_notes
      ) VALUES (
        ${dt.id}, ${dt.rowNumber}, ${dt.day}, ${dt.week}, ${dt.date},
        ${dt.activityCount ?? null}, ${dt.pic}, ${dt.topic},
        ${dt.defaultLearned ?? null}, ${dt.defaultNotes ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        row_number = EXCLUDED.row_number,
        day = EXCLUDED.day,
        week = EXCLUDED.week,
        date = EXCLUDED.date,
        activity_count = EXCLUDED.activity_count,
        pic = EXCLUDED.pic,
        topic = EXCLUDED.topic,
        default_learned = EXCLUDED.default_learned,
        default_notes = EXCLUDED.default_notes;
    `;

    // Also populate default diary entry
    await sql`
      INSERT INTO diary_entries (
        id, row_number, learned, notes, updated_at
      ) VALUES (
        ${`entry-${dt.rowNumber}`}, ${dt.rowNumber},
        ${dt.defaultLearned || ''}, ${dt.defaultNotes || ''},
        ${new Date().toISOString()}
      )
      ON CONFLICT (row_number) DO NOTHING;
    `;
  }

  console.log('4. Seeding feedback sessions...');
  for (const fs of FEEDBACK_SESSIONS) {
    await sql`
      INSERT INTO feedback_sessions (
        id, title, topic, pic, row_number, department
      ) VALUES (
        ${fs.id}, ${fs.title}, ${fs.topic || fs.title}, ${fs.pic}, ${fs.rowNumber}, ${fs.department || 'General'}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        topic = EXCLUDED.topic,
        pic = EXCLUDED.pic,
        row_number = EXCLUDED.row_number,
        department = EXCLUDED.department;
    `;
  }

  console.log('5. Seeding timeline stages...');
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
    await sql`
      INSERT INTO timeline_stages (
        id, stage_number, stage_name, start_date, end_date,
        objective, key_activities, outputs_evidence, minimum_duration,
        completed_evidence, updated_at
      ) VALUES (
        ${st.id}, ${st.stageNumber}, ${st.stageName || st.name}, ${dates.start}, ${dates.end},
        ${st.objective}, ${st.keyActivities}, ${outputs}, ${st.duration || '1 Month'},
        ${JSON.stringify([])}, ${new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        stage_number = EXCLUDED.stage_number,
        stage_name = EXCLUDED.stage_name,
        objective = EXCLUDED.objective,
        key_activities = EXCLUDED.key_activities,
        outputs_evidence = EXCLUDED.outputs_evidence,
        minimum_duration = EXCLUDED.minimum_duration;
    `;
  }

  console.log('6. Seeding monthly reviews...');
  for (const month of [1, 2, 3] as const) {
    await sql`
      INSERT INTO monthly_reviews (
        id, month, achievements, challenges, goals_next_month,
        technical_ratings, values_ratings, updated_at
      ) VALUES (
        ${`month-${month}`}, ${month},
        '', '', '',
        ${JSON.stringify({})}, ${JSON.stringify({})},
        ${new Date().toISOString()}
      )
      ON CONFLICT (month) DO NOTHING;
    `;
  }

  console.log('7. Seeding training modules (Glossary)...');
  for (const mod of OFFICIAL_TRAINING_MODULES) {
    await sql`
      INSERT INTO training_modules (
        id, topic, pic, objectives, framework_materials, materials,
        media, duration_minutes, material_access, material_links, notes
      ) VALUES (
        ${mod.id}, ${mod.topic}, ${mod.pic}, ${mod.objectives},
        ${mod.frameworkMaterials}, ${mod.materials}, ${mod.media},
        ${mod.durationMinutes}, ${mod.materialAccess ?? null},
        ${JSON.stringify(mod.materialLinks || [])}, ${mod.notes ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        topic = EXCLUDED.topic,
        pic = EXCLUDED.pic,
        objectives = EXCLUDED.objectives,
        framework_materials = EXCLUDED.framework_materials,
        materials = EXCLUDED.materials,
        media = EXCLUDED.media,
        duration_minutes = EXCLUDED.duration_minutes,
        material_access = EXCLUDED.material_access,
        material_links = EXCLUDED.material_links,
        notes = EXCLUDED.notes;
    `;
  }

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

  console.log('Database initialization and seeding completed successfully!');
  await sql.end();
}

main().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
