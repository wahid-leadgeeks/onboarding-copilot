/**
 * Core business logic, storage helpers, progress calculation, and TSV clipboard serializers
 * for Milestone 3: Interactive Timeline & Evidence Tracker.
 *
 * Aligned with rows 2-4 and columns A-I of the 'Timeline' worksheet in the official HR workbook.
 */

import type {
  StageDates,
  StageProgress,
  TimelineClipboardOptions,
  TimelineEvidenceItem,
  TimelineProgress,
  TimelineStage,
  TimelineStageState,
  TimelineState,
} from '@/lib/types/timeline';

export * from '@/lib/types/timeline';

export const TIMELINE_STORAGE_KEY = 'onboarding-timeline';

export const TIMELINE_HEADERS = [
  'Stage #',
  'Stage Name',
  'Start',
  'End',
  'Objective',
  'Key Activities',
  'Outputs / Evidence',
  'Minimum Duration',
  'Topic Covered',
] as const;

/**
 * Official Stage 1.0 deliverables (5 evidence items)
 */
export const STAGE_1_EVIDENCE: readonly TimelineEvidenceItem[] = [
  {
    id: 'stage-1-evidence-1',
    stageId: '1.0',
    text: 'Completed training checklist',
    title: 'Completed training checklist',
    label: 'Completed training checklist',
    order: 1,
    index: 1,
    globalIndex: 1,
  },
  {
    id: 'stage-1-evidence-2',
    stageId: '1.0',
    text: 'Learning notes and summary documentation',
    title: 'Learning notes and summary documentation',
    label: 'Learning notes and summary documentation',
    order: 2,
    index: 2,
    globalIndex: 2,
  },
  {
    id: 'stage-1-evidence-3',
    stageId: '1.0',
    text: 'Job shadowing / observation records',
    title: 'Job shadowing / observation records',
    label: 'Job shadowing / observation records',
    order: 3,
    index: 3,
    globalIndex: 3,
  },
  {
    id: 'stage-1-evidence-4',
    stageId: '1.0',
    text: 'Initial capability assessment',
    title: 'Initial capability assessment',
    label: 'Initial capability assessment',
    order: 4,
    index: 4,
    globalIndex: 4,
  },
  {
    id: 'stage-1-evidence-5',
    stageId: '1.0',
    text: 'Completed IT tasks',
    title: 'Completed IT tasks',
    label: 'Completed IT tasks',
    order: 5,
    index: 5,
    globalIndex: 5,
  },
] as const;

/**
 * Official Stage 2.0 deliverables (3 evidence items)
 */
export const STAGE_2_EVIDENCE: readonly TimelineEvidenceItem[] = [
  {
    id: 'stage-2-evidence-1',
    stageId: '2.0',
    text: 'Completed IT tasks',
    title: 'Completed IT tasks',
    label: 'Completed IT tasks',
    order: 1,
    index: 1,
    globalIndex: 6,
  },
  {
    id: 'stage-2-evidence-2',
    stageId: '2.0',
    text: 'Task / work records',
    title: 'Task / work records',
    label: 'Task / work records',
    order: 2,
    index: 2,
    globalIndex: 7,
  },
  {
    id: 'stage-2-evidence-3',
    stageId: '2.0',
    text: 'Feedback & improvement notes',
    title: 'Feedback & improvement notes',
    label: 'Feedback & improvement notes',
    order: 3,
    index: 3,
    globalIndex: 8,
  },
] as const;

/**
 * Official Stage 3.0 deliverables (4 evidence items)
 */
