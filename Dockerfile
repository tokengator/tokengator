# syntax=docker/dockerfile:1
FROM oven/bun:1.3.11-slim AS base

ENV DO_NOT_TRACK=1
WORKDIR /app

FROM base AS base-prod

ENV NODE_ENV=production
USER bun

FROM base AS deps

COPY bun.lock ./
COPY --parents **/package.json ./

RUN bun install --frozen-lockfile

FROM deps AS build

COPY . .

RUN bun run --cwd apps/api build
RUN bun run --cwd apps/web build
RUN bun build apps/api/dist/index.mjs --format esm --outfile apps/api/dist/index.runtime.mjs --target bun
RUN bun build apps/web/dist/server/server.js --format esm --outfile apps/web/dist/server/server.runtime.mjs --target bun

FROM deps AS runtime-deps

COPY scripts/generate-docker-runtime-package.ts ./scripts/generate-docker-runtime-package.ts

RUN bun ./scripts/generate-docker-runtime-package.ts

RUN rm -rf bun.lock node_modules packages/*/node_modules

RUN bun install --production

FROM base-prod AS app

COPY --from=build /app/apps/api/dist/index.runtime.mjs ./apps/api/dist/index.runtime.mjs
COPY --from=build /app/apps/web/dist/client ./apps/web/dist/client
COPY --from=build /app/apps/web/dist/server/server.runtime.mjs ./apps/web/dist/server/server.js
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=runtime-deps /app/package.json ./package.json

COPY packages/db/drizzle.config.ts ./packages/db/drizzle.config.ts
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/src ./packages/db/src

EXPOSE 3000

CMD ["bun", "start"]
