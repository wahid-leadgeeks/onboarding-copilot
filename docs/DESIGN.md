# Design System — NOVA

**Product:** NOVA (Newcomer Onboarding & Virtual Assistant)
**Status:** Active — v3 (warm, human-first)
**Last updated:** 2026-09-04

---

## 1. Product Philosophy

> **The spreadsheet is the backend, not the interface.**

The user should never think "I need to update my onboarding spreadsheet." They should think "I have one thing to do." The app handles the rest.

### Core Questions

Every screen must answer:

1. **What do I need to do right now?** — primary
2. **How much is left?** — secondary
3. **What happens next?** — supporting
4. **What do I need to record?** — after action
5. **Where am I in the journey?** — context

### The Loop

```
Start → Do → Finish → Capture learning → Next
```

Not:

```
Open spreadsheet → find row → inspect columns → type stuff → wonder what comes next
```

---

## 2. Visual Identity (v3 — warm, human-first)

> Linear's clarity + Duolingo's personality + Notion's flexibility. Not a children's app: color communicates emotion and meaning, never decoration.

### Palette

| Role | Color | Hex / Class | Usage |
|---|---|---|---|
| Background | Cream | `#fafaf7` (`bg-cream`) | Page background with a faint sun radial tint at the top |
| Surface | White | `#ffffff` | Cards — `rounded-card` (28px) + `shadow-soft`, **no borders or rings** |
| Ink | Warm charcoal | `stone-900 … stone-400` | All text, primary buttons (`bg-stone-900`) |
| Mint 🌿 | Progress / success | `mint-*` (500 `#35c98e`) | Completed, growth, "done" moments |
| Peach 🍑 | Activity / attention | `peach-*` (500 `#ff9d6b`) | Current activity, warnings, deviations |
| Lavender 💜 | Learning / personal | `lavender-*` (500 `#9b8cf2`) | Diary, AI content, assistant |
| Sun 🌼 | Achievement / highlight | `sun-*` (500 `#facc15`) | Celebrations, demo badge, import ready |
| Sky 🩵 | Information | `sky-*` | Imported schedule, neutral info |

Rules: one emotion tint per element (a dot, chip, or 50-level wash — never full saturated cards); ink does most of the work; big numerals over badges.

### Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display | Inter (sans-serif) | 600 | 2.25–3.75rem — greeting (`Good evening, Noah 👋`), big stats (`text-6xl`) |
| Heading | Inter | 600 | 1.5rem (24px) |
| Body | Inter | 400 | 1rem (16px) |
| Small | Inter | 400 | 0.875rem (14px) |

Typography IS the structure: giant numbers with small labels replace stat cards and tables.

**Minimum sizes (UI/UX pass, 2026-10-03).** No text below 12px (`text-xs`). The only 11px text (`text-[11px]`) is an uppercase, tracked eyebrow or badge. `text-[9px]` and `text-[10px]` are not used. Text is `text-stone-500` or darker; `text-stone-400` is reserved for placeholders and decorative icons. Quiet metadata such as the row reference (`RowTag`) is `text-xs text-stone-500`.

#### Palette tokens (final values, `app/globals.css`)

Every shade referenced in `app/**` is defined in `@theme`. Darker shades exist for text; light shades for washes. Contrast ratios below were computed with the WCAG 2.x formula.

| Token | Hex | On white | On its -50 tint | On its -100 tint |
|---|---|---|---|---|
| `mint-700` | `#187f58` | 4.98 | 4.77 | 4.40 |
| `mint-800` | `#14694a` | 6.67 | 6.39 | 5.89 |
| `mint-900` | `#0f5139` | 9.31 | 8.92 | 8.23 |
| `peach-700` | `#b4521f` | 5.04 | 4.73 | 4.31 |
| `peach-800` | `#9a4419` | 6.53 | 6.13 | 5.58 |
| `peach-900` | `#7a3614` | 8.88 | 8.33 | 7.59 |
| `lavender-700` | `#6650c4` | 5.98 | 5.50 | 5.04 |
| `lavender-800` | `#533fa3` | 8.05 | 7.40 | 6.78 |
| `lavender-900` | `#3f3080` | 10.79 | 9.91 | 9.08 |
| `sun-700` | `#856709` | 5.33 | 5.14 | 4.78 |
| `sun-800` | `#6e5508` | 7.08 | 6.83 | 6.36 |
| `sun-900` | `#574306` | 9.50 | 9.16 | 8.53 |

