# Talentech AI ATS — Workshop Test App

Small applicant tracking system used as a sandbox for workshop demos of agent
skills (`setup-agentic-repository`, the review skills, etc.). The app is fully
self-contained: in-memory storage, deterministic AI stub fallback, no database.

> Slice 1 status: `Jobs` is wired end-to-end. Candidates, applications, and the
> AI match flow land in later slices.

## Prerequisites

- Node.js 24 (see `.nvmrc`) and pnpm — or Docker if you'd rather skip the
  local toolchain.

## Quick start (Docker)

```bash
cp .env.example .env   # optional; empty values fall back to the StubAIClient
docker compose up
```

- API: <http://localhost:3000>
- Web: <http://localhost:5173>

## Quick start (local Node 24 + pnpm)

```bash
corepack enable
pnpm install
pnpm dev
```

`pnpm dev` runs the API and the web app in parallel.

## Scripts

| Command            | What it does                                       |
|--------------------|----------------------------------------------------|
| `pnpm dev`         | API on `:3000`, Vite dev server on `:5173`         |
| `pnpm build`       | Build `shared`, `api`, and `web`                   |
| `pnpm test`        | Vitest across the workspace                        |
| `pnpm typecheck`   | `tsc --noEmit` across the workspace                |

## Layout

```
apps/
  api/   Fastify backend (buildServer factory, in-memory repos)
  web/   Vite + React frontend
packages/
  shared/  Shared TypeScript types
```

## Environment variables

`.env.example` documents the Azure OpenAI variables. Leave them unset to use
the deterministic `StubAIClient` — the app works end-to-end without any
credentials.
