'use client';

import type { ScheduleActivity } from '@/lib/schedule-catalog';
import { activityDateLabel, greetingLine, topicTitle } from '@/lib/today-view';
import { IconSprout, IconTree, IconTrophy } from '@/app/components/Icons';

export type SeedlingStage = 'sprout' | 'tree' | 'trophy';

export interface TodayHeaderProps {
  /** False on the server and the first client paint: time-derived text renders only after mount. */
  ready: boolean;
  /** "Sat 3 Oct 2026" (Asia/Jakarta). */
  dateLabel: string;
  greeting: string;
  /** First name, or '' when unknown (no name is shown). */
  userName: string;
  headline: string;
  dayNumber: number;
  totalDays: number;
  todayCompleted: number;
  todayTotal: number;
  todayPercent: number;
  progressLabel: string;
  seedling: { label: string; stage: SeedlingStage };
  /** Shown when nothing is scheduled today. */
  nextActivity: ScheduleActivity | null;
}

function SeedlingIcon({ stage }: { stage: SeedlingStage }) {
  if (stage === 'trophy') return <IconTrophy className="mr-1.5 h-4 w-4 shrink-0 text-sun-500" />;
  if (stage === 'tree') return <IconTree className="mr-1.5 h-4 w-4 shrink-0 text-emerald-600" />;
  return <IconSprout className="mr-1.5 h-4 w-4 shrink-0 text-mint-600" />;
}

export function TodayHeader({
  ready,
  dateLabel,
  greeting,
  userName,
  headline,
  dayNumber,
  totalDays,
  todayCompleted,
  todayTotal,
  todayPercent,
  progressLabel,
  seedling,
  nextActivity,
}: TodayHeaderProps) {
  if (!ready) {
    // Neutral placeholder with the same footprint, so server and first client paint match.
    return (
      <header data-tour="progress-header" aria-busy="true" className="mb-8">
        <p className="h-5 w-48 max-w-full rounded-full bg-stone-100" aria-hidden="true" />
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          <span className="sr-only">Today</span>
          <span aria-hidden="true" className="inline-block h-10 w-72 max-w-full rounded-2xl bg-stone-100 align-middle sm:h-12" />
        </h1>
        <p className="mt-3 h-6 w-64 max-w-full rounded-full bg-stone-100" aria-hidden="true" />
      </header>
    );
  }

  const offDay = todayTotal === 0;

  return (
    <header data-tour="progress-header" className="animate-fade-up mb-8 min-w-0">
      <p className="text-sm font-medium text-stone-500">
        {dateLabel} · Day {Math.min(dayNumber, totalDays)} of {totalDays}
      </p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">{greetingLine(greeting, userName)}</h1>

      {offDay ? (
        <div className="mt-3">
          <p className="text-lg text-stone-600">
            Nothing scheduled today.
            {nextActivity && (
              <>
                {' '}Next:{' '}
                <span className="font-medium text-stone-900">
                  {activityDateLabel(nextActivity.day, nextActivity.date)} — {topicTitle(nextActivity.topic)}
                </span>
              </>
            )}
          </p>
          <a
            href={nextActivity ? `/schedule#activity-${nextActivity.id}` : '/schedule'}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700 active:scale-95"
          >
            {nextActivity ? 'View in schedule' : 'Open schedule'}
          </a>
        </div>
      ) : (
        <>
          <p className="mt-2 text-lg text-stone-500">{headline}</p>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <p className="flex items-baseline gap-2 text-lg font-medium text-stone-500">
              <span>Activities</span>{' '}
              <span className="text-5xl font-semibold tracking-tight text-stone-900">{todayCompleted}</span>{' '}
              <span>of {todayTotal} today</span>
            </p>
            <p className="flex items-center text-sm text-stone-500">
              <SeedlingIcon stage={seedling.stage} />
              {seedling.label}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Today's activities"
            aria-valuemin={0}
            aria-valuemax={todayTotal}
            aria-valuenow={todayCompleted}
            aria-valuetext={`Activities ${todayCompleted} of ${todayTotal} today`}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200"
          >
            <div className="bar-gradient progress-shimmer h-full rounded-full transition-all" style={{ width: `${todayPercent}%` }} />
          </div>
          <p className="mt-2 text-sm text-stone-500">{progressLabel}</p>
        </>
      )}
    </header>
  );
}
