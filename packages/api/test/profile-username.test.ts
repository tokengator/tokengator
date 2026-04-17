import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AssetSchema = typeof import('@tokengator/db/schema/asset')
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
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

let assetSchema: AssetSchema
let authSchema: AuthSchema
let communityRoleSchema: CommunityRoleSchema
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

function createIndexedAssetId(input: {
  address: string
  assetGroupId: string
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
}) {
  return `v2:${JSON.stringify([input.assetGroupId, input.address, input.owner, input.resolverKind])}`
}

async function insertAsset(input: {
  address: string
  amount: string
  assetGroupId: string
  id: string
  metadataImageUrl?: string | null
  metadataName?: string | null
  metadataSymbol?: string | null
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
  traits?: Array<{ groupId: string; groupLabel: string; value: string; valueLabel: string }>
}) {
  await database.insert(assetSchema.asset).values({
    address: input.address,
    amount: input.amount,
    assetGroupId: input.assetGroupId,
    firstSeenAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    indexedAssetId: createIndexedAssetId({
      address: input.address,
      assetGroupId: input.assetGroupId,
      owner: input.owner,
      resolverKind: input.resolverKind,
    }),
    indexedAt: new Date('2026-04-11T00:00:00.000Z'),
    lastSeenAt: new Date('2026-04-11T00:00:00.000Z'),
    metadata: null,
    metadataDescription: null,
    metadataImageUrl: input.metadataImageUrl ?? null,
    metadataJson: null,
    metadataJsonUrl: null,
    metadataName: input.metadataName ?? null,
    metadataProgramAccount: null,
    metadataSymbol: input.metadataSymbol ?? null,
    owner: input.owner,
    page: 1,
    raw: null,
    resolverId: input.assetGroupId,
    resolverKind: input.resolverKind,
  })

  if ((input.traits ?? []).length > 0) {
    await database.insert(assetSchema.assetTrait).values(
      input.traits!.map((trait) => ({
        assetGroupId: input.assetGroupId,
        assetId: input.id,
        id: crypto.randomUUID(),
        traitKey: trait.groupId,
        traitLabel: trait.groupLabel,
        traitValue: trait.value,
        traitValueLabel: trait.valueLabel,
      })),
    )
  }
}

async function insertAssetGroup(input: {
  address: string
  enabled?: boolean
  id: string
  imageUrl?: string | null
  label: string
  type: 'collection' | 'mint'
}) {
  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    enabled: input.enabled ?? true,
    id: input.id,
    imageUrl: input.imageUrl ?? null,
    indexingStartedAt: null,
    label: input.label,
    type: input.type,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
  })
}

async function insertCommunityRole(input: {
  enabled: boolean
  id: string
  matchMode: 'all' | 'any'
  name: string
  organizationId: string
  slug: string
  teamId: string
}) {
  await database.insert(communityRoleSchema.communityRole).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    enabled: input.enabled,
    id: input.id,
    matchMode: input.matchMode,
    name: input.name,
    organizationId: input.organizationId,
    slug: input.slug,
    teamId: input.teamId,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
  })
}

