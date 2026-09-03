# Roadmap

**Product:** Onboarding Copilot
**Last updated:** 2026-09-03

> The roadmap defines **where the product is going**.
> For what to work on right now, see [`docs/TODO.md`](TODO.md).

---

## Where We Are Now

**Updated:** 2026-09-03

| | |
|---|---|
| **Done** | Phases 0–3 are functionally complete in **local-first mode**: Today dashboard, Journey view, session timing with duration calculation, learning capture (text + voice + assistive AI), diary and quick notes, pending-sync queue with retry, and a first-run guide tour. |
| **Next** | Phase 4 (Feedback) — interface design, then local capture with confirmation. |
| **Blocked** | Connected Sheets/OAuth activation (Phase 0 remainder, Phase 2 sync). Waiting on Google Cloud credentials and the workbook column mapping from HR — see [`docs/TODO.md`](TODO.md#blocked). Until then, all writes are queued locally with an explicit pending state. |

> The application is a cockpit over the spreadsheet, not a replacement. Local-first behavior is intentional: every feature works without credentials, and sync activates when the connection exists.

---

## Phase 0 — Foundation

**Goal:** Create the basic application skeleton and establish the Google Sheets connection.

**Status:** Complete in local mode · Sheets connection blocked on credentials.

- [x] Project bootstrap (Next.js + TypeScript + Tailwind)
- [x] TypeScript strict mode configured
- [x] ESLint configured
- [ ] Google OAuth authentication *(blocked: Google Cloud credentials)*
- [x] Google Sheets API client (`lib/sheets/`)
- [x] Read Schedule sheet *(validated fallback rows until credentials are configured)*
- [x] Define `Activity` type
- [x] Environment variable setup and documentation
- [ ] Deployment to development environment

---

## Phase 1 — Today Dashboard

**Goal:** Remove the need to navigate the spreadsheet during the working day.

**Status:** Complete.

- [x] Today's activities view
- [x] Current activity card
- [x] Next activity card
- [x] Activity status display (not started / in progress / done)
- [x] Daily progress indicator
- [x] Remaining activities count
- [x] Empty state (no activities today)
- [x] Error state (Sheets unavailable)
- [x] Journey view (90-day timeline with phases and milestones)
- [x] First-run guide tour (walkthrough of the cockpit, restartable from Settings)

---

## Phase 2 — Automatic Time Tracking

**Goal:** Remove manual start/end time entry from the employee's responsibilities.

**Status:** Complete in local mode · Sheets write sync blocked on credentials.

- [x] Start session action
- [x] Live session timer
- [x] Finish session action
- [x] Actual duration calculation
- [ ] Sync actual times to Schedule sheet *(blocked: write proxy credentials)*
- [x] Handle late starts (scheduled time has already passed) — detected by the session API; "Started late" deviation note in the UI
- [x] Handle cancelled activities — "Cancelled" deviation note in the UI
- [x] Sync failure handling (pending state, retry)
- [x] Sync status indicator in UI

---

## Phase 3 — Learning Capture

**Goal:** Make the Onboarding Diary effortless to complete.

**Status:** Complete in local mode.

- [x] Manual text input for learning notes
- [x] Voice input for learning notes
- [x] AI extraction and structuring of raw notes
- [x] User review and edit of AI output
- [x] User confirmation before saving
- [x] Sync learning entry to Onboarding Diary sheet *(queued locally until write proxy is configured)*
- [x] Skip / defer learning capture option
- [x] Quick note drafts (captured on Today, listed under Learnings)

---

## Phase 4 — Feedback

**Goal:** Simplify completion of the Feedback Sheet.

**Status:** Not started · **This is the next phase.**

> Design constraint: AI may draft or suggest feedback wording, but submission always requires explicit user confirmation (see [ADR-0003](adr/0003-ai-is-assistive-not-authoritative.md)).

- [ ] Mobile-friendly feedback interface
- [ ] Rating capture (numeric or scale)
- [ ] Structured question responses
- [ ] Free-text comments
- [ ] User confirmation before submitting
- [ ] Sync to Feedback Sheet
- [ ] Feedback history view

---

## Phase 5 — Automation

**Goal:** Let the system proactively assist the employee without requiring manual check-ins.

**Status:** Not started.

> n8n remains optional plumbing (see [ADR-0002](adr/0002-n8n-for-automation.md)); core features must not depend on it.

- [ ] n8n integration and webhook setup
- [ ] Morning briefing (today's schedule summary)
- [ ] Session reminder notifications
- [ ] Missing-record detection (sessions without learning notes)
- [ ] Daily summary generation
- [ ] Weekly progress summary

---

## Phase 6 — Intelligence

**Goal:** Reduce manual logging further through smarter capture.

**Status:** Not started.

- [ ] Google Calendar integration (activity detection)
- [ ] Voice-first daily logging
- [ ] Natural-language daily log ("I spent the morning on IT systems orientation")
- [ ] Automatic schedule reconciliation from calendar

---

## Phase 7 — Scale

**Status:** Not started.

**Deploy only if required by organizational growth.**

> Any persistent database introduced here requires a new ADR (see [ADR-0001](adr/0001-google-sheets-as-source-of-truth.md) for the current storage decision).

- [ ] Persistent database (with ADR)
- [ ] Multi-employee support
- [ ] Manager dashboard
- [ ] HR reporting
- [ ] Role-based access control
- [ ] Audit log

---

## Principle

Each phase must be independently useful. Do not begin a new phase until the previous phase is stable and tested.

A phase is **stable** when: `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass, and the affected user flow has been verified end-to-end in the browser.
