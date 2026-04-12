import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AuthModule = typeof import('../src/index')
type AuthSchema = typeof import('@tokengator/db/schema/auth')
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
] as const
const PREVIOUS_ENV = {} as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-auth-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'avatar-url-sync.sqlite')).toString()

let authModule: AuthModule
let authSchema: AuthSchema
let database: DatabaseClient
let originalAccountInfo: unknown

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

async function insertAccount(input: { accountId: string; id: string; userId: string }) {
  const now = new Date('2026-04-12T00:00:00.000Z')

  await database.insert(authSchema.account).values({
    accountId: input.accountId,
    createdAt: now,
    id: input.id,
    providerId: 'discord',
    updatedAt: now,
    userId: input.userId,
  })
}

async function insertIdentity(input: {
  avatarUrl?: string | null
  id: string
  providerId: string
  referenceId: string
  userId: string
}) {
  const now = new Date('2026-04-12T00:00:00.000Z')

  await database.insert(authSchema.identity).values({
    avatarUrl: input.avatarUrl ?? null,
    createdAt: now,
    displayName: null,
    email: null,
    id: input.id,
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

async function insertUser(input: {
  avatarUrl?: string | null
  email: string
  id: string
  name: string
  username: string
}) {
  const now = new Date('2026-04-12T00:00:00.000Z')

  await database.insert(authSchema.user).values({
    createdAt: now,
    email: input.email,
    emailVerified: true,
    id: input.id,
    image: input.avatarUrl ?? null,
    name: input.name,
    role: 'user',
    updatedAt: now,
    username: input.username,
  })
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
  authModule = await import('../src/index')
  originalAccountInfo = (authModule.auth.api as any).accountInfo
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
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

afterEach(() => {
  ;(authModule.auth.api as any).accountInfo = originalAccountInfo
})

describe('reconcileLocalUserState', () => {
  test('updates the user image and identity avatarUrl from the primary Discord account image', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'user-1',
      name: 'Alice',
      username: 'alice',
    })
    await insertAccount({
      accountId: 'discord-user-1',
      id: 'account-1',
      userId: 'user-1',
    })

    ;(authModule.auth.api as any).accountInfo = async () =>
      ({
        user: {
          image: 'https://cdn.discordapp.com/avatars/user-1/avatar.png',
        },
      }) as never

    await authModule.reconcileLocalUserState({
      requestHeaders: new Headers(),
      userId: 'user-1',
    })

    const [userRecord] = await database
      .select({
        image: authSchema.user.image,
      })
      .from(authSchema.user)
      .where(eq(authSchema.user.id, 'user-1'))
    const [identityRecord] = await database
      .select({
        avatarUrl: authSchema.identity.avatarUrl,
      })
      .from(authSchema.identity)
      .where(eq(authSchema.identity.referenceId, 'account-1'))

    expect(userRecord).toEqual({
      image: 'https://cdn.discordapp.com/avatars/user-1/avatar.png',
    })
    expect(identityRecord).toEqual({
      avatarUrl: 'https://cdn.discordapp.com/avatars/user-1/avatar.png',
    })
  })

  test('keeps the existing user image when Discord account info does not include an image', async () => {
    await insertUser({
      avatarUrl: 'https://example.com/existing-avatar.png',
      email: 'alice@example.com',
      id: 'user-1',
      name: 'Alice',
      username: 'alice',
    })
    await insertAccount({
      accountId: 'discord-user-1',
      id: 'account-1',
      userId: 'user-1',
    })
    await insertIdentity({
      id: 'identity-1',
      providerId: 'discord-user-1',
      referenceId: 'account-1',
      userId: 'user-1',
    })

    ;(authModule.auth.api as any).accountInfo = async () =>
      ({
        user: {},
      }) as never

    await authModule.reconcileLocalUserState({
      requestHeaders: new Headers(),
      userId: 'user-1',
    })

    const [userRecord] = await database
      .select({
        image: authSchema.user.image,
      })
      .from(authSchema.user)
      .where(eq(authSchema.user.id, 'user-1'))

    expect(userRecord).toEqual({
      image: 'https://example.com/existing-avatar.png',
    })
  })
})
