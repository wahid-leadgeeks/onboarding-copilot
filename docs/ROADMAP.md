# Roadmap

**Product:** Onboarding Copilot
**Last updated:** 2026-09-03

> The roadmap defines **where the product is going**.
> For what to work on right now, see [`docs/TODO.md`](TODO.md).

---

## Phase 0 — Foundation

**Goal:** Create the basic application skeleton and establish the Google Sheets connection.

- [x] Project bootstrap (Next.js + TypeScript + Tailwind)
- [x] TypeScript strict mode configured
- [x] ESLint + Prettier configured
- [ ] Google OAuth authentication
- [x] Google Sheets API client (`lib/sheets/`)
- [x] Read Schedule sheet
- [x] Define `Activity` type
- [x] Environment variable setup and documentation
- [ ] Deployment to development environment

---

## Phase 1 — Today Dashboard

**Goal:** Remove the need to navigate the spreadsheet during the working day.

- [x] Today's activities view
- [x] Current activity card
- [x] Next activity card
- [x] Activity status display (not started / in progress / done)
- [x] Daily progress indicator
- [x] Remaining activities count
- [x] Empty state (no activities today)
- [x] Error state (Sheets unavailable)
- [x] Journey view (90-day timeline with phases and milestones)

---

## Phase 2 — Automatic Time Tracking

**Goal:** Remove manual start/end time entry from the employee's responsibilities.

- [x] Start session action
- [x] Live session timer
- [x] Finish session action
- [x] Actual duration calculation
- [ ] Sync actual times to Schedule sheet
- [ ] Handle late starts (scheduled time has already passed)
- [ ] Handle cancelled activities
- [x] Sync failure handling (pending state, retry)
- [x] Sync status indicator in UI

---

## Phase 3 — Learning Capture

**Goal:** Make the Onboarding Diary effortless to complete.

- [x] Manual text input for learning notes
- [x] Voice input for learning notes
- [x] AI extraction and structuring of raw notes
- [x] User review and edit of AI output
- [x] User confirmation before saving
- [x] Sync learning entry to Onboarding Diary sheet
- [x] Skip / defer learning capture option
- [x] Quick note drafts (captured on Today, listed under Learnings)

---

## Phase 4 — Feedback

**Goal:** Simplify completion of the Feedback Sheet.

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

- [ ] n8n integration and webhook setup
- [ ] Morning briefing (today's schedule summary)
- [ ] Session reminder notifications
- [ ] Missing-record detection (sessions without learning notes)
- [ ] Daily summary generation
- [ ] Weekly progress summary

---

## Phase 6 — Intelligence

**Goal:** Reduce manual logging further through smarter capture.

- [ ] Google Calendar integration (activity detection)
- [ ] Voice-first daily logging
- [ ] Natural-language daily log ("I spent the morning on IT systems orientation")
- [ ] Automatic schedule reconciliation from calendar

---

## Phase 7 — Scale

**Deploy only if required by organizational growth.**

- [ ] Persistent database (with ADR)
- [ ] Multi-employee support
- [ ] Manager dashboard
- [ ] HR reporting
- [ ] Role-based access control
- [ ] Audit log

---

## Principle

Each phase must be independently useful. Do not begin a new phase until the previous phase is stable and tested.
