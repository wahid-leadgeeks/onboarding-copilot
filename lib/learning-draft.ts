/**
 * Pure state machine for the post-session learning capture (ADR-0003).
 *
 * AI output is untrusted: a generated summary reaches the saved record only
 * after explicit user confirmation, editing or rejecting it resets that
 * confirmation, and a provider failure never blocks manual capture.
 */

/** Status of the summarize flow: settled, in flight, or failed. */
export type LearningDraftStatus = 'idle' | 'summarizing' | 'summarize-failed';

export type LearningSubmissionSource = 'manual' | 'ai-assisted';

/** Pre-filled or user-adjusted activity metadata for the 9-column HR diary row. */
export type ActivityMetadata = {
  topic: string;
  pic: string;
  day: string;
  date: string;
  week: string | number;
  activityCount: string | number;
};

export type LearningDraftState = {
  // Content Fields
  raw: string;
  takeaway1: string;
  takeaway2: string;
  takeaway3: string;
  notes: string;

  // Pre-filled Activity Metadata
  topic: string;
  pic: string;
  day: string;
  date: string;
  week: string | number;
  activityCount: string | number;

  // Voice Listening State (Web Speech API)
  isListening: boolean;
  transcript: string;

  // AI Structuring State (ADR-0003)
  isStructuring: boolean;
  aiError: string | null;
  summaryConfirmed: boolean;
  aiGenerated: boolean;
  preAiNotes?: string;

  // Backward Compatibility
  summary: string | null;
  status: LearningDraftStatus;
};

export type InitialLearningDraftOptions = {
  raw?: string;
  takeaway1?: string;
  takeaway2?: string;
  takeaway3?: string;
  notes?: string;
  topic?: string;
  pic?: string;
  day?: string;
  date?: string;
  week?: string | number;
  activityCount?: string | number;
};

export type LearningSubmission = {
  readonly content: string;
  readonly source: LearningSubmissionSource;
  readonly takeaway1?: string;
  readonly takeaway2?: string;
  readonly takeaway3?: string;
  readonly takeaways?: [string, string, string];
  readonly notes?: string;
  readonly topic?: string;
  readonly pic?: string;
  readonly day?: string;
  readonly date?: string;
  readonly week?: string | number;
  readonly activityCount?: string | number;
};

export type LearningDraftAction =
  | { type: 'type-raw'; content: string }
  | { type: 'type-takeaway'; index: 1 | 2 | 3; content: string }
  | { type: 'type-takeaway1'; content: string }
  | { type: 'type-takeaway2'; content: string }
  | { type: 'type-takeaway3'; content: string }
  | { type: 'type-notes'; content: string }
  | { type: 'set-metadata'; metadata: Partial<ActivityMetadata> }
  | { type: 'set-topic'; topic: string }
  | { type: 'set-pic'; pic: string }
  | { type: 'set-day'; day: string }
  | { type: 'set-date'; date: string }
  | { type: 'set-week'; week: string | number }
  | { type: 'set-activity-count'; count: string | number }
  | { type: 'voice-start' }
  | { type: 'voice-result'; transcript: string }
  | { type: 'voice-end' }
  | { type: 'voice-error'; error?: string }
  | { type: 'voice-clear' }
  | { type: 'apply-transcript-to-notes' }
  | { type: 'apply-transcript-to-raw' }
  | { type: 'structure-started' }
  | { type: 'summarize-started' }
  | {
      type: 'structure-succeeded';
      takeaways: [string, string, string] | string[];
      notes?: string;
    }
  | {
      type: 'summarize-succeeded';
      summary?: string;
      takeaways?: [string, string, string] | string[];
      takeaway1?: string;
      takeaway2?: string;
      takeaway3?: string;
      notes?: string;
    }
  | { type: 'structure-failed'; error?: string }
  | { type: 'summarize-failed'; error?: string }
  | { type: 'confirm-structure' }
  | { type: 'confirm-summary' }
  | { type: 'edit-summary'; content: string }
  | { type: 'reject-structure' }
  | { type: 'reject-summary' }
  | { type: 'reset'; seed?: InitialLearningDraftOptions | string };

