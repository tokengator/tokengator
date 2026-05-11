import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { sql } from 'drizzle-orm'

type AuthSchema = typeof import('@tokengator/db/schema/auth')
type CreateApiApp = (typeof import('../src/app'))['createApiApp']
type DatabaseClient = (typeof import('@tokengator/db'))['db']

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const ENV_KEYS = [
  'API_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_SOLANA_SIGN_IN_ENABLED',
  'CORS_ORIGINS',
  'DATABASE_AUTH_TOKEN',
  'DATABASE_URL',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'HELIUS_API_KEY',
  'HELIUS_CLUSTER',
  'NODE_ENV',
  'SOLANA_CLUSTER',
  'SOLANA_ENDPOINT_PUBLIC',
  'WEB_URL',
] as const
const PREVIOUS_ENV = {} as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-api-cli-auth-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'cli-auth.sqlite')).toString()

let authSchema: AuthSchema
let createApiApp: CreateApiApp
let database: DatabaseClient

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function syncDatabase(databaseUrl: string) {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'db:migrate'],
    cwd: DB_PACKAGE_DIR,
    env: {
      ...process.env,
      DATABASE_AUTH_TOKEN: 'test-token',
      DATABASE_URL: databaseUrl,
    },
    stderr: 'pipe',
    stdout: 'pipe',
  })

  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to migrate the test database.\n${decodeOutput(result.stdout)}\n${decodeOutput(result.stderr)}`,
    )
  }
}

beforeAll(async () => {
  for (const key of ENV_KEYS) {
    PREVIOUS_ENV[key] = process.env[key]
  }

  process.env.API_URL = 'http://127.0.0.1:3000'
  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED = 'true'
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.DISCORD_BOT_TOKEN = 'discord-bot-token'
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'
  process.env.WEB_URL = 'http://127.0.0.1:3001'

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  authSchema = await import('@tokengator/db/schema/auth')
  ;({ createApiApp } = await import('../src/app'))
}, 15_000)

afterAll(() => {
  for (const key of ENV_KEYS) {
    const previousValue = PREVIOUS_ENV[key]

    if (previousValue === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = previousValue
  }

  rmSync(TEST_DATABASE_DIR, {
    force: true,
    recursive: true,
  })
})

beforeEach(async () => {
  await database.delete(authSchema.deviceCode).where(sql`1 = 1`)
})

describe('CLI auth API endpoints', () => {
  test('POST /api/auth/device/code accepts the Tokengator CLI client', async () => {
    const app = createApiApp()
    const response = await app.request('/api/auth/device/code', {
      body: JSON.stringify({
        client_id: 'tokengator-cli',
        scope: 'cli',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    const body = (await response.json()) as { user_code: unknown }

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      expires_in: 900,
      interval: 5,
      verification_uri: 'http://127.0.0.1:3001/cli/authorize',
    })
    expect(String(body.user_code)).toHaveLength(8)
  })

  test('POST /api/auth/device/code rejects unknown clients', async () => {
    const app = createApiApp()
    const response = await app.request('/api/auth/device/code', {
      body: JSON.stringify({
        client_id: 'unknown-client',
        scope: 'cli',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'invalid_client',
    })
  })

  test('CORS allows x-api-key for browser-origin auth calls', async () => {
    const app = createApiApp()
    const response = await app.request('/api/auth/get-session', {
      headers: {
        'access-control-request-headers': 'x-api-key',
        'access-control-request-method': 'GET',
        origin: 'http://127.0.0.1:3001',
      },
      method: 'OPTIONS',
    })

    expect(response.headers.get('access-control-allow-headers')).toContain('x-api-key')
  })
})
