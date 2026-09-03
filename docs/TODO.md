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

### Schedule import (local-first alternative to Sheets)

- [x] `lib/import/` — CSV (RFC4180, auto-delimiter) and XLSX (fflate + fast-xml-parser, shared strings, inline strings) parsers with validated row→Activity mapping
- [x] `POST /api/import` — multipart boundary: 2 MB cap, size/type validation, `ImportError` → user-presentable 400s
- [x] Settings → Schedule section: file picker, parse preview (count, skipped rows, warnings, first activities), explicit confirm/discard, remove
- [x] Today + Learnings prefer the imported schedule (`onboarding-imported-schedule` localStorage, validated read) with a dedicated status badge
- [x] Discoverability: "Import your own schedule" link on Today next to the status badge whenever the app runs on demo/offline data (hidden once a real schedule is loaded)
- [x] Tests: 38 new across csv/xlsx/import-schedule/imported-schedule suites

### UI v3 polish (fresh theme + motion)

- [x] Enable the Tailwind CSS PostCSS pipeline (`@tailwindcss/postcss` + `postcss.config.mjs`) — utilities had never compiled; the app ran on a minimal fallback stylesheet
- [x] Remove the unlayered fallback CSS (it would have overridden every Tailwind utility under cascade layers)
- [x] Add gradient theme: indigo page-top tint, `.hero-gradient` cards, `.bar-gradient` progress fills, `.text-gradient` page titles
- [x] Add motion: staggered `fade-up` entrances, `pop-in` moments, `pulse-soft` live indicator, progress `shimmer`, animated nav underline, button hover lift — all disabled under `prefers-reduced-motion`
- [x] Give every bare `border` utility an explicit color (Tailwind default is `currentColor`)
- [x] Re-verify layout at desktop + mobile (no overflow/overlap regressions) and capture `screenshots/theme-*.png`

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
