'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampStep } from '@/lib/guide-tour';

export type GuideTourStep = {
  /** `data-tour` attribute value of the highlight target. Omit for a centered step. */
  target?: string;
  title: string;
  body: string;
};

export const todayTourSteps: readonly GuideTourStep[] = [
  {
    title: 'Welcome to your cockpit',
    body: "This is your onboarding copilot — one thing at a time. It tracks your time, notes, and the paperwork, so you can focus on learning. Let's take a quick look around.",
  },
  {
    target: 'status-bar',
    title: 'Know where you stand',
    body: 'This badge tells you whether you are looking at demo data, a saved schedule, or a live Google Sheets connection.',
  },
  {
    target: 'progress-header',
    title: 'Your day at a glance',
    body: 'See how far you are into the 90-day journey and how today is going — no spreadsheet required.',
  },
  {
    target: 'current-activity',
    title: 'Do one thing',
    body: 'This card is your only job. Start when you begin and finish when you are done — the app records the times and the duration for you.',
  },
  {
    target: 'day-timeline',
    title: 'The shape of your day',
    body: "Everything scheduled today with status at a glance. If plans change, use 'Something changed?' to note it.",
  },
  {
    target: 'quick-note',
    title: 'Capture thoughts on the fly',
    body: 'Had an insight? Jot it down in seconds. Drafts wait safely under Learnings until you turn them into diary entries.',
  },
  {
    target: 'primary-nav',
    title: 'Explore when you are ready',
    body: 'Journey shows your 90-day path, Learnings keeps your diary and notes, and Settings manages the connection and sync.',
  },
  {
    title: "You're all set",
    body: 'Start your first activity whenever you are ready. The app handles the rest.',
  },
];

// Self-contained styles: the tour must render correctly whether or not the
// Tailwind pipeline is active (see the fallback note in globals.css).
const guideTourCss = `
.guide-tour-shield { position: fixed; inset: 0; z-index: 40; }
.guide-tour-shield--dim { background: rgb(2 6 23 / 0.45); }
.guide-tour-spotlight { position: fixed; z-index: 41; pointer-events: none; border: 2px solid #2563eb; border-radius: 16px; box-shadow: 0 0 0 9999px rgb(2 6 23 / 0.45); }
.guide-tour-popover { position: fixed; z-index: 50; width: min(24rem, calc(100vw - 2rem)); background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 25px 50px -12px rgb(15 23 42 / 0.25); font-family: inherit; }
.guide-tour-popover--centered { left: 50%; top: 50%; transform: translate(-50%, -50%); }
.guide-tour-step-label { margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; color: #1d4ed8; }
.guide-tour-title { margin: 8px 0 0; font-size: 20px; line-height: 1.2; font-weight: 600; color: #0f172a; }
.guide-tour-body { margin: 8px 0 0; font-size: 14px; line-height: 24px; color: #475569; }
.guide-tour-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; }
.guide-tour-dots { display: flex; align-items: center; gap: 6px; }
.guide-tour-dot { width: 6px; height: 6px; border-radius: 9999px; background: #cbd5e1; }
.guide-tour-dot--active { width: 16px; background: #2563eb; }
.guide-tour-actions { display: flex; align-items: center; gap: 8px; }
.guide-tour-button { min-height: 44px; border-radius: 12px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; }
.guide-tour-button--back { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
.guide-tour-button--back:hover { background: #f8fafc; }
.guide-tour-button--skip { background: none; border: none; color: #64748b; text-decoration: underline; text-underline-offset: 4px; padding: 8px 12px; }
.guide-tour-button--skip:hover { color: #334155; }
.guide-tour-button--primary { background: #2563eb; border: 1px solid #2563eb; color: #ffffff; font-weight: 600; padding: 8px 20px; }
.guide-tour-button--primary:hover { background: #1d4ed8; }
.guide-tour-button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
`;

const VIEWPORT_MARGIN = 16;
const POPOVER_GAP = 12;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type Rect = { top: number; left: number; width: number; height: number };

