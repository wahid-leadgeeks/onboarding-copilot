# ADR-0005: Learning Records and AI Provider Chain

**Status:** Accepted
**Date:** 2026-09-05
**Deciders:** Engineering, Product

---

## Context

Learning notes are captured after each onboarding session, stored locally, and synced to the Onboarding Diary in Google Sheets ([ADR-0001](0001-google-sheets-as-source-of-truth.md)). Existing records carry a legacy shape, `{content, createdAt}`, with no ID and no structured fields.

Two internal contract questions need a decision:

1. **Record identity and structure.** Editing a note, linking a note to a session or activity, and filtering by activity all require stable record IDs and optional structured fields. Backfilling IDs or fields into existing records would mean migration writes against historical data. The product rules forbid silently altering historical records, so any rewrite must be avoided.
2. **AI provider resolution.** The AI assistant has a concrete provider (Groq) and a generic OpenAI-compatible endpoint option, and different environments configure different combinations of them. The application must stay provider-agnostic, keep credentials server-side, and resolve to the same provider for the same configuration every time.

[ADR-0003](0003-ai-is-assistive-not-authoritative.md) already constrains AI to drafting: AI output is untrusted input that the user reviews, edits, and confirms before anything is persisted. This ADR must not weaken that constraint.

---

## Decision

### 1. Additive learning record schema

**The legacy record shape `{content, createdAt}` remains valid. Readers must keep accepting it.**

- New fields, including structured metadata, are **optional and additive**. A record with or without them is equally valid, and every record is validated at the system boundary.
- Records that lack an ID receive a **deterministic ID computed at read time** from stable record properties. This avoids migration writes: existing records are never rewritten just to gain an ID.
- **New writes persist the ID** at creation time, so records created by the application are stable across reads without derivation.
- **Edits, deletes, and conversions** (for example, upgrading a legacy record to one with a persisted ID) happen only as **explicit user actions**. The application never rewrites records in the background.
- **AI never writes or modifies any record.** AI may draft content only; persistence follows the review-and-confirm rules of [ADR-0003](0003-ai-is-assistive-not-authoritative.md).
- **The diary sync contract is exactly `{content}`.** The client sends only the note content to `POST /api/diary`; structured fields are local-only until a future ADR changes the diary contract. Any timestamp written to the sheet row is stamped server-side, never sent by the client.
- **No database is introduced.** Local records stay in the existing client-side storage model, and Sheets remains the source of truth per [ADR-0001](0001-google-sheets-as-source-of-truth.md).

### 2. Server-side AI provider-resolution chain

**Provider resolution is deterministic, happens server-side only, and is ordered:**

1. **Fully configured Groq first.**
2. **Fully configured generic endpoint second** (the OpenAI-compatible endpoint).
3. **A deterministic heuristic last**, applied when no provider is fully configured. The heuristic returns the same outcome for the same configuration on every run. If the outcome is "no provider," AI features degrade gracefully and the manual flow remains fully usable, per [ADR-0003](0003-ai-is-assistive-not-authoritative.md).

"Fully configured" means every value that provider requires is present and valid at resolution time. A partially configured provider is skipped, never guessed into service.

Additional constraints:

- **The generic wire contract stays stable.** The internal request and response shape that application code consumes does not change when the provider changes.
- **Provider specifics are isolated server-side.** URLs, headers, model names, and response quirks stay behind the server boundary. Client code sees only the stable wire contract, never provider details or credentials.

---

## Consequences

### Positive

- Legacy records and the Sheets diary remain untouched: no migration, no background rewrites, no risk to historical data.
- Stable local IDs enable editing and linking features without any change to the spreadsheet.
- The provider chain behaves predictably across environments with different configurations.
- Providers remain swappable without touching client or business code, preserving provider-agnosticism.

### Negative

- Readers must handle two record shapes: legacy records with derived IDs and new records with persisted IDs.
- Read-time ID derivation adds a small computation cost on every read.
- Structured fields are invisible to sheet-only consumers, such as HR reading the workbook directly.
- Each provider in the chain needs its own configuration validation and testing.

### Mitigations

- Derive IDs with a single, unit-tested deterministic function and treat its inputs as a versioned contract.
- Validate every record at the system boundary, including legacy, structured, and AI-drafted shapes, before use or persistence.
- Cover the provider resolution order with unit tests so the chain is reproducible.

---

## Revisit When

- The Onboarding Diary contract needs to carry IDs or structured fields, which requires a new ADR for the Sheets write contract.
- A database is introduced (a revisit of [ADR-0001](0001-google-sheets-as-source-of-truth.md)), enabling server-side record identity.
- Records must be shared or synchronized across devices or multiple employees.
- A provider cannot conform to the stable generic wire contract and needs its own contract.
- Read-time ID derivation becomes a measured performance problem.
