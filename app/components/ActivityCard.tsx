export type ActivityCardModel = {
  id: string;
  name: string;
  time?: string;
  plannedStart?: string;
  plannedEnd?: string;
  status: string;
  type?: string;
};

export function ActivityCard({ activity }: { activity: ActivityCardModel }) {
  const statusLabel = activity.status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return (
    <div className="mb-3 flex min-h-11 justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div>
        <p className="font-medium">{activity.name}</p>
        {activity.type && <p className="text-xs uppercase tracking-wide text-slate-400">{activity.type}</p>}
        <p className="text-sm text-slate-500">{activity.time ?? `${activity.plannedStart ?? ''} – ${activity.plannedEnd ?? ''}`}</p>
      </div>
      <span className="text-sm text-slate-500">{statusLabel}</span>
    </div>
  );
}
