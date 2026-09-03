export const GUIDE_TOUR_STORAGE_KEY = 'onboarding-guide-tour';

export type GuideTourState = {
  completed: boolean;
  completedAt?: string;
};

/** Parses and validates persisted guide tour state (localStorage is untrusted input). */
export function readGuideTourState(raw: string | null): GuideTourState | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.completed !== 'boolean') return null;
  const state: GuideTourState = { completed: item.completed };
  if (typeof item.completedAt === 'string') state.completedAt = item.completedAt;
  return state;
}

/** Serializes guide tour state for persistence. */
export function writeGuideTourState(state: GuideTourState): string {
  return JSON.stringify(state);
}

/** Keeps a step index inside [0, total - 1]; empty tours resolve to 0. */
export function clampStep(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}