export const STAGE_3_EVIDENCE: readonly TimelineEvidenceItem[] = [
  {
    id: 'stage-3-evidence-1',
    stageId: '3.0',
    text: 'Completed assigned responsibilities',
    title: 'Completed assigned responsibilities',
    label: 'Completed assigned responsibilities',
    order: 1,
    index: 1,
    globalIndex: 9,
  },
  {
    id: 'stage-3-evidence-2',
    stageId: '3.0',
    text: 'Independent work records',
    title: 'Independent work records',
    label: 'Independent work records',
    order: 2,
    index: 2,
    globalIndex: 10,
  },
  {
    id: 'stage-3-evidence-3',
    stageId: '3.0',
    text: 'Improvement / optimization results',
    title: 'Improvement / optimization results',
    label: 'Improvement / optimization results',
    order: 3,
    index: 3,
    globalIndex: 11,
  },
  {
    id: 'stage-3-evidence-4',
    stageId: '3.0',
    text: 'Final onboarding assessment',
    title: 'Final onboarding assessment',
    label: 'Final onboarding assessment',
    order: 4,
    index: 4,
    globalIndex: 12,
  },
] as const;

/**
 * All 12 official evidence deliverables
 */
export const ALL_TIMELINE_EVIDENCE: readonly TimelineEvidenceItem[] = [
  ...STAGE_1_EVIDENCE,
  ...STAGE_2_EVIDENCE,
  ...STAGE_3_EVIDENCE,
] as const;

export const TIMELINE_EVIDENCE_ITEMS = ALL_TIMELINE_EVIDENCE;

/**
 * The 3 official HR stages matching rows 2-4 of the Timeline worksheet.
 */
export const TIMELINE_STAGES: readonly TimelineStage[] = [
  {
    id: 'stage-1',
    stageNumber: '1.0',
    name: 'Training – exposure and knowledge transfer – “I do, you see”',
    stageName: 'Training – exposure and knowledge transfer – “I do, you see”',
    title: 'Training – Exposure and Knowledge Transfer',
    pedagogicalSubtitle: 'Month 1: Weeks 1–4',
    subtitle: 'Month 1: Weeks 1–4',
    pedagogy: '“I do, you see”',
    pedagogicalModel: '“I do, you see”',
    duration: '1 Month',
    objective:
      'Ensure the IT Staff understands LeadGeeks, the IT Department, role responsibilities, current environment, systems, workflows, and expected standards.',
    keyActivities: `Execution:
a. Week 1 – Understanding LeadGeeks & IT Department
- Company & department introduction
- IT Department structure, values, and functions
- IT Staff role & responsibilities
- General collaboration and stakeholder relationships
- IT guidelines and working standards
- Introduction to current IT ecosystem

b. Week 2 – Understanding IT Functions & Current Environment
- Infrastructure Management
- Website Management
- Technology Optimization & Innovation
- Cybersecurity & Data Protection
- Tools, platforms, systems, dependencies and operational scope

c. Week 3 & 4 – Understanding IT Goals and Introduction to Daily IT Responsibilities
- 2026 IT SMART Goals
- Understanding how IT goals supports business objectives
- Observe real IT operational activities
- Observe troubleshooting and technical support
- Observe website/system management
- Observe basic IT infrastructure
- Observe automation/system development
- Observe AI-assisted development/workflows
- Observe cybersecurity/data protection activities`,
    deliverables: STAGE_1_EVIDENCE,
    evidenceDeliverables: STAGE_1_EVIDENCE,
    evidenceItems: STAGE_1_EVIDENCE,
    defaultDates: { startDate: '01/09/2026', endDate: '30/09/2026' },
    topicCovered: '',
  },
  {
    id: 'stage-2',
    stageNumber: '2.0',
    name: 'Trial – performance validation under supervision – “You do, I see”',
    stageName: 'Trial – performance validation under supervision – “You do, I see”',
    title: 'Trial – Performance Validation Under Supervision',
    pedagogicalSubtitle: 'Month 2: Weeks 5–8',
    subtitle: 'Month 2: Weeks 5–8',
    pedagogy: '“You do, I see”',
    pedagogicalModel: '“You do, I see”',
    duration: '1 Month',
    objective:
      'Ensure the IT Staff can apply the knowledge gained during training by executing real IT tasks with guidance and feedback from the IT Manager.',
    keyActivities: `Execution:
- Handle assigned IT operational tasks with guidance 
- Handle technical issues and troubleshooting and escalate when necessary
- Execute basic website/system management tasks
- Execute basic IT infrastructure tasks
- Practice and execute automation, AI-assisted workflow, and system-related tasks
- Practice and execute cybersecurity and data protection tasks
- Communicate task progress and issues
- Receive feedback and improve task execution`,
    deliverables: STAGE_2_EVIDENCE,
    evidenceDeliverables: STAGE_2_EVIDENCE,
    evidenceItems: STAGE_2_EVIDENCE,
    defaultDates: { startDate: '01/10/2026', endDate: '31/10/2026' },
    topicCovered: '',
  },
  {
    id: 'stage-3',
    stageNumber: '3.0',
    name: 'Transition – full role activation with accountability – “You do, I don’t see”',
    stageName: 'Transition – full role activation with accountability – “You do, I don’t see”',
    title: 'Transition – Full Role Activation with Accountability',
    pedagogicalSubtitle: 'Month 3: Weeks 9–12',
    subtitle: 'Month 3: Weeks 9–12',
    pedagogy: '“You do, I don’t see”',
    pedagogicalModel: '“You do, I don’t see”',
    duration: '1 Month',
    objective:
      'Ensure the IT Staff is ready to take full ownership of assigned IT responsibilities and manage tasks, decisions, and outcomes independently with the IT Manager providing escalation support when needed.',
    keyActivities: `Execution:
- Take ownership of assigned IT responsibilities
- Manage routine IT operations and technical support tasks independently
- Execute assigned IT infrastructure, website, automation, AI, and cybersecurity tasks independently
- Make decisions within defined responsibilities and escalate issues when necessary
- Maintain and improve assigned systems, workflows, and processes
- Communicate progress, issues, and risks proactively
- IT Manager shifts from daily guidance to periodic review and escalation support`,
    deliverables: STAGE_3_EVIDENCE,
    evidenceDeliverables: STAGE_3_EVIDENCE,
    evidenceItems: STAGE_3_EVIDENCE,
    defaultDates: { startDate: '01/11/2026', endDate: '30/11/2026' },
    topicCovered: '',
  },
] as const;

