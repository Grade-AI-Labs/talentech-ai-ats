# AI-Driven ATS — Workshop Test Application

**Date:** 2026-05-26
**Status:** Approved (design)
**Purpose:** Test application used during workshops that walk through the `setup-agentic-repository` skill and the various review skills.

## Goal

Build a small but functional Applicant Tracking System that exercises a realistic-enough surface area for two workshop demos:

1. **`setup-agentic-repository`** — needs a repo with multiple subdomains so the generated `AGENTS.md` + per-subdomain `CONTEXT.md` files are non-trivial.
2. **Review skills (`code-review`, `review`, `security-review`)** — needs real, clean code so reviewers have something substantive to evaluate (not seeded smells, just normal code that may or may not have things worth flagging).

The app must run end-to-end without external infrastructure: no database, no required API key.

## Non-goals

- Production realism (no auth, no persistence, no multi-tenant)
- Comprehensive ATS features (no interview scheduling, pipelines, reporting)
- Polished UI

## Tech stack

- Node.js (>=20), TypeScript (strict)
- **Backend:** Fastify
- **Frontend:** Vite + React + TypeScript
- **Tests:** Vitest (both apps)
- **AI:** LangChain.js (`langchain` + `@langchain/openai`) against Azure OpenAI, deployment serving `gpt-4.1-mini`
- **Workspace:** pnpm workspaces

## Repository layout

```
talentech-ai-ats/
├── package.json                 # workspace root, scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── README.md
├── docs/
│   └── superpowers/specs/       # this design + future specs
├── apps/
│   ├── api/                     # Fastify backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── server.ts        # buildServer() factory + start
│   │   │   ├── routes/
│   │   │   │   ├── jobs.ts
│   │   │   │   ├── candidates.ts
│   │   │   │   ├── applications.ts
│   │   │   │   └── ai.ts
│   │   │   ├── store/
│   │   │   │   ├── repo.ts      # JobsRepo, CandidatesRepo, ApplicationsRepo
│   │   │   │   └── seed.ts      # in-memory seed data
│   │   │   └── ai/
│   │   │       ├── matcher.ts   # match(job, candidate) → MatchResult
│   │   │       └── client.ts    # Anthropic client + stub fallback
│   │   └── test/                # vitest specs
│   │
│   └── web/                     # Vite + React frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── pages/
│           │   ├── JobsPage.tsx
│           │   ├── CandidatesPage.tsx
│           │   └── ApplicationsPage.tsx
│           ├── components/
│           │   └── MatchPanel.tsx
│           ├── lib/
│           │   └── api.ts       # typed fetch client
│           └── styles.css
│
└── packages/
    └── shared/                  # shared TS types only
        ├── package.json
        ├── tsconfig.json
        └── src/index.ts
```

This shape gives `setup-agentic-repository` three meaningful subdomains (`apps/api`, `apps/web`, `packages/shared`) plus a root, which produces a useful `AGENTS.md` + three `CONTEXT.md` files.

## Domain model (in `packages/shared`)

```ts
export type Job = {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  createdAt: string;            // ISO
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  summary: string;
  skills: string[];
  createdAt: string;
};

export type ApplicationStatus = 'new' | 'reviewed' | 'rejected' | 'hired';

export type Application = {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  matchScore?: number;          // 0–100, set after AI match
  matchReasoning?: string;
  createdAt: string;
};

export type MatchResult = {
  score: number;                // 0–100
  reasoning: string;
};
```

## Backend (`apps/api`)

### Server

`buildServer()` factory returns a configured `FastifyInstance`. Useful for:
- `start.ts` calling `buildServer().listen(...)`
- Vitest using `fastify.inject(...)` against the same factory

CORS enabled for `http://localhost:5173` (Vite dev). JSON only.

### Routes

| Method | Path                       | Behavior |
|--------|---------------------------|----------|
| GET    | `/jobs`                    | List all jobs |
| POST   | `/jobs`                    | Create a job |
| GET    | `/jobs/:id`                | Get one job (404 if missing) |
| GET    | `/candidates`              | List all candidates |
| POST   | `/candidates`              | Create a candidate |
| GET    | `/candidates/:id`          | Get one candidate (404 if missing) |
| GET    | `/applications`            | List all applications |
| POST   | `/applications`            | Create application `{ jobId, candidateId }` |
| GET    | `/applications/:id`        | Get one application (404 if missing) |
| POST   | `/ai/match`                | Body `{ applicationId }` → runs match, persists `matchScore` + `matchReasoning` on the application, returns the updated `Application` |

Input validation uses Fastify's built-in JSON Schema route options. Errors are returned as `{ error: string }` with appropriate status codes.

### Store

Three in-memory repos backed by `Map<string, T>`, each exposing `list()`, `get(id)`, `create(input)`, `update(id, patch)`. IDs generated with `crypto.randomUUID()`. A `seed()` function preloads two jobs, three candidates, and two applications so the app is immediately useful on startup.

The repos are constructed once in `buildServer()` and decorated onto the Fastify instance (`fastify.repos`) so routes get them via DI rather than module-level singletons. This keeps tests isolated — each test builds a fresh server with fresh repos.

