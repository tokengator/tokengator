import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

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
] as const
const PREVIOUS_ENV = {} as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-api-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'profile-username.sqlite')).toString()

let authSchema: AuthSchema
let database: DatabaseClient
let profileRouter: ProfileRouter

function createCallContext(input: { userId: string; username: string | null }) {
  return {
    context: {
      requestHeaders: new Headers(),
      requestSignal: new AbortController().signal,
      responseHeaders: new Headers(),
      session: {
        session: {
          createdAt: new Date('2026-04-11T00:00:00.000Z'),
          expiresAt: new Date('2026-04-18T00:00:00.000Z'),
          id: `${input.userId}-session`,
          token: `${input.userId}-token`,
          updatedAt: new Date('2026-04-11T00:00:00.000Z'),
          userId: input.userId,
        },
        user: {
          banExpires: null,
          banned: false,
          banReason: null,
          createdAt: new Date('2026-04-11T00:00:00.000Z'),
          displayUsername: null,
          email: `${input.userId}@example.com`,
          emailVerified: true,
          id: input.userId,
          image: null,
          name: input.username ?? input.userId,
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

async function insertIdentity(input: {
  displayName?: string | null
  email?: string | null
  id: string
  isPrimary?: boolean
  linkedAt?: Date
  provider: 'discord' | 'solana'
  providerId: string
  referenceId: string
  referenceType: 'account' | 'solana_wallet'
  userId: string
  username?: string | null
}) {
  const linkedAt = input.linkedAt ?? new Date('2026-04-11T00:00:00.000Z')

  await database.insert(authSchema.identity).values({
    avatarUrl: null,
    createdAt: linkedAt,
    displayName: input.displayName ?? null,
    email: input.email ?? null,
    id: input.id,
    isPrimary: input.isPrimary ?? false,
    lastSyncedAt: linkedAt,
    linkedAt,
    profile: null,
    provider: input.provider,
    providerId: input.providerId,
    referenceId: input.referenceId,
    referenceType: input.referenceType,
    updatedAt: linkedAt,
    userId: input.userId,
    username: input.username ?? null,
  })
}

async function insertMember(input: {
  id: string
  organizationId: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}) {
  await database.insert(authSchema.member).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    organizationId: input.organizationId,
    role: input.role,
    userId: input.userId,
  })
}

async function insertOrganization(input: { id: string; name: string; slug: string }) {
  await database.insert(authSchema.organization).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    logo: null,
    metadata: null,
    name: input.name,
    slug: input.slug,
  })
}

async function insertSolanaWallet(input: {
  address: string
  id: string
  isPrimary?: boolean
  name?: string | null
  userId: string
}) {
  await database.insert(authSchema.solanaWallet).values({
    address: input.address,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    isPrimary: input.isPrimary ?? false,
    name: input.name ?? null,
    userId: input.userId,
  })
}

async function insertUser(input: {
  email: string
  id: string
  image?: string | null
  name: string
  private?: boolean
  username: string
}) {
  const createdAt = new Date('2026-04-11T00:00:00.000Z')

  await database.insert(authSchema.user).values({
    createdAt,
    developerMode: false,
    displayUsername: null,
    email: input.email,
    emailVerified: true,
    id: input.id,
    image: input.image ?? null,
    name: input.name,
    private: input.private ?? false,
    role: 'user',
    updatedAt: createdAt,
    username: input.username,
  })
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
  ;({ profileRouter } = await import('../src/features/profile/feature/profile-router'))
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
  await database.delete(authSchema.identity).where(sql`1 = 1`)
  await database.delete(authSchema.member).where(sql`1 = 1`)
  await database.delete(authSchema.solanaWallet).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('profile username routes', () => {
  test('getByUsername returns the visible profile summary', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'alice-user-id',
      image: 'https://example.com/alice.png',
      name: 'Alice',
      username: 'alice',
    })
    await insertUser({
      email: 'viewer@example.com',
      id: 'viewer-user-id',
      name: 'Viewer',
      username: 'viewer',
    })

    const result = await profileRouter.getByUsername.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      username: 'alice',
    })

    expect(result).toEqual({
      id: 'alice-user-id',
      image: 'https://example.com/alice.png',
      name: 'Alice',
      private: false,
      username: 'alice',
    })
  })

  test('returns the profile summary but hides private profile details from another user', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'alice-user-id',
      name: 'Alice',
      private: true,
      username: 'alice',
    })
    await insertUser({
      email: 'viewer@example.com',
      id: 'viewer-user-id',
      name: 'Viewer',
      username: 'viewer',
    })

    const viewerContext = createCallContext({
      userId: 'viewer-user-id',
      username: 'viewer',
    })

    expect(await profileRouter.getByUsername.callable(viewerContext)({ username: 'alice' })).toEqual({
      id: 'alice-user-id',
      image: null,
      name: 'Alice',
      private: true,
      username: 'alice',
    })
    await expectORPCError(profileRouter.listCommunitiesByUsername.callable(viewerContext)({ username: 'alice' }), {
      code: 'NOT_FOUND',
      message: 'User not found.',
      status: 404,
    })
    await expectORPCError(profileRouter.listIdentitiesByUsername.callable(viewerContext)({ username: 'alice' }), {
      code: 'NOT_FOUND',
      message: 'User not found.',
      status: 404,
    })
  })

  test('allows the owner to access a private profile and its identities', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'alice-user-id',
      name: 'Alice',
      private: true,
      username: 'alice',
    })
    await insertIdentity({
      email: 'alice@discord.example',
      id: 'identity-1',
      isPrimary: true,
      provider: 'discord',
      providerId: 'discord-alice',
      referenceId: 'account-1',
      referenceType: 'account',
      userId: 'alice-user-id',
      username: 'alice',
    })
    await insertSolanaWallet({
      address: 'wallet-1-address',
      id: 'wallet-1',
      isPrimary: true,
      name: 'Primary Wallet',
      userId: 'alice-user-id',
    })

    const ownerContext = createCallContext({
      userId: 'alice-user-id',
      username: 'alice',
    })
    const profile = await profileRouter.getByUsername.callable(ownerContext)({
      username: 'alice',
    })
    const identities = await profileRouter.listIdentitiesByUsername.callable(ownerContext)({
      username: 'alice',
    })

    expect(profile).toEqual({
      id: 'alice-user-id',
      image: null,
      name: 'Alice',
      private: true,
      username: 'alice',
    })
    expect(identities).toEqual({
      identities: [
        {
          avatarUrl: null,
          displayName: null,
          email: 'alice@discord.example',
          id: 'identity-1',
          isPrimary: true,
          linkedAt: new Date('2026-04-11T00:00:00.000Z').getTime(),
          provider: 'discord',
          providerId: 'discord-alice',
          username: 'alice',
        },
      ],
      solanaWallets: [
        {
          address: 'wallet-1-address',
          displayName: 'Primary Wallet',
          id: 'wallet-1',
          isPrimary: true,
          name: 'Primary Wallet',
        },
      ],
    })
  })

  test('listIdentitiesByUsername returns the public identity and wallet payloads', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'alice-user-id',
      name: 'Alice',
      username: 'alice',
    })
    await insertUser({
      email: 'viewer@example.com',
      id: 'viewer-user-id',
      name: 'Viewer',
      username: 'viewer',
    })
    await insertIdentity({
      displayName: 'Alice on Discord',
      email: 'alice@discord.example',
      id: 'identity-1',
      isPrimary: true,
      provider: 'discord',
      providerId: 'discord-alice',
      referenceId: 'account-1',
      referenceType: 'account',
      userId: 'alice-user-id',
      username: 'alice',
    })
    await insertSolanaWallet({
      address: 'wallet-1-address',
      id: 'wallet-1',
      isPrimary: true,
      name: 'Primary Wallet',
      userId: 'alice-user-id',
    })

    const result = await profileRouter.listIdentitiesByUsername.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      username: 'alice',
    })

    expect(result).toEqual({
      identities: [
        {
          avatarUrl: null,
          displayName: 'Alice on Discord',
          email: null,
          id: 'identity-1',
          isPrimary: true,
          linkedAt: new Date('2026-04-11T00:00:00.000Z').getTime(),
          provider: 'discord',
          providerId: 'discord-alice',
          username: 'alice',
        },
      ],
      solanaWallets: [
        {
          address: 'wallet-1-address',
          displayName: 'Primary Wallet',
          id: 'wallet-1',
          isPrimary: true,
          name: 'Primary Wallet',
        },
      ],
    })
  })

  test('listCommunitiesByUsername returns the target user communities', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'alice-user-id',
      name: 'Alice',
      username: 'alice',
    })
    await insertUser({
      email: 'viewer@example.com',
      id: 'viewer-user-id',
      name: 'Viewer',
      username: 'viewer',
    })
    await insertOrganization({
      id: 'org-1',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertMember({
      id: 'member-1',
      organizationId: 'org-1',
      role: 'owner',
      userId: 'alice-user-id',
    })

    const result = await profileRouter.listCommunitiesByUsername.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      username: 'alice',
    })

    expect(result).toEqual({
      communities: [
        {
          gatedRoles: [],
          id: 'org-1',
          logo: null,
          name: 'Alpha DAO',
          role: 'owner',
          slug: 'alpha-dao',
        },
      ],
    })
  })
})
