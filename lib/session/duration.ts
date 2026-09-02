/** Returns elapsed whole minutes, clamped to zero for invalid ordering. */
export function calculateDurationMinutes(start: Date, end: Date): number {
  const elapsed = end.getTime() - start.getTime();
  return elapsed > 0 ? Math.floor(elapsed / 60_000) : 0;
}
