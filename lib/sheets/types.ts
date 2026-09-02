import type { Activity } from '@/lib/types/activity';

export function isActivity(value: unknown): value is Activity {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.type === 'string' && typeof item.plannedStart === 'string' && typeof item.plannedEnd === 'string' && ['not-started', 'in-progress', 'done', 'overdue'].includes(String(item.status));
}

export function isActivityList(value: unknown): value is Activity[] {
  return Array.isArray(value) && value.every(isActivity);
}
