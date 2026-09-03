export function formatStartedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `Started at ${hours}:${minutes}`;
}

export function getProgressLabel({ completed, inProgress, total }: { completed: number; inProgress: number; total: number }): string {
  const remaining = Math.max(0, total - completed - inProgress);
  if (completed === total && total > 0) return `${completed} completed · Nothing else scheduled`;
  if (inProgress > 0) return `${inProgress} in progress · ${remaining} remaining`;
  return `${completed} completed · ${remaining} remaining`;
}

/** Local sessions stay authoritative until a Sheets write is confirmed, so the higher count wins. */
export function mergeCompletedCount(serverCompleted: number | null, localCompleted: number): number {
  return Math.max(serverCompleted ?? 0, localCompleted);
}
