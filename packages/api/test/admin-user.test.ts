import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AdminUserRouter = typeof import('../src/features/admin-user/feature/admin-user-router').adminUserRouter
type AssetSchema = typeof import('@tokengator/db/schema/asset')
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type DatabaseClient = (typeof import('@tokengator/db'))['db']

const ADMIN_SESSION_TOKEN = 'admin-session-token'
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
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'admin-user.sqlite')).toString()

let adminUserRouter: AdminUserRouter
let adminSessionCookieToken = ''
let assetSchema: AssetSchema
let authSchema: AuthSchema
let database: DatabaseClient

function createCallContext(input: { role: 'admin' | 'user'; sessionToken: string; userId: string; username: string }) {
  return {
    context: {
      requestHeaders: new Headers({
        cookie: `better-auth.session_token=${input.sessionToken}`,
      }),
      requestSignal: new AbortController().signal,
      responseHeaders: new Headers(),
      session: {
        session: {
          createdAt: new Date('2026-04-11T00:00:00.000Z'),
          expiresAt: new Date('2026-04-18T00:00:00.000Z'),
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
          displayUsername: null,
          email: `${input.username}@example.com`,
          emailVerified: true,
          id: input.userId,
          image: null,
          name: input.username,
          role: input.role,
          updatedAt: new Date('2026-04-11T00:00:00.000Z'),
          username: input.username,
        },
      },
    },
  }
}

