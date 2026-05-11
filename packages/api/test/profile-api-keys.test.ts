import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { eq, sql } from 'drizzle-orm'

type Auth = (typeof import('@tokengator/auth'))['auth']
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type ProfileRouter = typeof import('../src/features/profile/feature/profile-router').profileRouter

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
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-profile-api-key-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'profile-api-keys.sqlite')).toString()

let auth: Auth
let authSchema: AuthSchema
let database: DatabaseClient
let profileRouter: ProfileRouter

function createCallContext(input: {
  sessionCookieToken: string
  sessionToken: string
  userId: string
  username: string
}) {
  return {
    context: {
      requestHeaders: new Headers({
        cookie: `better-auth.session_token=${input.sessionCookieToken}`,
      }),
      requestSignal: new AbortController().signal,
      responseHeaders: new Headers(),
      session: {
        session: {
          createdAt: new Date('2026-04-11T00:00:00.000Z'),
          expiresAt: new Date('2036-04-18T00:00:00.000Z'),
          id: `${input.userId}-session`,
          token: input.sessionToken,
          updatedAt: new Date('2026-04-11T00:00:00.000Z'),
          userId: input.userId,
        },
        user: {
          banExpires: null,
          banned: false,
          banReason: null,
          createdAt: new Date('2026-04-11T00:00:00.000Z'),
          developerMode: false,
          displayUsername: null,
          email: `${input.username}@example.com`,
          emailVerified: true,
          id: input.userId,
          image: null,
          name: input.username,
          private: false,
          role: 'user',
          updatedAt: new Date('2026-04-11T00:00:00.000Z'),
          username: input.username,
        },
      },
    },
  }
}

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

async function createApiKey(input: { name: string; userId: string }) {
  return await auth.api.createApiKey({
    body: {
      configId: 'cli',
      expiresIn: 60 * 60 * 24,
      name: input.name,
      userId: input.userId,
    },
  })
}

async function createSignedSessionToken(token: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(process.env.BETTER_AUTH_SECRET!),
    {
      hash: 'SHA-256',
      name: 'HMAC',
    },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))

  return `${token}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`
}

async function expectORPCError(
  promise: Promise<unknown>,
  expected: {
    code: string
    message?: string
    status: number
  },
) {
  try {
    await promise
  } catch (error) {
    expect(error).toMatchObject(expected)

    return
  }

  throw new Error(`Expected promise to reject with ${expected.code}.`)
}

async function insertSession(input: { id: string; token: string; userId: string }) {
  await database.insert(authSchema.session).values({
    activeOrganizationId: null,
    activeTeamId: null,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    expiresAt: new Date('2036-04-18T00:00:00.000Z'),
    id: input.id,
    impersonatedBy: null,
    ipAddress: null,
    token: input.token,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    userAgent: 'bun:test',
    userId: input.userId,
  })
}

async function insertUser(input: { email: string; id: string; name: string; username: string }) {
  await database.insert(authSchema.user).values({
    developerMode: false,
    email: input.email,
    emailVerified: true,
    id: input.id,
    name: input.name,
    private: false,
    role: 'user',
    username: input.username,
  })
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

  ;({ auth } = await import('@tokengator/auth'))
  ;({ db: database } = await import('@tokengator/db'))
  ;({ profileRouter } = await import('../src/features/profile/feature/profile-router'))
  authSchema = await import('@tokengator/db/schema/auth')
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
  await database.delete(authSchema.apikey).where(sql`1 = 1`)
  await database.delete(authSchema.session).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)

  await insertUser({
    email: 'alice@example.com',
    id: 'user-1',
    name: 'Alice',
    username: 'alice',
  })
  await insertUser({
    email: 'bob@example.com',
    id: 'user-2',
    name: 'Bob',
    username: 'bob',
  })
  await insertSession({
    id: 'alice-session',
    token: 'alice-session-token',
    userId: 'user-1',
  })
  await insertSession({
    id: 'bob-session',
    token: 'bob-session-token',
    userId: 'user-2',
  })
})

describe('profile API keys', () => {
  test('lists only the signed-in user CLI API keys without exposing the secret key', async () => {
    const aliceBuildKey = await createApiKey({
      name: 'Alice build key',
      userId: 'user-1',
    })
    const aliceCliKey = await createApiKey({
      name: 'Alice CLI key',
      userId: 'user-1',
    })

    await database
      .update(authSchema.apikey)
      .set({
        lastRequest: new Date('2026-04-27T00:00:00.000Z'),
      })
      .where(eq(authSchema.apikey.id, aliceBuildKey.id))
    await database
      .update(authSchema.apikey)
      .set({
        lastRequest: new Date('2026-04-27T01:00:00.000Z'),
      })
      .where(eq(authSchema.apikey.id, aliceCliKey.id))

    await createApiKey({
      name: 'Bob CLI key',
      userId: 'user-2',
    })

    const result = await profileRouter.listApiKeys.callable(
      createCallContext({
        sessionCookieToken: await createSignedSessionToken('alice-session-token'),
        sessionToken: 'alice-session-token',
        userId: 'user-1',
        username: 'alice',
      }),
    )()

    expect(result.apiKeys.map((apiKey) => apiKey.name)).toEqual(['Alice CLI key', 'Alice build key'])
    expect(JSON.stringify(result)).not.toContain(aliceBuildKey.key)
    expect(JSON.stringify(result)).not.toContain(aliceCliKey.key)
    expect(Object.keys(result.apiKeys[0] ?? {}).sort()).toEqual([
      'createdAt',
      'enabled',
      'expiresAt',
      'id',
      'lastRequest',
      'name',
      'prefix',
      'requestCount',
      'start',
    ])
  })

  test('revokes only a signed-in user API key', async () => {
    const aliceKey = await createApiKey({
      name: 'Alice CLI key',
      userId: 'user-1',
    })
    const bobKey = await createApiKey({
      name: 'Bob CLI key',
      userId: 'user-2',
    })
    const aliceContext = createCallContext({
      sessionCookieToken: await createSignedSessionToken('alice-session-token'),
      sessionToken: 'alice-session-token',
      userId: 'user-1',
      username: 'alice',
    })

    await expectORPCError(profileRouter.revokeApiKey.callable(aliceContext)({ id: bobKey.id }), {
      code: 'NOT_FOUND',
      message: 'API key not found.',
      status: 404,
    })

    expect(
      await database
        .select({ id: authSchema.apikey.id })
        .from(authSchema.apikey)
        .where(eq(authSchema.apikey.id, bobKey.id)),
    ).toHaveLength(1)

    await expect(profileRouter.revokeApiKey.callable(aliceContext)({ id: aliceKey.id })).resolves.toEqual({
      apiKeyId: aliceKey.id,
    })

    expect(
      await database
        .select({ id: authSchema.apikey.id })
        .from(authSchema.apikey)
        .where(eq(authSchema.apikey.id, aliceKey.id)),
    ).toHaveLength(0)
  })
})