/**
 * Stage lookup helper supporting 'stage-1', '1.0', 'stage-2', '2.0', 'stage-3', '3.0', etc.
 */
export function findTimelineStage(stageIdOrNumber: string | number): TimelineStage | undefined {
  if (stageIdOrNumber === undefined || stageIdOrNumber === null) return undefined;
  const q = String(stageIdOrNumber).trim().toLowerCase();
  if (!q) return undefined;
  return TIMELINE_STAGES.find((s) => {
    return (
      s.id.toLowerCase() === q ||
      s.stageNumber.toLowerCase() === q ||
      `stage-${s.stageNumber.replace('.0', '')}` === q ||
      `stage ${s.stageNumber.replace('.0', '')}` === q ||
      s.stageNumber.replace('.0', '') === q ||
      `stage-${s.stageNumber}` === q ||
      s.name.toLowerCase().includes(q)
    );
  });
}

/**
 * Evidence item lookup helper by ID or globalIndex (1..12).
 */
export function findTimelineEvidenceItem(
  idOrIndex: string | number
): TimelineEvidenceItem | undefined {
  if (idOrIndex === undefined || idOrIndex === null) return undefined;
  if (typeof idOrIndex === 'number') {
    return ALL_TIMELINE_EVIDENCE.find((e) => e.globalIndex === idOrIndex);
  }
  const q = String(idOrIndex).trim().toLowerCase();
  if (!q) return undefined;
  return ALL_TIMELINE_EVIDENCE.find(
    (e) => e.id.toLowerCase() === q || String(e.globalIndex) === q
  );
}

/**
 * Normalizes an arbitrary date string (ISO 'YYYY-MM-DD' or 'DD/MM/YYYY')
 * into the canonical spreadsheet format 'DD/MM/YYYY'.
 */
export function normalizeTimelineDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return trimmed;
}

/**
 * Formats a date into 'DD/MM/YYYY' for Excel/Google Sheets compatibility.
 */
