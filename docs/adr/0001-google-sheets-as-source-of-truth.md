# ADR-0001: Google Sheets as Source of Truth

**Status:** Accepted
**Date:** 2026-09-02
**Deciders:** Engineering, Product

---

## Context

The existing onboarding process already uses a Google Sheets workbook as its primary data store. The workbook contains:

- Schedule (activities, planned times, dates)
- Onboarding Diary (learning entries)
- Feedback Sheet
- Timeline / progress tracking
- Glossary and reference information

HR and management actively use and maintain this workbook. It contains organizationally important records that predate this project.

Building a new application from scratch would require migrating this data to a separate database, recreating the existing reporting and visibility that HR relies on, and convincing stakeholders to abandon a familiar workflow — all before delivering any user value.

---

## Decision

**Google Sheets remains the primary source of truth during MVP.**

The application acts as a user-friendly interface and automation layer on top of the existing spreadsheet. It reads from, and writes back to, Google Sheets via the Sheets API.

No separate persistent database will be introduced without a new ADR explicitly approving it.

---

## Consequences

### Positive

- No data migration required before launch.
- Existing HR workflow remains intact and visible.
- Easy organizational adoption — the spreadsheet still exists.
- Existing records remain accessible to anyone with current sheet access.
- MVP scope is significantly reduced.

### Negative

- Google Sheets API has rate limits (read: 300 req/min per project; write: 300 req/min per project).
- Transactional consistency is harder — Sheets has no atomic multi-cell transactions.
- The application is dependent on the spreadsheet structure remaining stable.
- Concurrent writes from multiple users could cause conflicts.
- Complex relational queries are not practical against Sheets.

### Mitigations

- Design the application to minimize API calls (batch reads, cache schedule per page load).
- Treat the spreadsheet schema as a versioned contract — document the expected structure explicitly.
- For MVP, the application is single-user (one onboarding employee at a time), avoiding concurrency conflicts.

---

## Revisit When

This decision should be revisited if any of the following occur:

- Multiple employees need to use the application simultaneously.
- Data relationships become too complex for a flat spreadsheet structure.
- Reporting requirements exceed what Google Sheets can provide.
- Reliability requirements demand transactional storage.
- Google Sheets API rate limits become a real operational constraint.

When revisiting, create a new ADR that supersedes this one.
