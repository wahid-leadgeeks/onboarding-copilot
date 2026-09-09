/**
 * Core business logic, storage helpers, and TSV clipboard serializer
 * for Milestone 2: Feedback Sheet System.
 *
 * Aligned with rows 4-16 of the 'Feedback Sheet' worksheet in the official HR workbook.
 */

import type {
  CreateFeedbackInput,
  FeedbackClipboardInput,
  FeedbackDimensionDefinition,
  FeedbackDimensionKey,
  FeedbackEntry,
  FeedbackProgress,
  FeedbackRatingDimension,
  FeedbackRatings,
  FeedbackSession,
  FeedbackSessionDefinition,
  FeedbackSessionStatus,
  LikertLabel,
  LikertScore,
  QuestionAddressingOption,
} from '@/lib/types/feedback';
import { QUESTION_ADDRESSING_OPTIONS } from '@/lib/types/feedback';

export * from '@/lib/types/feedback';

export const FEEDBACK_STORAGE_KEY = 'onboarding-feedback';

/**
 * The 14 official evaluation sessions defined in rows 3–16 of the Feedback Sheet worksheet.
 */
export const FEEDBACK_SESSIONS: readonly FeedbackSession[] = [
  {
    id: 'row-3',
    title: 'Introduction to Company',
    topic: 'Introduction to Company',
    pic: 'Managing Director',
    rowNumber: 3,
    row: 3,
    department: 'Executive Management',
  },
  {
    id: 'row-4',
    title: 'Beyond the Slides: Chat with the MD',
    topic: 'Beyond the Slides: Chat with the MD',
    pic: 'Managing Director',
    rowNumber: 4,
    row: 4,
    department: 'Executive Management',
  },
  {
    id: 'row-5',
    title: 'Intro to HRD Department',
    topic: 'Intro to HRD Department',
    pic: 'HRD',
    rowNumber: 5,
    row: 5,
    department: 'Human Resources',
  },
  {
    id: 'row-6',
    title: 'Company Policy',
    topic: 'Company Policy',
    pic: 'HRD',
    rowNumber: 6,
    row: 6,
    department: 'Human Resources',
  },
  {
    id: 'row-7',
    title: 'Personnel Administration',
    topic: 'Personnel Administration',
    pic: 'HRD',
    rowNumber: 7,
    row: 7,
    department: 'Human Resources',
  },
  {
    id: 'row-8',
    title: 'Introduction to Management Office Department',
    topic: 'Introduction to Management Office Department',
    pic: 'Managing Director & Excecutive Assistant',
    rowNumber: 8,
    row: 8,
    department: 'Management Office',
  },
  {
    id: 'row-9',
    title: 'Introduction to Finance & Accounting Department',
    topic: 'Introduction to Finance & Accounting Department',
    pic: 'Excecutive Assistant & Accounting and Tax Staff',
    rowNumber: 9,
    row: 9,
    department: 'Finance & Accounting',
  },
  {
    id: 'row-10',
    title: 'Experience Department Introduction',
    topic: 'Experience Department Introduction',
    pic: 'Experience Manager',
    rowNumber: 10,
    row: 10,
    department: 'Experience',
  },
  {
    id: 'row-11',
    title: 'Operations Department Introduction',
    topic: 'Operations Department Introduction',
    pic: 'Operations Manager',
    rowNumber: 11,
    row: 11,
    department: 'Operations',
  },
  {
    id: 'row-12',
    title: 'Growth Department Introduction',
    topic: 'Growth Department Introduction',
    pic: 'Growth Manager',
    rowNumber: 12,
    row: 12,
    department: 'Growth',
  },
  {
    id: 'row-13',
    title: 'Individual Call',
    topic: 'Individual Call',
    pic: 'Internal Experience Staff',
    rowNumber: 13,
    row: 13,
    department: 'Experience',
  },
  {
    id: 'row-14',
    title: 'Anonymous Feedback',
    topic: 'Anonymous Feedback',
    pic: 'Internal Experience Staff',
    rowNumber: 14,
    row: 14,
    department: 'Experience',
  },
  {
    id: 'row-15',
    title: 'Meeting Preparation with Clients',
    topic: 'Meeting Preparation with Clients',
    pic: 'External Experience Staff',
    rowNumber: 15,
    row: 15,
    department: 'Experience',
  },
  {
    id: 'row-16',
    title: 'ESMR (Employer & Staff Media Representation)',
    topic: 'ESMR (Employer & Staff Media Representation)',
    pic: 'External Experience Staff',
    rowNumber: 16,
    row: 16,
    department: 'Experience',
  },
] as const;

/** Canonical aliases */
export const REQUIRED_FEEDBACK_SESSIONS = FEEDBACK_SESSIONS;
export const OFFICIAL_FEEDBACK_SESSIONS = FEEDBACK_SESSIONS;

