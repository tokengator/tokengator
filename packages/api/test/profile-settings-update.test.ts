import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AuthSchema = typeof import('@tokengator/db/schema/auth')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type ProfileSettingsUpdate =
  typeof import('../src/features/profile/data-access/profile-settings-update').profileSettingsUpdate

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
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-api-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'profile-settings.sqlite')).toString()

let authSchema: AuthSchema
let database: DatabaseClient
let profileSettingsUpdate: ProfileSettingsUpdate

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

async function insertUser(input: {
  developerMode?: boolean
  email: string
  id: string
  name: string
  private?: boolean
  username: string
}) {
  await database.insert(authSchema.user).values({
    developerMode: input.developerMode ?? false,
    email: input.email,
    emailVerified: true,
    id: input.id,
    name: input.name,
    private: input.private ?? false,
    role: 'user',
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
  ;({ profileSettingsUpdate } = await import('../src/features/profile/data-access/profile-settings-update'))
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
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('profileSettingsUpdate', () => {
  test('returns the persisted settings value after updating the user row', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'user-1',
      name: 'Alice',
      username: 'alice',
    })

    const result = await profileSettingsUpdate({
      settings: {
        developerMode: true,
        private: true,
      },
      userId: 'user-1',
    })
    const [updatedUser] = await database
      .select({
        developerMode: authSchema.user.developerMode,
        private: authSchema.user.private,
      })
      .from(authSchema.user)
      .where(eq(authSchema.user.id, 'user-1'))

    expect(result).toEqual({
      settings: {
        developerMode: true,
        private: true,
      },
    })
    expect(updatedUser).toEqual({
      developerMode: true,
      private: true,
    })
  })

  test('throws when the user row does not exist', async () => {
    await expect(
      profileSettingsUpdate({
        settings: {
          developerMode: true,
          private: true,
        },
        userId: 'missing-user',
      }),
    ).rejects.toThrow('User not found while updating profile settings.')
  })
})
