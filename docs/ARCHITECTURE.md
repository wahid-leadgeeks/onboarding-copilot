# Architecture

**Product:** Onboarding Copilot
**Status:** Active — MVP
**Last updated:** 2026-09-02

---

## 1. Architectural Principle

> The application is a convenience layer on top of the existing Google Sheets onboarding system.

Google Sheets remains the source of truth during MVP. The application does not own the data — it reads, transforms, and writes back to the sheet on behalf of the employee.

See: [`docs/adr/0001-google-sheets-as-source-of-truth.md`](adr/0001-google-sheets-as-source-of-truth.md)

---

## 2. High-Level Architecture

```
                    ┌─────────────────┐
                    │  Google Sheets  │
                    │ Source of Truth │
                    └────────┬────────┘
                             │
                         Sheets API
                             │
                             ▼
┌──────────────┐      ┌──────────────┐
│              │      │              │
│   Web App    │◄────►│  Application │
│  (Next.js)   │      │  API Routes  │
│              │      │              │
└──────────────┘      └──────┬───────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
              AI Service            n8n
                    │                │
                    │                ├── reminders
                    │                ├── summaries
                    │                └── automation
                    ▼
          Structured Output
          (user-confirmed)
```

---

## 3. Recommended Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (App Router) | Server components where possible |
| Language | TypeScript (strict) | Required |
| Styling | Tailwind CSS | |
| Backend | Next.js API Routes | No separate server for MVP |
| Auth | Google OAuth 2.0 | Via NextAuth.js or similar |
| Integration | Google Sheets API v4 | |
| Automation | n8n | Non-critical path only |
| AI | Provider-agnostic LLM API | Abstracted behind a service interface |
| Database | None (MVP) | Google Sheets is the store |
| Cache | None (MVP) | Add if API rate limits become an issue |

---

## 4. Data Ownership

### Google Sheets owns:

- Schedule (activities, planned times, dates)
- Onboarding Diary (learning entries)
- Feedback Sheet
- Timeline / progress tracking
- Glossary / reference information

### The application owns:

- Temporary session state (in-progress timer)
- UI state
- AI processing state (pre-confirmation drafts)
- Integration metadata (sync status, last sync timestamp)
- Pending writes (when Sheets is temporarily unavailable)

---

## 5. Data Flows

### Schedule — Read

```
Google Sheets
  → Sheets API (read)
  → API Route: GET /api/schedule
  → Today view (filtered by date)
```

### Session — Start

```
User taps Start
  → Application records start timestamp (local)
  → Activity status → In Progress
  → UI shows live timer
```

### Session — Finish

```
User taps Finish
  → Application records end timestamp
  → Duration calculated
  → API Route: PATCH /api/schedule/:activityId
  → Sheets API (write): actual start, actual end, duration, status → Done
```

### Learning Capture

```
User speaks or types
  → Raw input sent to AI service
  → AI extracts and structures learning notes
  → Structured draft presented to user
  → User edits / confirms
  → API Route: POST /api/diary
  → Sheets API (write): entry appended to Onboarding Diary
```

### Automation

```
Application event (e.g., session completed)
  → Webhook: POST to n8n
  → n8n workflow triggered
  → Notification / summary / external integration
```

---

## 6. Module Boundaries

```
app/                  Next.js pages and layouts
app/api/              API routes (server-only)
  ├── schedule/       Read and update schedule activities
  ├── diary/          Read and write diary entries
  ├── session/        Session state management
  └── ai/             AI processing endpoints

lib/
  ├── sheets/         Google Sheets API client (isolated)
  ├── ai/             AI provider client (provider-agnostic interface)
  ├── n8n/            n8n webhook client
  └── session/        Session business logic

components/           React components (UI only, no API calls)
```

> Integration code (`lib/sheets/`, `lib/ai/`, `lib/n8n/`) must remain isolated from business logic. Swap implementations without touching business code.

---

## 7. Failure Strategy

### If Google Sheets API is unavailable:

- Do not lose session data.
- Persist session state locally (in-memory or localStorage with a clear pending indicator).
- Retry synchronization with exponential backoff.
- Show synchronization status clearly in the UI.
- Never silently discard a completed session.

### If the AI service is unavailable:

- Fall back to manual text input immediately.
- Never block completion of an onboarding activity because AI is down.
- AI summarization is an enhancement, not a requirement.

### If n8n is unavailable:

- Core application remains fully functional.
- Automation tasks (notifications, summaries) are best-effort only.
- Log failed webhook calls for manual retry if needed.

---

## 8. Security Considerations

- Google OAuth tokens stored server-side only (never exposed to the client).
- All Sheets API calls made from API routes (server-side), never from client components.
- AI API key kept in environment variables, never bundled client-side.
- n8n webhook URL kept in environment variables.
- Validate all incoming request payloads at API route boundaries.
- Validate all data received from Google Sheets before use.

---

## 9. Deferred Decisions

| Decision | Deferred Until |
|---|---|
| Persistent database | Multiple concurrent users or data relationship complexity |
| Redis / caching | Google Sheets API rate limits become a real problem |
| Separate backend service | API Routes become insufficient |
| Multi-tenant support | Phase 7 (Scale) |

See [`docs/ROADMAP.md`](ROADMAP.md) for phase definitions.
