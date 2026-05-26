# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# deps: install the full workspace dependency tree (cached layer)
# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# dev: target used by docker-compose; source is bind-mounted at runtime
# -----------------------------------------------------------------------------
FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@talentech/api", "dev"]

# -----------------------------------------------------------------------------
# build: compile TypeScript -> dist/
# -----------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @talentech/api build

# -----------------------------------------------------------------------------
# prod-deps: production-only node_modules (no devDependencies)
# -----------------------------------------------------------------------------
FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod --filter @talentech/api...

# -----------------------------------------------------------------------------
# runtime: minimal image that runs the built API on port 3000.
# Defaults to StubAIClient because no AZURE_OPENAI_* env vars are set here;
# pass them at `docker run` time to switch to the Azure-backed client.
# -----------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Production node_modules (workspace-linked) + built JS.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/shared ./packages/shared

WORKDIR /app/apps/api
EXPOSE 3000
# server.ts only exports buildServer(); start.ts is the actual listener that
# imports it and calls .listen(). The TypeScript build emits both as dist/*.js.
CMD ["node", "dist/start.js"]
