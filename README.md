# Onboarding Copilot

> **Don't rebuild the onboarding spreadsheet. Build a cockpit for it.**

A lightweight assistant that makes employee onboarding administration almost effortless.

## Goal

The application provides a simple interface over the existing Google Sheets onboarding workflow. The employee focuses on learning. The system handles the administration.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes |
| Integration | Google Sheets API + Google OAuth |
| Automation | n8n |
| AI | Provider-agnostic LLM API |

## Requirements

- Node.js 18+
- pnpm
For local fallback mode, only Node.js, pnpm, and the project dependencies are
required. Google Cloud, OAuth, Sheets proxies, n8n, and an AI provider are
optional integrations.

## Installation

```bash
git clone <repository>
cd onboarding-copilot
pnpm install
```

## Environment

Create `.env.local` in the project root:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEETS_ID=
N8N_WEBHOOK_URL=
AI_API_KEY=
AI_API_BASE_URL=
SHEETS_SCHEDULE_URL=
SHEETS_WRITE_URL=
SHEETS_DIARY_URL=
SHEETS_WRITE_TOKEN=

# Groq AI assistant — pick any current Groq chat model; the model is
# configured here, never hardcoded in the app
GROQ_API_KEY=
GROQ_MODEL=
# Optional endpoint override (defaults to the Groq OpenAI-compatible URL)
# GROQ_BASE_URL=https://api.groq.com/openai/v1/chat/completions
```

Use `.env.example` as the starting template. All Google, automation, and AI values are server-only; never expose them through client-side code or commit `.env.local`.

> Never commit `.env.local` or any file containing credentials.

### AI provider precedence

AI features resolve their provider server-side in a fixed order
([ADR-0005](docs/adr/0005-learning-records-and-ai-provider-chain.md)): a fully
configured Groq provider (`GROQ_API_KEY` + `GROQ_MODEL`, optional
`GROQ_BASE_URL`) wins over a fully configured generic endpoint
(`AI_API_BASE_URL` + `AI_API_KEY`). Partially configured providers are ignored.
When neither is fully configured, the app falls back to a deterministic local
heuristic and every feature stays usable without AI.

### Integration contract

`SHEETS_SCHEDULE_URL` is a server-side read proxy that returns a JSON array of
validated activity objects (`id`, `name`, `type`, `plannedStart`, `plannedEnd`,
and a status of `not-started`, `in-progress`, `done`, or `overdue`).

`SHEETS_WRITE_URL` is a server-side write proxy. The app sends `POST` JSON with
`activityId`, `actualStart`, `actualEnd`, and `durationMinutes`; a configured
`SHEETS_WRITE_TOKEN` is sent only as a Bearer header from the server.

When these values are absent or unavailable, sessions and learning notes remain
available locally and are marked pending for later synchronization.

## Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Checks

```bash
pnpm typecheck   # TypeScript type checking
pnpm lint        # ESLint
pnpm test        # Unit tests
```

All three must pass before committing.

Continuous integration runs these checks plus `pnpm build` on every push and
pull request to `main` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Documentation

| Document | Question it answers |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Why are we building this? |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | What does the system look like? |
| [`docs/DESIGN.md`](docs/DESIGN.md) | How should it behave and look? |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Where are we going? |
| [`docs/TODO.md`](docs/TODO.md) | What should we do next? |
| [`docs/adr/`](docs/adr/) | Why did we make this decision? |

## Agent Development

See [`AGENTS.md`](AGENTS.md) before writing any code.

## Project Status

See [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/TODO.md`](docs/TODO.md).
