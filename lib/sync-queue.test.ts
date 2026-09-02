import { enqueueSync, readPendingSyncs } from './sync-queue';

describe('sync queue', () => {
  const item = { activityId: 'a', actualStart: '2026-09-02T09:00:00.000Z', actualEnd: '2026-09-02T10:00:00.000Z', durationMinutes: 60 };
  it('rejects malformed persisted entries', () => expect(readPendingSyncs('[{"activityId":"a"}]')).toEqual([]));
  it('deduplicates the same activity start', () => {
    const queued = enqueueSync(enqueueSync([], item), item);
    expect(queued).toHaveLength(1);
    expect(queued[0].attempts).toBe(0);
  });
});