### AI matcher

`ai/matcher.ts` exposes:

```ts
export async function matchCandidateToJob(
  job: Job,
  candidate: Candidate,
  client: AIClient,
): Promise<MatchResult>
```

`ai/client.ts` exposes an `AIClient` interface with one method `complete(prompt: string): Promise<string>` and two implementations:

- `AzureOpenAIClient` — wraps LangChain.js's `AzureChatOpenAI` (from `@langchain/openai`), targeting an Azure OpenAI deployment that serves `gpt-4.1-mini`. The matcher builds a `ChatPromptTemplate` with a system message describing the matcher's role and JSON output contract, then a human message containing the job + candidate. Output is parsed with LangChain's `StructuredOutputParser` (zod schema for `{ score, reasoning }`) so the route gets typed data without ad-hoc JSON handling.
- `StubAIClient` — deterministic fallback. Computes a score from overlap between `candidate.skills` and `job.requirements` (case-insensitive). Reasoning is a templated string explaining matched/missing skills.

`buildServer()` picks `AzureOpenAIClient` when all of `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT` (or `AZURE_OPENAI_API_INSTANCE_NAME`), `AZURE_OPENAI_DEPLOYMENT_NAME`, and `AZURE_OPENAI_API_VERSION` are present; otherwise it uses `StubAIClient`. This is the key affordance for the workshop: anyone can run the app without Azure access, and the stub gives sensible results. `.env.example` documents all four variables with a comment pointing at the `gpt-4.1-mini` deployment.

The matcher returns `{ score, reasoning }`. The route persists this onto the application via `applications.update(id, { matchScore, matchReasoning })`.

### Error handling

- Missing entities → 404 with `{ error: "Job not found" }` etc.
- Validation errors → 400 (Fastify default)
- LangChain / Azure OpenAI errors (network, auth, parsing) are caught in `ai/matcher.ts` and rethrown as a typed `MatchError`; the `/ai/match` route maps these to 502 with a clear message.

## Frontend (`apps/web`)

Vite + React + TS. Tiny single-page app with client-side tab switching (no router needed — three pages is fine with state). Plain CSS, no UI library.

### Pages

- **Jobs** — list jobs, a small "Add job" form
- **Candidates** — list candidates, a small "Add candidate" form
- **Applications** — list applications joined with job title + candidate name; clicking one expands a `MatchPanel`

### `MatchPanel` component

Shows current match score + reasoning (if present). Has a "Run AI match" button that `POST`s to `/ai/match` and re-renders with the updated application.

### API client

`lib/api.ts` exports typed functions (`listJobs()`, `createJob(input)`, `runMatch(applicationId)`, etc.) that hit the Fastify API. Types come from `@talentech/shared`.

Base URL: `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`.

## Tests (Vitest)

### `apps/api/test`

- `routes/jobs.test.ts` — list/create/get via `fastify.inject`, including 404
- `routes/applications.test.ts` — create application referencing existing job/candidate; 400 when referenced ids don't exist
- `ai/matcher.test.ts` — exercises `matchCandidateToJob` with `StubAIClient`, asserts deterministic scoring on overlapping/disjoint skill sets. A second test passes a fake `AIClient` returning a canned JSON string and asserts the `StructuredOutputParser` path produces the expected `MatchResult` (so the LangChain glue is exercised without hitting Azure).
- `routes/ai.test.ts` — `POST /ai/match` end-to-end with stub client wired in, asserts that the application is updated with score + reasoning

### `apps/web/test`

- `MatchPanel.test.tsx` — renders with no score, with score; clicking "Run AI match" calls a mocked `runMatch` and re-renders
- `JobsPage.test.tsx` — renders a list and a created job

`@testing-library/react` + `jsdom` environment.

### Coverage stance

Not chasing a coverage number. The tests above demonstrate the real test patterns (route injection, component testing with mocked API client, deterministic AI testing via stub) that the workshop's review skills can comment on.

## Scripts (root `package.json`)

- `pnpm dev` — runs api + web in parallel (via `concurrently` or `pnpm -r --parallel run dev`)
- `pnpm test` — runs vitest in every package
- `pnpm build` — builds shared, api, web in order
- `pnpm typecheck` — `tsc --noEmit` across the workspace
- `pnpm lint` — defer (no linter in initial scope; can be added later, mentioned as a deliberate future addition)

## What this design intentionally does NOT include

- No auth, sessions, or users
- No database (Postgres/SQLite/etc.) — in-memory only
- No file/CV uploads or parsing
- No interview scheduling, pipelines, notes, or comments
- No Docker, no CI pipeline files
- No linter / formatter configured initially
- No E2E tests (Playwright etc.)

If the workshop later wants any of these, they're each a separate spec.

## Open questions

None. Ready to plan.

## Self-review notes

- No placeholders or TBDs.
- Repo layout matches the API routes match the test list — consistent.
- Scope is bounded: a single implementation plan can carry this through. No decomposition needed.
- Ambiguity check: "small but functional" is qualitative but bounded by the explicit non-goals list. The AI client interface is explicit (one method, two implementations) — no room for drift.
