import { isActivity } from './types';

describe('isActivity', () => {
  it('accepts the canonical schedule shape', () => {
    expect(isActivity({ id: 'a', name: 'A', type: 'learning', plannedStart: '09:00', plannedEnd: '10:00', status: 'not-started' })).toBe(true);
  });

  it('rejects rows with unsupported status values', () => {
    expect(isActivity({ id: 'a', name: 'A', type: 'learning', plannedStart: '09:00', plannedEnd: '10:00', status: 'complete' })).toBe(false);
  });
});