async function insertCommunityRoleCondition(input: {
  assetGroupId: string
  communityRoleId: string
  maximumAmount?: string | null
  minimumAmount: string
}) {
  await database.insert(communityRoleSchema.communityRoleCondition).values({
    assetGroupId: input.assetGroupId,
    communityRoleId: input.communityRoleId,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: crypto.randomUUID(),
    maximumAmount: input.maximumAmount ?? null,
    minimumAmount: input.minimumAmount,
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

async function insertTeam(input: { id: string; name: string; organizationId: string }) {
  await database.insert(authSchema.team).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    name: input.name,
    organizationId: input.organizationId,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
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
  assetSchema = await import('@tokengator/db/schema/asset')
  authSchema = await import('@tokengator/db/schema/auth')
  communityRoleSchema = await import('@tokengator/db/schema/community-role')
  ;({ profileRouter } = await import('../src/features/profile/feature/profile-router'))
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
  await database.delete(assetSchema.assetTrait).where(sql`1 = 1`)
  await database.delete(assetSchema.asset).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRoleCondition).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRole).where(sql`1 = 1`)
  await database.delete(authSchema.teamMember).where(sql`1 = 1`)
  await database.delete(authSchema.team).where(sql`1 = 1`)
  await database.delete(authSchema.identity).where(sql`1 = 1`)
  await database.delete(authSchema.member).where(sql`1 = 1`)
  await database.delete(authSchema.solanaWallet).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
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
          label: 'alice',
          linkedAt: new Date('2026-04-11T00:00:00.000Z').getTime(),
          provider: 'discord',
          providerId: 'discord-alice',
          referenceId: 'account-1',
          referenceType: 'account',
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
          label: 'Alice on Discord',
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

  test('listIdentitiesByUsername does not use email as the public label fallback', async () => {
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
      email: 'alice@discord.example',
      id: 'identity-1',
      isPrimary: true,
      provider: 'discord',
      providerId: 'discord-alice',
      referenceId: 'account-1',
      referenceType: 'account',
      userId: 'alice-user-id',
      username: null,
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
          displayName: null,
          email: null,
          id: 'identity-1',
          isPrimary: true,
          label: 'discord-alice',
          linkedAt: new Date('2026-04-11T00:00:00.000Z').getTime(),
          provider: 'discord',
          providerId: 'discord-alice',
          username: null,
        },
      ],
      solanaWallets: [],
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
          assetRoles: [],
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

  test('listCommunitiesByUsername returns community asset roles with owned assets and accumulated mint amounts', async () => {
    await insertUser({
      email: 'alice@example.com',
      id: 'alice-user-id',
      name: 'Alice',
      username: 'alice',
    })
    await insertUser({
      email: 'other@example.com',
      id: 'other-user-id',
      name: 'Other',
      username: 'other',
    })
    await insertUser({
      email: 'viewer@example.com',
      id: 'viewer-user-id',
      name: 'Viewer',
      username: 'viewer',
    })
    await insertSolanaWallet({
      address: ' wallet-alpha ',
      id: 'wallet-alpha',
      isPrimary: true,
      userId: 'alice-user-id',
    })
    await insertSolanaWallet({
      address: 'wallet-beta',
      id: 'wallet-beta',
      userId: 'alice-user-id',
    })
    await insertSolanaWallet({
      address: 'wallet-other',
      id: 'wallet-other',
      isPrimary: true,
      userId: 'other-user-id',
    })
    await insertOrganization({
      id: 'org-1',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertMember({
      id: 'member-1',
      organizationId: 'org-1',
      role: 'member',
      userId: 'alice-user-id',
    })
    await insertTeam({
      id: 'team-a',
      name: 'Collectors',
      organizationId: 'org-1',
    })
    await insertTeam({
      id: 'team-b',
      name: 'Supporters',
      organizationId: 'org-1',
    })
    await insertTeam({
      id: 'team-c',
      name: 'Token Holders',
      organizationId: 'org-1',
    })
    await insertTeam({
      id: 'team-disabled',
      name: 'Disabled',
      organizationId: 'org-1',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-collection',
      imageUrl: 'https://example.com/collection-alpha.png',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertAssetGroup({
      address: 'collection-disabled',
      enabled: false,
      id: 'asset-group-disabled',
      label: 'Disabled Collection',
      type: 'collection',
    })
    await insertAssetGroup({
      address: 'mint-island',
      id: 'asset-group-mint',
      imageUrl: 'https://example.com/mint-island.png',
      label: 'Island Token',
      type: 'mint',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'role-a',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-1',
      slug: 'collectors',
      teamId: 'team-a',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'role-b',
      matchMode: 'any',
      name: 'Supporters',
      organizationId: 'org-1',
      slug: 'supporters',
      teamId: 'team-b',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'role-c',
      matchMode: 'any',
      name: 'Token Holders',
      organizationId: 'org-1',
      slug: 'token-holders',
      teamId: 'team-c',
    })
    await insertCommunityRole({
      enabled: false,
      id: 'role-disabled',
      matchMode: 'any',
      name: 'Disabled',
      organizationId: 'org-1',
      slug: 'disabled',
      teamId: 'team-disabled',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-mint',
      communityRoleId: 'role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-collection',
      communityRoleId: 'role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-collection',
      communityRoleId: 'role-b',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-mint',
      communityRoleId: 'role-c',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-disabled',
      communityRoleId: 'role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-mint',
      communityRoleId: 'role-disabled',
      minimumAmount: '1',
    })
    await insertAsset({
      address: 'asset-owned-1-address',
      amount: '1',
      assetGroupId: 'asset-group-collection',
      id: 'asset-owned-1',
      metadataImageUrl: 'https://example.com/asset-owned-1.png',
      metadataName: 'PEARK #100',
      metadataSymbol: 'PEARK',
      owner: 'wallet-alpha',
      resolverKind: 'helius-collection-assets',
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'forest',
          valueLabel: 'Forest',
        },
        {
          groupId: 'hat',
          groupLabel: 'Hat',
          value: 'crown',
          valueLabel: 'Crown',
        },
      ],
    })
    await insertAsset({
      address: 'asset-owned-2-address',
      amount: '1',
      assetGroupId: 'asset-group-collection',
      id: 'asset-owned-2',
      metadataName: 'PEARK #101',
      owner: ' wallet-beta ',
      resolverKind: 'helius-collection-assets',
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'sunset',
          valueLabel: 'Sunset',
        },
      ],
    })
    await insertAsset({
      address: 'asset-other-address',
      amount: '1',
      assetGroupId: 'asset-group-collection',
      id: 'asset-other',
      metadataName: 'PEARK #999',
      owner: 'wallet-other',
      resolverKind: 'helius-collection-assets',
    })
    await insertAsset({
      address: 'mint-island',
      amount: '10',
      assetGroupId: 'asset-group-mint',
      id: 'mint-owned-alpha',
      owner: 'wallet-alpha',
      resolverKind: 'helius-token-accounts',
    })
    await insertAsset({
      address: 'mint-island',
      amount: '15',
      assetGroupId: 'asset-group-mint',
      id: 'mint-owned-beta',
      owner: ' wallet-beta ',
      resolverKind: 'helius-token-accounts',
    })
    await insertAsset({
      address: 'mint-island',
      amount: '5',
      assetGroupId: 'asset-group-mint',
      id: 'mint-owned-beta-extra',
      owner: 'wallet-beta',
      resolverKind: 'helius-token-accounts',
    })
    await insertAsset({
      address: 'mint-island',
      amount: '999',
      assetGroupId: 'asset-group-mint',
      id: 'mint-other',
      owner: 'wallet-other',
      resolverKind: 'helius-token-accounts',
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
          assetRoles: [
            {
              assetGroups: [
                {
                  address: 'collection-alpha',
                  id: 'asset-group-collection',
                  imageUrl: 'https://example.com/collection-alpha.png',
                  label: 'Alpha Collection',
                  maximumAmount: null,
                  minimumAmount: '1',
                  ownedAssets: [
                    {
                      address: 'asset-owned-1-address',
                      amount: '1',
                      id: 'asset-owned-1',
                      metadataImageUrl: 'https://example.com/asset-owned-1.png',
                      metadataName: 'PEARK #100',
                      metadataSymbol: 'PEARK',
                      owner: 'wallet-alpha',
                      traits: [
                        {
                          groupId: 'background',
                          groupLabel: 'Background',
                          value: 'forest',
                          valueLabel: 'Forest',
                        },
                        {
                          groupId: 'hat',
                          groupLabel: 'Hat',
                          value: 'crown',
                          valueLabel: 'Crown',
                        },
                      ],
                    },
                    {
                      address: 'asset-owned-2-address',
                      amount: '1',
                      id: 'asset-owned-2',
                      metadataImageUrl: null,
                      metadataName: 'PEARK #101',
                      metadataSymbol: null,
                      owner: 'wallet-beta',
                      traits: [
                        {
                          groupId: 'background',
                          groupLabel: 'Background',
                          value: 'sunset',
                          valueLabel: 'Sunset',
                        },
                      ],
                    },
                  ],
                  type: 'collection',
                },
              ],
              id: 'role-b',
              matchMode: 'any',
              name: 'Supporters',
              slug: 'supporters',
            },
            {
              assetGroups: [
                {
                  address: 'mint-island',
                  id: 'asset-group-mint',
                  imageUrl: 'https://example.com/mint-island.png',
                  label: 'Island Token',
                  maximumAmount: null,
                  minimumAmount: '1',
                  ownedAccounts: [
                    {
                      address: 'mint-island',
                      amount: '10',
                      id: 'asset-group-mint:wallet-alpha',
                      owner: 'wallet-alpha',
                    },
                    {
                      address: 'mint-island',
                      amount: '20',
                      id: 'asset-group-mint:wallet-beta',
                      owner: 'wallet-beta',
                    },
                  ],
                  ownedAmount: '30',
                  type: 'mint',
                },
              ],
              id: 'role-c',
              matchMode: 'any',
              name: 'Token Holders',
              slug: 'token-holders',
            },
          ],
          gatedRoles: [],
          id: 'org-1',
          logo: null,
          name: 'Alpha DAO',
          role: 'member',
          slug: 'alpha-dao',
        },
      ],
    })
  })
})
