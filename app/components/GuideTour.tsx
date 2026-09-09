'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampStep } from '@/lib/guide-tour';

export type GuideTourStep = {
  /** `data-tour` attribute value of the highlight target. Omit for a centered step. */
  target?: string;
  title: string;
  body: string;
};

export const allPagesTourSteps: readonly GuideTourStep[] = [
  {
    title: 'Welcome to your onboarding cockpit!',
    body: "Starting a new role comes with a lot of new information. NOVA is your friendly personal guide designed to keep your first 90 days calm, organized, and clear — without wrestling with complex spreadsheets. Let's take a quick 1-minute look around!",
  },
  {
    target: 'nav-today',
    title: 'Today: Your daily focus & timer',
    body: 'Never wonder what to work on next. Today highlights your current task, gives you a simple start/stop timer, and tracks your working hours automatically so you never have to log them by hand.',
  },
  {
    target: 'nav-schedule',
    title: 'Schedule: Your complete 90-day plan',
    body: 'Browse all 59 onboarding activities, training sessions, and team meetings planned for your first three months. You can search by topic, filter by week, and see who is leading each session.',
  },
  {
    target: 'nav-timeline',
    title: 'Timeline: Major milestones & deliverables',
    body: 'See your journey broken down into 3 clear 30-day phases. Check off key deliverables as you complete them and watch your onboarding progress grow week by week.',
  },
  {
    target: 'nav-reviews',
    title: 'Reviews: Check-ins with your manager',
    body: 'Keep communication open and transparent. Use this page for your 30, 60, and 90-day review conversations to celebrate milestones, share feedback, and request any support you need.',
  },
  {
    target: 'nav-diary',
    title: 'Diary: Your personal learning notes',
    body: 'Capture quick takeaways, lightbulb moments, or questions as you learn. Record up to three key notes each day to build your personal onboarding journal.',
  },
  {
    target: 'nav-feedback',
    title: 'Feedback: Share how your week went',
    body: 'Your experience matters! Rate your onboarding sessions on an easy 1-to-6 scale and ask questions so your team and mentor can help you succeed.',
  },
  {
    target: 'nav-glossary',
    title: 'Glossary: Guides, videos & resources',
    body: 'Find essential company links, training videos, and helpful documentation curated specifically for your role — all organized in one convenient place.',
  },
  {
    target: 'nav-settings',
    title: 'Settings: Connect & customize',
    body: "NOVA works completely in your browser with zero setup. When you are ready, you can connect your team's Google Sheet with a single click to keep everything in sync.",
  },
  {
    target: 'assistant-launcher',
    title: 'Ask NOVA: Your anytime helper',
    body: "Need help finding a document, understanding a company process, or checking what's next? Click this floating sparkle button anytime to chat with your virtual assistant.",
  },
  {
    title: "You're all set to begin!",
    body: "Take things one step at a time at your own pace. You can restart this tour anytime from the sidebar or by pressing ⌘K. We're thrilled to have you here!",
  },
];

/** Maintained for backwards compatibility */
export const todayTourSteps: readonly GuideTourStep[] = allPagesTourSteps;