Other shades defined: `mint-200/400/950` (`#b8eed6`, `#5dd6a5`, `#072e20`), `peach-200/400` (`#ffd7bf`, `#ffb187`), `lavender-200` (`#dad0fa`), `sun-200/400` (`#fde98a`, `#fbd52e`). The 500 values are unchanged (mint `#35c98e`, peach `#ff9d6b`, lavender `#9b8cf2`, sun `#facc15`).

Rules: use `-700` for text on white or a `-50` wash; use `-800` (or darker) for text on a `-100` tint (`mint-700` and `peach-700` fall just under 4.5:1 there). Backgrounds and dots stay at 100-500. The previous `mint-700 #1d8a60` and `peach-700 #c9602a` were replaced because they were not reliably AA on tints.

Known gap: the global `:focus-visible` outline is `#35c98e`, which is only about 2.12:1 on white (tracked in `docs/TODO.md`).

### Personality copy

| Instead of | Use |
|---|---|
| `Time Tracking Dashboard` | `Your day so far ☀️` |
| `Task successfully created.` | `Nice. That's one less thing to carry around. ✨` |
| `87% completion` | `Almost there! 🌱` |
| `No records found.` | `Nothing here yet. Your day is still unwritten.` |

Growth stages track progress: 🌱 Just planted → 🌱 Growing → 🌿 Almost there → 🌳 Day complete. The day's finish is `Day wrapped up 🎉`.

### Shadows

| Level | Usage |
|---|---|
| `shadow-soft` | Resting cards — `0 1px 2px + 0 8px 24px rgb(87 70 31 / .04–.06)` warm tint |
| `shadow-lift` | Hover elevation |

No borders on cards. Elevation is soft and warm, never gray-boxed.

### Gradients

| Class | Gradient | Usage |
|---|---|---|
| Body background | sun radial tint fading to cream | Warm page top |
| `.hero-gradient` | `#3f3a36 → #1c1917` (135°) warm charcoal | Assistant header/launcher |
| `.bar-gradient` | `#35c98e → #38bdf8` mint→sky (90°) | Progress bar fills (with `.progress-shimmer`) |

### Fonts

The app renders `Inter, 'Segoe UI', system-ui, -apple-system, Arial, sans-serif` — Inter when installed on the user's machine, otherwise the platform's native UI font. No webfont download is bundled.

---

## 3. Motion (v3)

Motion is **calm, quick, and meaningful** — it explains where things come from, never distracts.

| Class | Effect | Usage |
|---|---|---|
| `.animate-fade-up` | 0.5s rise + fade, cubic-bezier(.21,.61,.35,1) | Sections entering on page load |
| `.stagger-1` … `.stagger-5` | +0.07s per step | Sequential entrance of sibling sections/cards |
| `.animate-pop-in` | 0.35s scale-in (overshoot 1.04) | Import preview, learning capture |
| `.animate-spring-in` | 0.45s spring (cubic-bezier(.34,1.56,.64,1)) | Completion moment ✓ |
| `.animate-celebrate` | 0.7s springy scale+rotate | `Day wrapped up 🎉` |
| `.animate-float` | 3.5s gentle idle float | Assistant launcher, growth emoji |
| `.animate-pulse-soft` | 2s opacity pulse | "Right now" live indicator |
| `.progress-shimmer` | Sweeping highlight across the bar fill | Progress bars |
| Nav active pill | Filled `bg-stone-900` pill | Primary navigation |
| Button lift | translateY(-1px) + soft shadow on hover | All buttons |

Rules:

- Every entrance animation plays once, on mount.
- `prefers-reduced-motion: reduce` disables all animation and transition durations globally (globals.css).
- The guide tour popover pops in per step (spring easing) with a mint-600 spotlight ring.

---

## 4. Screen Architecture

### Navigation

```
Today     Journey     Learnings     Settings
```

- **Today** — primary, answers "What do I need to do now?"
- **Journey** — 90‑day timeline, shows where you are
- **Learnings** — diary, history of completed sessions and notes (renamed from History)
- **Settings** — preferences, sync, connection

#### Navigation after the UI/UX pass (2026-10-03)

The sidebar (and the mobile drawer) has **8 items** in four sections, defined once in `NAV_ITEMS` (`app/components/AppShell.tsx`):

