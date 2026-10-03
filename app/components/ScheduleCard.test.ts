import type { ScheduleActivity } from '@/lib/schedule-catalog';

describe('ScheduleCard progressive disclosure & state logic', () => {
  const sampleActivity: ScheduleActivity = {
    id: 'sched-row-26',
    rowNumber: 26,
    week: 'Week 2',
    day: 'Monday',
    date: '07/09/2026',
    activityCount: 23,
    pic: 'IT Manager',
    topic: 'Understanding LeadGeeks IT Department Functions\n- Department overview\n- Systems architecture\n- Key personnel\n- Escalation matrix\n- Q&A',
    mainMedia: 'Knowledge Sharing & Discussion',
    durationMinutes: 60,
    startTime: '09:00',
    endTime: '10:00',
    progress: 'Not Started',
    notes: 'https://drive.google.com/folder-123',
  };

  it('correctly splits title and subtopics for progressive disclosure', () => {
    const lines = sampleActivity.topic.split('\n');
    const title = lines[0];
    const subtopics = lines.slice(1);

    expect(title).toBe('Understanding LeadGeeks IT Department Functions');
    expect(subtopics).toHaveLength(5);
    expect(subtopics[0]).toBe('- Department overview');
  });

  it('determines primary button state for not started, running, paused, and done', () => {
    function getCardPrimaryAction(params: {
      progress: string;
      isTimerRunning: boolean;
      isTimerPaused: boolean;
    }): 'start' | 'running' | 'paused' | 'reflection' {
      if (params.progress === 'Done') return 'reflection';
      if (params.isTimerRunning) return 'running';
      if (params.isTimerPaused) return 'paused';
      return 'start';
    }

    expect(
      getCardPrimaryAction({ progress: 'Not Started', isTimerRunning: false, isTimerPaused: false })
    ).toBe('start');

    expect(
      getCardPrimaryAction({ progress: 'In Progress', isTimerRunning: true, isTimerPaused: false })
    ).toBe('running');

    expect(
      getCardPrimaryAction({ progress: 'In Progress', isTimerRunning: false, isTimerPaused: true })
    ).toBe('paused');

    expect(
      getCardPrimaryAction({ progress: 'Done', isTimerRunning: false, isTimerPaused: false })
    ).toBe('reflection');
  });

  it('determines subtitle format based on status', () => {
    function getCardSubline(
      item: ScheduleActivity,
      isTimerRunning: boolean,
      isTimerPaused: boolean,
      elapsedSeconds: number
    ): string {
      const done = item.progress === 'Done';
      const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

      if (done) {
        return `Logged: ${item.durationMinutes ?? 'Done'} min · ${item.startTime} → ${item.endTime}`;
      }
      if (isTimerRunning) {
        return `Stopwatch live: ${elapsedMinutes} min (started ${item.startTime || ''})`;
      }
      if (isTimerPaused) {
        return `Stopwatch paused: ${elapsedMinutes} min logged`;
      }
      return `Target: ${item.durationMinutes ? `${item.durationMinutes} min` : 'Flexible / TBD'} · ${item.mainMedia}`;
    }

    // 1. Not started
    const notStartedSubline = getCardSubline(sampleActivity, false, false, 0);
    expect(notStartedSubline).toBe('Target: 60 min · Knowledge Sharing & Discussion');

    // 2. Running
    const runningSubline = getCardSubline(sampleActivity, true, false, 300);
    expect(runningSubline).toBe('Stopwatch live: 5 min (started 09:00)');

    // 3. Paused
    const pausedSubline = getCardSubline(sampleActivity, false, true, 600);
    expect(pausedSubline).toBe('Stopwatch paused: 10 min logged');

    // 4. Done
    const doneActivity: ScheduleActivity = { ...sampleActivity, progress: 'Done', durationMinutes: 55 };
    const doneSubline = getCardSubline(doneActivity, false, false, 0);
    expect(doneSubline).toBe('Logged: 55 min · 09:00 → 10:00');
  });
});

// Card / completed-row logic lives in pure helpers (lib/schedule-view.ts); jest is node-only.
import { completedRowSummary, scheduleCardPrimaryAction, scheduleRowToolLabels, activityAnchorId } from '@/lib/schedule-view';

describe('ScheduleCard helpers (exported, pure)', () => {
  it('hides Write Reflection once a reflection is linked', () => {
    const base = { isTimerRunning: false, isTimerPaused: false };
    expect(scheduleCardPrimaryAction({ ...base, progress: 'Done', hasReflection: false })).toBe('reflection');
    expect(scheduleCardPrimaryAction({ ...base, progress: 'Done', hasReflection: true })).toBe('none');
    expect(scheduleCardPrimaryAction({ ...base, progress: '', hasReflection: true })).toBe('start');
  });

  it('anchors each card and completed row at #activity-{id}', () => {
    expect(activityAnchorId('sched-row-26')).toBe('activity-sched-row-26');
  });

  it('keeps sheet ranges inside the Sheet tools hints only', () => {
    const labels = scheduleRowToolLabels(26);
    expect(Object.values(labels).map((l) => l.label)).toEqual([
      'Sync this row',
      'Copy row (G–L)',
      'Copy full row (A–L)',
      'Full outline',
    ]);
    expect(labels.sync.hint).toContain('row 26');
  });

  it('ScheduleCompletedRow shows title, formatted date and reflection status', () => {
    const summary = completedRowSummary(
      { topic: 'Understanding IT\n- Overview', day: 'Monday', date: '07/09/2026', durationMinutes: 60 },
      false
    );
    expect(summary).toEqual({ title: 'Understanding IT', dateLabel: 'Mon 7 Sep 2026', duration: '60 min', needsReflection: true });
  });
});