export function formatTimelineDateForSheet(date: string | Date | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    return normalizeTimelineDate(date);
  }
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export const formatTimelineDate = formatTimelineDateForSheet;

/**
 * Formats a date into 'YYYY-MM-DD' for HTML <input type="date" />.
 */
export function formatTimelineDateForInput(date: string | Date | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const ddmmyyyyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (ddmmyyyyMatch) {
      const [, d, m, y] = ddmmyyyyMatch;
      return `${y}-${m}-${d}`;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return trimmed;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns canonical default dates for all stages starting from September 1, 2026.
 */
export function getDefaultStageDates(): Record<string, StageDates> {
  const dates1: StageDates = { startDate: '01/09/2026', endDate: '30/09/2026' };
  const dates2: StageDates = { startDate: '01/10/2026', endDate: '31/10/2026' };
  const dates3: StageDates = { startDate: '01/11/2026', endDate: '30/11/2026' };

  return {
    '1.0': dates1,
    '2.0': dates2,
    '3.0': dates3,
    'stage-1': dates1,
    'stage-2': dates2,
    'stage-3': dates3,
  };
}

/**
 * Returns default initial TimelineState.
 */
export function getDefaultTimelineState(): TimelineState {
  const defaultDates = getDefaultStageDates();
  const stages: Record<string, TimelineStageState> = {
    '1.0': { dates: defaultDates['1.0'], evidence: {} },
    '2.0': { dates: defaultDates['2.0'], evidence: {} },
    '3.0': { dates: defaultDates['3.0'], evidence: {} },
    'stage-1': { dates: defaultDates['stage-1'], evidence: {} },
    'stage-2': { dates: defaultDates['stage-2'], evidence: {} },
    'stage-3': { dates: defaultDates['stage-3'], evidence: {} },
  };

  return {
    stages,
    stageDates: defaultDates,
    completedEvidence: {},
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

export const createInitialTimelineState = getDefaultTimelineState;

/**
 * Runtime validator type guard for TimelineState boundary validation.
 */
export function isTimelineState(val: unknown): val is TimelineState {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;

  if (obj.stages && typeof obj.stages === 'object' && !Array.isArray(obj.stages)) {
    return true;
  }
  if (
    obj.stageDates &&
    typeof obj.stageDates === 'object' &&
    !Array.isArray(obj.stageDates) &&
    obj.completedEvidence &&
    typeof obj.completedEvidence === 'object' &&
    !Array.isArray(obj.completedEvidence)
  ) {
    return true;
  }
  if (obj.stageDates && typeof obj.stageDates === 'object' && !Array.isArray(obj.stageDates)) {
    return true;
  }
  return false;
}

/**
 * Reads and sanitizes timeline state from localStorage raw JSON string.
 */
export function readTimelineState(raw: string | null): TimelineState {
  if (!raw || typeof raw !== 'string') {
    return getDefaultTimelineState();
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[]') {
    return getDefaultTimelineState();
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!isTimelineState(parsed)) {
      return getDefaultTimelineState();
    }

    const defaultDates = getDefaultStageDates();
    const stageDates: Record<string, StageDates> = { ...defaultDates };

    // Hydrate stage dates from parsed.stageDates or parsed.stages
    const rawDates = (parsed.stageDates || {}) as Record<string, Partial<StageDates>>;
    const rawStages = (parsed.stages || {}) as Record<
      string,
      { dates?: Partial<StageDates>; evidence?: Record<string, unknown> }
    >;

    const pairs: Array<[string, string]> = [
      ['stage-1', '1.0'],
      ['stage-2', '2.0'],
      ['stage-3', '3.0'],
    ];

    for (const [idKey, numKey] of pairs) {
      const candidate =
        rawDates[idKey] ||
        rawDates[numKey] ||
        rawStages[idKey]?.dates ||
        rawStages[numKey]?.dates;

      if (candidate) {
        const defaultForPair = defaultDates[idKey];
        const start = normalizeTimelineDate(candidate.startDate || defaultForPair.startDate);
        const end = normalizeTimelineDate(candidate.endDate || defaultForPair.endDate);
        const resolved: StageDates = { startDate: start, endDate: end };
        stageDates[idKey] = resolved;
        stageDates[numKey] = resolved;
      }
    }

    // Clean completedEvidence to strictly boolean values
    const completedEvidence: Record<string, boolean> = {};
    const rawEvidence = (parsed.completedEvidence || {}) as Record<string, unknown>;

    for (const [k, v] of Object.entries(rawEvidence)) {
      if (typeof v === 'boolean') {
        completedEvidence[k] = v;
      }
    }

    // Also ingest any evidence stored inside parsed.stages
    for (const st of Object.values(rawStages)) {
      if (st && st.evidence && typeof st.evidence === 'object') {
        for (const [k, v] of Object.entries(st.evidence)) {
          if (typeof v === 'boolean' && completedEvidence[k] === undefined) {
            completedEvidence[k] = v;
          }
        }
      }
    }

    // Build stages object
    const stages: Record<string, TimelineStageState> = {
      '1.0': { dates: stageDates['1.0'], evidence: { ...completedEvidence } },
      '2.0': { dates: stageDates['2.0'], evidence: { ...completedEvidence } },
      '3.0': { dates: stageDates['3.0'], evidence: { ...completedEvidence } },
      'stage-1': { dates: stageDates['stage-1'], evidence: { ...completedEvidence } },
      'stage-2': { dates: stageDates['stage-2'], evidence: { ...completedEvidence } },
      'stage-3': { dates: stageDates['stage-3'], evidence: { ...completedEvidence } },
    };

    return {
      stages,
      stageDates,
      completedEvidence,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return getDefaultTimelineState();
  }
}

/**
 * Serializes timeline state for localStorage persistence.
 */
export function writeTimelineState(state: TimelineState): string {
  return JSON.stringify(state);
}

/**
 * Safely resolves stage dates from TimelineState.
 */
export function getStageDates(
  state: TimelineState,
  stageIdOrNumber: string | number
): StageDates {
  const stage = findTimelineStage(stageIdOrNumber);
  const key = stage ? stage.id : String(stageIdOrNumber);
  const numKey = stage ? stage.stageNumber : String(stageIdOrNumber);

  const dates =
    state.stageDates?.[key] ||
    state.stageDates?.[numKey] ||
    state.stages?.[key]?.dates ||
    state.stages?.[numKey]?.dates;

  if (dates && typeof dates.startDate === 'string' && typeof dates.endDate === 'string') {
    return dates;
  }
  const defaults = getDefaultStageDates();
  return defaults[key] || defaults[numKey] || { startDate: '', endDate: '' };
}

/**
 * Updates stage dates immutably, preserving other dates and syncing all key aliases.
 */
export function updateStageDates(
  state: TimelineState,
  stageIdOrNumber: string | number,
  dates: Partial<StageDates>
): TimelineState {
  const stage = findTimelineStage(stageIdOrNumber);
  const stageId = stage ? stage.id : String(stageIdOrNumber);
  const stageNum = stage ? stage.stageNumber : String(stageIdOrNumber);

  const currentDates = getStageDates(state, stageId);
  const nextStart =
    dates.startDate !== undefined
      ? normalizeTimelineDate(dates.startDate)
      : currentDates.startDate;
  const nextEnd =
    dates.endDate !== undefined
      ? normalizeTimelineDate(dates.endDate)
      : currentDates.endDate;

  const nextStageDatesObj: StageDates = {
    startDate: nextStart,
    endDate: nextEnd,
  };

  const nextStageDates = {
    ...state.stageDates,
    [stageId]: nextStageDatesObj,
    [stageNum]: nextStageDatesObj,
  };

  const nextStages: Record<string, TimelineStageState> = {
    ...state.stages,
    [stageId]: {
      dates: nextStageDatesObj,
      evidence: state.stages?.[stageId]?.evidence || state.completedEvidence || {},
    },
    [stageNum]: {
      dates: nextStageDatesObj,
      evidence: state.stages?.[stageNum]?.evidence || state.completedEvidence || {},
    },
  };

  return {
    ...state,
    stageDates: nextStageDates,
    stages: nextStages,
    updatedAt: new Date().toISOString(),
  };
}

export const updateTimelineStageDates = updateStageDates;

/**
 * Toggles an evidence deliverable completion status immutably.
 */
export function toggleEvidenceItem(
  state: TimelineState,
  evidenceId: string,
  completed?: boolean
): TimelineState {
  const current = Boolean(state.completedEvidence?.[evidenceId]);
  const next = completed !== undefined ? completed : !current;

  const nextEvidence = {
    ...state.completedEvidence,
    [evidenceId]: next,
  };

  const nextStages: Record<string, TimelineStageState> = {};
  for (const [k, v] of Object.entries(state.stages || {})) {
    nextStages[k] = {
      dates: v.dates,
      evidence: {
        ...v.evidence,
        [evidenceId]: next,
      },
    };
  }

  return {
    ...state,
    stages: nextStages,
    completedEvidence: nextEvidence,
    updatedAt: new Date().toISOString(),
  };
}

export const toggleTimelineEvidence = toggleEvidenceItem;

/**
 * Computes progress metrics for an individual stage.
 */
export function calculateStageProgress(
  stage: TimelineStage,
  stateOrEvidence: TimelineState | Record<string, boolean>
): StageProgress {
  let evidenceMap: Record<string, boolean> = {};
  let stagesState: Record<string, TimelineStageState> | undefined;

  if (isTimelineState(stateOrEvidence)) {
    evidenceMap = stateOrEvidence.completedEvidence || {};
    stagesState = stateOrEvidence.stages;
  } else if (stateOrEvidence && typeof stateOrEvidence === 'object') {
    evidenceMap = stateOrEvidence;
  }

  const completedItemIds: string[] = [];
  const evidenceStatuses: Array<{ item: TimelineEvidenceItem; completed: boolean }> = [];

  for (const item of stage.deliverables) {
    const isDone =
      evidenceMap[item.id] === true ||
      stagesState?.[stage.stageNumber]?.evidence?.[item.id] === true ||
      stagesState?.[stage.id]?.evidence?.[item.id] === true;

    if (isDone) {
      completedItemIds.push(item.id);
    }
    evidenceStatuses.push({
      item,
      completed: isDone,
    });
  }

  const total = stage.deliverables.length;
  const completed = completedItemIds.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = total > 0 && completed === total;
  const remainingCount = Math.max(0, total - completed);

  return {
    stageId: stage.id,
    stageNumber: stage.stageNumber,
    stageName: stage.name,
    total,
    completed,
    percentage,
    isComplete,
    totalCount: total,
    completedCount: completed,
    remainingCount,
    completedItemIds,
    evidenceStatuses,
  };
}

/**
 * Computes holistic journey and stage progress across all 12 evidence items.
 */
export function calculateTimelineProgress(
  state: TimelineState,
  options?: {
    currentDate?: Date | string;
    journeyStart?: Date | string;
    totalDays?: number;
  }
): TimelineProgress {
  const stageProgressList: StageProgress[] = [];
  let totalCompleted = 0;

  for (const stage of TIMELINE_STAGES) {
    const sp = calculateStageProgress(stage, state);
    stageProgressList.push(sp);
    totalCompleted += sp.completed;
  }

  const stageProgressMap: Record<string, StageProgress> = {};
  for (const sp of stageProgressList) {
    stageProgressMap[sp.stageId] = sp;
    if (sp.stageNumber) {
      stageProgressMap[sp.stageNumber] = sp;
    }
  }

  // Combine array and map into dual indexable structure
  const stageProgressCombined = Object.assign(stageProgressList, stageProgressMap) as StageProgress[] &
    Record<string, StageProgress>;

  const totalDeliverables = ALL_TIMELINE_EVIDENCE.length; // 12
  const percentage =
    totalDeliverables > 0 ? Math.round((totalCompleted / totalDeliverables) * 100) : 0;
  const isComplete = totalCompleted === totalDeliverables;
  const remainingCount = Math.max(0, totalDeliverables - totalCompleted);

  const totalDays = (options?.totalDays && options.totalDays > 0) ? options.totalDays : 90;
  let currentDay: number | undefined;
  let timePercentage: number | undefined;

  if (options?.currentDate) {
    const now =
      typeof options.currentDate === 'string'
        ? new Date(options.currentDate)
        : options.currentDate;
    const start = options.journeyStart
      ? typeof options.journeyStart === 'string'
        ? new Date(options.journeyStart)
        : options.journeyStart
      : new Date(2026, 8, 1);

    if (!Number.isNaN(now.getTime()) && !Number.isNaN(start.getTime())) {
      const elapsedDays = Math.floor(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
          Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
          86400000
      );
      currentDay = Math.min(totalDays, Math.max(1, elapsedDays + 1));
      timePercentage = Math.round((currentDay / totalDays) * 100);
    }
  }

  return {
    overallPercentage: percentage,
    totalDeliverables,
    completedDeliverables: totalCompleted,
    stageProgress: stageProgressCombined,
    stageProgresses: stageProgressMap,
    totalCount: totalDeliverables,
    completedCount: totalCompleted,
    remainingCount,
    total: totalDeliverables,
    completed: totalCompleted,
    percentage,
    isComplete,
    currentDay,
    totalDays,
    timePercentage,
  };
}

export const calculateOverallTimelineProgress = calculateTimelineProgress;

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
 * Serializes a single stage into an exact 9-column TSV row matching columns A-I of the Timeline sheet:
 *
 * Col 1 (A): Stage #
 * Col 2 (B): Stage Name
 * Col 3 (C): Start (DD/MM/YYYY)
 * Col 4 (D): End (DD/MM/YYYY)
 * Col 5 (E): Objective
 * Col 6 (F): Key Activities
 * Col 7 (G): Outputs / Evidence (multiline checklist with [DONE] / [PENDING])
 * Col 8 (H): Minimum Duration
 * Col 9 (I): Topic Covered
 */
export function clipboardRowForTimelineStage(
  stageIdOrNumber: string | number,
  state: TimelineState,
  options?: TimelineClipboardOptions
): string {
  const stage = findTimelineStage(stageIdOrNumber);
  if (!stage) return '';

  const dates = getStageDates(state, stage.id);
  const startStr = formatTimelineDateForSheet(dates.startDate);
  const endStr = formatTimelineDateForSheet(dates.endDate);

  const doneTag = options?.markDoneTag ?? '[DONE]';
  const includePending = options?.includePendingTag !== false;

  const outputLines = stage.deliverables.map((item) => {
    const isDone = Boolean(
      state.completedEvidence?.[item.id] ??
        state.stages?.[stage.stageNumber]?.evidence?.[item.id] ??
        state.stages?.[stage.id]?.evidence?.[item.id]
    );

    if (isDone) {
      return `- ${item.text} ${doneTag}`;
    }
    if (includePending) {
      return `- ${item.text} [PENDING]`;
    }
    return `- ${item.text}`;
  });

  const outputsStr = outputLines.join('\n');

  const columns = [
    stage.stageNumber,
    stage.name,
    startStr,
    endStr,
    stage.objective,
    stage.keyActivities,
    outputsStr,
    stage.duration,
    stage.topicCovered ?? '',
  ];

  return columns.map(escapeTsvCell).join('\t');
}

/**
 * Serializes the full 3-stage timeline summary for pasting into cell A2 (or A1 with header)
 * of the Timeline worksheet in Google Sheets or Excel.
 */
export function clipboardSummaryForTimeline(
  state: TimelineState,
  options?: TimelineClipboardOptions
): string {
  const rows = TIMELINE_STAGES.map((stage) =>
    clipboardRowForTimelineStage(stage.id, state, options)
  );

  if (options?.includeHeader) {
    const headerRow = TIMELINE_HEADERS.map(escapeTsvCell).join('\t');
    return [headerRow, ...rows].join('\n');
  }

  return rows.join('\n');
}