| Section | Items |
|---|---|
| Daily Execution | Today `/`, Schedule `/schedule` |
| Milestones & Growth | Timeline `/timeline`, Reviews `/reviews` |
| Reflections & Input | Diary `/diary`, Feedback `/feedback` |
| System & Knowledge | Glossary `/glossary`, Settings `/settings` |

- **Reviews tabs.** First Month Review and Monthly Review Score are no longer nav items. They are reached through the `ReviewsTabs` bar (`app/components/ReviewsTabs.tsx`: Overview `/reviews`, First month `/first-month-review`, Monthly score `/monthly-review-score`), shown under the h1 of all three pages. It is a `nav` landmark of links (`aria-current="page"` on the current one, `min-h-11`), not `role="tab"`, because each tab is a real navigation. The Reviews nav item stays active on all three routes (`matches` + `isNavItemActive`), and the mobile header title reads "Reviews" on each.
- **Redirects and titles.** `/journey` redirects permanently to `/timeline` and `/history` to `/diary` (`next.config.ts`). Titles use the root template `%s · NOVA` with a per-route server `layout.tsx` (for example "Diary · NOVA").
- **Skip link.** `Skip to content` is the first focusable element and targets `#main-content`.
- **Global search.** `CommandPalette` is mounted once in `AppShell` (⌘K works on every route; picking an activity goes to `/schedule#activity-{id}`). The notification bell is only shown on `/`, because its summary is Today-specific.

### Today Screen Layout

```
┌─────────────────────────────────────────────────────┐
│  ONBOARDING COPILOT                                 │
│  Today     Journey     Learnings     Settings        │
│                                                     │
│  Wednesday · 2 September                            │
│                                                     │
│  GOOD EVENING, NOAH                                 │
│  Day 2 of 90                                        │
│  ██████████░░░░░░░░░░  18%                          │
│  2 of 3 today                                       │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  ● RIGHT NOW                                  │  │
│  │                                               │  │
│  │  Team Welcome                                 │  │
│  │  14:00 → 15:00                               │  │
│  │  Experience Manager                           │  │
│  │                                               │  │
│  │              [ Continue ]                     │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  TODAY                                              │
│                                                     │
│  ✓  Introduction to IT Systems       09:00          │
│  ✓  Security & Access Setup           11:30          │
│  ●  Team Welcome                      14:00          │
│                                                     │
│  + Quick note                                       │
│                                                     │
│  90-DAY JOURNEY                                     │
│  ●━━━━━━━●━━━━━━━━○━━━━━━━━○                        │
│  Learn    Practice     Own      Graduate             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 5. Components

### Status Indicators

| State | Indicator | Color | Label |
|---|---|---|---|
| Completed | ✓ | Emerald | Completed |
| In progress | ● | Blue | In progress |
| Upcoming | ○ | Slate | Upcoming |
| Needs attention | ! | Amber | Needs attention |

### Progress Component

```
Day 2 of 90
██████████░░░░░░░░░░  18%
2 of 3 today
```

- Shows overall journey progress and daily progress
- Bar width reflects percentage
- Clean, minimal, one strong signal

### Activity Card (Current)

```
┌──────────────────────────────────────────────┐
│  ● RIGHT NOW                                │
│                                              │
│  Team Welcome                                │
│  14:00 → 15:00                               │
│  Experience Manager                           │
│                                              │
│           [ Continue ]                       │
│                                              │
└──────────────────────────────────────────────┘
```

- Visually dominant, full-width
- Action button is the hero
- Metadata de-emphasized (smaller text, lighter color)

### Timeline

```
TODAY

