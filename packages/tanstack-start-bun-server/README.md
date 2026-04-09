# `tanstack-start-bun-server`

Bun-only helpers for serving a TanStack Start production build with:

- a loaded `server/server.js` handler
- static asset routes from `client/**/*`
- in-memory preloading for small assets
- on-demand disk reads for filtered or oversized assets
- optional ETag and gzip support

## Install

```sh
bun add tanstack-start-bun-server
```

## Basic usage

```ts
import { createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'

const { fetchHandler, routes } = await createTanStackStartBunServeConfig({
  webDistPath: './dist',
})

const server = Bun.serve({
  port: 3000,
  routes: {
    ...routes,
    '/*': (request) => fetchHandler(request),
  },
})

console.log(server.url)
```

## Use the default console logger explicitly

```ts
import { createConsoleLogger, createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'

const { fetchHandler, routes } = await createTanStackStartBunServeConfig({
  logger: createConsoleLogger(),
  webDistPath: './dist',
})
```

## Use `@tokengator/logger`

```ts
import { configureAppLogger, getAppLogger } from '@tokengator/logger'
import { createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'

configureAppLogger({
  env: {
    LOG_JSON: true,
  },
})

const { fetchHandler, routes } = await createTanStackStartBunServeConfig({
  logger: getAppLogger('api', 'web-server'),
  maxPreloadBytes: 5 * 1024 * 1024,
  webDistPath: './dist',
})
```

## Customize gzip mime types

```ts
import { DEFAULT_GZIP_MIME_TYPES, createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'

const { fetchHandler, routes } = await createTanStackStartBunServeConfig({
  gzipMimeTypes: [...DEFAULT_GZIP_MIME_TYPES, 'application/wasm'].sort(),
  webDistPath: './dist',
})
```

```ts
import { DEFAULT_GZIP_MIME_TYPES, createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'

const { fetchHandler, routes } = await createTanStackStartBunServeConfig({
  gzipMimeTypes: DEFAULT_GZIP_MIME_TYPES.filter((type) => type !== 'image/svg+xml'),
  webDistPath: './dist',
})
```

## Use alongside application routes

```ts
import { createTanStackStartBunServeConfig } from 'tanstack-start-bun-server'

const app = {
  fetch(request: Request) {
    return new Response(`api:${new URL(request.url).pathname}`)
  },
}

const { fetchHandler, routes } = await createTanStackStartBunServeConfig({
  includePatterns: ['*.css', '*.js', '*.woff2'],
  webDistPath: './dist',
})

Bun.serve({
  port: 3000,
  routes: {
    '/api': (request) => app.fetch(request),
    '/api/*': (request) => app.fetch(request),
    ...routes,
    '/*': (request) => fetchHandler(request),
  },
})
```
