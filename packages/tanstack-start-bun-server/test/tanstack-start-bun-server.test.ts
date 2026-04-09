import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTanStackStartBunServeConfig, type Logger } from '../src/index'

const DEFAULT_SERVER_MODULE = `
export default {
  fetch(request) {
    const url = new URL(request.url)
    return new Response(\`server:\${url.pathname}\`, {
      headers: {
        'Content-Type': 'text/plain',
      },
      status: 200,
    })
  },
}
`

const tempDirectories = new Set<string>()

afterEach(() => {
  for (const tempDirectory of tempDirectories) {
    rmSync(tempDirectory, {
      force: true,
      recursive: true,
    })
  }

  tempDirectories.clear()
})

function getRoute(config: Awaited<ReturnType<typeof createTanStackStartBunServeConfig>>, route: string) {
  const handler = config.routes[route]

  expect(handler).toBeDefined()

  return handler as NonNullable<typeof handler>
}

function createFixtureDist({
  assets,
  includeServer = true,
  serverModule = DEFAULT_SERVER_MODULE,
}: {
  assets: Record<string, string>
  includeServer?: boolean
  serverModule?: string
}) {
  const webDistPath = mkdtempSync(join(tmpdir(), 'tanstack-start-bun-server-'))
  tempDirectories.add(webDistPath)

  for (const [relativePath, contents] of Object.entries(assets).sort(([left], [right]) => left.localeCompare(right))) {
    writeFixtureFile({
      contents,
      filepath: join(webDistPath, 'client', relativePath),
    })
  }

  if (includeServer) {
    writeFixtureFile({
      contents: serverModule,
      filepath: join(webDistPath, 'server', 'server.js'),
    })
  }

  return webDistPath
}

function createSilentLogger(): Logger {
  return {
    debug() {},
    error() {},
    info() {},
  }
}

function writeFixtureFile({ contents, filepath }: { contents: string; filepath: string }) {
  mkdirSync(dirname(filepath), {
    recursive: true,
  })
  writeFileSync(filepath, contents)
}