export function GuideTour({ steps, open, onFinish }: { steps: readonly GuideTourStep[]; open: boolean; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [popoverTop, setPopoverTop] = useState<number | null>(null);
  const [popoverLeft, setPopoverLeft] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const centered = !step?.target;

  const next = useCallback(() => setIndex(current => clampStep(current + 1, steps.length)), [steps.length]);
  const back = useCallback(() => setIndex(current => clampStep(current - 1, steps.length)), [steps.length]);
  const finish = useCallback(() => {
    setIndex(0);
    onFinish();
  }, [onFinish]);

  const updatePosition = useCallback(() => {
    if (!step || centered) {
      setSpotlight(null);
      setPopoverTop(null);
      setPopoverLeft(null);
      return;
    }
    const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!element) {
      // Target not rendered (e.g. day complete): fall back to a centered step.
      setSpotlight(null);
      setPopoverTop(null);
      setPopoverLeft(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setSpotlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    const popover = popoverRef.current;
    const popoverWidth = popover?.offsetWidth ?? 384;
    const popoverHeight = popover?.offsetHeight ?? 220;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let top: number;
    if (rect.bottom + popoverHeight + POPOVER_GAP + VIEWPORT_MARGIN <= viewportHeight) {
      top = rect.bottom + POPOVER_GAP;
    } else if (rect.top - popoverHeight - POPOVER_GAP - VIEWPORT_MARGIN >= 0) {
      top = rect.top - popoverHeight - POPOVER_GAP;
    } else {
      top = clamp((viewportHeight - popoverHeight) / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportHeight - popoverHeight - VIEWPORT_MARGIN));
    }
    const left = clamp(rect.left + rect.width / 2 - popoverWidth / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - popoverWidth - VIEWPORT_MARGIN));
    setPopoverTop(top);
    setPopoverLeft(left);
  }, [step, centered]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, index]);

  // Bring the highlighted element into view whenever the step changes.
  useEffect(() => {
    if (!step || centered) return;
    document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)?.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [index, step, centered]);

  // Track viewport changes so the spotlight follows its target.
  useEffect(() => {
    if (!open) return;
    const onViewportChange = () => updatePosition();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, updatePosition]);

  // Keyboard navigation: Escape closes, arrows move, Tab stays inside the popover.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        back();
        return;
      }
      if (event.key === 'Tab' && popoverRef.current) {
        const focusable = Array.from(popoverRef.current.querySelectorAll<HTMLButtonElement>('button'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, next, back, finish]);

  // Always begin at the first step when the tour opens.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Move focus to the primary action for keyboard users on every step.
  useEffect(() => {
    if (open) popoverRef.current?.querySelector<HTMLButtonElement>('[data-tour-primary]')?.focus();
  }, [open, index]);

  if (!open || !step) return null;

  const titleId = 'guide-tour-title';
  const centeredRender = centered || !spotlight || popoverTop === null || popoverLeft === null;

  return (
    <>
      <style>{guideTourCss}</style>
      {/* Interaction shield: keeps the page still while the tour is open. */}
      <div className={`guide-tour-shield${centeredRender ? ' guide-tour-shield--dim' : ''}`} aria-hidden="true" />
      {/* Spotlight: dims everything except the highlighted element. */}
      {spotlight && (
        <div
          aria-hidden="true"
          className="guide-tour-spotlight"
          style={{
            top: spotlight.top - 6,
            left: spotlight.left - 6,
            width: spotlight.width + 12,
            height: spotlight.height + 12,
          }}
        />
      )}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={`Guide tour, step ${index + 1} of ${steps.length}`}
        className={`guide-tour-popover${centeredRender ? ' guide-tour-popover--centered' : ''}`}
        style={centeredRender ? undefined : { top: popoverTop ?? undefined, left: popoverLeft ?? undefined }}
      >
        <p className="guide-tour-step-label">
          Guide · Step {index + 1} of {steps.length}
        </p>
        <h2 id={titleId} className="guide-tour-title">
          {step.title}
        </h2>
        <p className="guide-tour-body">{step.body}</p>
        <div className="guide-tour-footer">
          <div className="guide-tour-dots" aria-hidden="true">
            {steps.map((_, dot) => (
              <span key={dot} className={dot === index ? 'guide-tour-dot guide-tour-dot--active' : 'guide-tour-dot'} />
            ))}
          </div>
          <div className="guide-tour-actions">
            {!isFirst && (
              <button type="button" onClick={back} className="guide-tour-button guide-tour-button--back">
                Back
              </button>
            )}
            {!isLast && (
              <button type="button" onClick={finish} className="guide-tour-button guide-tour-button--skip">
                Skip
              </button>
            )}
            {isLast ? (
              <button type="button" data-tour-primary onClick={finish} className="guide-tour-button guide-tour-button--primary">
                Get started
              </button>
            ) : (
              <button type="button" data-tour-primary onClick={next} className="guide-tour-button guide-tour-button--primary">
                {isFirst ? 'Show me around' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