export function initialLearningDraft(seed?: InitialLearningDraftOptions | string): LearningDraftState {
  if (typeof seed === 'string') {
    return {
      raw: seed,
      takeaway1: '',
      takeaway2: '',
      takeaway3: '',
      notes: '',
      topic: '',
      pic: '',
      day: '',
      date: '',
      week: '',
      activityCount: '',
      isListening: false,
      transcript: '',
      isStructuring: false,
      aiError: null,
      summaryConfirmed: false,
      aiGenerated: false,
      summary: null,
      status: 'idle',
    };
  }

  const options = seed ?? {};
  return {
    raw: options.raw ?? '',
    takeaway1: options.takeaway1 ?? '',
    takeaway2: options.takeaway2 ?? '',
    takeaway3: options.takeaway3 ?? '',
    notes: options.notes ?? '',
    topic: options.topic ?? '',
    pic: options.pic ?? '',
    day: options.day ?? '',
    date: options.date ?? '',
    week: options.week ?? '',
    activityCount: options.activityCount ?? '',
    isListening: false,
    transcript: '',
    isStructuring: false,
    aiError: null,
    summaryConfirmed: false,
    aiGenerated: false,
    summary: null,
    status: 'idle',
  };
}

export function parseTakeawaysFromSummary(summary: string): {
  takeaway1: string;
  takeaway2: string;
  takeaway3: string;
  notes?: string;
} {
  if (!summary || typeof summary !== 'string') {
    return { takeaway1: '', takeaway2: '', takeaway3: '' };
  }

  const lines = summary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items: string[] = [];
  const notesLines: string[] = [];
  let inNotes = false;

  for (const line of lines) {
    if (/^(notes?|observations?|follow[- ]?ups?):/i.test(line)) {
      inNotes = true;
      const stripped = line.replace(/^(notes?|observations?|follow[- ]?ups?):\s*/i, '');
      if (stripped) notesLines.push(stripped);
      continue;
    }
    if (inNotes) {
      notesLines.push(line);
      continue;
    }

    const clean = line
      .replace(/^([0-9]+[.)]\s*|[-*•]\s*)/, '')
      .replace(/^(core concept|concept|process & standard|process|standard|practical application|application):\s*/i, '')
      .trim();

    if (clean) items.push(clean);
  }

  return {
    takeaway1: items[0] ?? '',
    takeaway2: items[1] ?? '',
    takeaway3: items[2] ?? '',
    notes: notesLines.length > 0 ? notesLines.join('\n') : undefined,
  };
}

export function formatTakeaways(
  takeaways: [string, string, string] | readonly [string, string, string] | string[],
  notes?: string,
): string {
  const lines: string[] = [];
  takeaways.forEach((item) => {
    const trimmed = item.trim();
    if (trimmed) {
      if (/^\d+[\.\)\-]\s+/.test(trimmed)) {
        lines.push(trimmed);
      } else {
        lines.push(`${lines.length + 1}. ${trimmed}`);
      }
    }
  });
  const takeawayBlock = lines.join('\n');
  const trimmedNotes = notes?.trim();
  if (takeawayBlock && trimmedNotes) {
    return `${takeawayBlock}\n\nNotes:\n${trimmedNotes}`;
  }
  if (takeawayBlock) return takeawayBlock;
  if (trimmedNotes) return trimmedNotes;
  return '';
}

