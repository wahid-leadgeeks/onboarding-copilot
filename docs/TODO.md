# TODO

**Product:** NOVA (Newcomer Onboarding & Virtual Assistant)
**Last updated:** 2026-09-05

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
- [x] Set up Google OAuth (OAuth 2.0 flow with encrypted HTTP-only session cookie and callback at http://localhost:4000/api/auth/callback/google)
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

### Schedule import (local-first alternative to Sheets)

- [x] `lib/import/` — CSV (RFC4180, auto-delimiter) and XLSX (fflate + fast-xml-parser, shared strings, inline strings) parsers with validated row→Activity mapping
- [x] Multi-sheet HR workbook support (`parseXlsxSheets`) with smart sheet selection (`Schedule`), diary sheet extraction (`Onboarding Diary`), HR column aliases (`Topic`, `Progress`, `Main Media`, `Duration (minutes)`, `Date`), and flexible/TBD session timings
- [x] `POST /api/import` — multipart boundary: 2 MB cap, size/type validation, `ImportError` → user-presentable 400s
- [x] Settings → Schedule section: file picker, parse preview (count, skipped rows, warnings, first activities, diary notes count), explicit confirm/discard, remove
- [x] Today + Learnings prefer the imported schedule (`onboarding-imported-schedule` localStorage, validated read) with a dedicated status badge
- [x] Discoverability: "Import your own schedule" link on Today next to the status badge whenever the app runs on demo/offline data (hidden once a real schedule is loaded)
- [x] Tests: 40 tests across csv/xlsx/import-schedule/imported-schedule and actual HR workbook integration suites

### UI v3 polish (fresh theme + motion)

- [x] Enable the Tailwind CSS PostCSS pipeline (`@tailwindcss/postcss` + `postcss.config.mjs`) — utilities had never compiled; the app ran on a minimal fallback stylesheet
- [x] Remove the unlayered fallback CSS (it would have overridden every Tailwind utility under cascade layers)
- [x] Add gradient theme: indigo page-top tint, `.hero-gradient` cards, `.bar-gradient` progress fills, `.text-gradient` page titles
- [x] Add motion: staggered `fade-up` entrances, `pop-in` moments, `pulse-soft` live indicator, progress `shimmer`, animated nav underline, button hover lift — all disabled under `prefers-reduced-motion`
- [x] Give every bare `border` utility an explicit color (Tailwind default is `currentColor`)
- [x] Re-verify layout at desktop + mobile (no overflow/overlap regressions) and capture `screenshots/theme-*.png`

### UI v3 redesign (warm human-first design language)

- [x] Design token foundation in globals.css: cream `#fafaf7` base with sun radial tint, emotion palettes as Tailwind v4 utilities (mint/peach/lavender/sun), stone ink replacing slate, 28px `rounded-card`, warm `shadow-soft`/`shadow-lift`, spring/celebrate/float keyframes
- [x] Today: 👋 greeting + reactive human line, big-stat typography (giant `N of N`), growth stages 🌱→🌿→🌳, warm focus card, day-journey rail with connector, spring completion moment, `Day wrapped up 🎉` celebration
- [x] Journey + PrimaryNav: huge percentage display, floating growth emoji, milestone path rail, filled-pill active nav
- [x] Learnings + Settings + ExportNotes: visual summaries, personality copy, human empty states ("Your day is still unwritten."), warm export toolbar
- [x] GuideTour + Assistant: mint spotlight, refreshed personality copy, lavender assistant bubbles, floating ✨ launcher
- [x] Zero slate-* classes remain; verified typecheck/lint/82 tests/build + browser QA (desktop + mobile, geometry clean); screenshots in `screenshots/warm-*.png`

### Notes export (batch, client-side)

- [x] `lib/export-notes.ts` — pure serializers: RFC4180 CSV (UTF-8 BOM, CRLF, quote escaping) and Markdown (UTC `##` headings), plus `onboarding-notes-YYYY-MM-DD.ext` filename builder
- [x] Selection checkboxes on every diary entry and quick note on Learnings, with stable ids
- [x] Export toolbar (visible only when notes exist): select-all with indeterminate state, "N of M notes selected", CSV/Markdown format picker, count-labeled export button, Clear
- [x] Client-side Blob download (no server round-trip); selection persists after export; status message confirms
- [x] Browser QA: byte-level BOM check, quote/newline escaping, partial selection, both formats, cleanup verified

### AI assistant (Groq provider)

- [x] `lib/ai/assistant.ts` — validated chat messages (1–20, roles, length caps), system prompt enforcing assistive-only behavior, env-driven provider config (`GROQ_API_KEY`, `GROQ_MODEL`, optional `GROQ_BASE_URL` — no model ID hardcoded)
- [x] `POST /api/ai/assistant` — 400/503/502 boundary handling; `/api/health` `ai` flag now lights for Groq config too
- [x] `Assistant` component — floating ✨ launcher on every page, chat panel with loading state, failure notice with draft restore, unconfigured hint, Esc to close
- [x] QA against a mock Groq endpoint via `GROQ_BASE_URL` override (auth, model passthrough, history, failure path)

### Guide tour (first-run experience)

- [x] Add `lib/guide-tour.ts` — validated tour state persistence (`onboarding-guide-tour` localStorage key)
- [x] Add `GuideTour` component — spotlight, popover, keyboard navigation (←/→/Esc/Tab), reduced-motion support
- [x] Auto-start tour on first visit to Today; restart via Settings → "Restart the guide tour" (`/?tour=start`)
- [x] Tag tour targets with `data-tour` attributes (status bar, progress header, activity card, timeline, quick note, primary nav)

### Continuous integration

- [x] GitHub Actions workflow (`.github/workflows/ci.yml`) — push/PR to `main`, pinned action versions, pnpm cache, least-privilege `contents: read`, 15-minute timeout, per-branch concurrency with cancel
- [x] CI gates mirror the local definition of done: `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm build` — no secrets required (all env reads happen at request time, so the build runs without `.env.local`)
- [x] `packageManager` field in `package.json` pins pnpm 11.15.0 so CI and local runs agree

### Elevating the Learning Feature (structured local learning records, [ADR-0005](adr/0005-learning-records-and-ai-provider-chain.md))

- [x] `lib/local-records.ts`: additive learning record schema with optional `id`, `activityId`, `activityName`, `source`, `updatedAt` on diary entries; legacy `{ content, createdAt }` records remain accepted; deterministic stable IDs derived at read time, persisted on new writes
- [x] `LearningModal`: reusable accessible capture dialog (focus trap, Esc to dismiss) for manual and AI-assisted notes; AI summary rendered as an editable draft with an explicit review-and-confirm checkbox (ADR-0003); editing the summary resets confirmation
- [x] AI summarize provider chain: server-side and deterministic (`lib/ai/providers.ts`); fully configured Groq first, generic OpenAI-compatible endpoint second, deterministic local heuristic fallback (`heuristicSummary` in `lib/ai/client.ts`)
- [x] Diary sync projection: `diarySyncPayload` sends exactly `{ content }` to `POST /api/diary`; structured metadata is local-only
- [x] Learnings filters: search, source (manual / quick-note / AI-assisted / legacy), and activity filters over diary entries and quick notes (`lib/learning-records-view.ts`)
- [x] Explicit record management: inline diary edit (stamps `updatedAt`, keeps `createdAt`), two-step delete confirmation, quick-note → diary conversion preserving the original timestamp
- [x] Deterministic structured export: CSV (RFC4180, UTF-8 BOM, metadata columns) and Markdown (UTC headings and metadata); record IDs are never exported; selection and export operate on the filtered list
- [x] Run the full quality gates for this slice (`pnpm typecheck` / `lint` / `test` / `build`) — 23 suites / 246 tests passing
- [x] Browser QA for the capture modal, Learnings filters, edit/delete/convert, filtered selection/export, and Settings import flows; responsive captures verified at 375px, 768px, and 1280px with no horizontal overflow

### Spreadsheet Cockpit & Elevated Diary Experience (Schedule, Onboarding Diary, Feedback Sheet, Timeline)

- [x] **Milestone 1: Elevated Onboarding Diary Experience** — Guided 3-takeaway diary creation workflow aligned with the HR workbook (`Onboarding Diary` worksheet): pre-population of Topic, PIC, Day, Date, Week, Activity Count from active activities; assistive AI structuring and speech-to-text voice input; 1-click 9-column TSV clipboard copy (`clipboardRowForDiary`) formatted for cell A of Excel/Sheets.
- [x] **Milestone 2: Feedback Sheet System** — Interactive evaluation dashboard covering all 13 official onboarding sessions from the HR workbook (`Feedback Sheet` worksheet): progress indicator ("X of 13 evaluated"), 6-dimension Likert rating form (1–5 scale), qualitative follow-up questions, and 1-click 13-column TSV clipboard copy (`clipboardRowForFeedback`).
- [x] **Milestone 3: Interactive Timeline & Evidence Tracker** — Upgraded `/journey` reflecting the 3 HR stages (Stage 1.0: Training – Month 1, Stage 2.0: Trial – Month 2, Stage 3.0: Transition – Month 3): editable start and end dates with date-picker inputs, interactive checklist for all 12 HR evidence/deliverable items, visual stage progress metrics, and 1-click 9-column TSV clipboard copy (`clipboardRowForTimelineStage`).
- [x] **Milestone 4: Schedule Completion & Clipboard Copy** — Manual time tracking and schedule row export for the `Schedule` worksheet: 1-click completion with custom actual times, duration calculation, and 1-click 4-column (`clipboardRowForSchedule`, columns H–K) and 11-column (`clipboardRowForScheduleFull`, columns A–K) TSV clipboard copy on Today and Learnings.
- [x] **Zero-defect Verification** — strict TypeScript (`pnpm typecheck`), zero ESLint errors (`pnpm lint`), 28 test suites / 481 tests passing (`pnpm test`), and Next.js production build (`pnpm build`).

### UI/UX Cockpit Simplification & Progressive Disclosure (Now & Next Focus)

- [x] **Separation of Concerns**: Split the cluttered multi-week schedule off of Today (`/`), creating a dedicated Master Schedule page (`/schedule`) for multi-week browsing, search, and day/status filtering.
- [x] **High-Focus Today Cockpit**: Redesigned `/` around the primary question "What should I do now?", featuring hero timer, daily pulse progress, and clean 1-row task cards with active focus indicators.
- [x] **Smart Fallback Agenda**: Displays upcoming journey activities when 0 activities are explicitly scheduled on the calendar date (weekends / off-calendar days).
- [x] **Progressive Disclosure Slide-over Sheet**: Created `ActivityDetailSheet` (right-side drawer on desktop, bottom sheet on mobile) to reveal subtopic outlines, timing, PIC, media, notes, TSV copy, and direct Google Sheets sync on demand.
- [x] **App-Wide Progressive Disclosure Rollout**: Extended the cockpit + slide-over drawer pattern across Feedback (`/feedback`), Diary (`/diary`), Timeline (`/timeline`), Monthly Reviews (`/reviews`), and Glossary (`/glossary`) with `FeedbackDetailSheet`, `DiaryDetailSheet`, `StageDetailSheet`, `ReviewDetailSheet`, and `GlossaryDetailSheet`, achieving 100% design system consistency with sequential Prev/Next navigation and inline edit toggle without nested modals.
- [x] **Persistent Sidebar Navigation Shell**: Migrated horizontal header navigation into an ergonomic `AppShell` with desktop left sidebar, categorized sections (Daily Execution, Milestones & Growth, Reflections & Input, System & Knowledge), quick `⌘K` search trigger, and mobile slide-out drawer.
- [x] **App-Wide Non-Technical Guide Tour (Feature Priority Walkthrough)**: Redesigned the onboarding guide tour to actively navigate across all pages (`/`, `/schedule`, `/timeline`, `/reviews`, `/diary`, `/feedback`, `/glossary`, `/settings`) and teach the primary action on each page (e.g. tracking work with stopwatch on Today, documenting 3 key learnings and reflections on Diary, checking off stage deliverables on Timeline, conducting 1-on-1 reviews, rating sessions on Feedback, searching modules on Glossary, and cloud sync/backup on Settings). Formatted with 3 actionable numbered steps and pro-tips per feature, with spotlight targets attached directly to the core feature elements on each page.
- [x] **Navigation & Quality Gates**: Verified 0 errors across `pnpm typecheck`, `pnpm lint`, `pnpm test` (42 suites / 581 tests), and `pnpm build`.

---

## Bugs

- [ ] *(none yet)*

---

## Technical Debt

- [ ] *(none yet)*

---

## Blocked

- [ ] Google Cloud project credentials — waiting on: *(owner TBD)*
- [x] Google Sheets workbook structure — structure and column mapping identified & supported from HR Onboarding Kit 2026 (Schedule + Onboarding Diary worksheets)

> Roadmap note: credential-free MVP behavior is implemented locally, including
> schedule fallback, session timing, learning capture, assistive AI, history,
> and pending synchronization. Connected Sheets/OAuth activation remains
> intentionally gated on the deployment credentials and workbook mapping above.

---

## Completed

- [x] Documentation scaffold created (README, AGENTS, PRD, ARCHITECTURE, DESIGN, ROADMAP, ADRs)
