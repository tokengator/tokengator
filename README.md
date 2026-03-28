# tokengator

A Bun platform template with TanStack Start, Hono, oRPC, Better Auth, Drizzle, SQLite/Turso, and shared UI packages.

## Create a New Project

```bash
bun x create-seed@latest my-project -t tokengator
```

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **SQLite/Turso** - Database engine
- **Authentication** - Better-Auth
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

After scaffolding with `create-seed` or cloning the project directly, install the dependencies:

```bash
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

3. Apply the schema to your database:

```bash
bun run db:push
```

4. Seed the local development dataset:

```bash
bun run db:seed
```

This seeds two local users you can sign in with. The command prints the seeded
credentials when it completes.

Set `DEV_SEED_PASSWORD` before running `bun run db:seed` if you want a
different local password.

Then, run the development apps:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## `dev:local`

For the full local stack, you can also run:

```bash
bun run dev:local
```

This starts the local database, waits for it to be ready, runs `db:push`, runs `db:seed`, and then opens the database, API, and web processes in a `tmux` session.

This helps when you are iterating on the repo locally and want one command instead of manually coordinating multiple terminals and startup order.

Useful `tmux` shortcuts with the default setup:

- `Ctrl+b`, then arrow keys: switch panes
- `Ctrl+b`, then `d`: detach and leave everything running
- `Ctrl+c` inside a pane: stop the current process, then rerun the command in that pane
- `exit`: close the current pane
- `tmux attach -t tokengator-dev`: reattach to the session
- `tmux kill-session -t tokengator-dev`: stop the whole session

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

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

```
tokengator/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── api/         # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run build`: Build all applications
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:generate`: Generate database client/types
- `bun run db:local`: Start the local SQLite database
- `bun run db:migrate`: Run database migrations
- `bun run db:push`: Push schema changes to database
- `bun run db:seed`: Seed the local development dataset
- `bun run db:studio`: Open database studio UI
- `bun run dev:api`: Start only the API
- `bun run dev:local`: Start the local database, apply schema/seed, and open API/web in `tmux`
- `bun run dev:web`: Start only the web application
- `bun run dev`: Start all applications in development mode
- `bun run lint`: Run Oxlint and Oxfmt in check mode
- `bun run lint:fix`: Run Oxlint and Oxfmt with auto-fixing
