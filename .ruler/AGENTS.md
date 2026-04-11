# AGENTS.md

Centralized AI agent instructions. Add coding guidelines, style guides, and project context here.

Ruler concatenates all `.md` files in this directory (and subdirectories), starting with `AGENTS.md` (if present), then remaining files in sorted order.

# Runtime is Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun install` instead of `npm install` or `pnpm install` or `yarn install`
- Use `bun run <script>` instead of `npm run <script>` or `pnpm run <script>` or `yarn run <script>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads `.env`, so do not add `dotenv` setup unless a package explicitly requires it

## Workspace layout

- `apps/api` contains the Hono API entrypoint
- `apps/web` contains the TanStack Start web app
- `packages/*` contains shared auth, config, data, env, and UI packages
- Run workspace-wide tasks from the repository root with `turbo`

## Project stack

- Better Auth handles authentication and organization membership
- Drizzle defines the database schema and migration workflow
- Hono and oRPC power the backend API surface
- Shared UI components live in `packages/ui`

## TanStack Start SSR and data loading

- Treat SSR-visible state as a server-data problem first, not a client-fetch problem.
- If a value affects the initial HTML, route guards, redirects, or controlled UI state during hydration, load it before render.
- Prefer `beforeLoad` for route-critical data and decisions:
  - auth/session gating
  - redirects
  - route-scoped entities needed for the first render
  - app-wide SSR state that should be available from the root route context
- Use `context.queryClient.ensureQueryData(...)` inside `beforeLoad` when the route depends on query-backed data.
- When root-level data is needed throughout the app, load it in the root route `beforeLoad`, return it in route context, and seed related query caches from that same source.

## Initial data preferences

- Prefer one canonical server-loaded source of truth for the first render.
- If `beforeLoad` or route context already has the data, pass that into query hooks via `initialData` instead of letting the component render a pending state first.
- For shared app state, follow the `appAuthState` pattern:
  - load it in root `beforeLoad`
  - expose it through route context
  - use it as `initialData` in hooks such as `useAppAuthStateQuery`
  - seed any derivative query caches from that same payload
- For route-local entities, pass the `beforeLoad` result into the feature/query hook as `initialData`.
- Do not compute SSR-visible controlled props from a secondary query alone if that query can be pending on the server or during hydration.
- When combining sources, prefer this order:
  - optimistic in-flight mutation state
  - persisted query data
  - server-loaded `initialData` or route-context data
  - hardcoded fallback defaults last
- Avoid disabling SSR-controlled UI just because a secondary query is pending if stable server-loaded data already exists.

## Hydration guidance

- Server markup and the first client render must agree on controlled values such as `checked`, `value`, `open`, and `disabled`.
- If a component rendered on the server depends on data that also exists in root or route context, use that context for the initial render to avoid hydration mismatches.
- If a piece of UI is truly client-only, explicitly gate it behind a mounted/client check. Otherwise, make the server and client read the same initial data.

## Feature structure and layering

- Before adding or refactoring a feature, inspect nearby route files, neighboring feature folders, and matching API feature modules. Prefer the nearest strong local pattern over a generic scaffold.
- In `apps/web/src/routes`, keep file routes thin. Let them own route registration, `beforeLoad`, params, and route context wiring, then render a feature component from `apps/web/src/features/*`.
- In `apps/web/src/features/*`, prefer `data-access`, `feature`, `ui`, and optional `util` folders when the workflow is non-trivial.
- In web `data-access`, own oRPC calls, query keys, invalidation, optimistic or pending mutation state, and toast or mutation side effects. Prefer one query or one mutation per file or hook.
- In web `feature`, own prerequisite gating, query or mutation selection, route-param usage, child-feature composition, and mapping resolved data into UI props.
- In web `ui`, keep cards, dialogs, forms, list items, lists, tables, and similar leaves presentational. Do not move route parsing, API calls, or mutation orchestration into `ui`.
- Keep ephemeral draft, filter, and input state in the smallest UI leaf that needs it unless multiple siblings genuinely need to share it.
- Prefer parent feature gating over passing prerequisite booleans into child features and making the child branch internally.
- Prefer small explicit files over monoliths. Split large `*-manage` screens or aggregate hooks into focused features, queries, mutations, and UI leaves.
- Prefer repository naming patterns such as `*-feature-*`, `*-router`, `*-ui-*`, `use-*-create`, `use-*-query`, and `use-*-update`. Avoid placeholder names such as `screen`, `view`, `wrapper`, or `manager` unless the local pattern already uses them deliberately.
- In `packages/api/src/features/*`, keep `feature` files as procedure or request orchestration boundaries, `data-access` files as database or integration code, and `util` files pure.
- Prefer early returns and small handoff contracts between layers. Pass concrete domain actions and resolved data, not broad event bags or catch-all management objects.
