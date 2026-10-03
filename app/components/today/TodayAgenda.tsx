'use client';

import { getPicBadge, type ScheduleActivity } from '@/lib/schedule-catalog';
import { topicTitle } from '@/lib/today-view';
import { RowTag } from '@/app/components/RowTag';
import { IconCheck } from '@/app/components/Icons';

export interface TodayAgendaProps {
  /** False on the server and the first client paint: "today" is only known after mount. */
  ready: boolean;
  items: ScheduleActivity[];
  /** True when nothing is dated today and `items` are the next open activities instead. */
  isFallback: boolean;
  /** Size of the full schedule, for the "View full schedule (N)" link. */
  catalogCount: number;
  isDone: (item: ScheduleActivity) => boolean;
  currentActivityId: string | null;
  onOpen: (item: ScheduleActivity) => void;
  onFocus: (item: ScheduleActivity) => void;
}

function timeLabel(item: ScheduleActivity): string {
  if (item.startTime && item.endTime) return `${item.startTime} - ${item.endTime}`;
  if (item.durationMinutes) return `${item.durationMinutes}m`;
  return 'Flexible';
}

export function TodayAgenda({ ready, items, isFallback, catalogCount, isDone, currentActivityId, onOpen, onFocus }: TodayAgendaProps) {
  return (
    <section data-tour="day-timeline" aria-busy={!ready} className="animate-fade-up stagger-2 mt-10 min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
              {ready && isFallback ? 'Up Next in Your Journey' : "Today's Agenda"}
            </h2>
            {ready && (
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                {items.length} {items.length === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            {!ready
              ? 'Loading today’s activities…'
              : isFallback
              ? 'Nothing is dated today. Here are your next onboarding activities:'
              : 'Your activities for today · Tap one for details'}
          </p>
        </div>

        <a
          href="/schedule"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95 sm:min-h-9"
        >
          View full schedule ({catalogCount}) →
        </a>
      </div>

      {!ready ? (
        <div className="space-y-2.5" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 rounded-2xl border border-stone-100 bg-stone-50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
          <p className="text-sm font-medium">All onboarding activities have been completed! 🎉</p>
          <a href="/schedule" className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-mint-700 underline underline-offset-4">
            Browse all activities in the schedule →
          </a>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const done = isDone(item);
            const current = currentActivityId === item.id;
            return (
              <li
                key={item.id}
                // Pointer convenience: the whole card opens details. Keyboard and screen readers use the title button.
                onClick={(event) => {
                  if (!(event.target instanceof Element) || !event.target.closest('button, a')) onOpen(item);
                }}
                className={`group relative flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-3.5 transition-all focus-within:ring-2 focus-within:ring-stone-900/20 sm:flex-row sm:items-center sm:px-4 sm:py-3 ${
                  current
                    ? 'border-peach-300 bg-peach-50/60 shadow-2xs'
                    : done
                    ? 'border-stone-100 bg-white/70 hover:border-stone-200 hover:bg-white'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      done ? 'bg-mint-100 text-mint-800' : current ? 'animate-pulse bg-peach-100 text-peach-800' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {done ? (
                      <IconCheck className="h-3.5 w-3.5" />
                    ) : current ? (
                      <span className="size-2 rounded-full bg-peach-600" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-stone-300" />
                    )}
                  </span>

                  <div className="flex shrink-0 items-center gap-2">
                    <RowTag rowNumber={item.rowNumber} />
                    <span className="text-xs font-medium text-stone-500">{timeLabel(item)}</span>
                  </div>

                  <h3 className="min-w-0 flex-1 text-sm font-medium text-stone-900">
                    <button type="button" onClick={() => onOpen(item)} className="flex min-h-11 w-full min-w-0 flex-col justify-center text-left sm:min-h-0">
                      <span className="block truncate">{topicTitle(item.topic)}</span>
                      {done && <span className="sr-only"> (done)</span>}
                    </button>
                  </h3>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-2 pl-9 sm:justify-end sm:pl-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPicBadge(item.pic)}`}>{item.pic}</span>

                  {done ? (
                    <span className="px-2 py-0.5 text-xs font-semibold text-mint-700">Done ✓</span>
                  ) : current ? (
                    <span className="rounded-full bg-peach-100 px-2.5 py-1 text-xs font-semibold text-peach-800">Active Focus</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onFocus(item)}
                      className="inline-flex min-h-11 items-center rounded-full bg-stone-100 px-3 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95 sm:min-h-8"
                    >
                      Focus / Start
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
