import { calculateDurationMinutes } from './duration';

describe('calculateDurationMinutes', () => {
  it('calculates whole elapsed minutes', () => {
    expect(calculateDurationMinutes(new Date('2026-09-02T09:00:00Z'), new Date('2026-09-02T10:14:59Z'))).toBe(74);
  });

  it('clamps an end before start to zero', () => {
    expect(calculateDurationMinutes(new Date('2026-09-02T10:00:00Z'), new Date('2026-09-02T09:00:00Z'))).toBe(0);
  });
});
