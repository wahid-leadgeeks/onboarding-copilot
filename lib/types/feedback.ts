/**
 * Types for the Feedback Sheet System (Milestone 2)
 * Aligned with the official HR Onboarding Kit (Feedback Sheet worksheet, Rows 4-16)
 */

export type LikertScore = 1 | 2 | 3 | 4 | 5;

export type LikertLabel =
  | '5. Very Good'
  | '4. Good'
  | '3. Neutral'
  | '2. Poor'
  | '1. Very Poor';

export type FeedbackRatingDimension =
  | 'communication'
  | 'alignment'
  | 'understanding'
  | 'readiness'
  | 'pace'
  | 'overall';

export type FeedbackDimensionKey = FeedbackRatingDimension;

export interface FeedbackRatings {
  communication: LikertScore;
  alignment: LikertScore;
  understanding: LikertScore;
  readiness: LikertScore;
  pace: LikertScore;
  overall: LikertScore;
}

export interface FeedbackDimensionDefinition {
  key: FeedbackRatingDimension;
  dimensionNumber: 1 | 2 | 3 | 4 | 5 | 6;
  columnLetter: 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
  shortLabel: string;
  statement: string;
}

export interface FeedbackSession {
  id: string;
  title: string;
  pic: string;
  rowNumber: number;
  topic?: string;
  row?: number;
  department?: string;
}

export type FeedbackSessionDefinition = FeedbackSession;

export interface FeedbackEntry {
  sessionId: string;
  sessionTitle: string;
  pic: string;
  date: string;
  ratings: FeedbackRatings;
  hasQuestions: boolean;
  questionExplanation?: string;
  questionAddressing?: string;
  suggestions?: string;
  createdAt: string;
  updatedAt?: string;
  id?: string;
}

export interface CreateFeedbackInput {
  sessionId: string;
  sessionTitle?: string;
  pic?: string;
  date?: string;
  ratings: FeedbackRatings;
  hasQuestions: boolean;
  questionExplanation?: string;
  questionAddressing?: string;
  suggestions?: string;
}

export interface FeedbackClipboardInput {
  date?: string;
  pic?: string;
  topic?: string;
  sessionTitle?: string;
  ratings?:
    | Partial<FeedbackRatings>
    | {
        communication?: number | string;
        alignment?: number | string;
        understanding?: number | string;
        readiness?: number | string;
        pace?: number | string;
        overall?: number | string;
        q1?: number | string;
        q2?: number | string;
        q3?: number | string;
        q4?: number | string;
        q5?: number | string;
        q6?: number | string;
      };
  hasQuestions?: boolean;
  questionExplanation?: string;
  explanation?: string;
  questionAddressing?: string;
  howAddressed?: string;
  suggestions?: string;
}

export interface FeedbackSessionStatus {
  session: FeedbackSession;
  status: 'evaluated' | 'pending';
  entry?: FeedbackEntry;
}

export interface FeedbackProgress {
  total: number;
  evaluated: number;
  pending: number;
  percentage: number;
  evaluatedCount: number;
  totalCount: number;
  remainingCount: number;
  isComplete: boolean;
  evaluatedSessionIds: string[];
  sessionStatuses: FeedbackSessionStatus[];
}
