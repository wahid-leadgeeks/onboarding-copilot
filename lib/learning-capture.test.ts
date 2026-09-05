import { diarySyncPayload, learningDiaryEntry } from './learning-capture';
import type { LearningActivityContext } from './learning-capture';
import { appendDiary, diaryId, readDiary } from './local-records';
import type { StoredDiary } from './local-records';
import type { LearningSubmission } from '@/app/components/LearningModal';

const CREATED_AT = '2026-09-05T14:30:00.000Z';
const LEGACY_DIARY: StoredDiary = { content: 'legacy note', createdAt: '2026-09-01T09:00:00.000Z' };

const manual: LearningSubmission = {
  content: 'Learned how the sync queue defers writes to Google Sheets',
  source: 'manual',
};

const aiAssisted: LearningSubmission = {
  content: 'Confirmed summary of the sync queue behaviour',
  source: 'ai-assisted',
};

const finishedActivity: LearningActivityContext = { activityId: 'security', activityName: 'Security & Access Setup' };

describe('learningDiaryEntry', () => {
  it('builds a structured record with a persistent id, the activity identity, and the submission source', () => {
    const entry = learningDiaryEntry(manual, finishedActivity, CREATED_AT);

    expect(entry).toStrictEqual({
      content: manual.content,
      createdAt: CREATED_AT,
      id: diaryId({ content: manual.content, createdAt: CREATED_AT }),
      activityId: 'security',
      activityName: 'Security & Access Setup',
      source: 'manual',
    });
  });

  it('preserves the ai-assisted source of a confirmed summary', () => {
    const entry = learningDiaryEntry(aiAssisted, { activityId: 'welcome', activityName: 'Team Welcome' }, CREATED_AT);

    expect(entry.source).toBe('ai-assisted');
    expect(entry.content).toBe(aiAssisted.content);
  });

  it('keeps the activity fields absent when the finished activity is unknown', () => {
    const entry = learningDiaryEntry(manual, { activityId: null, activityName: null }, CREATED_AT);

    expect(entry).toStrictEqual({
      content: manual.content,
      createdAt: CREATED_AT,
      id: diaryId({ content: manual.content, createdAt: CREATED_AT }),
      source: 'manual',
    });
  });

  it('keeps a partially known activity identity partial', () => {
    const entry = learningDiaryEntry(manual, { activityId: 'security', activityName: null }, CREATED_AT);

    expect(entry).toStrictEqual({
      content: manual.content,
      createdAt: CREATED_AT,
      id: diaryId({ content: manual.content, createdAt: CREATED_AT }),
      activityId: 'security',
      source: 'manual',
    });
  });

  it('derives the same id for the same submission and timestamp', () => {
    const first = learningDiaryEntry(manual, finishedActivity, CREATED_AT);
    const second = learningDiaryEntry(manual, finishedActivity, CREATED_AT);

    expect(first.id).toBe(second.id);
  });

  it('produces records that survive the storage boundary validation unchanged', () => {
    const entry = learningDiaryEntry(aiAssisted, finishedActivity, CREATED_AT);
    const stored = readDiary(JSON.stringify(appendDiary([LEGACY_DIARY], entry)));

    expect(stored).toStrictEqual([LEGACY_DIARY, entry]);
  });
});

describe('diarySyncPayload', () => {
  it('projects a constructed record onto only its content', () => {
    const entry = learningDiaryEntry(aiAssisted, finishedActivity, CREATED_AT);

    expect(diarySyncPayload(entry)).toStrictEqual({ content: aiAssisted.content });
  });

  it('omits every structured field from the wire contract', () => {
    const structured: StoredDiary = {
      content: 'Confirmed summary',
      createdAt: CREATED_AT,
      id: 'd-custom',
      activityId: 'welcome',
      activityName: 'Team Welcome',
      source: 'ai-assisted',
      updatedAt: CREATED_AT,
    };

    expect(diarySyncPayload(structured)).toStrictEqual({ content: 'Confirmed summary' });
  });

  it('keeps the payload contract at exactly { content } for a legacy record', () => {
    expect(diarySyncPayload(LEGACY_DIARY)).toStrictEqual({ content: LEGACY_DIARY.content });
  });
});
