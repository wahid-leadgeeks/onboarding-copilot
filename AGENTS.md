# AGENTS.md

## Project

**Onboarding Copilot**

## Mission

Build a lightweight application that reduces the administrative burden of completing the existing employee onboarding spreadsheet.

The application is a cockpit for the spreadsheet — not a replacement for it.

---

## Before Coding

Agents MUST read the following documents before writing any code:

1. This file (`AGENTS.md`)
2. [`docs/PRD.md`](docs/PRD.md) — product problem and goals
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system components and data flow
4. Relevant ADRs in [`docs/adr/`](docs/adr/)
5. [`docs/DESIGN.md`](docs/DESIGN.md) — UX and UI rules
6. [`docs/TODO.md`](docs/TODO.md) — current work queue

> Do not start implementation based solely on a user prompt if the repository documentation contradicts it. Resolve the conflict first.

---

## Product Rules

The application must:

- Reduce cognitive load for the onboarding employee.
- Preserve the existing Google Sheets workflow.
- Prefer automation over manual data entry.
- Keep user confirmation for any AI-generated content.
- Never silently alter historical records.

---

## Architecture Rules

- Do not introduce a database without a corresponding ADR.
- Do not replace Google Sheets without a corresponding ADR.
- Do not make n8n mandatory for core application functionality.
- Keep integration code isolated from business logic.
- Keep AI provider code provider-agnostic (no hard dependency on a single vendor).
- Validate all external data at system boundaries (API responses, Sheets data, AI output).

---

## UI Rules

- Follow [`docs/DESIGN.md`](docs/DESIGN.md) for all interface decisions.
- Avoid unnecessary screens.
- Avoid large spreadsheet-like tables or grids.
- Optimize every screen for the primary question: **"What should I do now?"**

---

## AI Rules

**AI output is untrusted input.**

Always:

1. Validate the structure and content of AI output.
2. Present AI-generated content to the user before it affects user-owned information.
3. Allow the user to edit AI output.
4. Require explicit user confirmation before persisting AI-generated content.

Never allow AI to:

- Invent or assume attendance.
- Invent learning notes or diary entries.
- Submit feedback without user confirmation.
- Evaluate or rate employee performance.
- Modify historical records automatically.

Reference: [`docs/adr/0003-ai-is-assistive-not-authoritative.md`](docs/adr/0003-ai-is-assistive-not-authoritative.md)

---

## Coding Rules

- TypeScript strict mode (`"strict": true`).
- Prefer small, composable functions over large monolithic ones.
- Validate external data at system boundaries.
- Handle Google Sheets API failures explicitly — never assume the API is available.
- Do not expose credentials or secrets to the client.
- Keep all secrets in environment variables (`.env.local`).
- Add tests for business-critical logic (session timing, duration calculation, sync logic).

---

## Testing

Before marking a task complete:

- [ ] Run `pnpm typecheck` — zero errors.
- [ ] Run `pnpm lint` — zero errors.
- [ ] Run `pnpm test` — all tests pass.
- [ ] Manually verify the affected user flow end-to-end.

---

## Git

Commits should be small, focused, and atomic.

Use conventional commit style:

```
feat:      new user-facing feature
fix:       bug fix
refactor:  code change without behavior change
docs:      documentation only
test:      adding or updating tests
chore:     build, config, tooling
```

Do not commit:

- `.env` or `.env.local`
- OAuth credentials or tokens
- API keys or secrets
- Generated private data
- Large binary files

---

## Documentation

When architecture or behavior changes:

- Update the relevant documentation file.
- Create an ADR in `docs/adr/` when a significant architectural decision is introduced or reversed.
- Update `docs/TODO.md` and `docs/ROADMAP.md` when scope changes.

---

## Agent Workflow

```
User request
     ↓
Read AGENTS.md
     ↓
Read PRD / ARCHITECTURE / DESIGN
     ↓
Read relevant ADRs
     ↓
Read relevant feature spec (docs/features/ if it exists)
     ↓
Check TODO.md
     ↓
Implement
     ↓
Test (typecheck + lint + unit tests + manual flow)
     ↓
Update docs if needed
     ↓
Commit
```