✓  Introduction to IT Systems       09:00
✓  Security & Access Setup           11:30
●  Team Welcome                      14:00
```

- Compact, scannable
- Status indicator on left
- Time on right
- No extra cards

### Completion Moment

```
┌──────────────────────────────────────────────┐
│  ✓ DONE                                     │
│                                              │
│  Introduction to IT Systems                  │
│  09:00 → 11:05                              │
│  2h 05m                                     │
│                                              │
│  Nice. One less thing to think about.        │
│                                              │
│  [ Record what I learned ]                   │
│                                              │
└──────────────────────────────────────────────┘
```

- Replaces the activity card after finishing
- Celebratory but not over-the-top
- Clear next step

### Learning Capture

```
┌──────────────────────────────────────────────┐
│  ✓ Activity complete                          │
│                                              │
│  What did you learn?                         │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ Just write a few words.                  ││
│  │                                          ││
│  └──────────────────────────────────────────┘│
│                                              │
│  ✨ Summarize for me                         │
│                                              │
│                 [ Save & continue ]          │
└──────────────────────────────────────────────┘
```

- Conversational, not a form
- One text area
- One primary action ("Summarize for me") that uses AI
- One secondary action ("Save & continue")

### Quick Note

```
+ Quick note
```

- Tiny input at bottom of Today page
- Click → expands to a text area
- AI structures the note later
- Example: "MD explained company strategy..." → structured diary entry

### Notes Export Toolbar

```
☑ Select all notes   3 of 4 notes selected    Format [CSV ▾]  [ Export 3 notes ]  Clear
```

- On Learnings, visible only when at least one note exists
- Checkbox on every diary entry and quick note; select-all carries an indeterminate state
- Two formats: CSV (UTF-8 BOM, RFC4180 — Excel-compatible) and Markdown
- Export is fully client-side (Blob download), oldest note first, filename `onboarding-notes-YYYY-MM-DD.csv|.md`
- Selection persists after export; a status line confirms the count
- Export button shows the count and disables at zero selection

### Journey View

```
YOUR 90-DAY JOURNEY

●━━━━━━━●━━━━━━━━○━━━━━━━━○
Learn    Practice     Own      Graduate
1 month  2 month      3 month

          YOU ARE HERE ↑

Month 1
Understanding the company & IT environment

████████░░░░░░░░ 42%
```

- Horizontal timeline with phases
- Current position highlighted
- Phase detail below

### Sync status chip (UI/UX pass, 2026-10-03)

One component, `SyncStatusChip` (`app/components/SyncStatusChip.tsx`), is the only place sync state is shown (sidebar footer, mobile header, Today's summary, Settings). The label is derived by `deriveSyncState` (`lib/sync-status.ts`) from `/api/health`, the pending queue and the last confirmed write; nothing is hardcoded.

| Label | When | Tone |
|---|---|---|
| `Checking…` | health not loaded yet | stone |
| `Saved on this device` | mode is not `connected`, or Sheets is not configured | stone |
| `Not synced yet` | connected, no confirmed write yet | stone |
| `Synced HH:MM` | connected, nothing pending, last write time in Asia/Jakarta | mint |
| `Couldn’t sync — retry` | health request failed, or any session write is still queued | peach |

- Variants: `full` (dot + label) and `compact` (dot + sr-only label, used in the mobile header). The error state shows a Retry button (`min-h-11` on mobile). The chip is `role="status"`.
- `markSynced` (writes `nova-last-synced-at`) and the `nova:sync-changed` event fire only on a confirmed success: `/api/session` replying `syncStatus: 'synced'`, a successful `update-cell`, a successful bulk sync, or `retryPendingSessionSyncs` with at least one row synced. A queued write only dispatches the event. Pending writes win over an earlier success.
- Copy never says PostgreSQL, "Dual-Sync", or DB. Jargon about the database or spreadsheet stays out of the chip.

### Sheet tools menu and RowTag

Spreadsheet actions (copy a row for the sheet, sync a row, open the sheet) live behind one quiet **Sheet tools** trigger (`SheetToolsMenu`) instead of visible buttons labelled with columns and ranges. This is how the product "hides the spreadsheet" while keeping every manual fallback.

- Items are `{ id, label, hint?, onSelect?, href?, disabled?, state?, doneLabel? }`. Column and range detail (for example "pastes at B15:C25") appears only as a hint inside the open menu.
- Trigger is a `button` with `aria-haspopup="menu"` and `aria-expanded`; `size="icon"` needs an aria-label; `min-h-11` on mobile. The panel is `role="menu"` with `menuitem` buttons, ArrowUp/Down (wrapping, `nextMenuIndex`), click-outside to close, `placement` `down|up` (dialog and sheet footers use `up`), `max-h-[60vh]` scroll. It renders in-tree (no portal) so dialog focus traps keep working, and `href` items open with `window.open` from a button.
- **Escape** closes only the open menu first and refocuses the trigger (the menu stops propagation; slide-over sheets use `shouldSheetCloseOnEscape` from `app/components/sheetEscape.ts`, which ignores Escape while a menu is open).
- Primary actions (Save, Edit details, Write Reflection) stay visible; only spreadsheet tooling moves into the menu.
- **RowTag** (`RowTag.tsx`) replaces "Row 12" chips with a small grey `#12`, `title="Spreadsheet row 12"` and an sr-only "row". Visible Row/Col/Column/PIC wording is not allowed outside menus, `title`, and sr-only text (the Glossary "Sheet Guide" is the deliberate exception). Use "Led by" for the former PIC label.

