import type { Activity } from '@/lib/types/activity';

export function selectCurrentActivity(activities: Activity[], completedIds: ReadonlySet<string>): Activity | null {
  return activities.find((activity) => !completedIds.has(activity.id) && activity.status !== 'done') ?? null;
}

export function selectUpcomingActivities(activities: Activity[], currentId: string | undefined, completedIds: ReadonlySet<string>): Activity[] {
  return activities.filter((activity) => activity.id !== currentId && !completedIds.has(activity.id) && activity.status !== 'done');
}