function createIndexedAssetId(input: {
  address: string
  assetGroupId: string
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
}) {
  return `v2:${JSON.stringify([input.assetGroupId, input.address, input.owner, input.resolverKind])}`
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

async function insertAsset(input: {
  address: string
  amount: string
  assetGroupId: string
  indexedAt?: Date
  metadataName?: string | null
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
}) {
  const indexedAt = input.indexedAt ?? new Date('2026-04-11T00:00:00.000Z')

  await database.insert(assetSchema.asset).values({
    address: input.address,
    addressLower: input.address.toLowerCase(),
    amount: input.amount,
    assetGroupId: input.assetGroupId,
    firstSeenAt: indexedAt,
    id: crypto.randomUUID(),
    indexedAssetId: createIndexedAssetId({
      address: input.address,
      assetGroupId: input.assetGroupId,
      owner: input.owner,
      resolverKind: input.resolverKind,
    }),
    indexedAt,
    lastSeenAt: indexedAt,
    metadata: null,
    metadataDescription: null,
    metadataImageUrl: null,
    metadataJson: null,
    metadataJsonUrl: null,
    metadataName: input.metadataName ?? null,
    metadataProgramAccount: null,
    metadataSymbol: null,
    owner: input.owner,
    ownerLower: input.owner.toLowerCase(),
    page: 1,
    raw: null,
    resolverId: input.assetGroupId,
    resolverKind: input.resolverKind,
  })
}

async function insertAssetGroup(input: { address: string; id: string; label: string; type: 'collection' | 'mint' }) {
  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    enabled: true,
    id: input.id,
    indexingStartedAt: null,
    label: input.label,
    type: input.type,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
  })
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
  createdAt?: Date
  id: string
  organizationId: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}) {
  await database.insert(authSchema.member).values({
    createdAt: input.createdAt ?? new Date('2026-04-11T00:00:00.000Z'),
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

async function insertSession(input: { id: string; token: string; userId: string }) {
  await database.insert(authSchema.session).values({
    activeOrganizationId: null,
    activeTeamId: null,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    expiresAt: new Date('2026-04-18T00:00:00.000Z'),
    id: input.id,
    impersonatedBy: null,
    ipAddress: null,
    token: input.token,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    userAgent: 'bun:test',
    userId: input.userId,
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
  banExpires?: Date | null
  banReason?: string | null
  banned?: boolean
  developerMode?: boolean
  displayUsername?: string | null
  email: string
  emailVerified?: boolean
  id: string
  image?: string | null
  name: string
  private?: boolean
  role: 'admin' | 'user'
  username?: string | null
}) {
  const createdAt = new Date('2026-04-11T00:00:00.000Z')

  await database.insert(authSchema.user).values({
    banExpires: input.banExpires ?? null,
    banned: input.banned ?? false,
    banReason: input.banReason ?? null,
    createdAt,
    developerMode: input.developerMode ?? false,
    displayUsername: input.displayUsername ?? null,
    email: input.email,
    emailVerified: input.emailVerified ?? false,
    id: input.id,
    image: input.image ?? null,
    name: input.name,
    private: input.private ?? false,
    role: input.role,
    updatedAt: createdAt,
    username: input.username ?? null,
  })
}

async function seedAdminUser() {
  await insertUser({
    email: 'admin@example.com',
    id: 'admin-user-id',
    name: 'Admin User',
    role: 'admin',
    username: 'admin',
  })
  await insertSession({
    id: 'admin-session-id',
    token: ADMIN_SESSION_TOKEN,
    userId: 'admin-user-id',
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
  ;({ adminUserRouter } = await import('../src/features/admin-user/feature/admin-user-router'))
  assetSchema = await import('@tokengator/db/schema/asset')
  authSchema = await import('@tokengator/db/schema/auth')
  adminSessionCookieToken = await createSignedSessionToken(ADMIN_SESSION_TOKEN)
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
  await database.delete(assetSchema.asset).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
  await database.delete(authSchema.identity).where(sql`1 = 1`)
  await database.delete(authSchema.member).where(sql`1 = 1`)
  await database.delete(authSchema.session).where(sql`1 = 1`)
  await database.delete(authSchema.solanaWallet).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)

  await seedAdminUser()
})

describe('admin user router', () => {
  test('rejects non-admin callers for every procedure', async () => {
    await insertUser({
      email: 'member@example.com',
      id: 'member-user-id',
      name: 'Member User',
      role: 'user',
      username: 'member',
    })
    await insertSession({
      id: 'member-session-id',
      token: 'member-session-token',
      userId: 'member-user-id',
    })
    const memberSessionCookieToken = await createSignedSessionToken('member-session-token')

    const userContext = createCallContext({
      role: 'user',
      sessionToken: memberSessionCookieToken,
      userId: 'member-user-id',
      username: 'member',
    })

    await Promise.all([
      expectORPCError(
        adminUserRouter.deleteSolanaWallet.callable(userContext)({
          solanaWalletId: 'wallet-id',
          userId: 'member-user-id',
        }),
        {
          code: 'FORBIDDEN',
          status: 403,
        },
      ),
      expectORPCError(adminUserRouter.get.callable(userContext)({ userId: 'member-user-id' }), {
        code: 'FORBIDDEN',
        status: 403,
      }),
      expectORPCError(adminUserRouter.list.callable(userContext)({}), {
        code: 'FORBIDDEN',
        status: 403,
      }),
      expectORPCError(adminUserRouter.listAssets.callable(userContext)({ userId: 'member-user-id' }), {
        code: 'FORBIDDEN',
        status: 403,
      }),
      expectORPCError(adminUserRouter.listCommunities.callable(userContext)({ userId: 'member-user-id' }), {
        code: 'FORBIDDEN',
        status: 403,
      }),
      expectORPCError(adminUserRouter.listIdentities.callable(userContext)({ userId: 'member-user-id' }), {
        code: 'FORBIDDEN',
        status: 403,
      }),
      expectORPCError(
        adminUserRouter.removeCommunityMembership.callable(userContext)({
          memberId: 'member-id',
          userId: 'member-user-id',
        }),
        {
          code: 'FORBIDDEN',
          status: 403,
        },
      ),
      expectORPCError(
        adminUserRouter.setPrimarySolanaWallet.callable(userContext)({
          solanaWalletId: 'wallet-id',
          userId: 'member-user-id',
        }),
        {
          code: 'FORBIDDEN',
          status: 403,
        },
      ),
      expectORPCError(
        adminUserRouter.update.callable(userContext)({ data: { name: 'Updated User' }, userId: 'member-user-id' }),
        {
          code: 'FORBIDDEN',
          status: 403,
        },
      ),
      expectORPCError(
        adminUserRouter.updateCommunityMembership.callable(userContext)({
          memberId: 'member-id',
          role: 'member',
          userId: 'member-user-id',
        }),
        {
          code: 'FORBIDDEN',
          status: 403,
        },
      ),
      expectORPCError(
        adminUserRouter.updateSolanaWallet.callable(userContext)({
          name: 'Renamed Wallet',
          solanaWalletId: 'wallet-id',
          userId: 'member-user-id',
        }),
        {
          code: 'FORBIDDEN',
          status: 403,
        },
      ),
    ])
  })

  test('lists users with search, sorting, and derived counts', async () => {
    await insertUser({
      email: 'alice-z@example.com',
      id: 'user-z',
      name: 'Alice Example',
      role: 'user',
      username: 'zeta',
    })
    await insertUser({
      email: 'alice-a@example.com',
      id: 'user-a',
      name: 'Alice Example',
      role: 'user',
      username: 'alpha',
    })
    await insertUser({
      email: 'bob@example.com',
      id: 'user-b',
      name: 'Bob Example',
      role: 'user',
      username: 'bob',
    })
    await insertOrganization({
      id: 'organization-1',
      name: 'Acme',
      slug: 'acme',
    })
    await insertIdentity({
      id: 'identity-1',
      provider: 'discord',
      providerId: 'discord-alpha',
      referenceId: 'account-alpha',
      referenceType: 'account',
      userId: 'user-a',
      username: 'alpha',
    })
    await insertMember({
      id: 'member-1',
      organizationId: 'organization-1',
      role: 'member',
      userId: 'user-a',
    })
    await insertSolanaWallet({
      address: 'wallet-alpha',
      id: 'wallet-1',
      isPrimary: true,
      userId: 'user-a',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-1',
      label: 'Collection Alpha',
      type: 'collection',
    })
    await insertAsset({
      address: 'asset-alpha-1',
      amount: '1',
      assetGroupId: 'asset-group-1',
      metadataName: 'Asset Alpha',
      owner: ' wallet-alpha ',
      resolverKind: 'helius-collection-assets',
    })

    const result = await adminUserRouter.list.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      search: 'alice',
    })

    expect(result.total).toBe(2)
    expect(result.users.map((user) => user.id)).toEqual(['user-a', 'user-z'])
    expect(result.users[0]).toMatchObject({
      assetCount: 1,
      communityCount: 1,
      email: 'alice-a@example.com',
      identityCount: 1,
      name: 'Alice Example',
      username: 'alpha',
      walletCount: 1,
    })
  })

  test('loads a user detail with base fields and summary counts', async () => {
    await insertUser({
      banned: true,
      banReason: 'Spam',
      developerMode: true,
      email: 'target@example.com',
      id: 'target-user-id',
      image: 'https://example.com/avatar.png',
      name: 'Target User',
      private: true,
      role: 'user',
      username: 'target',
    })
    await insertOrganization({
      id: 'organization-1',
      name: 'Acme',
      slug: 'acme',
    })
    await insertIdentity({
      displayName: 'Target Discord',
      email: 'target@example.com',
      id: 'identity-1',
      isPrimary: true,
      provider: 'discord',
      providerId: 'discord-target',
      referenceId: 'account-target',
      referenceType: 'account',
      userId: 'target-user-id',
      username: 'target-discord',
    })
    await insertMember({
      id: 'member-1',
      organizationId: 'organization-1',
      role: 'member',
      userId: 'target-user-id',
    })
    await insertSolanaWallet({
      address: 'wallet-one',
      id: 'wallet-1',
      isPrimary: true,
      userId: 'target-user-id',
    })
    await insertSolanaWallet({
      address: 'wallet-two',
      id: 'wallet-2',
      userId: 'target-user-id',
    })
    await insertAssetGroup({
      address: 'collection-target',
      id: 'asset-group-1',
      label: 'Collection Target',
      type: 'collection',
    })
    await insertAsset({
      address: 'asset-target-1',
      amount: '1',
      assetGroupId: 'asset-group-1',
      owner: 'wallet-one',
      resolverKind: 'helius-collection-assets',
    })

    const result = await adminUserRouter.get.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      userId: 'target-user-id',
    })

    expect(result).toMatchObject({
      assetCount: 1,
      banned: true,
      banReason: 'Spam',
      communityCount: 1,
      developerMode: true,
      email: 'target@example.com',
      identityCount: 1,
      image: 'https://example.com/avatar.png',
      name: 'Target User',
      private: true,
      role: 'user',
      username: 'target',
      walletCount: 2,
    })
  })

  test('lists identities together with linked wallets for a target user', async () => {
    await insertUser({
      email: 'target@example.com',
      id: 'target-user-id',
      name: 'Target User',
      role: 'user',
      username: 'target',
    })
    await insertIdentity({
      displayName: 'Discord Target',
      email: 'target@example.com',
      id: 'identity-discord',
      isPrimary: true,
      linkedAt: new Date('2026-04-11T00:00:00.000Z'),
      provider: 'discord',
      providerId: 'discord-target',
      referenceId: 'account-target',
      referenceType: 'account',
      userId: 'target-user-id',
      username: 'target-discord',
    })
    await insertSolanaWallet({
      address: 'wallet-b',
      id: 'wallet-b',
      userId: 'target-user-id',
    })
    await insertSolanaWallet({
      address: 'wallet-a',
      id: 'wallet-a',
      isPrimary: true,
      userId: 'target-user-id',
    })

    const result = await adminUserRouter.listIdentities.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      userId: 'target-user-id',
    })

    expect(result.identities).toHaveLength(1)
    expect(result.solanaWallets.map((wallet) => wallet.address)).toEqual(['wallet-a', 'wallet-b'])
  })

  test('lists communities for a target user and allows role updates and removal', async () => {
    await insertUser({
      email: 'other@example.com',
      id: 'other-user-id',
      name: 'Other User',
      role: 'user',
      username: 'other',
    })
    await insertUser({
      email: 'target@example.com',
      id: 'target-user-id',
      name: 'Target User',
      role: 'user',
      username: 'target',
    })
    await insertUser({
      email: 'owner@example.com',
      id: 'owner-user-id',
      name: 'Owner User',
      role: 'user',
      username: 'owner',
    })
    await insertOrganization({
      id: 'organization-b',
      name: 'Beacon',
      slug: 'beacon',
    })
    await insertOrganization({
      id: 'organization-a',
      name: 'Acme',
      slug: 'acme',
    })
    await insertMember({
      id: 'owner-member-a',
      organizationId: 'organization-a',
      role: 'owner',
      userId: 'owner-user-id',
    })
    await insertMember({
      id: 'owner-member-b',
      organizationId: 'organization-b',
      role: 'owner',
      userId: 'owner-user-id',
    })
    await insertMember({
      id: 'target-member-b',
      organizationId: 'organization-b',
      role: 'member',
      userId: 'target-user-id',
    })
    await insertMember({
      id: 'target-member-a',
      organizationId: 'organization-a',
      role: 'member',
      userId: 'target-user-id',
    })
    await insertMember({
      id: 'other-member-a',
      organizationId: 'organization-a',
      role: 'member',
      userId: 'other-user-id',
    })

    const listResult = await adminUserRouter.listCommunities.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      userId: 'target-user-id',
    })

    expect(listResult.communities.map((community) => community.organizationId)).toEqual([
      'organization-a',
      'organization-b',
    ])

    const updatedMembership = await adminUserRouter.updateCommunityMembership.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      memberId: 'target-member-a',
      role: 'admin',
      userId: 'target-user-id',
    })

    expect(updatedMembership.role).toBe('admin')

    await expectORPCError(
      adminUserRouter.updateCommunityMembership.callable(
        createCallContext({
          role: 'admin',
          sessionToken: adminSessionCookieToken,
          userId: 'admin-user-id',
          username: 'admin',
        }),
      )({
        memberId: 'other-member-a',
        role: 'admin',
        userId: 'target-user-id',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Membership not found.',
        status: 404,
      },
    )

    const removedMembership = await adminUserRouter.removeCommunityMembership.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      memberId: 'target-member-b',
      userId: 'target-user-id',
    })

    expect(removedMembership.memberId).toBe('target-member-b')
    expect(await database.select().from(authSchema.member).where(eq(authSchema.member.id, 'target-member-b'))).toEqual(
      [],
    )
  })

  test('lists only assets owned by the target user linked wallets', async () => {
    await insertUser({
      email: 'other@example.com',
      id: 'other-user-id',
      name: 'Other User',
      role: 'user',
      username: 'other',
    })
    await insertUser({
      email: 'target@example.com',
      id: 'target-user-id',
      name: 'Target User',
      role: 'user',
      username: 'target',
    })
    await insertSolanaWallet({
      address: ' wallet-target ',
      id: 'wallet-target',
      isPrimary: true,
      userId: 'target-user-id',
    })
    await insertSolanaWallet({
      address: 'wallet-other',
      id: 'wallet-other',
      isPrimary: true,
      userId: 'other-user-id',
    })
    await insertAssetGroup({
      address: 'collection-1',
      id: 'asset-group-1',
      label: 'Collection One',
      type: 'collection',
    })
    await insertAsset({
      address: 'asset-target-1',
      amount: '1',
      assetGroupId: 'asset-group-1',
      metadataName: 'Asset Target One',
      owner: 'wallet-target',
      resolverKind: 'helius-collection-assets',
    })
    await insertAsset({
      address: 'asset-target-2',
      amount: '1',
      assetGroupId: 'asset-group-1',
      metadataName: 'Asset Target Two',
      owner: ' wallet-target ',
      resolverKind: 'helius-collection-assets',
    })
    await insertAsset({
      address: 'asset-other-1',
      amount: '1',
      assetGroupId: 'asset-group-1',
      metadataName: 'Asset Other One',
      owner: 'wallet-other',
      resolverKind: 'helius-collection-assets',
    })

    const result = await adminUserRouter.listAssets.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      userId: 'target-user-id',
    })

    expect(result.assets.map((asset) => asset.address)).toEqual(['asset-target-1', 'asset-target-2'])
    expect(result.total).toBe(2)
  })

  test('updates core fields, role, and ban state for a target user', async () => {
    await insertUser({
      developerMode: false,
      email: 'target@example.com',
      id: 'target-user-id',
      name: 'Target User',
      private: false,
      role: 'user',
      username: 'target',
    })
    await insertSession({
      id: 'target-session-id',
      token: 'target-session-token',
      userId: 'target-user-id',
    })

    const banExpires = Date.parse('2026-04-12T00:00:00.000Z')
    const result = await adminUserRouter.update.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      data: {
        banExpires,
        banned: true,
        banReason: 'Violation',
        developerMode: true,
        email: 'updated@example.com',
        image: 'https://example.com/updated.png',
        name: 'Updated User',
        private: true,
        role: 'admin',
        username: 'updated',
      },
      userId: 'target-user-id',
    })

    expect(result).toMatchObject({
      banned: true,
      banReason: 'Violation',
      developerMode: true,
      email: 'updated@example.com',
      image: 'https://example.com/updated.png',
      name: 'Updated User',
      private: true,
      role: 'admin',
      username: 'updated',
    })
    expect(
      await database.select().from(authSchema.session).where(eq(authSchema.session.userId, 'target-user-id')),
    ).toEqual([])
  })

  test('clears nullable core fields for a target user', async () => {
    await insertUser({
      email: 'target@example.com',
      id: 'target-user-id',
      image: 'https://example.com/avatar.png',
      name: 'Target User',
      role: 'user',
      username: 'target',
    })

    const result = await adminUserRouter.update.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      data: {
        image: null,
        username: null,
      },
      userId: 'target-user-id',
    })

    expect(result).toMatchObject({
      image: null,
      username: null,
    })
    expect(
      await database
        .select({
          image: authSchema.user.image,
          username: authSchema.user.username,
        })
        .from(authSchema.user)
        .where(eq(authSchema.user.id, 'target-user-id')),
    ).toEqual([
      {
        image: null,
        username: null,
      },
    ])
  })

  test('ignores whitespace-only name updates for a target user', async () => {
    await insertUser({
      email: 'target@example.com',
      id: 'target-user-id',
      name: 'Target User',
      role: 'user',
      username: 'target',
    })

    const result = await adminUserRouter.update.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      data: {
        name: '   ',
      },
      userId: 'target-user-id',
    })

    expect(result).toMatchObject({
      name: 'Target User',
    })
    expect(
      await database
        .select({
          name: authSchema.user.name,
        })
        .from(authSchema.user)
        .where(eq(authSchema.user.id, 'target-user-id')),
    ).toEqual([
      {
        name: 'Target User',
      },
    ])
  })

  test('updates, reorders, and deletes linked wallets for a target user', async () => {
    await insertUser({
      email: 'target@example.com',
      id: 'target-user-id',
      name: 'Target User',
      role: 'user',
      username: 'target',
    })
    await insertSolanaWallet({
      address: 'wallet-1',
      id: 'wallet-1',
      isPrimary: true,
      userId: 'target-user-id',
    })
    await insertSolanaWallet({
      address: 'wallet-2',
      id: 'wallet-2',
      userId: 'target-user-id',
    })

    const updatedWallet = await adminUserRouter.updateSolanaWallet.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      name: 'Renamed Wallet',
      solanaWalletId: 'wallet-2',
      userId: 'target-user-id',
    })
    const primaryWallet = await adminUserRouter.setPrimarySolanaWallet.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      solanaWalletId: 'wallet-2',
      userId: 'target-user-id',
    })
    const deletedWallet = await adminUserRouter.deleteSolanaWallet.callable(
      createCallContext({
        role: 'admin',
        sessionToken: adminSessionCookieToken,
        userId: 'admin-user-id',
        username: 'admin',
      }),
    )({
      solanaWalletId: 'wallet-1',
      userId: 'target-user-id',
    })

    expect(updatedWallet.solanaWallet.name).toBe('Renamed Wallet')
    expect(primaryWallet.solanaWallet.id).toBe('wallet-2')
    expect(deletedWallet.solanaWalletId).toBe('wallet-1')
    expect(
      await database.select().from(authSchema.solanaWallet).where(eq(authSchema.solanaWallet.userId, 'target-user-id')),
    ).toHaveLength(1)
  })
})