### Bulk sync modal

`BulkSyncModal` (`app/components/BulkSyncModal.tsx`, plans in `lib/bulk-sync.ts`) replaces the two near-duplicate `DiarySyncAllModal` and `ScheduleSyncAllModal`. Schedule and Diary each have exactly one entry point, "Sync all to spreadsheet…", inside their Sheet tools menu.

- Built on `ModalDialog` with `dismissible={!busy}`: while syncing, Escape, backdrop and the X do nothing and Cancel is hidden. An in-flight ref blocks double submits.
- Shows a peach overwrite warning with the exact ranges, counts ("N ready", "M still need notes"), and a row list with `RowTag`. Rows with no data are listed as "No data — left unchanged in the sheet".
- Footer: Sheet tools (placement `up`, with one clipboard item per contiguous chunk, built by `scheduleChunkClipboard`), Cancel (before a result) or Close (after), and the primary `Overwrite N rows` (`bg-stone-900`), disabled while busy, while data is loading, when blocking rows exist, or when there is nothing to write.
- **Diary:** scope selector `official` (rows 2–25, 24 topics, the default) or `all` (rows 2–29, 28 topics); counts always name their scope. Readiness follows the page's whole-entry rule (an entry with a cleared field is not ready). Blocking rows get a Fill button that closes the modal and opens that topic's sheet. A 409 `emptyRows` reply is mapped into the same list. Body `{ scope, maxRow, entries }` (built by `buildDiarySyncBody`).
- **Schedule:** sends only rows that have data (`activities: plan.rowsWithData`, `week: 'All'`; 51 of 53 on the official catalog), grouped into chunks such as `G3:L23`, `G25:L34`, `G36:L42`, `G44:L51`, `G53:L56`, `G58:L58` (rows without data are skipped). `buildScheduleSyncBody` throws on an empty list or while loading, so the route never falls back to all rows. A row with partial data still writes blanks to its other G–L cells; the warning says so.
- Results: success (records `markSynced` and notifies the chip), 401 "Sign in with Google…", blocked, or error with a pointer to Sheet tools.

### Learning capture: three stages

`LearningModal` discloses the capture in stages instead of showing everything at once (`learningStage(state, takeawaysOpen)` is a pure, tested function; the draft reducer is unchanged). This supersedes the single-textarea sketch above for the full flow; the first stage is that sketch.

1. **write** — "What did you learn?": one textarea, voice input, "Summarize for me", and a quiet "Write takeaways myself" link.
2. **review** — an unconfirmed AI draft in a lavender box labelled "AI draft" with **Edit** (reveals the prefilled takeaways; editing resets confirmation), **Revert**, and **Confirm**.
3. **takeaways** — "Your 3 takeaways": three labelled textareas plus an optional notes disclosure, with an inline Confirm if an AI draft was edited and is unconfirmed. A confirmed AI draft maps here, never back to "write", so Save is always reachable.

- The footer is sticky: primary **Save** (`bg-stone-900`) enabled only when `canSaveLearning` holds, and "Skip for now". Save no longer auto-confirms AI output (ADR-0003); an unconfirmed draft cannot be saved or copied. "Copy for Diary Sheet" lives in a Sheet tools menu.
- Layout is `flex max-h-[90vh] flex-col` with a scrolling body, so Save is visible on mobile without scrolling. Focus returns to the opener on close (`useRestoreFocus`).

### Schedule Import (Settings)

```
SCHEDULE
Import your onboarding schedule from an Excel or Google
Sheets export (.xlsx, .csv, or .tsv). The file is parsed
here and kept on this device — nothing is uploaded elsewhere.

[ Choose file ]

  ┌─ preview ──────────────────────────────────┐
  │ 4 activities ready to import, 1 skipped    │
  │ Row 5: could not read the start/end time   │
  │ Company Orientation — 09:00–11:00          │
  │ Security & Access Training — 09:30–11:30   │
  │                                            │
  │ [ Use this schedule ]  [ Discard ]         │
  └────────────────────────────────────────────┘
```