export function learningDraftReducer(state: LearningDraftState, action: LearningDraftAction): LearningDraftState {
  switch (action.type) {
    case 'type-raw':
      return { ...state, raw: action.content };

    case 'type-takeaway': {
      const field = action.index === 1 ? 'takeaway1' : action.index === 2 ? 'takeaway2' : 'takeaway3';
      return {
        ...state,
        [field]: action.content,
        summaryConfirmed: false,
      };
    }

    case 'type-takeaway1':
      return { ...state, takeaway1: action.content, summaryConfirmed: false };

    case 'type-takeaway2':
      return { ...state, takeaway2: action.content, summaryConfirmed: false };

    case 'type-takeaway3':
      return { ...state, takeaway3: action.content, summaryConfirmed: false };

    case 'type-notes':
      return {
        ...state,
        notes: action.content,
        summaryConfirmed: state.aiGenerated ? false : state.summaryConfirmed,
      };

    case 'set-metadata':
      return { ...state, ...action.metadata };

    case 'set-topic':
      return { ...state, topic: action.topic };

    case 'set-pic':
      return { ...state, pic: action.pic };

    case 'set-day':
      return { ...state, day: action.day };

    case 'set-date':
      return { ...state, date: action.date };

    case 'set-week':
      return { ...state, week: action.week };

    case 'set-activity-count':
      return { ...state, activityCount: action.count };

    case 'voice-start':
      return { ...state, isListening: true };

    case 'voice-result':
      return { ...state, transcript: action.transcript };

    case 'voice-end':
      return { ...state, isListening: false };

    case 'voice-error':
      return { ...state, isListening: false, aiError: action.error ?? null };

    case 'voice-clear':
      return { ...state, transcript: '' };

    case 'apply-transcript-to-notes': {
      if (!state.transcript.trim()) return state;
      const combined = state.notes ? `${state.notes}\n${state.transcript}` : state.transcript;
      return {
        ...state,
        notes: combined,
        transcript: '',
        summaryConfirmed: state.aiGenerated ? false : state.summaryConfirmed,
      };
    }

    case 'apply-transcript-to-raw': {
      if (!state.transcript.trim()) return state;
      const combined = state.raw ? `${state.raw}\n${state.transcript}` : state.transcript;
      return {
        ...state,
        raw: combined,
        transcript: '',
        summaryConfirmed: state.aiGenerated ? false : state.summaryConfirmed,
      };
    }

    case 'structure-started':
      return {
        ...state,
        isStructuring: true,
        status: 'summarizing',
        aiError: null,
        summaryConfirmed: false,
        preAiNotes: state.aiGenerated ? state.preAiNotes : state.notes,
      };

    case 'summarize-started':
      return {
        ...state,
        isStructuring: true,
        status: 'summarizing',
        aiError: null,
      };

    case 'structure-succeeded': {
      const t1 = action.takeaways[0] ?? '';
      const t2 = action.takeaways[1] ?? '';
      const t3 = action.takeaways[2] ?? '';
      const nextNotes = action.notes !== undefined ? action.notes : state.notes;
      const formatted = formatTakeaways([t1, t2, t3], nextNotes);
      return {
        ...state,
        takeaway1: t1,
        takeaway2: t2,
        takeaway3: t3,
        notes: nextNotes,
        preAiNotes: state.aiGenerated ? state.preAiNotes : state.notes,
        summary: formatted,
        isStructuring: false,
        status: 'idle',
        aiGenerated: true,
        summaryConfirmed: false,
        aiError: null,
      };
    }

    case 'summarize-succeeded': {
      let t1 = action.takeaway1 ?? (action.takeaways ? action.takeaways[0] ?? '' : '');
      let t2 = action.takeaway2 ?? (action.takeaways ? action.takeaways[1] ?? '' : '');
      let t3 = action.takeaway3 ?? (action.takeaways ? action.takeaways[2] ?? '' : '');
      let nextNotes = action.notes !== undefined ? action.notes : state.notes;

      if (action.summary && !action.takeaways && !action.takeaway1 && !action.takeaway2 && !action.takeaway3) {
        const parsed = parseTakeawaysFromSummary(action.summary);
        if (parsed.takeaway1 || parsed.takeaway2 || parsed.takeaway3) {
          t1 = parsed.takeaway1;
          t2 = parsed.takeaway2;
          t3 = parsed.takeaway3;
          if (parsed.notes) nextNotes = parsed.notes;
        }
      }

      const summary = action.summary ?? formatTakeaways([t1, t2, t3], nextNotes);

      return {
        ...state,
        takeaway1: t1,
        takeaway2: t2,
        takeaway3: t3,
        notes: nextNotes,
        preAiNotes: state.aiGenerated ? state.preAiNotes : state.notes,
        summary,
        summaryConfirmed: false,
        status: 'idle',
        isStructuring: false,
        aiGenerated: true,
        aiError: null,
      };
    }

    case 'structure-failed':
    case 'summarize-failed':
      return {
        ...state,
        isStructuring: false,
        status: 'summarize-failed',
        aiError: action.error ?? 'Structuring failed',
      };

    case 'confirm-structure':
    case 'confirm-summary':
      if (state.summary === null && !state.aiGenerated) return state;
      return { ...state, summaryConfirmed: true };

    case 'edit-summary':
      if (state.summary === null) return state;
      return { ...state, summary: action.content, summaryConfirmed: false };

    case 'reject-structure':
    case 'reject-summary':
      return {
        ...state,
        summary: null,
        summaryConfirmed: false,
        aiGenerated: false,
        takeaway1: '',
        takeaway2: '',
        takeaway3: '',
        notes: state.preAiNotes !== undefined ? state.preAiNotes : state.notes,
        preAiNotes: undefined,
      };

    case 'reset':
      return initialLearningDraft(action.seed);
  }
}