/**
 * The 6 Likert rating dimensions occupying columns D through I.
 */
export const FEEDBACK_DIMENSIONS: readonly FeedbackDimensionDefinition[] = [
  {
    key: 'communication',
    dimensionNumber: 1,
    columnLetter: 'D',
    shortLabel: 'Communication effectiveness',
    statement: 'The key messages of the topic session were communicated effectively.',
  },
  {
    key: 'alignment',
    dimensionNumber: 2,
    columnLetter: 'E',
    shortLabel: 'Alignment with new employee needs',
    statement: 'The content aligned well with what I need to know as a new employee.',
  },
  {
    key: 'understanding',
    dimensionNumber: 3,
    columnLetter: 'F',
    shortLabel: 'Understanding of main concepts',
    statement: 'After this session, I have a better understanding of the main concepts related to the topic',
  },
  {
    key: 'readiness',
    dimensionNumber: 4,
    columnLetter: 'G',
    shortLabel: 'Readiness to apply',
    statement: 'The session helped me feel more prepared to apply what I learned from the topic in my work.',
  },
  {
    key: 'pace',
    dimensionNumber: 5,
    columnLetter: 'H',
    shortLabel: 'Appropriate pace',
    statement: 'The pace of the session felt appropriate.',
  },
  {
    key: 'overall',
    dimensionNumber: 6,
    columnLetter: 'I',
    shortLabel: 'Overall topic effectiveness',
    statement: 'Overall, the topic was effective as part of my onboarding experience.',
  },
] as const;

export const LIKERT_LABELS: Record<LikertScore, LikertLabel> = {
  6: '6. Excellent',
  5: '5. Very Good',
  4: '4. Good',
  3: '3. Fair',
  2: '2. Poor',
  1: '1. Very Poor',
} as const;

/**
 * Formats a Likert rating integer 1–6 to its official label.
 */
export function formatLikertLabel(rating: number): string {
  if (rating in LIKERT_LABELS) {
    return LIKERT_LABELS[rating as LikertScore];
  }
  return '';
}

/**
 * Maps a Likert score (number or raw string) into the official spreadsheet label.
 */
export function toLikertLabel(rating: unknown): string {
  if (typeof rating === 'number') {
    return formatLikertLabel(rating);
  }
  if (typeof rating === 'string') {
    const trimmed = rating.trim();
    if (trimmed.startsWith('6') || trimmed.toLowerCase().includes('excellent')) return '6. Excellent';
    if (trimmed.startsWith('5') || trimmed.toLowerCase().includes('very good')) return '5. Very Good';
    if (trimmed.startsWith('4') || (trimmed.toLowerCase().includes('good') && !trimmed.toLowerCase().includes('very'))) return '4. Good';
    if (trimmed.startsWith('3') || trimmed.toLowerCase().includes('fair') || trimmed.toLowerCase().includes('neutral')) return '3. Fair';
    if (trimmed.startsWith('2') || (trimmed.toLowerCase().includes('poor') && !trimmed.toLowerCase().includes('very'))) return '2. Poor';
    if (trimmed.startsWith('1') || trimmed.toLowerCase().includes('very poor')) return '1. Very Poor';
    const num = parseInt(trimmed, 10);
    if (!Number.isNaN(num)) {
      return formatLikertLabel(num);
    }
  }
  return '';
}

/**
 * Parses an arbitrary raw value (number or label string) into a LikertScore (1–6).
 */
export function parseLikertScore(raw: unknown): LikertScore | undefined {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 6) {
    return raw as LikertScore;
  }
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    if (t.startsWith('6') || t.includes('excellent')) return 6;
    if (t.startsWith('5') || t.includes('very good')) return 5;
    if (t.startsWith('4') || (t.includes('good') && !t.includes('very'))) return 4;
    if (t.startsWith('3') || t.includes('fair') || t.includes('neutral')) return 3;
    if (t.startsWith('2') || (t.includes('poor') && !t.includes('very'))) return 2;
    if (t.startsWith('1') || t.includes('very poor')) return 1;
    const num = parseInt(t, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 6) {
      return num as LikertScore;
    }
  }
  return undefined;
}

/**
 * Normalizes question addressing value to match official Google Sheets choices if matching.
 */
export function normalizeQuestionAddressing(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'chat response is fine' || lower.includes('chat response') || lower === 'chat') {
    return 'Chat response is fine';
  }
  if (
    lower === "i don't have any questions today" ||
    lower === 'i dont have any questions today' ||
    lower.includes("don't have any question") ||
    lower.includes('dont have any question') ||
    lower === 'no questions' ||
    lower === 'no question'
  ) {
    return "I don't have any questions today";
  }
  if (lower.includes('schedule') && lower.includes('meeting')) {
    return 'I’d like to schedule aN online live meeting';
  }
  return trimmed;
}

