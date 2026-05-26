# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@talentech/api", "dev"]
