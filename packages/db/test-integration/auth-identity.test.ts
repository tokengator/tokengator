import { createClient } from '@libsql/client'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AuthSchema = typeof import('../src/schema/auth')
type DatabaseClient = ReturnType<typeof drizzle>

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-db-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'auth-identity.sqlite')).toString()

let authSchema: AuthSchema
let database: DatabaseClient

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function syncDatabase(databaseUrl: string) {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'db:push', '--force'],
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
    throw new Error(`Failed to sync the test database.\n${decodeOutput(result.stdout)}\n${decodeOutput(result.stderr)}`)
  }
}

async function insertIdentity(input: { providerId: string; referenceId: string; userId: string }) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(authSchema.identity).values({
    avatarUrl: null,
    createdAt: now,
    displayName: null,
    email: null,
    id: crypto.randomUUID(),
    isPrimary: true,
    lastSyncedAt: now,
    linkedAt: now,
    profile: null,
    provider: 'discord',
    providerId: input.providerId,
    referenceId: input.referenceId,
    referenceType: 'account',
    updatedAt: now,
    userId: input.userId,
    username: null,
  })
}

async function insertUser(input: { email: string; id: string }) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(authSchema.user).values({
    createdAt: now,
    email: input.email,
    emailVerified: true,
    id: input.id,
    name: input.id,
    role: 'user',
    updatedAt: now,
    username: input.id,
  })
}

beforeAll(async () => {
  mkdirSync(TEST_DATABASE_DIR, {
    recursive: true,
  })

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

  authSchema = await import('../src/schema/auth')
  database = drizzle({
    client: createClient({
      authToken: 'test-token',
      url: TEST_DATABASE_URL,
    }),
    schema: await import('../src/schema'),
  })
})

beforeEach(async () => {
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('identity schema', () => {
  test('enforces unique provider ids per provider', async () => {
    await insertUser({
      email: 'first@example.com',
      id: 'first-user',
    })
    await insertUser({
      email: 'second@example.com',
      id: 'second-user',
    })
    await insertIdentity({
      providerId: 'discord-user',
      referenceId: 'account-first',
      userId: 'first-user',
    })

    await expect(
      insertIdentity({
        providerId: 'discord-user',
        referenceId: 'account-second',
        userId: 'second-user',
      }),
    ).rejects.toThrow()
  })

  test('enforces unique source references', async () => {
    await insertUser({
      email: 'first@example.com',
      id: 'first-user',
    })
    await insertUser({
      email: 'second@example.com',
      id: 'second-user',
    })
    await insertIdentity({
      providerId: 'discord-first',
      referenceId: 'shared-account',
      userId: 'first-user',
    })

    await expect(
      insertIdentity({
        providerId: 'discord-second',
        referenceId: 'shared-account',
        userId: 'second-user',
      }),
    ).rejects.toThrow()
  })
})