/**
 * Checks whether a given question addressing string is one of the official Google Sheets options.
 */
export function isStandardQuestionAddressing(val: unknown): val is QuestionAddressingOption {
  if (typeof val !== 'string') return false;
  return (QUESTION_ADDRESSING_OPTIONS as readonly string[]).includes(val);
}

/**
 * Formats a date string or Date object into DD/MM/YYYY matching the HR template.
 */
export function formatFeedbackDate(date: string | Date | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year}`;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return trimmed;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Finds an official feedback session definition by ID, topic, or row number.
 */
export function findFeedbackSession(query: string | number): FeedbackSession | undefined {
  if (typeof query === 'number') {
    return FEEDBACK_SESSIONS.find((s) => s.rowNumber === query || s.row === query);
  }
  const q = query.trim().toLowerCase();
  return FEEDBACK_SESSIONS.find(
    (s) =>
      s.id.toLowerCase() === q ||
      s.title.toLowerCase().trim() === q ||
      (s.topic && s.topic.toLowerCase().trim() === q) ||
      `row ${s.rowNumber}` === q ||
      `row-${s.rowNumber}` === q
  );
}

/**
 * Validates whether an unknown value conforms to FeedbackRatings.
 */
function areRatingsValid(val: unknown): val is FeedbackRatings {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const r = val as Record<string, unknown>;
  const keys: FeedbackRatingDimension[] = [
    'communication',
    'alignment',
    'understanding',
    'readiness',
    'pace',
    'overall',
  ];
  return keys.every((k) => {
    const v = r[k];
    return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6;
  });
}

/**
 * Runtime type guard for FeedbackEntry.
 * Treats localStorage and external inputs as untrusted boundary data.
 */
export function isFeedbackEntry(val: unknown): val is FeedbackEntry {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const item = val as Record<string, unknown>;

  if (typeof item.sessionId !== 'string' || item.sessionId.trim().length === 0) return false;
  if (typeof item.sessionTitle !== 'string' || item.sessionTitle.trim().length === 0) return false;
  if (typeof item.pic !== 'string') return false;
  if (typeof item.date !== 'string') return false;
  if (typeof item.hasQuestions !== 'boolean') return false;

  if (!areRatingsValid(item.ratings)) return false;

  if (item.createdAt !== undefined && typeof item.createdAt !== 'string') return false;
  if (item.updatedAt !== undefined && typeof item.updatedAt !== 'string') return false;
  if (item.id !== undefined && typeof item.id !== 'string') return false;
  if (item.questionExplanation !== undefined && typeof item.questionExplanation !== 'string') return false;
  if (item.questionAddressing !== undefined && typeof item.questionAddressing !== 'string') return false;
  if (item.suggestions !== undefined && typeof item.suggestions !== 'string') return false;

  return true;
}

/**
 * Reads and validates feedback entries from a localStorage JSON string.
 */
export function readFeedbackEntries(raw: string | null): FeedbackEntry[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[]') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed.filter(isFeedbackEntry);
  }
  if (isFeedbackEntry(parsed)) {
    return [parsed];
  }
  return [];
}

export const readFeedback = readFeedbackEntries;

/**
 * Serializes feedback entries to JSON string for persistence.
 */
export function writeFeedbackEntries(entries: FeedbackEntry[]): string {
  return JSON.stringify(entries);
}

export const writeFeedback = writeFeedbackEntries;

/**
 * Pure function to insert or update an evaluation, preventing duplicates by sessionId.
 */
export function upsertFeedbackEntry(
  existing: FeedbackEntry[],
  entry: FeedbackEntry
): FeedbackEntry[] {
  const index = existing.findIndex(
    (e) => e.sessionId === entry.sessionId || (entry.id && e.id === entry.id)
  );
  if (index === -1) {
    return [...existing, entry];
  }
  const updated = [...existing];
  updated[index] = {
    ...entry,
    createdAt: existing[index].createdAt ?? entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
  return updated;
}

export const upsertFeedback = upsertFeedbackEntry;

/**
 * Removes an evaluation entry by sessionId or id.
 */
export function removeFeedbackEntry(
  existing: FeedbackEntry[],
  idOrSessionId: string
): FeedbackEntry[] {
  return existing.filter((e) => e.id !== idOrSessionId && e.sessionId !== idOrSessionId);
}

/**
 * Calculates completion metrics across the 13 required evaluation sessions.
 */
export function calculateFeedbackProgress(entries: FeedbackEntry[]): FeedbackProgress {
  const sessionStatuses: FeedbackSessionStatus[] = [];
  let evaluatedCount = 0;
  const evaluatedSessionIds: string[] = [];
  const evaluatedIdSet = new Set<string>();

  for (const session of FEEDBACK_SESSIONS) {
    const entry = entries.find(
      (e) =>
        e.sessionId === session.id ||
        e.sessionId === `row-${session.rowNumber}`
    );

    if (entry && !evaluatedIdSet.has(session.id)) {
      evaluatedCount += 1;
      evaluatedIdSet.add(session.id);
      evaluatedSessionIds.push(session.id);
      sessionStatuses.push({
        session,
        status: 'evaluated',
        entry,
      });
    } else {
      sessionStatuses.push({
        session,
        status: 'pending',
      });
    }
  }

  const total = FEEDBACK_SESSIONS.length;
  const pending = Math.max(0, total - evaluatedCount);
  const percentage = total > 0 ? Math.round((evaluatedCount / total) * 100) : 0;
  const isComplete = evaluatedCount >= total;

  return {
    total,
    evaluated: evaluatedCount,
    pending,
    percentage,
    evaluatedCount,
    totalCount: total,
    remainingCount: pending,
    isComplete,
    evaluatedSessionIds,
    sessionStatuses,
  };
}

/**
 * Escapes a cell according to RFC4180 rules for TSV clipboard export.
 */
export function escapeTsvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes('\t') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a feedback evaluation into the exact 13 column values
 * matching columns A–M of the Feedback Sheet worksheet:
 *
 * Col 1 (A): Insert Date
 * Col 2 (B): PIC
 * Col 3 (C): Topic
 * Col 4 (D): Q1 (Communication)
 * Col 5 (E): Q2 (Alignment)
 * Col 6 (F): Q3 (Understanding)
 * Col 7 (G): Q4 (Readiness)
 * Col 8 (H): Q5 (Pace)
 * Col 9 (I): Q6 (Overall)
 * Col 10 (J): Questions? (YES/NO)
 * Col 11 (K): Please explain your answer
 * Col 12 (L): How would you like your question to be addressed?
 * Col 13 (M): Any suggestions to improve the onboarding process in the future?
 */
export function formatFeedbackRowValues(entry: FeedbackEntry | FeedbackClipboardInput): string[] {
  const date = entry.date ? formatFeedbackDate(entry.date) : '';
  const pic = entry.pic ?? '';
  const topic = (entry as FeedbackEntry).sessionTitle ?? (entry as FeedbackClipboardInput).topic ?? '';

  const ratings = (entry.ratings ?? {}) as Record<string, unknown>;

  const q1 = toLikertLabel(ratings.communication ?? ratings.q1);
  const q2 = toLikertLabel(ratings.alignment ?? ratings.q2);
  const q3 = toLikertLabel(ratings.understanding ?? ratings.q3);
  const q4 = toLikertLabel(ratings.readiness ?? ratings.q4);
  const q5 = toLikertLabel(ratings.pace ?? ratings.q5);
  const q6 = toLikertLabel(ratings.overall ?? ratings.q6);

  let hasQuestions = '';
  if (entry.hasQuestions === true) hasQuestions = 'YES';
  else if (entry.hasQuestions === false) hasQuestions = 'NO';

  const rawEntry = entry as Record<string, unknown>;
  const explanation = entry.questionExplanation ?? (typeof rawEntry.explanation === 'string' ? rawEntry.explanation : '');
  const howAddressed = entry.questionAddressing ?? (typeof rawEntry.howAddressed === 'string' ? rawEntry.howAddressed : '');
  const suggestions = entry.suggestions ?? '';

  return [
    date,
    pic,
    topic,
    q1,
    q2,
    q3,
    q4,
    q5,
    q6,
    hasQuestions,
    explanation,
    howAddressed,
    suggestions,
  ];
}

/**
 * Serializes a feedback evaluation into the exact 13-column TSV row
 * matching columns A–M of the Feedback Sheet worksheet.
 */
export function clipboardRowForFeedback(entry: FeedbackEntry | FeedbackClipboardInput): string {
  return formatFeedbackRowValues(entry).map(escapeTsvCell).join('\t');
}

/**
 * Serializes all 14 official feedback sessions (rows 3–16) into a complete multi-line TSV block
 * for columns A–M. Designed for 1-click paste starting at cell A3 in 'Feedback Sheet'.
 */
export function clipboardBlockForFeedback(entries: FeedbackEntry[]): string {
  const lines: string[] = [];

  for (const session of FEEDBACK_SESSIONS) {
    const entry = entries.find(
      (e) => e.sessionId === session.id || e.sessionId === `row-${session.rowNumber}`
    );

    if (entry) {
      lines.push(clipboardRowForFeedback(entry));
    } else {
      const emptyRow = [
        '',
        session.pic,
        session.title,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ];
      lines.push(emptyRow.map(escapeTsvCell).join('\t'));
    }
  }

  return lines.join('\n');
}
