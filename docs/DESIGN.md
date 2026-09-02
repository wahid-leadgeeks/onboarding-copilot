# Design System & UX Guidelines

**Product:** Onboarding Copilot
**Status:** Active — MVP
**Last updated:** 2026-09-02

---

## 1. Core Principle

> The application should reduce cognitive load.

The employee should never need to understand the underlying spreadsheet structure to complete onboarding. The interface handles interpretation, navigation, and administration on their behalf.

---

## 2. Primary Question

Every screen must answer:

> **What do I need to do now?**

If a screen does not answer this question — or actively makes it harder to answer — the screen should not exist in MVP.

---

## 3. Information Hierarchy

When displaying information, prioritize in this order:

1. **Current activity** — what is happening right now
2. **Next activity** — what is coming up next
3. **Today's remaining activities** — the rest of the day at a glance
4. **Progress** — how much has been completed
5. **Learning capture** — after a session completes
6. **Historical information** — past sessions and diary (accessible but not prominent)

---

## 4. Primary Navigation

MVP navigation must have no more than three destinations:

| Destination | Purpose |
|---|---|
| **Today** | Current day view — the primary screen |
| **History** | Past sessions and diary entries |
| **Settings** | Account and preferences |

Do not add navigation items speculatively. Add only when a feature requires it.

---

## 5. Today Screen

The Today screen is the primary surface of the application. It must display:

- Current date
- Current activity (name, type, planned duration)
- Current session status (not started / in progress / completed)
- Primary action (Start / Finish)
- Next activity (name, planned time)
- Remaining activities count
- Daily progress indicator

Keep it scannable in under 10 seconds.

---

## 6. Session Interaction States

### Before starting

```
┌─────────────────────────────────┐
│  Introduction to IT Systems     │
│  Planned: 09:00 – 11:00         │
│                                 │
│       [ Start Session ]         │
└─────────────────────────────────┘
```

### During session

```
┌─────────────────────────────────┐
│  🟢  Session in progress        │
│                                 │
│  Introduction to IT Systems     │
│  Started: 09:02                 │
│  Elapsed: 1h 14m                │
│                                 │
│       [ Finish Session ]        │
└─────────────────────────────────┘
```

### After session — confirmation

```
┌─────────────────────────────────┐
│  ✅  Session completed           │
│                                 │
│  Introduction to IT Systems     │
│  Duration: 2h 03m               │
│                                 │
│       [ Capture Learning ]      │
│       [ Skip for now ]          │
└─────────────────────────────────┘
```

---

## 7. Learning Capture

Prefer conversational input over structured forms.

### Input options (in priority order)

| Option | UI element |
|---|---|
| **Voice** | 🎙 Speak — primary CTA |
| **Text** | ✍ Type — secondary option |
| **Skip** | Text link — always available |

After input:

1. Show the raw input.
2. Show the AI-structured version (if AI is available).
3. Allow the user to edit either.
4. Require explicit **Confirm** before saving to diary.

---

## 8. AI Interaction Rules

AI-generated content must be **visually distinguishable** from user-entered content at all times. Use a consistent visual treatment (e.g., a subtle background, an AI label, or a distinct border).

The user must always be able to:

- **Edit** any AI-generated content before confirming
- **Reject** the AI version and revert to their raw input
- **Confirm** explicitly before anything is saved

AI content that has not been confirmed must never be persisted.

---

## 9. UX Rules

### Avoid

- Large data tables or spreadsheet-like grids
- Excessive form fields
- Empty state dashboards with no clear action
- Multiple competing primary actions on one screen
- Requiring the user to understand spreadsheet structure
- Unnecessary confirmation dialogs for non-destructive actions
- Jargon from the spreadsheet (tab names, column headers, etc.)

### Prefer

- One primary action per screen
- Progressive disclosure (show details only when needed)
- Short, plain-language status summaries
- Clear, unambiguous status indicators
- Large, accessible touch targets (min 44×44px)
- Keyboard-friendly interaction patterns
- Optimistic UI updates with sync status indicators

---

## 10. Status Indicators

Use consistent, plain-language status labels:

| Status | Label | Visual |
|---|---|---|
| Not started | Not started | — |
| Currently active | In progress | 🟢 |
| Completed | Done | ✅ |
| Missed / overdue | Overdue | 🔴 |
| Syncing | Syncing... | ⏳ |
| Sync failed | Not synced | ⚠️ |

---

## 11. Tone of Voice

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

## 12. Accessibility Baseline

- All interactive elements must be keyboard accessible.
- Color must not be the only means of conveying status.
- Text must meet WCAG AA contrast ratios.
- Touch targets minimum 44×44px.
- Form inputs must have associated visible labels.
