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
| `pnpm test`        | Vitest across the workspace (excludes `e2e`)       |
| `pnpm test:e2e`    | Playwright smoke suite against real API + web      |
| `pnpm test:all`    | `pnpm test` followed by `pnpm test:e2e`            |
| `pnpm typecheck`   | `tsc --noEmit` across the workspace                |

### Playwright E2E smoke tests

The `e2e/` workspace package boots the real API and web dev server via
Playwright's `webServer` and drives them with Chromium. The API is launched
without any `AZURE_OPENAI_*` env vars, so the deterministic `StubAIClient` is
always used and the match score is reproducible.

On first use (or after a Playwright version bump), install the Chromium
browser and its system libraries (this is the only step that needs root):

```bash
pnpm exec playwright install --with-deps
```

After that, run the suite from the repo root:

```bash
pnpm test:e2e
```

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

## Production builds

The workshop happy path is `docker compose up` against the `dev` stage. The
Dockerfiles also include realistic `build` and `runtime` stages so the
production path is visible to review skills and easy to try locally. These
stages are *not* wired into `docker-compose.yml` — they exist for inspection
and for one-off production-style runs.

Build the images from the repo root (the build context is the whole workspace
so the Dockerfiles can see `pnpm-workspace.yaml` and `packages/shared`):

```bash
# API: node:24-alpine, runs `node dist/start.js` on :3000
docker build --target runtime -f apps/api/Dockerfile -t talentech-ai-ats-api .

# Web: nginx:alpine serving the built Vite SPA on :80
docker build --target runtime -f apps/web/Dockerfile -t talentech-ai-ats-web .
```

Run them:

```bash
# API on http://localhost:3000 (StubAIClient is the default with no Azure env)
docker run --rm -p 3000:3000 talentech-ai-ats-api

# Web on http://localhost:8080
docker run --rm -p 8080:80 talentech-ai-ats-web
```

To use the Azure OpenAI client instead of the stub, pass the four
`AZURE_OPENAI_*` variables from `.env.example` to `docker run` (e.g.
`--env-file .env`). Omitting them keeps the deterministic stub so the runtime
image works for a fresh clone with zero configuration.
