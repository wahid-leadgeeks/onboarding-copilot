# ADR-0004: Session Tracking Model

**Status:** Accepted
**Date:** 2026-09-02
**Deciders:** Engineering, Product

---

## Context

The application needs to track when an employee starts and finishes an onboarding activity in order to calculate the actual duration and write it back to the Schedule sheet.

Several approaches are possible:

1. **Server-side session state** — The server records start time when the user clicks Start.
2. **Client-side session state** — The browser records start time locally and submits it on Finish.
3. **Optimistic client + server sync** — Client records time locally, server validates and persists.

The key constraints are:

- The employee may close the browser during a session.
- The Google Sheets API may be temporarily unavailable.
- Session data must not be lost due to either of the above.
- The system must not allow sessions to silently disappear.

---

## Decision

**Use optimistic client-side session state with server-side validation and Sheets persistence.**

1. When the user taps **Start**:
   - The start timestamp is recorded in the client (localStorage + React state).
   - A `POST /api/session/start` request is made to the server.
   - The server stores the session start in memory (or a lightweight cache if needed).
   - The UI immediately enters "In Progress" state regardless of server response.

2. When the user taps **Finish**:
   - The end timestamp is recorded in the client.
   - Duration is calculated client-side.
   - A `POST /api/session/finish` request is made with start time, end time, and activity ID.
   - The server validates the times and writes actual start, end, and duration to the Schedule sheet.
   - On success, the client clears local session state.
   - On failure, the client retains local session state and marks it as pending sync.

3. **Recovery**: On application load, if pending session state exists in localStorage, the user is shown a "You have an unsynced session — would you like to sync it?" prompt.

---

## Consequences

### Positive

- Session data survives browser refreshes and short outages.
- The UI is immediately responsive — no waiting for server round-trips before showing "In Progress."
- Google Sheets unavailability does not cause data loss.

### Negative

- Client-provided timestamps are not server-verified at record time — a malicious or buggy client could submit incorrect times.
- More complex recovery logic for pending sessions.
- localStorage is cleared if the user clears browser data.

### Mitigations

- Validate submitted timestamps server-side (reject obviously invalid times: future start, end before start, duration > 24h).
- Log validation failures.
- Accept that for MVP with a single trusted employee, timestamp manipulation is a low-risk concern.
- Document the limitation and revisit if the application is used in a higher-trust-required context.

---

## Revisit When

- The application is used in a context requiring audit-grade time records.
- Multiple employees use the application and time accuracy becomes critical.
- A server-side database is introduced (ADR-0001 revisit), enabling server-side session state.
