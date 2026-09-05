/**
 * Pure bridge from a confirmed learning capture to its persisted
 * representations (ADR-0005): the structured local diary record and the
 * diary sync wire payload.
 *
 * Structured fields (id, activity identity, source) are local-only — the
 * Sheets diary sync contract stays exactly `{ content }`.
 */
import { createDiaryEntry } from './local-records';
import type { StoredDiary } from './local-records';
// Type-only: the submission contract is owned by the capture UI. `import type`
// is erased at compile time, so this module keeps no runtime dependency on app code.
import type { LearningSubmission } from '@/app/components/LearningModal';

/**
 * Finished-activity identity for a capture. `null` parts are unknown and stay
 * absent from the record — never `undefined` placeholders or invented values.
 */
export type LearningActivityContext = {
  readonly activityId: string | null;
  readonly activityName: string | null;
};

/** Builds the structured local record for a user-confirmed submission. */
export function learningDiaryEntry(
  submission: LearningSubmission,
  activity: LearningActivityContext,
  createdAt: string,
): StoredDiary {
  return createDiaryEntry(
    {
      content: submission.content,
      ...(activity.activityId === null ? {} : { activityId: activity.activityId }),
      ...(activity.activityName === null ? {} : { activityName: activity.activityName }),
      source: submission.source,
    },
    createdAt,
  );
}

/** Projects a stored record onto the diary sync body — content only, never metadata. */
export function diarySyncPayload(record: StoredDiary): { content: string } {
  return { content: record.content };
}
