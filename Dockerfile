# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM oven/bun:1.3.11-slim AS base
WORKDIR /workspace
ENV DO_NOT_TRACK=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

FROM --platform=$TARGETPLATFORM oven/bun:1.3.11-slim AS target-base
WORKDIR /workspace
ENV DO_NOT_TRACK=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

FROM target-base AS deps
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN bun install --frozen-lockfile

FROM deps AS build
RUN bun run build

FROM target-base AS runtime-base
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/package.json ./package.json
COPY --from=deps /workspace/bun.lock ./bun.lock
COPY --from=deps /workspace/turbo.json ./turbo.json
COPY --from=deps /workspace/apps ./apps
COPY --from=deps /workspace/packages ./packages
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/web/dist ./apps/web/dist
COPY --from=deps /workspace/scripts ./scripts
RUN chown -R bun:bun /workspace

FROM runtime-base AS api
USER bun
EXPOSE 3000
CMD ["bun", "run", "start:api"]

FROM runtime-base AS web
USER bun
EXPOSE 3001
CMD ["bun", "run", "start:web"]