export function deriveLearningSubmission(
  state: LearningDraftState,
  activity?: ActivityMetadata | Partial<ActivityMetadata> | null,
): LearningSubmission | null {
  const t1 = state.takeaway1.trim();
  const t2 = state.takeaway2.trim();
  const t3 = state.takeaway3.trim();
  const hasTakeaways = Boolean(t1 || t2 || t3);
  const rawTrimmed = state.raw.trim();
  const hasRaw = Boolean(rawTrimmed);
  const summaryTrimmed = state.summary ? state.summary.trim() : '';
  const hasSummary = Boolean(summaryTrimmed);
  const notesTrimmed = state.notes.trim();

  const topic = activity?.topic ?? (state.topic || undefined);
  const pic = activity?.pic ?? (state.pic || undefined);
  const day = activity?.day ?? (state.day || undefined);
  const date = activity?.date ?? (state.date || undefined);
  const week = activity?.week ?? (state.week !== '' ? state.week : undefined);
  const activityCount = activity?.activityCount ?? (state.activityCount !== '' ? state.activityCount : undefined);

  // 1. AI-generated / AI-assisted flow
  if (state.aiGenerated || hasSummary) {
    if (state.summaryConfirmed) {
      let content = '';
      let takeaways: [string, string, string] | undefined = undefined;

      if (hasTakeaways) {
        takeaways = [t1, t2, t3];
        content = formatTakeaways(takeaways, notesTrimmed);
      } else if (hasSummary) {
        content = summaryTrimmed;
      }

      if (content) {
        return {
          content,
          source: 'ai-assisted',
          ...(takeaways ? { takeaways, takeaway1: takeaways[0], takeaway2: takeaways[1], takeaway3: takeaways[2] } : {}),
          ...(notesTrimmed ? { notes: notesTrimmed } : {}),
          ...(topic ? { topic } : {}),
          ...(pic ? { pic } : {}),
          ...(day ? { day } : {}),
          ...(date ? { date } : {}),
          ...(week !== undefined ? { week } : {}),
          ...(activityCount !== undefined ? { activityCount } : {}),
        };
      }

      // If summary is confirmed but empty/whitespace, fall back to manual raw notes if available
      if (hasRaw) {
        return {
          content: rawTrimmed,
          source: 'manual',
          ...(topic ? { topic } : {}),
          ...(pic ? { pic } : {}),
          ...(day ? { day } : {}),
          ...(date ? { date } : {}),
          ...(week !== undefined ? { week } : {}),
          ...(activityCount !== undefined ? { activityCount } : {}),
        };
      }
    }

    // Unconfirmed AI: ADR-0003 strictly blocks saving unconfirmed AI output.
    // Takeaways and user edits must never be silently discarded in favor of raw scratchpad.
    // Saving is disallowed until the user explicitly confirms or rejects the AI structure.
    return null;
  }

  // 2. Pure Manual flow
  if (hasTakeaways) {
    const takeaways: [string, string, string] = [t1, t2, t3];
    const content = formatTakeaways(takeaways, notesTrimmed);
    return {
      content,
      source: 'manual',
      takeaways,
      takeaway1: takeaways[0],
      takeaway2: takeaways[1],
      takeaway3: takeaways[2],
      ...(notesTrimmed ? { notes: notesTrimmed } : {}),
      ...(topic ? { topic } : {}),
      ...(pic ? { pic } : {}),
      ...(day ? { day } : {}),
      ...(date ? { date } : {}),
      ...(week !== undefined ? { week } : {}),
      ...(activityCount !== undefined ? { activityCount } : {}),
    };
  }

  if (hasRaw) {
    return {
      content: rawTrimmed,
      source: 'manual',
      ...(topic ? { topic } : {}),
      ...(pic ? { pic } : {}),
      ...(day ? { day } : {}),
      ...(date ? { date } : {}),
      ...(week !== undefined ? { week } : {}),
      ...(activityCount !== undefined ? { activityCount } : {}),
    };
  }

  if (notesTrimmed) {
    return {
      content: notesTrimmed,
      source: 'manual',
      notes: notesTrimmed,
      ...(topic ? { topic } : {}),
      ...(pic ? { pic } : {}),
      ...(day ? { day } : {}),
      ...(date ? { date } : {}),
      ...(week !== undefined ? { week } : {}),
      ...(activityCount !== undefined ? { activityCount } : {}),
    };
  }

  return null;
}

/** Content that would be persisted: the confirmed summary, else the raw notes; null when empty. */
export function resolvedContent(state: LearningDraftState): string | null {
  if (state.summaryConfirmed && state.summary !== null) {
    const summary = state.summary.trim();
    if (summary !== '') return summary;
  }
  return deriveLearningSubmission(state)?.content ?? null;
}

/** Whether the draft holds saveable, user-owned content. */
export function canSaveLearning(state: LearningDraftState): boolean {
  return deriveLearningSubmission(state) !== null;
}

/** Whether the user may request a summary / structuring right now. */
export function canRequestSummary(state: LearningDraftState): boolean {
  if (state.isStructuring || state.status === 'summarizing') return false;
  return state.raw.trim() !== '' || state.transcript.trim() !== '' || state.notes.trim() !== '';
}
