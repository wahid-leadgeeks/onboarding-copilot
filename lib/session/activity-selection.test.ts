import { selectCurrentActivity, selectUpcomingActivities } from './activity-selection';
import type { Activity } from '@/lib/types/activity';

const activities: Activity[] = [
  { id: 'a', name: 'A', type: 'learning', plannedStart: '09:00', plannedEnd: '10:00', status: 'not-started' },
  { id: 'b', name: 'B', type: 'learning', plannedStart: '10:00', plannedEnd: '11:00', status: 'not-started' },
];

describe('activity selection', () => {
  it('selects the first incomplete activity', () => {
    expect(selectCurrentActivity(activities, new Set(['a']))?.id).toBe('b');
  });
  it('returns only incomplete activities after current', () => {
    expect(selectUpcomingActivities(activities, 'a', new Set(['a'])).map((item) => item.id)).toEqual(['b']);
  });
});