// Self-contained styles so the tour renders identically regardless of the
// Tailwind pipeline state.
const guideTourCss = `
.guide-tour-shield { position: fixed; inset: 0; z-index: 40; }
.guide-tour-shield--dim { background: rgb(28 25 23 / 0.45); animation: guide-fade 0.25s ease both; }
.guide-tour-spotlight { position: fixed; z-index: 41; pointer-events: none; border: 2px solid #23ae77; border-radius: 16px; box-shadow: 0 0 0 9999px rgb(28 25 23 / 0.45); animation: guide-fade 0.25s ease both; }
.guide-tour-popover { position: fixed; z-index: 50; width: min(24rem, calc(100vw - 2rem)); background: #ffffff; border: 1px solid #e7e5e4; border-radius: 20px; padding: 24px; box-shadow: 0 16px 40px rgb(87 70 31 / 0.14); font-family: inherit; animation: guide-pop-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.guide-tour-popover--centered { left: 50%; top: 50%; transform: translate(-50%, -50%); animation-name: guide-pop-center; }
.guide-tour-step-label { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; color: #23ae77; }
.guide-tour-title { margin: 8px 0 0; font-size: 20px; line-height: 1.2; font-weight: 600; color: #1c1917; }
.guide-tour-body { margin: 8px 0 0; font-size: 14px; line-height: 24px; color: #57534e; }
.guide-tour-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; }
.guide-tour-dots { display: flex; align-items: center; gap: 6px; }
.guide-tour-dot { width: 6px; height: 6px; border-radius: 9999px; background: #d6d3d1; transition: width 0.2s ease, background-color 0.2s ease; }
.guide-tour-dot--active { width: 16px; background: #23ae77; }
.guide-tour-actions { display: flex; align-items: center; gap: 8px; }
.guide-tour-button { min-height: 44px; border-radius: 12px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; }
.guide-tour-button--back { background: #ffffff; border: 1px solid #e7e5e4; color: #57534e; }
.guide-tour-button--back:hover { background: #fafaf7; }
.guide-tour-button--skip { background: none; border: none; color: #78716c; text-decoration: underline; text-underline-offset: 4px; padding: 8px 12px; }
.guide-tour-button--skip:hover { color: #1c1917; }
.guide-tour-button--primary { background: #1c1917; border: 1px solid #1c1917; color: #ffffff; font-weight: 600; padding: 8px 20px; }
.guide-tour-button--primary:hover { background: #292524; }
.guide-tour-button:focus-visible { outline: 2px solid #23ae77; outline-offset: 2px; }
@keyframes guide-fade { from { opacity: 0; } }
@keyframes guide-pop-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes guide-pop-center { from { opacity: 0; transform: translate(-50%, calc(-50% + 10px)) scale(0.97); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
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
    if (!element || (element.offsetWidth === 0 && element.offsetHeight === 0)) {
      // Target not rendered or hidden (e.g. mobile hidden sidebar): fall back to a centered step.
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
    let left: number;

    // If target is docked on the left (e.g. sidebar nav) and there is enough room on the right, position alongside it
    if (rect.right + popoverWidth + POPOVER_GAP + VIEWPORT_MARGIN <= viewportWidth && rect.left < 320) {
      left = rect.right + POPOVER_GAP;
      top = clamp(
        rect.top + rect.height / 2 - popoverHeight / 2,
        VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, viewportHeight - popoverHeight - VIEWPORT_MARGIN)
      );
    } else if (rect.bottom + popoverHeight + POPOVER_GAP + VIEWPORT_MARGIN <= viewportHeight) {
      top = rect.bottom + POPOVER_GAP;
      left = clamp(rect.left + rect.width / 2 - popoverWidth / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - popoverWidth - VIEWPORT_MARGIN));
    } else if (rect.top - popoverHeight - POPOVER_GAP - VIEWPORT_MARGIN >= 0) {
      top = rect.top - popoverHeight - POPOVER_GAP;
      left = clamp(rect.left + rect.width / 2 - popoverWidth / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - popoverWidth - VIEWPORT_MARGIN));
    } else {
      top = clamp((viewportHeight - popoverHeight) / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportHeight - popoverHeight - VIEWPORT_MARGIN));
      left = clamp(rect.left + rect.width / 2 - popoverWidth / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - popoverWidth - VIEWPORT_MARGIN));
    }
    setPopoverTop(top);
    setPopoverLeft(left);
  }, [step, centered]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, index]);

  // Bring the highlighted element into view whenever the step changes.
  useEffect(() => {
    if (!step || centered) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
      el.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
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
        key={index}
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={`Guide tour, step ${index + 1} of ${steps.length}`}
        className={`guide-tour-popover${centeredRender ? ' guide-tour-popover--centered' : ''}`}
        style={centeredRender ? undefined : { top: popoverTop ?? undefined, left: popoverLeft ?? undefined }}
      >
        <p className="guide-tour-step-label">
          Step {index + 1} of {steps.length}
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
