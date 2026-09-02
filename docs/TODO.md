# TODO

**Product:** Onboarding Copilot
**Last updated:** 2026-09-02

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