- One section on Settings, between Connection and Sync
- Preview before persist: activity count, skipped-row warnings (first 5), first activities with times
- **Explicit confirmation required** — nothing is stored until "Use this schedule"
- Importing is local-only; the Today status badge switches to `📄 Imported schedule · N activities`
- Removing the imported schedule returns the app to the default (demo) schedule
- Errors from parsing are user-presentable sentences, shown inline in red, never raw exceptions

### Guide Tour

```
┌───────────────────────────────────────┐
│  GUIDE · STEP 3 OF 8                  │
│                                       │
│  Your day at a glance                 │
│  See how far you are into the 90-day  │
│  journey and how today is going.      │
│                                       │
│  ●●●○○○○○      [ Back ][ Skip ][ Next ] │
└───────────────────────────────────────┘
```

- First-run walkthrough of the cockpit (8 steps: welcome, status bar, progress, current activity, timeline, quick note, navigation, done)
- Spotlight dims the page; a blue ring frames the highlighted element; the popover sits beside it (centered when no target)
- Auto-starts on a visitor's first arrival at Today; restartable from Settings
- Keyboard: `←`/`→` step, `Esc` closes, focus stays inside the popover
- Dismissing (skip, escape, or finish) persists to localStorage (`onboarding-guide-tour`) so it never nags
- Calm tone, no jargon, never blocks the primary action for returning users
- Elements opt in via a `data-tour="<id>"` attribute; steps live in `app/components/GuideTour.tsx`

---

## 6. Interaction Flows

### Starting a Session

1. User sees "RIGHT NOW" card with activity name, time, owner.
2. Clicks [Start] / [Continue].
3. App records start timestamp.
4. Card updates to "IN PROGRESS" with a timer (optional) or just "Started at HH:MM".
5. Timeline updates to show activity as ●.

### Finishing a Session

1. User clicks [Finish].
2. App records end timestamp, calculates duration.
3. Card transforms to "✓ DONE" with duration and a "Record what I learned" action.
4. Timeline updates to show activity as ✓.
5. Next activity moves into the "RIGHT NOW" card.

### Capturing Learning

1. User sees "What did you learn?" with a text area.
2. Types a few words.
3. Clicks "Summarize for me".
4. App sends to AI, returns a structured summary.
5. User reviews, edits if needed, confirms.
6. App saves to diary and syncs to Sheets.
7. User moves to next activity.

### Quick Note

1. User clicks "+ Quick note" at bottom of Today page.
2. A minimal text area appears.
3. User types anything.
4. App stores it as a draft (listed under Learnings).
5. Later, AI structures it into a diary entry (or user does it manually).

---

## 7. Responsive Behavior

- Mobile: full-width, stacked, touch targets 44px min.
- Tablet: two-column layout for timeline and detail.
- Desktop: max-width 1200px, centered.

### Mobile rules (UI/UX pass, 2026-10-03)

- **Touch targets.** Every button, link, select, checkbox/radio and summary inside main, header and nav is at least 44×44px on mobile (`min-h-11`, `size-11` for header icons); desktop may shrink (for example `min-h-11 sm:min-h-8.5`). Inline text links inside prose are exempt.
- **No horizontal scroll.** The shell's content wrapper has `min-w-0` and `<main id="main-content">` has `overflow-x-clip`. Use `overflow-x-clip`, never `overflow-x-hidden` (hidden breaks `sticky` headers). Truncate chains inside flex rows need `min-w-0`.
- **Floating clearance.** `main` has `pb-[calc(6rem+env(safe-area-inset-bottom))]` below `md`. The Assistant FAB sits at `bottom-[calc(1.25rem+env(safe-area-inset-bottom))]`; the FloatingTimer is above it at `bottom-[calc(5.5rem+...)]` and Toasts above the timer at `bottom-[calc(9rem+...)]`, so the three never overlap at 390px. From `md` up they return to `bottom-5`/`bottom-6`.
- **Sticky headers.** The Schedule's week headings stick at `top-14` below `md` (under the fixed mobile header) and `top-0` above. Anchored rows use `scroll-mt-[calc(3.5rem+3rem)] md:scroll-mt-16`.
- Filters collapse behind a "Filters (n active)" disclosure on mobile (`aria-expanded`).

