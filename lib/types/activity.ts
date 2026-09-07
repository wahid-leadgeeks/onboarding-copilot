export type ActivityStatus = 'not-started' | 'in-progress' | 'done' | 'overdue';

export interface Activity {
  id: string;
  name: string;
  type: string;
  plannedStart: string;
  plannedEnd: string;
  status: ActivityStatus;
  actualStart?: string;
  actualEnd?: string;
  durationMinutes?: number;
  date?: string;
  day?: string;
  activityCount?: number;
  pic?: string;
  notes?: string;
}
