# Design System — Onboarding Copilot

**Product:** Onboarding Copilot
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