describe('createTanStackStartBunServeConfig', () => {
  test('defaults to the console logger when logger is omitted', async () => {
    const webDistPath = createFixtureDist({
      assets: {
        'app.js': 'console-default',
      },
    })

    const config = await createTanStackStartBunServeConfig({
      webDistPath,
    })
    const response = await config.fetchHandler(new Request('https://example.com/'))

    expect(await response.text()).toBe('server:/')
  })

  test('preloads small assets into memory and serves oversized assets on demand', async () => {
    const webDistPath = createFixtureDist({
      assets: {
        'large.txt': 'abcdefghijklmnopqrstuvwxyz',
        'small.txt': 'small-original',
      },
    })

    const config = await createTanStackStartBunServeConfig({
      logger: createSilentLogger(),
      maxPreloadBytes: 16,
      webDistPath,
    })

    writeFixtureFile({
      contents: 'large-updated',
      filepath: join(webDistPath, 'client', 'large.txt'),
    })
    writeFixtureFile({
      contents: 'small-updated',
      filepath: join(webDistPath, 'client', 'small.txt'),
    })

    const largeResponse = await getRoute(config, '/large.txt')(new Request('https://example.com/large.txt'))
    const smallResponse = await getRoute(config, '/small.txt')(new Request('https://example.com/small.txt'))

    expect(await largeResponse.text()).toBe('large-updated')
    expect(await smallResponse.text()).toBe('small-original')
  })

  test('applies include and exclude patterns to filenames only', async () => {
    const webDistPath = createFixtureDist({
      assets: {
        'nested/app.js': 'app-original',
        'nested/keep.css': 'keep-original',
        'nested/skip.css': 'skip-original',
      },
    })

    const config = await createTanStackStartBunServeConfig({
      excludePatterns: ['skip.css'],
      includePatterns: ['*.css'],
      logger: createSilentLogger(),
      maxPreloadBytes: 1024,
      webDistPath,
    })

    writeFixtureFile({
      contents: 'app-updated',
      filepath: join(webDistPath, 'client', 'nested', 'app.js'),
    })
    writeFixtureFile({
      contents: 'keep-updated',
      filepath: join(webDistPath, 'client', 'nested', 'keep.css'),
    })
    writeFixtureFile({
      contents: 'skip-updated',
      filepath: join(webDistPath, 'client', 'nested', 'skip.css'),
    })

    const appResponse = await getRoute(config, '/nested/app.js')(new Request('https://example.com/nested/app.js'))
    const keepResponse = await getRoute(config, '/nested/keep.css')(new Request('https://example.com/nested/keep.css'))
    const skipResponse = await getRoute(config, '/nested/skip.css')(new Request('https://example.com/nested/skip.css'))

    expect(await appResponse.text()).toBe('app-updated')
    expect(await keepResponse.text()).toBe('keep-original')
    expect(await skipResponse.text()).toBe('skip-updated')
  })

  test('returns immutable and short-lived cache headers based on versioned filenames', async () => {
    const webDistPath = createFixtureDist({
      assets: {
        'app-1a2b3c4d.js': 'versioned',
        'app.js': 'plain',
      },
    })

    const config = await createTanStackStartBunServeConfig({
      logger: createSilentLogger(),
      webDistPath,
    })

    const plainResponse = await getRoute(config, '/app.js')(new Request('https://example.com/app.js'))
    const versionedResponse = await getRoute(
      config,
      '/app-1a2b3c4d.js',
    )(new Request('https://example.com/app-1a2b3c4d.js'))

    expect(plainResponse.headers.get('Cache-Control')).toBe('public, max-age=3600')
    expect(versionedResponse.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })

  test('supports gzip negotiation and etag revalidation for preloaded assets', async () => {
    const webDistPath = createFixtureDist({
      assets: {
        'bundle.js': 'const value = "gzip me please";\n'.repeat(8),
      },
    })

    const config = await createTanStackStartBunServeConfig({
      gzipMinBytes: 1,
      logger: createSilentLogger(),
      webDistPath,
    })

    const gzipResponse = await getRoute(
      config,
      '/bundle.js',
    )(
      new Request('https://example.com/bundle.js', {
        headers: {
          'accept-encoding': 'br, gzip;q=1',
        },
      }),
    )
    const etag = gzipResponse.headers.get('ETag')
    const gunzippedBody = Bun.gunzipSync(await gzipResponse.arrayBuffer())

    expect(etag).toBeTruthy()
    expect(gzipResponse.headers.get('Content-Encoding')).toBe('gzip')
    expect(gzipResponse.headers.get('Vary')).toBe('Accept-Encoding')
    expect(new TextDecoder().decode(gunzippedBody)).toContain('gzip me please')

    const notModifiedResponse = await getRoute(
      config,
      '/bundle.js',
    )(
      new Request('https://example.com/bundle.js', {
        headers: {
          'if-none-match': etag ?? '',
        },
      }),
    )

    expect(notModifiedResponse.status).toBe(304)
    expect(notModifiedResponse.headers.get('ETag')).toBe(etag)
  })

  test('treats wildcard accept-encoding as gzip unless gzip is explicitly disabled', async () => {
    const webDistPath = createFixtureDist({
      assets: {
        'bundle.js': 'const value = "wildcard gzip";\n'.repeat(8),
      },
    })

    const config = await createTanStackStartBunServeConfig({
      gzipMinBytes: 1,
      logger: createSilentLogger(),
      webDistPath,
    })

    const wildcardResponse = await getRoute(
      config,
      '/bundle.js',
    )(
      new Request('https://example.com/bundle.js', {
        headers: {
          'accept-encoding': 'br;q=0.5, *;q=1',
        },
      }),
    )
    const disabledResponse = await getRoute(
      config,
      '/bundle.js',
    )(
      new Request('https://example.com/bundle.js', {
        headers: {
          'accept-encoding': 'gzip;q=0, *;q=1',
        },
      }),
    )

    expect(wildcardResponse.headers.get('Content-Encoding')).toBe('gzip')
    expect(disabledResponse.headers.get('Content-Encoding')).toBeNull()
  })

  test('returns a not found handler when server/server.js is missing', async () => {
    const webDistPath = createFixtureDist({
      assets: {
        'app.js': 'no-server',
      },
      includeServer: false,
    })

    const config = await createTanStackStartBunServeConfig({
      logger: createSilentLogger(),
      webDistPath,
    })
    const response = await config.fetchHandler(new Request('https://example.com/'))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Not Found')
  })
})
