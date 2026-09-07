/**
 * Types for Milestone 3: Interactive Timeline & Evidence Tracker
 * Aligned with the official HR Onboarding Kit (Timeline worksheet, Rows 2-4, Columns A-I)
 */

export type TimelineStageNumber = '1.0' | '2.0' | '3.0';
export type TimelineStageId = TimelineStageNumber | 'stage-1' | 'stage-2' | 'stage-3';

export interface TimelineEvidenceItem {
  id: string; // e.g. 'stage-1-evidence-1'
  stageId: TimelineStageNumber | string; // '1.0' or 'stage-1'
  text: string; // Official deliverable label
  title?: string;
  label?: string;
  order?: number;
  index?: number;
  globalIndex?: number; // 1..12 across entire journey
  description?: string;
}

export interface StageDates {
  startDate: string; // ISO 'YYYY-MM-DD' or Sheet 'DD/MM/YYYY'
  endDate: string; // ISO 'YYYY-MM-DD' or Sheet 'DD/MM/YYYY'
}

export interface TimelineStage {
  id: string; // Canonical stage ID ('stage-1' or '1.0')
  stageNumber: TimelineStageNumber; // '1.0' | '2.0' | '3.0'
  name: string; // Official worksheet name (Title + pedagogical model)
  stageName?: string; // Alias for name
  title: string; // Clean UI title
  pedagogicalSubtitle: string; // e.g. 'Month 1: Weeks 1–4'
  subtitle?: string; // Alias for pedagogicalSubtitle
  pedagogy?: string; // e.g. '“I do, you see”'
  pedagogicalModel?: string; // Alias for pedagogy
  objective: string; // Developmental objective
  duration: string; // '1 Month'
  keyActivities: string; // Weekly syllabus execution details
  deliverables: readonly TimelineEvidenceItem[]; // Official checklist items
  evidenceDeliverables?: readonly TimelineEvidenceItem[]; // Alias for deliverables
  evidenceItems?: readonly TimelineEvidenceItem[]; // Alias for deliverables
  defaultDates?: StageDates;
  topicCovered?: string; // Worksheet Column I
}

export type TimelineStageDefinition = TimelineStage;

export interface TimelineStageState {
  dates: StageDates;
  evidence: Record<string, boolean>;
}

export interface TimelineState {
  stages: Record<string, TimelineStageState>;
  stageDates: Record<string, StageDates>;
  completedEvidence: Record<string, boolean>;
  updatedAt?: string;
}

export interface StageProgress {
  stageId: string;
  stageNumber?: TimelineStageNumber;
  stageName?: string;
  total: number;
  completed: number;
  percentage: number; // 0..100 integer
  isComplete: boolean;
  totalCount?: number;
  completedCount?: number;
  remainingCount?: number;
  completedItemIds?: string[];
  evidenceStatuses?: Array<{
    item: TimelineEvidenceItem;
    completed: boolean;
  }>;
}

export interface TimelineProgress {
  overallPercentage: number;
  totalDeliverables: number;
  completedDeliverables: number;
  stageProgress: StageProgress[] & Record<string, StageProgress>;
  totalCount: number;
  completedCount: number;
  remainingCount: number;
  total: number;
  completed: number;
  percentage: number;
  isComplete: boolean;
  stageProgresses?: Record<string, StageProgress>;
  currentDay?: number;
  totalDays?: number;
  timePercentage?: number;
}

export type OverallTimelineProgress = TimelineProgress;

export interface TimelineClipboardOptions {
  includeHeader?: boolean;
  markDoneTag?: string; // Defaults to '[DONE]'
  includePendingTag?: boolean; // Defaults to true
}