### Dialogs

- **Focus restore.** Opening a dialog stores `document.activeElement`; closing returns focus to it if it is still connected (`useRestoreFocus`, used by `ModalDialog`, `CommandPalette`, the detail sheets and `LearningModal`).
- **Escape order.** Escape closes only the innermost thing: an open Sheet tools menu first (and refocuses its trigger), then the dialog or sheet. Slide-over sheets use `shouldSheetCloseOnEscape` (`sheetEscape.ts`); `ModalDialog` uses `shouldDismissOnEscape(dismissible, key)` and a non-`dismissible` dialog ignores Escape and backdrop clicks.
- **FAB hides under modals.** `useModalPresence` watches for an open `[aria-modal="true"]` dialog or alertdialog (excluding the guide-tour popover and the Assistant's own panel, marked `data-assistant`) and the Assistant FAB and panel disappear while one is open.
- Dialog actions inside footers (copy/sync tools) use `SheetToolsMenu` with `placement="up"`; every control inside a dialog is a `button` so the focus trap selector sees it.

### Dates

- Dates on screen are display-formatted by `lib/format-date.ts`: `formatDisplayDate` gives `Tue 1 Sep 2026` (en-GB parts with a fixed month-name table, since ICU writes "Sept").
- **Sheet dates are calendar days.** `parseSheetDate` accepts `DD/MM/YYYY`, `D/M/YYYY` and `YYYY-MM-DD` and returns `{ y, m, d }` (null for "Day 1", "TBD", empty); they are formatted in UTC so a device timezone can never shift them.
- **Instants use Asia/Jakarta.** `formatDisplayDate(now)`, `jakartaHour`, `greetingFor`, `formatJakartaTime` (the chip's `HH:MM`), `jakartaDateParts` and `isSameJakartaDate(sheetDateText, now)` use the business timezone, so Today's header, agenda and "Day N" agree on any device.
- **Display only.** These helpers must not be used in clipboard/TSV builders, `lib/diary-cockpit.ts`, `lib/feedback.ts`, `lib/timeline.ts` or any request body; what is copied or written keeps the sheet's own format.
- Time-derived output on Today renders after mount (neutral placeholder first) to avoid hydration mismatches.

---

## 8. Accessibility

- Keyboard navigable.
- Color not the only indicator (use labels).
- WCAG AA contrast.
- Reduced motion respected.

---

## 9. AI Interaction Rules

AI-generated content must be **visually distinguishable** from user-entered content at all times. Use a consistent visual treatment (e.g., a subtle background, an AI label, or a distinct border).

The user must always be able to:

- **Edit** any AI-generated content before confirming
- **Reject** the AI version and revert to their raw input
- **Confirm** explicitly before anything is saved

AI content that has not been confirmed must never be persisted.

---

## 10. Tone of Voice

The interface should feel like a **calm personal assistant**, not an enterprise administration portal.

| Prefer | Avoid |
|---|---|
| Clear | Jargon |
| Calm | Urgent / alarming |
| Professional | Overly casual |
| Lightweight | Heavy / form-heavy |
| Helpful | Demanding |

**Example — good:**
> "You've completed 3 of 5 activities today. Nice work."

**Example — avoid:**
> "3/5 activities marked COMPLETED. 2 activities PENDING. ACTION REQUIRED."

---

## 11. Implementation Notes

- Keep existing local storage (session, diary, history).
- Keep existing API routes for schedule, session, diary, AI.
- No new database.
- Google Sheets sync remains as-is.
- AI integration: use existing `/api/ai/summarize` for learning capture; add a `/api/ai/structure` for quick notes if needed.
- All new components are in `app/components/`.
- Tailwind v4 compiles via `@tailwindcss/postcss` (`postcss.config.mjs`); theme tokens and motion utilities live unlayered in `app/globals.css` — keep them free of element-level styling that would fight utility classes.

---

## 12. Design Principles

1. **Decision simplicity over information density.** One question per screen.
2. **Action dominates.** The primary action is the most prominent element.
3. **Progress as a single signal.** One progress component, not four.
4. **Timeline supports, not overshadows.** It shows the day's shape, not the hero.
5. **Completion is a moment.** A tiny celebration and a clear next step.
6. **Learning is conversational.** Forms are the enemy.
7. **The app hides the spreadsheet.** The user never sees columns, rows, or tabs.
