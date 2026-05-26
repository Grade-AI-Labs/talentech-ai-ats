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
EXPOSE 5173
CMD ["pnpm", "--filter", "@talentech/web", "dev"]

# -----------------------------------------------------------------------------
# build: produce the static SPA bundle in apps/web/dist
# -----------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @talentech/web build

# -----------------------------------------------------------------------------
# runtime: nginx:alpine serving the built SPA on port 80
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runtime
# SPA fallback so deep links don't 404 on reload.
RUN printf '%s\n' \
    'server {' \
    '  listen 80;' \
    '  root /usr/share/nginx/html;' \
    '  index index.html;' \
    '  location / {' \
    '    try_files $uri $uri/ /index.html;' \
    '  }' \
    '}' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
