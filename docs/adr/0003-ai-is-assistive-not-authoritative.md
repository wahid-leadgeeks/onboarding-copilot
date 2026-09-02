# ADR-0003: AI Is Assistive, Not Authoritative

**Status:** Accepted
**Date:** 2026-09-02
**Deciders:** Engineering, Product, HR

---

## Context

The application uses AI to help employees capture and structure learning notes after each onboarding session. AI could plausibly be used to:

- Summarize raw notes into diary entries
- Detect activities from calendar or device signals
- Generate feedback on employee progress
- Automatically mark attendance based on inferred signals

These capabilities could save time — but they also carry significant risk if AI is allowed to act without user oversight. Incorrect AI output that silently enters the onboarding record could affect the employee's documented learning, their feedback, and organizational records.

Employees are new and may not always notice or challenge incorrect AI output if the interface does not make it easy to do so.

---

## Decision

**AI may transform or summarize employee-provided information, but the employee remains responsible for reviewing and confirming the result before it is persisted.**

AI is a drafting assistant. The employee is the author.

---

## Rules

### AI must never silently:

- Mark attendance or presence
- Invent learning notes or diary entries not grounded in user input
- Submit feedback responses without explicit user confirmation
- Modify historical records (completed sessions, past diary entries, submitted feedback)
- Evaluate or score employee performance
- Make any write to Google Sheets without a user confirmation step

### AI must always:

- Present its output to the user before saving
- Allow the user to edit AI-generated content
- Allow the user to reject AI output and revert to raw input
- Be visually distinguishable from user-authored content in the UI
- Degrade gracefully — if AI is unavailable, the user can proceed manually

---

## Consequences

### Positive

- Employee remains in control of their own onboarding record.
- Reduces risk of incorrect data entering organizational records.
- Builds trust in the system — the employee knows AI helps but does not decide.
- Complies with reasonable expectations of transparency in AI-assisted tools.
- Protects against prompt injection and other AI failure modes affecting records.

### Negative

- Every AI interaction requires an additional confirmation step.
- This adds friction for users who trust AI output and would prefer auto-apply.
- AI features cannot be fully "set and forget."

### Mitigation

- Make the confirmation step as lightweight as possible (one tap to confirm, pre-filled edit field).
- Allow users to quickly confirm without reading every word if they choose to — but always give them the choice.

---

## Scope

This ADR applies to all AI features in the application, including:

- Learning note summarization
- Diary entry structuring
- Any future AI-generated feedback, summaries, or evaluations

Any future feature that proposes allowing AI to act without user confirmation must create a new ADR explicitly overriding this decision for that specific, bounded case, with explicit justification and HR approval.
