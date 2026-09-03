# TODO

**Product:** Onboarding Copilot
**Last updated:** 2026-09-03

> This file tracks **what to work on right now**.
> For product direction, see [`docs/ROADMAP.md`](ROADMAP.md).

---

## Current Sprint — Phase 0: Foundation

### P0 (blocking)

- [x] Initialize Next.js project with App Router
- [x] Configure TypeScript (strict mode)
- [x] Configure Tailwind CSS
- [x] Configure ESLint
- [x] Create application shell (layout, root page)
- [ ] Set up Google OAuth (NextAuth.js or equivalent)
- [x] Create `lib/sheets/` Google Sheets API client boundary
- [x] Read Schedule sheet — validated fallback rows until credentials are configured
- [x] Define `Activity` TypeScript type
- [x] Build Today page with functional local session flow

### P1

- [x] Build `ActivityCard` component
- [x] Add Start Session button (local state only)
- [x] Add Finish Session button (local state + API boundary)
- [x] Calculate actual duration from start/end timestamps
- [x] Add Sheets write boundary with explicit pending state when unconfigured

### P2

- [x] Add learning capture text input
- [x] Add manual diary entry flow
- [x] Integrate AI summarization endpoint (assistive, unconfirmed output)
- [x] Add optional browser voice input with text fallback
- [x] Add local append-only session and diary history
- [x] Add integration readiness endpoint without exposing credentials
- [x] Add shared primary navigation for Today, History, and Settings

### UI v2 redesign (credential-free MVP surface)

- [x] Redesign Today page — progress header, current-activity focus card, "Something changed?" disclosure, dot-based timeline, status bar
- [x] Add Journey page — 90-day timeline with phases and milestones
- [x] Rename History to Learnings (navigation label, page title, copy)
- [x] Replace quick-note stub with expanding capture; drafts listed under Learnings
- [x] Fix completion-moment activity name, header progress merge with local sessions, and reload hydration (found in browser QA)
- [x] Consolidate design system into `docs/DESIGN.md` (v2)

### Guide tour (first-run experience)

- [x] Add `lib/guide-tour.ts` — validated tour state persistence (`onboarding-guide-tour` localStorage key)
- [x] Add `GuideTour` component — spotlight, popover, keyboard navigation (←/→/Esc/Tab), reduced-motion support
- [x] Auto-start tour on first visit to Today; restart via Settings → "Restart the guide tour" (`/?tour=start`)
- [x] Tag tour targets with `data-tour` attributes (status bar, progress header, activity card, timeline, quick note, primary nav)

---

## Bugs

- [ ] *(none yet)*

---

## Technical Debt

- [ ] *(none yet)*

---

## Blocked

- [ ] Google Cloud project credentials — waiting on: *(owner TBD)*
- [ ] Google Sheets workbook structure — need column mapping from HR

> Roadmap note: credential-free MVP behavior is implemented locally, including
> schedule fallback, session timing, learning capture, assistive AI, history,
> and pending synchronization. Connected Sheets/OAuth activation remains
> intentionally gated on the deployment credentials and workbook mapping above.

---

## Completed

- [x] Documentation scaffold created (README, AGENTS, PRD, ARCHITECTURE, DESIGN, ROADMAP, ADRs)
