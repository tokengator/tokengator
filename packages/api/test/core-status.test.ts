import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { sql } from 'drizzle-orm'

type AuthSchema = typeof import('@tokengator/db/schema/auth')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type GetCoreStatus = typeof import('../src/features/core/data-access/get-core-status').getCoreStatus
type ResetCoreStatusCache = typeof import('../src/features/core/data-access/get-core-status').resetCoreStatusCache

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
] as const
const PREVIOUS_ENV = {} as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-core-status-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'core-status.sqlite')).toString()

let authSchema: AuthSchema
let database: DatabaseClient
let getCoreStatus: GetCoreStatus
let resetCoreStatusCache: ResetCoreStatusCache

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

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  authSchema = await import('@tokengator/db/schema/auth')
  ;({ getCoreStatus, resetCoreStatusCache } = await import('../src/features/core/data-access/get-core-status'))
}, 30_000)

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
  resetCoreStatusCache()

  await database.delete(authSchema.member).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)
  await database.delete(authSchema.verification).where(sql`1 = 1`)
})

describe('core.status', () => {
  test('ignores unrelated verification rows while unconfigured', async () => {
    await database.insert(authSchema.verification).values({
      expiresAt: new Date('2036-04-11T00:00:00.000Z'),
      id: 'verification-id',
      identifier: 'core-status',
      value: 'nonce',
    })

    await expect(getCoreStatus()).resolves.toEqual({
      configured: false,
    })
  })

  test('reports and caches configured state', async () => {
    await database.insert(authSchema.user).values({
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
      email: 'seed@example.com',
      emailVerified: true,
      id: 'seed-user-id',
      image: null,
      name: 'Seed User',
      role: 'user',
      updatedAt: new Date('2026-04-11T00:00:00.000Z'),
      username: 'seed',
    })

    await expect(getCoreStatus()).resolves.toEqual({
      configured: true,
    })

    await database.delete(authSchema.user).where(sql`1 = 1`)

    await expect(getCoreStatus()).resolves.toEqual({
      configured: true,
    })
  })
})
