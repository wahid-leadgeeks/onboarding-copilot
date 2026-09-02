# ADR-0002: Use n8n for Workflow Automation

**Status:** Accepted
**Date:** 2026-09-02
**Deciders:** Engineering, Product

---

## Context

The application needs to support asynchronous automation tasks including:

- Morning schedule briefings
- Session reminders
- Missing-record detection
- Daily and weekly summaries
- External integrations (email, messaging, calendar)

Building these capabilities directly into the application would increase scope significantly, require a persistent job scheduler, and couple automation logic tightly to the application code.

An alternative is to use a dedicated automation platform that handles scheduling, retries, and integrations independently.

---

## Decision

**n8n handles asynchronous automation and external integrations.**

The application triggers n8n via webhook calls at defined events. n8n executes the automation workflow. The core application does not depend on n8n for its primary functionality.

---

## Responsibility Split

### n8n is responsible for:

- Notification delivery (email, messaging platforms)
- Daily and weekly summary generation and dispatch
- Scheduled checks (morning briefing, missing records)
- AI workflows that run asynchronously (e.g., weekly progress digest)
- Webhooks to external systems
- Any integration that does not need to be synchronous

### The application is responsible for:

- All user interface rendering and interaction
- Session tracking (start, stop, duration)
- User confirmation flows
- Immediate state changes visible in the UI
- Core data validation
- Synchronous writes to Google Sheets

---

## Consequences

### Positive

- Automation logic is independent of the application deployment.
- n8n workflows can be modified without deploying application code.
- The application remains fast and simple — no background job infrastructure needed.
- n8n provides visual workflow editing, useful for non-developer stakeholders.

### Negative

- Introduces an operational dependency on an n8n instance.
- Webhook delivery is not guaranteed (n8n could be down or unreachable).
- Two systems to monitor and maintain.

---

## Critical Rule

> **Do not make the application dependent on n8n for basic functionality.**

If n8n is unavailable, the application must continue to work. Sessions must be completable. Learning must be capturable. Sheets must be synchronizable.

n8n failure is always a degraded-but-acceptable state, never a blocking failure.

---

## Revisit When

- Automation complexity grows beyond what n8n can reasonably handle.
- Self-hosted n8n becomes an operational burden.
- A managed alternative (e.g., Zapier, Make, Inngest) becomes preferable.
