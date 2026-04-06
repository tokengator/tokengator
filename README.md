# tokengator

TokenGator lets Discord communities gate access by validating onchain asset ownership.

Under the hood it uses TanStack Start, Hono, oRPC, Better Auth, Drizzle, SQLite/Turso, and shared packages for auth, indexing, and UI.

## Features

- **Authentication** - Better Auth with Discord and Solana sign-in/linking
- **Bun** - Runtime environment
- **Discord bot integration** - API-hosted Discord bot helpers and command registration
- **Drizzle** - TypeScript-first ORM
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Solana asset indexing** - Helius-backed ownership indexing and asset group sync
- **SQLite/Turso** - Database engine
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **TanStack Start** - SSR framework with TanStack Router
- **Turborepo** - Optimized monorepo build system
- **TypeScript** - For type safety and improved developer experience

## Getting Started

Clone the repository and install the dependencies:

```bash
git clone https://github.com/tokengator/tokengator.git tokengator
cd tokengator
bun install
```

Then create your local env files and generate any placeholder secrets:

```bash
bun run setup
```

## Database Setup

This project uses SQLite with Drizzle ORM.

1. Start the local SQLite database (optional):

```bash
bun run db:local
```

2. Update your `.env` file in the `apps/api` directory with the appropriate connection details if needed.

For the full local TokenGator flow, fill in the Discord and Helius values in addition to the local database defaults.

3. Apply the schema to your database:

```bash
bun run db:push
```

4. Seed the local development dataset:

```bash
bun run db:seed
```

This seeds local users, Solana sign-in fixtures, and development organizations. The command prints the seeded usernames and organization summaries when it completes.

Then, start the development apps in separate terminals:

```bash
bun run dev:api
bun run dev:web
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## `dev:local`

Use the split `dev:api` and `dev:web` flow above for regular development.
To quickly start the full local stack and verify the setup is coherent, run:

```bash
bun run dev:local
```

This starts the local database, waits for it to be ready, runs `db:push`, runs `db:seed`, and then opens the database, API, and web processes in a `tmux` session.

This helps when you want a quick end-to-end local setup check without manually coordinating multiple terminals and startup order.

Useful `tmux` shortcuts with the default setup:

- `Ctrl+b`, then arrow keys: switch panes
- `Ctrl+b`, then `d`: detach and leave everything running
- `Ctrl+c` inside a pane: stop the current process, then rerun the command in that pane
- `exit`: close the current pane
- `tmux attach -t tokengator-dev`: reattach to the session
- `tmux kill-session -t tokengator-dev`: stop the whole session

## Docker and Dokploy

A minimal production container setup is included for Dokploy-style deployments.

### Services

- `web` on internal port `3001`
- `api` on internal port `3000`
- `libsql` on internal port `8080` (internal only, via `ghcr.io/beeman/libsql-server-healthcheck:latest`)

The root `Dockerfile` has separate `api` and `web` targets, and `compose.yml` wires the three services together.

### Local container run

The compose file reads its env values from `apps/api/.env`. For local use, copy `apps/api/.env.example` to `apps/api/.env`, update the values you need, create the Dokploy network once, then run:

```bash
docker network create dokploy-network
bun run docker:up
```

The default host port mappings are:

- Web: `3001`
- API: `3000`

For browser traffic, `VITE_API_URL` must be a host the browser can actually reach, such as `http://localhost:3000` locally or your public API domain in Dokploy.

Override them with `WEB_PORT` and `API_PORT` if needed.

### Dokploy notes

- Route the web service to container port `3001`
- Route the api service to container port `3000`
- Keep `libsql` internal only
- The API container waits for the libsql healthcheck, then runs `bun run db:push` and starts
- Keep both `default` and `dokploy-network` attached for `web` and `api`

## Published container images

GitHub Actions publishes container images to GHCR on pushes to `main`, while pull requests build the Docker targets without pushing.

Published images:

- `ghcr.io/tokengator/tokengator-api:latest`
- `ghcr.io/tokengator/tokengator-web:latest`

The workflow also produces branch, pull request, and `sha-*` tags so Dokploy or other deployers can pin preview and immutable image versions when needed.

## UI Customization

React web apps in this project share shadcn/ui primitives through `packages/ui`.

- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`
- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
bunx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from '@tokengator/ui/components/button'
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Git Hooks and Formatting

- Format and lint fix: `bun run lint:fix`

## Project Structure

```text
tokengator/
├── apps/
│   ├── api/         # Backend API (Hono, oRPC, Discord bot host)
│   └── web/         # Frontend application (React + TanStack Start)
└── packages/
    ├── api/         # Shared API layer, routers, and server composition
    ├── auth/        # Authentication configuration for Discord and Solana sign-in
    ├── config/      # Shared TypeScript and tooling configuration
    ├── db/          # Database schema, queries, and seed scripts
    ├── discord/     # Discord bot runtime and command helpers
    ├── env/         # Typed environment variable definitions
    ├── indexer/     # Solana ownership indexing utilities and Helius integration
    ├── sdk/         # Shared client SDK for calling the API
    └── ui/          # Shared shadcn/ui components and styles
```

## Available Scripts

- `bun run build`: Build all applications
- `bun run check-types`: Check TypeScript types across all apps
- `bun run ci`: Run the full CI task set locally
- `bun run db:generate`: Generate database client/types
- `bun run db:local`: Start the local SQLite database
- `bun run db:migrate`: Run database migrations
- `bun run db:push`: Push schema changes to database
- `bun run db:reset`: Remove the local SQLite database files
- `bun run db:seed`: Seed the local development dataset
- `bun run db:studio`: Open database studio UI
- `bun run dev`: Start all applications in development mode
- `bun run dev:api`: Start only the API
- `bun run dev:local`: Start the local database, apply schema/seed, and open API/web in `tmux`
- `bun run dev:web`: Start only the web application
- `bun run docker:up`: Build and start the local Docker stack with env from `apps/api/.env`
- `bun run lint`: Run Oxlint and Oxfmt in check mode
- `bun run lint:fix`: Run Oxlint and Oxfmt with auto-fixing
- `bun run setup`: Create local env files and generate placeholder secrets
- `bun run test`: Run the workspace test suite
- `bun run test:e2e`: Run the workspace end-to-end tests
- `bun run test:integration`: Run the workspace integration tests
