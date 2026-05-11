import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { and, eq, sql } from 'drizzle-orm'
import type { ResolverKind as AssetGroupResolverKind } from '@tokengator/indexer'

type AssetSchema = typeof import('@tokengator/db/schema/asset')
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type CommunityListCollectionLeaderboard =
  typeof import('../src/features/community/data-access/community-list-collection-leaderboard').communityListCollectionLeaderboard
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
type CommunityRouter = typeof import('../src/features/community/feature/community-router').communityRouter
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type TestMagicEdenListingInput = {
  assetAddress: string
  auctionHouseAddress: string | null
  id: string
  imageUrl: string | null
  name: string | null
  priceSol: number
  seller: string
  sellerExpiry: number
  tokenAta: string
  verification: string
}

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
  'MAGIC_EDEN_API_KEY',
  'MAGIC_EDEN_LISTING_SECRET',
  'NODE_ENV',
  'SOLANA_CLUSTER',
  'SOLANA_ENDPOINT_PUBLIC',
] as const
const PREVIOUS_ENV = {} as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-api-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community.sqlite')).toString()

let assetSchema: AssetSchema
let authSchema: AuthSchema
let communityListCollectionLeaderboard: CommunityListCollectionLeaderboard
let communityRoleSchema: CommunityRoleSchema
let communityRouter: CommunityRouter
let database: DatabaseClient

function createCallContext(input: { userId: string; username: string }) {
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

function createUnauthorizedContext() {
  return {
    context: {
      requestHeaders: new Headers(),
      requestSignal: new AbortController().signal,
      responseHeaders: new Headers(),
      session: null,
    },
  }
}

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function getAssetGroupResolverKind(type: 'collection' | 'mint'): AssetGroupResolverKind {
  return type === 'collection' ? 'helius-collection-assets' : 'helius-token-accounts'
}

function getExpectedAssetGroupImageUrl(id: string) {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(`asset-group:${id}`)}`
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

function withMagicEdenApiKey(value: string | undefined) {
  const previousApiKey = process.env.MAGIC_EDEN_API_KEY
  const previousListingSecret = process.env.MAGIC_EDEN_LISTING_SECRET

  if (value === undefined) {
    delete process.env.MAGIC_EDEN_API_KEY
    delete process.env.MAGIC_EDEN_LISTING_SECRET
  } else {
    process.env.MAGIC_EDEN_API_KEY = value
    process.env.MAGIC_EDEN_LISTING_SECRET = '12345678901234567890123456789012'
  }

  return () => {
    if (previousApiKey === undefined) {
      delete process.env.MAGIC_EDEN_API_KEY
    } else {
      process.env.MAGIC_EDEN_API_KEY = previousApiKey
    }

    if (previousListingSecret === undefined) {
      delete process.env.MAGIC_EDEN_LISTING_SECRET
    } else {
      process.env.MAGIC_EDEN_LISTING_SECRET = previousListingSecret
    }
  }
}

type TestFetch = (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => ReturnType<typeof fetch>
type TestAssetTrait = { groupId: string; groupLabel: string; value: string; valueLabel: string }

function withFetch(value: TestFetch) {
  const previousValue = globalThis.fetch

  globalThis.fetch = value as typeof globalThis.fetch

  return () => {
    globalThis.fetch = previousValue
  }
}

function createMagicEdenListingInput(input: Partial<TestMagicEdenListingInput> = {}): TestMagicEdenListingInput {
  return {
    assetAddress: 'mint-alpha',
    auctionHouseAddress: null,
    id: 'listing-alpha',
    imageUrl: 'https://example.com/alpha.png',
    name: 'Alpha NFT',
    priceSol: 1.25,
    seller: 'seller-alpha',
    sellerExpiry: 0,
    tokenAta: 'ata-alpha',
    verification: 'listing-verification',
    ...input,
  }
}

function normalizeTestAssetTraits(traits: TestAssetTrait[] = []) {
  return [...traits].sort(
    (left, right) =>
      left.groupId.localeCompare(right.groupId) ||
      left.value.localeCompare(right.value) ||
      left.groupLabel.localeCompare(right.groupLabel) ||
      left.valueLabel.localeCompare(right.valueLabel),
  )
}

async function insertAssetTraitStorage(input: { assetGroupId: string; assetId: string; traits?: TestAssetTrait[] }) {
  for (const trait of normalizeTestAssetTraits(input.traits)) {
    await database
      .insert(assetSchema.assetTraitGroup)
      .values({
        assetGroupId: input.assetGroupId,
        label: trait.groupLabel,
        value: trait.groupId,
      })
      .onConflictDoNothing()

    const [traitGroup] = await database
      .select({
        id: assetSchema.assetTraitGroup.id,
      })
      .from(assetSchema.assetTraitGroup)
      .where(
        and(
          eq(assetSchema.assetTraitGroup.assetGroupId, input.assetGroupId),
          eq(assetSchema.assetTraitGroup.value, trait.groupId),
        ),
      )

    if (!traitGroup) {
      throw new Error(`Missing test trait group ${trait.groupId}.`)
    }

    await database
      .insert(assetSchema.assetTraitValue)
      .values({
        assetGroupId: input.assetGroupId,
        groupId: traitGroup.id,
        label: trait.valueLabel,
        value: trait.value,
      })
      .onConflictDoNothing()

    const [traitValue] = await database
      .select({
        id: assetSchema.assetTraitValue.id,
      })
      .from(assetSchema.assetTraitValue)
      .where(
        and(eq(assetSchema.assetTraitValue.groupId, traitGroup.id), eq(assetSchema.assetTraitValue.value, trait.value)),
      )

    if (!traitValue) {
      throw new Error(`Missing test trait value ${trait.groupId}:${trait.value}.`)
    }

    await database
      .insert(assetSchema.assetTraitMembership)
      .values({
        assetGroupId: input.assetGroupId,
        assetId: input.assetId,
        valueId: traitValue.id,
      })
      .onConflictDoNothing()
  }
}

async function insertAssetGroup(input: {
  address: string
  enabled?: boolean
  facetTotals?: Record<
    string,
    { label: string; options: Record<string, { label: string; total: number }>; total: number }
  >
  id: string
  imageUrl?: string | null
  label: string
  symbolMagicEden?: string | null
  type: 'collection' | 'mint'
}) {
  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    enabled: input.enabled ?? true,
    facetTotals: input.facetTotals ? JSON.stringify(input.facetTotals) : null,
    id: input.id,
    imageUrl: input.imageUrl ?? null,
    indexingStartedAt: null,
    label: input.label,
    resolverKind: getAssetGroupResolverKind(input.type),
    symbolMagicEden: input.symbolMagicEden ?? null,
    type: input.type,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
  })
}

async function insertAsset(input: {
  address: string
  assetGroupId: string
  id: string
  metadataImageUrl?: string | null
  metadataJson?: unknown | null
  metadataJsonUrl?: string | null
  metadataName?: string | null
  metadataSymbol?: string | null
  owner: string
  traits?: TestAssetTrait[]
}) {
  const traits = normalizeTestAssetTraits(input.traits)

  await database.insert(assetSchema.asset).values({
    address: input.address,
    amount: '1',
    assetGroupId: input.assetGroupId,
    firstSeenAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    indexedAssetId: `${input.assetGroupId}:${input.address}:${input.owner}`,
    indexedAt: new Date('2026-04-11T00:00:00.000Z'),
    lastSeenAt: new Date('2026-04-11T00:00:00.000Z'),
    metadata: null,
    metadataDescription: null,
    metadataImageUrl: input.metadataImageUrl ?? null,
    metadataJson: input.metadataJson == null ? null : JSON.stringify(input.metadataJson),
    metadataJsonUrl: input.metadataJsonUrl ?? null,
    metadataName: input.metadataName ?? null,
    metadataProgramAccount: null,
    metadataSymbol: input.metadataSymbol ?? null,
    owner: input.owner,
    page: 1,
    raw: null,
    resolverId: input.assetGroupId,
    resolverKind: 'helius-collection-assets',
    traits: JSON.stringify(traits),
  })

  await insertAssetTraitStorage({
    assetGroupId: input.assetGroupId,
    assetId: input.id,
    traits,
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

async function insertOrganization(input: { id: string; logo?: string | null; name: string; slug: string }) {
  await database.insert(authSchema.organization).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    logo: input.logo ?? null,
    metadata: null,
    name: input.name,
    slug: input.slug,
  })
}

async function insertSolanaWallet(input: { address: string; id?: string; userId: string }) {
  await database.insert(authSchema.solanaWallet).values({
    address: input.address,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id ?? crypto.randomUUID(),
    isPrimary: false,
    name: null,
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

async function insertUser(input: { email?: string; id: string; name: string; username?: string | null }) {
  await database.insert(authSchema.user).values({
    banExpires: null,
    banned: false,
    banReason: null,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    developerMode: false,
    displayUsername: null,
    email: input.email ?? `${input.id}@example.com`,
    emailVerified: true,
    id: input.id,
    image: null,
    name: input.name,
    private: false,
    role: 'user',
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    username: input.username ?? null,
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
  delete process.env.MAGIC_EDEN_API_KEY
  delete process.env.MAGIC_EDEN_LISTING_SECRET
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  assetSchema = await import('@tokengator/db/schema/asset')
  authSchema = await import('@tokengator/db/schema/auth')
  ;({ communityListCollectionLeaderboard } =
    await import('../src/features/community/data-access/community-list-collection-leaderboard'))
  communityRoleSchema = await import('@tokengator/db/schema/community-role')
  ;({ communityRouter } = await import('../src/features/community/feature/community-router'))
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
  await database.delete(assetSchema.assetTraitMembership).where(sql`1 = 1`)
  await database.delete(assetSchema.assetTraitValue).where(sql`1 = 1`)
  await database.delete(assetSchema.assetTraitGroup).where(sql`1 = 1`)
  await database.delete(assetSchema.asset).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRoleCondition).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRole).where(sql`1 = 1`)
  await database.delete(authSchema.solanaWallet).where(sql`1 = 1`)
  await database.delete(authSchema.teamMember).where(sql`1 = 1`)
  await database.delete(authSchema.team).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('community routes', () => {
  test('list returns all communities ordered by name', async () => {
    await insertOrganization({
      id: 'org-zeta',
      name: 'Zeta Club',
      slug: 'zeta-club',
    })
    await insertOrganization({
      id: 'org-alpha',
      logo: 'https://example.com/alpha.png',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })

    const result = await communityRouter.list.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )()

    expect(result).toMatchObject({
      communities: [
        {
          id: 'org-alpha',
          logo: 'https://example.com/alpha.png',
          name: 'Alpha DAO',
          slug: 'alpha-dao',
        },
        {
          id: 'org-zeta',
          logo: null,
          name: 'Zeta Club',
          slug: 'zeta-club',
        },
      ],
    })
  })

  test('getBySlug returns the community with deduplicated collection conditions only', async () => {
    await insertOrganization({
      id: 'org-alpha',
      logo: 'https://example.com/alpha.png',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha-a',
      name: 'Alpha Team A',
      organizationId: 'org-alpha',
    })
    await insertTeam({
      id: 'team-alpha-b',
      name: 'Alpha Team B',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            forest: {
              label: 'Forest',
              total: 2,
            },
          },
          total: 2,
        },
      },
      id: 'asset-group-alpha',
      imageUrl: 'https://example.com/collection-alpha.png',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertAssetGroup({
      address: 'mint-beta',
      id: 'asset-group-beta',
      label: 'Beta Mint',
      type: 'mint',
    })
    await insertAssetGroup({
      address: 'collection-gamma',
      facetTotals: {
        rarity: {
          label: 'Rarity',
          options: {
            mythic: {
              label: 'Mythic',
              total: 1,
            },
          },
          total: 1,
        },
      },
      id: 'asset-group-gamma',
      label: 'Gamma Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-a',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha-a',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-b',
      matchMode: 'any',
      name: 'Supporters',
      organizationId: 'org-alpha',
      slug: 'supporters',
      teamId: 'team-alpha-b',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-gamma',
      communityRoleId: 'community-role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-beta',
      communityRoleId: 'community-role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-b',
      minimumAmount: '2',
    })

    const result = await communityRouter.getBySlug.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      slug: 'alpha-dao',
    })

    expect(result).toMatchObject({
      collections: [
        {
          address: 'collection-alpha',
          facetTotals: {
            background: {
              label: 'Background',
              options: {
                forest: {
                  label: 'Forest',
                  total: 2,
                },
              },
              total: 2,
            },
          },
          id: 'asset-group-alpha',
          imageUrl: 'https://example.com/collection-alpha.png',
          label: 'Alpha Collection',
          type: 'collection',
        },
        {
          address: 'collection-gamma',
          facetTotals: {
            rarity: {
              label: 'Rarity',
              options: {
                mythic: {
                  label: 'Mythic',
                  total: 1,
                },
              },
              total: 1,
            },
          },
          id: 'asset-group-gamma',
          imageUrl: getExpectedAssetGroupImageUrl('asset-group-gamma'),
          label: 'Gamma Collection',
          type: 'collection',
        },
      ],
      id: 'org-alpha',
      logo: 'https://example.com/alpha.png',
      name: 'Alpha DAO',
      roles: [
        {
          assetGroups: [
            {
              address: 'collection-alpha',
              id: 'asset-group-alpha',
              imageUrl: 'https://example.com/collection-alpha.png',
              label: 'Alpha Collection',
              maximumAmount: null,
              minimumAmount: '1',
              resolverKind: 'helius-collection-assets',
              type: 'collection',
            },
            {
              address: 'mint-beta',
              id: 'asset-group-beta',
              imageUrl: getExpectedAssetGroupImageUrl('asset-group-beta'),
              label: 'Beta Mint',
              maximumAmount: null,
              minimumAmount: '1',
              resolverKind: 'helius-token-accounts',
              type: 'mint',
            },
            {
              address: 'collection-gamma',
              id: 'asset-group-gamma',
              imageUrl: getExpectedAssetGroupImageUrl('asset-group-gamma'),
              label: 'Gamma Collection',
              maximumAmount: null,
              minimumAmount: '1',
              resolverKind: 'helius-collection-assets',
              type: 'collection',
            },
          ],
          assigned: false,
          assignedAssetGroups: [],
          id: 'community-role-a',
          matchMode: 'all',
          name: 'Collectors',
          slug: 'collectors',
        },
        {
          assetGroups: [
            {
              address: 'collection-alpha',
              id: 'asset-group-alpha',
              imageUrl: 'https://example.com/collection-alpha.png',
              label: 'Alpha Collection',
              maximumAmount: null,
              minimumAmount: '2',
              resolverKind: 'helius-collection-assets',
              type: 'collection',
            },
          ],
          assigned: false,
          assignedAssetGroups: [],
          id: 'community-role-b',
          matchMode: 'any',
          name: 'Supporters',
          slug: 'supporters',
        },
      ],
      slug: 'alpha-dao',
    })
  })

  test('getBySlug excludes disabled roles and disabled asset groups', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha-a',
      name: 'Alpha Team A',
      organizationId: 'org-alpha',
    })
    await insertTeam({
      id: 'team-alpha-b',
      name: 'Alpha Team B',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: 1,
            },
            forest: {
              label: 'Forest',
              total: 2,
            },
          },
          total: 3,
        },
        hat: {
          label: 'Hat',
          options: {
            cap: {
              label: 'Cap',
              total: 1,
            },
          },
          total: 1,
        },
      },
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertAssetGroup({
      address: 'collection-beta',
      enabled: false,
      id: 'asset-group-beta',
      label: 'Beta Collection',
      type: 'collection',
    })
    await insertAssetGroup({
      address: 'collection-gamma',
      id: 'asset-group-gamma',
      label: 'Gamma Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-a',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha-a',
    })
    await insertCommunityRole({
      enabled: false,
      id: 'community-role-b',
      matchMode: 'any',
      name: 'Supporters',
      organizationId: 'org-alpha',
      slug: 'supporters',
      teamId: 'team-alpha-b',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-beta',
      communityRoleId: 'community-role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-gamma',
      communityRoleId: 'community-role-b',
      minimumAmount: '1',
    })

    const result = await communityRouter.getBySlug.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      slug: 'alpha-dao',
    })

    expect(result).toMatchObject({
      collections: [
        {
          address: 'collection-alpha',
          facetTotals: {},
          id: 'asset-group-alpha',
          imageUrl: getExpectedAssetGroupImageUrl('asset-group-alpha'),
          label: 'Alpha Collection',
          type: 'collection',
        },
      ],
      id: 'org-alpha',
      logo: null,
      name: 'Alpha DAO',
      roles: [
        {
          assetGroups: [
            {
              address: 'collection-alpha',
              id: 'asset-group-alpha',
              imageUrl: getExpectedAssetGroupImageUrl('asset-group-alpha'),
              label: 'Alpha Collection',
              maximumAmount: null,
              minimumAmount: '1',
              resolverKind: 'helius-collection-assets',
              type: 'collection',
            },
          ],
          assigned: false,
          assignedAssetGroups: [],
          id: 'community-role-a',
          matchMode: 'all',
          name: 'Collectors',
          slug: 'collectors',
        },
      ],
      slug: 'alpha-dao',
    })
  })

  test('getBySlug marks roles assigned for the current viewer', async () => {
    await insertUser({
      id: 'viewer-user-id',
      name: 'Viewer',
      username: 'viewer',
    })
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha-a',
      name: 'Alpha Team A',
      organizationId: 'org-alpha',
    })
    await insertTeam({
      id: 'team-alpha-b',
      name: 'Alpha Team B',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-alpha',
      imageUrl: 'https://example.com/collection-alpha.png',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertAssetGroup({
      address: 'collection-beta',
      id: 'asset-group-beta',
      label: 'Beta Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-a',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha-a',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-b',
      matchMode: 'any',
      name: 'Supporters',
      organizationId: 'org-alpha',
      slug: 'supporters',
      teamId: 'team-alpha-b',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-a',
      minimumAmount: '1',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-beta',
      communityRoleId: 'community-role-b',
      minimumAmount: '1',
    })
    await insertSolanaWallet({
      address: 'viewer-wallet',
      userId: 'viewer-user-id',
    })
    await insertAsset({
      address: 'collection-alpha-asset',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-alpha-1',
      owner: 'viewer-wallet',
    })

    const result = await communityRouter.getBySlug.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      slug: 'alpha-dao',
    })

    expect(result).toMatchObject({
      collections: [
        {
          address: 'collection-alpha',
          facetTotals: {},
          id: 'asset-group-alpha',
          imageUrl: 'https://example.com/collection-alpha.png',
          label: 'Alpha Collection',
          type: 'collection',
        },
        {
          address: 'collection-beta',
          facetTotals: {},
          id: 'asset-group-beta',
          imageUrl: getExpectedAssetGroupImageUrl('asset-group-beta'),
          label: 'Beta Collection',
          type: 'collection',
        },
      ],
      id: 'org-alpha',
      logo: null,
      name: 'Alpha DAO',
      roles: [
        {
          assetGroups: [
            {
              address: 'collection-alpha',
              id: 'asset-group-alpha',
              imageUrl: 'https://example.com/collection-alpha.png',
              label: 'Alpha Collection',
              maximumAmount: null,
              minimumAmount: '1',
              resolverKind: 'helius-collection-assets',
              type: 'collection',
            },
          ],
          assigned: true,
          assignedAssetGroups: [
            {
              address: 'collection-alpha',
              id: 'asset-group-alpha',
              imageUrl: 'https://example.com/collection-alpha.png',
              label: 'Alpha Collection',
              maximumAmount: null,
              minimumAmount: '1',
              resolverKind: 'helius-collection-assets',
              type: 'collection',
            },
          ],
          id: 'community-role-a',
          matchMode: 'all',
          name: 'Collectors',
          slug: 'collectors',
        },
        {
          assetGroups: [
            {
              address: 'collection-beta',
              id: 'asset-group-beta',
              imageUrl: getExpectedAssetGroupImageUrl('asset-group-beta'),
              label: 'Beta Collection',
              maximumAmount: null,
              minimumAmount: '1',
              resolverKind: 'helius-collection-assets',
              type: 'collection',
            },
          ],
          assigned: false,
          assignedAssetGroups: [],
          id: 'community-role-b',
          matchMode: 'any',
          name: 'Supporters',
          slug: 'supporters',
        },
      ],
      slug: 'alpha-dao',
    })
  })

  test('getBySlug exposes Magic Eden asset marketplace eligibility for linked collections', async () => {
    const restoreMagicEdenApiKey = withMagicEdenApiKey('magic-eden-api-key')

    try {
      await insertOrganization({
        id: 'org-alpha',
        name: 'Alpha DAO',
        slug: 'alpha-dao',
      })
      await insertTeam({
        id: 'team-alpha',
        name: 'Alpha Team',
        organizationId: 'org-alpha',
      })
      await insertAssetGroup({
        address: 'collection-alpha',
        id: 'asset-group-alpha',
        label: 'Alpha Collection',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      })
      await insertCommunityRole({
        enabled: true,
        id: 'community-role-alpha',
        matchMode: 'all',
        name: 'Collectors',
        organizationId: 'org-alpha',
        slug: 'collectors',
        teamId: 'team-alpha',
      })
      await insertCommunityRoleCondition({
        assetGroupId: 'asset-group-alpha',
        communityRoleId: 'community-role-alpha',
        minimumAmount: '1',
      })

      const result = await communityRouter.getBySlug.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        slug: 'alpha-dao',
      })

      expect(result.collections[0]?.symbolMagicEden).toBe('alpha-symbol')
      expect(result.marketplace).toEqual({
        magicEden: {
          enabled: true,
          unavailableReason: null,
        },
      })
      expect(result.collections[0]?.assetMarketplace).toEqual({
        assetGroupId: 'asset-group-alpha',
        enabled: true,
        unavailableReason: null,
      })
      expect(result.roles[0]?.assetGroups[0]?.symbolMagicEden).toBe('alpha-symbol')
    } finally {
      restoreMagicEdenApiKey()
    }
  })

  test('getBySlug marks Magic Eden unavailable when the listing secret is missing', async () => {
    const previousApiKey = process.env.MAGIC_EDEN_API_KEY
    const previousListingSecret = process.env.MAGIC_EDEN_LISTING_SECRET

    process.env.MAGIC_EDEN_API_KEY = 'magic-eden-api-key'
    delete process.env.MAGIC_EDEN_LISTING_SECRET

    try {
      await insertOrganization({
        id: 'org-alpha',
        name: 'Alpha DAO',
        slug: 'alpha-dao',
      })
      await insertTeam({
        id: 'team-alpha',
        name: 'Alpha Team',
        organizationId: 'org-alpha',
      })
      await insertAssetGroup({
        address: 'collection-alpha',
        id: 'asset-group-alpha',
        label: 'Alpha Collection',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      })
      await insertCommunityRole({
        enabled: true,
        id: 'community-role-alpha',
        matchMode: 'all',
        name: 'Collectors',
        organizationId: 'org-alpha',
        slug: 'collectors',
        teamId: 'team-alpha',
      })
      await insertCommunityRoleCondition({
        assetGroupId: 'asset-group-alpha',
        communityRoleId: 'community-role-alpha',
        minimumAmount: '1',
      })

      const result = await communityRouter.getBySlug.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        slug: 'alpha-dao',
      })

      expect(result.marketplace).toEqual({
        magicEden: {
          enabled: false,
          unavailableReason: 'listing-secret-missing',
        },
      })
      expect(result.collections[0]?.assetMarketplace).toEqual({
        assetGroupId: 'asset-group-alpha',
        enabled: false,
        unavailableReason: 'listing-secret-missing',
      })
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.MAGIC_EDEN_API_KEY
      } else {
        process.env.MAGIC_EDEN_API_KEY = previousApiKey
      }

      if (previousListingSecret === undefined) {
        delete process.env.MAGIC_EDEN_LISTING_SECRET
      } else {
        process.env.MAGIC_EDEN_LISTING_SECRET = previousListingSecret
      }
    }
  })

  test('getBySlug ignores role amount ranges for linked collection marketplace eligibility', async () => {
    const restoreMagicEdenApiKey = withMagicEdenApiKey('magic-eden-api-key')

    try {
      await insertOrganization({
        id: 'org-alpha',
        name: 'Alpha DAO',
        slug: 'alpha-dao',
      })
      await insertTeam({
        id: 'team-alpha',
        name: 'Alpha Team',
        organizationId: 'org-alpha',
      })
      await insertAssetGroup({
        address: 'collection-alpha',
        id: 'asset-group-alpha',
        label: 'Alpha Collection',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      })
      await insertCommunityRole({
        enabled: true,
        id: 'community-role-alpha',
        matchMode: 'all',
        name: 'Collectors',
        organizationId: 'org-alpha',
        slug: 'collectors',
        teamId: 'team-alpha',
      })
      await insertCommunityRoleCondition({
        assetGroupId: 'asset-group-alpha',
        communityRoleId: 'community-role-alpha',
        maximumAmount: '10',
        minimumAmount: '2',
      })

      const result = await communityRouter.getBySlug.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        slug: 'alpha-dao',
      })

      expect(result.collections[0]?.assetMarketplace).toEqual({
        assetGroupId: 'asset-group-alpha',
        enabled: true,
        unavailableReason: null,
      })
    } finally {
      restoreMagicEdenApiKey()
    }
  })

  test('listAssetMarketplaceListings rejects when Magic Eden is not configured', async () => {
    const restoreMagicEdenApiKey = withMagicEdenApiKey(undefined)

    try {
      await expectORPCError(
        communityRouter.listAssetMarketplaceListings.callable(
          createCallContext({
            userId: 'viewer-user-id',
            username: 'viewer',
          }),
        )({
          assetGroupId: 'asset-group-alpha',
          limit: 12,
          slug: 'alpha-dao',
        }),
        {
          code: 'BAD_REQUEST',
          message: 'Magic Eden purchases are not configured.',
          status: 400,
        },
      )
    } finally {
      restoreMagicEdenApiKey()
    }
  })

  test('listAssetMarketplaceListings allows linked collections regardless of role amount ranges', async () => {
    const requestedUrls: string[] = []
    const restoreFetch = withFetch(async (input) => {
      requestedUrls.push(String(input))

      return Response.json([])
    })
    const restoreMagicEdenApiKey = withMagicEdenApiKey('magic-eden-api-key')

    try {
      await insertOrganization({
        id: 'org-alpha',
        name: 'Alpha DAO',
        slug: 'alpha-dao',
      })
      await insertTeam({
        id: 'team-alpha',
        name: 'Alpha Team',
        organizationId: 'org-alpha',
      })
      await insertAssetGroup({
        address: 'collection-alpha',
        id: 'asset-group-alpha',
        label: 'Alpha Collection',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      })
      await insertCommunityRole({
        enabled: true,
        id: 'community-role-alpha',
        matchMode: 'all',
        name: 'Collectors',
        organizationId: 'org-alpha',
        slug: 'collectors',
        teamId: 'team-alpha',
      })
      await insertCommunityRoleCondition({
        assetGroupId: 'asset-group-alpha',
        communityRoleId: 'community-role-alpha',
        maximumAmount: '10',
        minimumAmount: '2',
      })

      const result = await communityRouter.listAssetMarketplaceListings.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        assetGroupId: 'asset-group-alpha',
        limit: 12,
        slug: 'alpha-dao',
      })

      expect(result.listings).toEqual([])
      expect(requestedUrls).toHaveLength(1)
      expect(requestedUrls[0]).toContain('/v2/collections/alpha-symbol/listings')
    } finally {
      restoreFetch()
      restoreMagicEdenApiKey()
    }
  })

  test('prepareAssetMarketplaceBuy rejects buyer wallets that are not linked to the user', async () => {
    const restoreMagicEdenApiKey = withMagicEdenApiKey('magic-eden-api-key')

    try {
      await insertUser({
        id: 'viewer-user-id',
        name: 'Viewer',
        username: 'viewer',
      })
      await insertOrganization({
        id: 'org-alpha',
        name: 'Alpha DAO',
        slug: 'alpha-dao',
      })
      await insertTeam({
        id: 'team-alpha',
        name: 'Alpha Team',
        organizationId: 'org-alpha',
      })
      await insertAssetGroup({
        address: 'collection-alpha',
        id: 'asset-group-alpha',
        label: 'Alpha Collection',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      })
      await insertCommunityRole({
        enabled: true,
        id: 'community-role-alpha',
        matchMode: 'all',
        name: 'Collectors',
        organizationId: 'org-alpha',
        slug: 'collectors',
        teamId: 'team-alpha',
      })
      await insertCommunityRoleCondition({
        assetGroupId: 'asset-group-alpha',
        communityRoleId: 'community-role-alpha',
        minimumAmount: '1',
      })

      await expectORPCError(
        communityRouter.prepareAssetMarketplaceBuy.callable(
          createCallContext({
            userId: 'viewer-user-id',
            username: 'viewer',
          }),
        )({
          assetGroupId: 'asset-group-alpha',
          buyer: 'unlinked-wallet',
          listing: createMagicEdenListingInput(),
          slug: 'alpha-dao',
        }),
        {
          code: 'FORBIDDEN',
          message: 'Buyer wallet is not linked to your profile.',
          status: 403,
        },
      )
    } finally {
      restoreMagicEdenApiKey()
    }
  })

  test('prepareAssetMarketplaceBuy prepares the selected listing snapshot', async () => {
    const requestedUrls: string[] = []
    const restoreFetch = withFetch(async (input) => {
      const url = String(input)

      requestedUrls.push(url)

      if (url.includes('/v2/collections/alpha-symbol/listings')) {
        return Response.json([
          {
            pdaAddress: 'listing-alpha',
            price: 1.25,
            seller: 'seller-alpha',
            sellerExpiry: -1,
            token: {
              image: 'https://example.com/alpha.png',
              mintAddress: 'mint-alpha',
              name: 'Alpha NFT',
            },
            tokenATA: 'ata-alpha',
          },
        ])
      }

      return Response.json({
        txSigned: {
          data: [1, 2, 3],
        },
      })
    })
    const restoreMagicEdenApiKey = withMagicEdenApiKey('magic-eden-api-key')

    try {
      await insertUser({
        id: 'viewer-user-id',
        name: 'Viewer',
        username: 'viewer',
      })
      await insertSolanaWallet({
        address: 'buyer-alpha',
        userId: 'viewer-user-id',
      })
      await insertOrganization({
        id: 'org-alpha',
        name: 'Alpha DAO',
        slug: 'alpha-dao',
      })
      await insertTeam({
        id: 'team-alpha',
        name: 'Alpha Team',
        organizationId: 'org-alpha',
      })
      await insertAssetGroup({
        address: 'collection-alpha',
        id: 'asset-group-alpha',
        label: 'Alpha Collection',
        symbolMagicEden: 'alpha-symbol',
        type: 'collection',
      })
      await insertCommunityRole({
        enabled: true,
        id: 'community-role-alpha',
        matchMode: 'all',
        name: 'Collectors',
        organizationId: 'org-alpha',
        slug: 'collectors',
        teamId: 'team-alpha',
      })
      await insertCommunityRoleCondition({
        assetGroupId: 'asset-group-alpha',
        communityRoleId: 'community-role-alpha',
        minimumAmount: '1',
      })

      const listingsResult = await communityRouter.listAssetMarketplaceListings.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        assetGroupId: 'asset-group-alpha',
        limit: 12,
        slug: 'alpha-dao',
      })
      const [listing] = listingsResult.listings

      if (!listing) {
        throw new Error('Expected listing fixture to be returned.')
      }

      const listingExpiresAt = Number(listing.verification.split('.')[1])

      if (!Number.isFinite(listingExpiresAt)) {
        throw new Error('Expected listing verification to include an expiry.')
      }

      await expectORPCError(
        communityRouter.prepareAssetMarketplaceBuy.callable(
          createCallContext({
            userId: 'viewer-user-id',
            username: 'viewer',
          }),
        )({
          assetGroupId: 'asset-group-alpha',
          buyer: 'buyer-alpha',
          listing: {
            ...listing,
            assetAddress: 'mint-beta',
          },
          slug: 'alpha-dao',
        }),
        {
          code: 'BAD_REQUEST',
          message: 'Magic Eden listing is not valid for this community collection.',
          status: 400,
        },
      )

      const originalDateNow = Date.now

      Date.now = () => listingExpiresAt + 1

      try {
        await expectORPCError(
          communityRouter.prepareAssetMarketplaceBuy.callable(
            createCallContext({
              userId: 'viewer-user-id',
              username: 'viewer',
            }),
          )({
            assetGroupId: 'asset-group-alpha',
            buyer: 'buyer-alpha',
            listing,
            slug: 'alpha-dao',
          }),
          {
            code: 'BAD_REQUEST',
            message: 'Magic Eden listing is not valid for this community collection.',
            status: 400,
          },
        )
      } finally {
        Date.now = originalDateNow
      }

      const result = await communityRouter.prepareAssetMarketplaceBuy.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        assetGroupId: 'asset-group-alpha',
        buyer: 'buyer-alpha',
        listing,
        slug: 'alpha-dao',
      })

      expect(result.listing).toEqual(listing)
      expect(result.transaction).toEqual({
        data: Buffer.from([1, 2, 3]).toString('base64'),
        encoding: 'base64',
      })
      expect(requestedUrls).toHaveLength(2)
      expect(requestedUrls[0]).toContain('/v2/collections/alpha-symbol/listings')
      expect(requestedUrls[1]).toContain('/v2/instructions/buy_now')
      expect(requestedUrls[1]).toContain('buyer=buyer-alpha')
      expect(requestedUrls[1]).toContain('sellerExpiry=-1')
      expect(requestedUrls[1]).toContain('tokenATA=ata-alpha')
      expect(requestedUrls[1]).toContain('tokenMint=mint-alpha')
    } finally {
      restoreFetch()
      restoreMagicEdenApiKey()
    }
  })

  test('refreshAssetMarketplaceAccess rejects unknown transaction signatures', async () => {
    const restoreFetch = withFetch(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { method?: string }

      expect(body.method).toBe('getSignatureStatuses')

      return Response.json({
        id: 'tokengator-asset-marketplace-refresh',
        jsonrpc: '2.0',
        result: {
          value: [null],
        },
      })
    })
    const restoreMagicEdenApiKey = withMagicEdenApiKey('magic-eden-api-key')

    try {
      await expectORPCError(
        communityRouter.refreshAssetMarketplaceAccess.callable(
          createCallContext({
            userId: 'viewer-user-id',
            username: 'viewer',
          }),
        )({
          assetGroupId: 'asset-group-alpha',
          signature: '1'.repeat(88),
          slug: 'alpha-dao',
        }),
        {
          code: 'BAD_REQUEST',
          message: 'Purchase transaction signature was not found.',
          status: 400,
        },
      )
    } finally {
      restoreFetch()
      restoreMagicEdenApiKey()
    }
  })

  test('refreshAssetMarketplaceAccess reports Solana RPC outages as server errors', async () => {
    const restoreFetch = withFetch(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { method?: string }

      expect(body.method).toBe('getSignatureStatuses')

      return Response.json(
        {
          error: {
            message: 'RPC unavailable.',
          },
        },
        {
          status: 503,
        },
      )
    })
    const restoreMagicEdenApiKey = withMagicEdenApiKey('magic-eden-api-key')

    try {
      await expectORPCError(
        communityRouter.refreshAssetMarketplaceAccess.callable(
          createCallContext({
            userId: 'viewer-user-id',
            username: 'viewer',
          }),
        )({
          assetGroupId: 'asset-group-alpha',
          signature: '1'.repeat(88),
          slug: 'alpha-dao',
        }),
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'RPC unavailable.',
          status: 500,
        },
      )
    } finally {
      restoreFetch()
      restoreMagicEdenApiKey()
    }
  })

  test('Magic Eden client normalizes listings and buy transactions', async () => {
    const { createMagicEdenClient } = await import('../src/features/community/data-access/magic-eden-client')
    const authorizationHeaders: Array<string | null> = []
    const timeoutSignals: boolean[] = []
    const urls: string[] = []
    const client = createMagicEdenClient({
      apiKey: 'magic-eden-api-key',
      baseUrl: 'https://api-mainnet.magiceden.dev',
      fetch: async (input, init) => {
        const url = String(input)

        authorizationHeaders.push(new Headers(init?.headers).get('Authorization'))
        timeoutSignals.push(init?.signal instanceof AbortSignal)
        urls.push(url)

        if (url.includes('/v2/collections/alpha-symbol/listings')) {
          return Response.json([
            {
              pdaAddress: 'listing-blank-price',
              price: '   ',
              seller: 'seller-blank-price',
              sellerExpiry: 0,
              token: {
                image: 'https://example.com/blank-price.png',
                mintAddress: 'mint-blank-price',
                name: 'Blank Price NFT',
              },
              tokenATA: 'ata-blank-price',
            },
            {
              pdaAddress: 'listing-alpha',
              price: 1.25,
              seller: 'seller-alpha',
              sellerExpiry: -1,
              token: {
                image: 'https://example.com/alpha.png',
                mintAddress: 'mint-alpha',
                name: 'Alpha NFT',
              },
              tokenATA: 'ata-alpha',
            },
          ])
        }

        return Response.json({
          tx: {
            data: [9, 9, 9],
          },
          txSigned: {
            data: [1, 2, 3],
          },
        })
      },
    })

    const listings = await client.listCollectionListings({
      limit: 12,
      symbolMagicEden: 'alpha-symbol',
    })
    const [listing] = listings

    if (!listing) {
      throw new Error('Expected Magic Eden listing fixture to normalize.')
    }

    expect(listings).toHaveLength(1)
    expect(listing).toEqual({
      assetAddress: 'mint-alpha',
      auctionHouseAddress: null,
      id: 'listing-alpha',
      imageUrl: 'https://example.com/alpha.png',
      name: 'Alpha NFT',
      priceSol: 1.25,
      seller: 'seller-alpha',
      sellerExpiry: -1,
      tokenAta: 'ata-alpha',
    })

    const transaction = await client.getBuyNowTransaction({
      buyer: 'buyer-alpha',
      listing,
    })

    expect(authorizationHeaders).toEqual(['Bearer magic-eden-api-key', 'Bearer magic-eden-api-key'])
    expect(timeoutSignals).toEqual([true, true])
    expect(transaction).toEqual({
      data: Buffer.from([1, 2, 3]).toString('base64'),
      encoding: 'base64',
    })
    expect(urls[1]).toContain('/v2/instructions/buy_now')
    expect(urls[1]).toContain('buyer=buyer-alpha')
    expect(urls[1]).toContain('sellerExpiry=-1')
    expect(urls[1]).toContain('tokenATA=ata-alpha')
    expect(urls[1]).toContain('tokenMint=mint-alpha')
  })

  test('Magic Eden client maps timeout failures', async () => {
    const { createMagicEdenClient } = await import('../src/features/community/data-access/magic-eden-client')
    const timeoutError = new Error('Request timed out.')

    timeoutError.name = 'TimeoutError'

    const client = createMagicEdenClient({
      apiKey: 'magic-eden-api-key',
      baseUrl: 'https://api-mainnet.magiceden.dev',
      fetch: async () => {
        throw timeoutError
      },
    })

    await expect(
      client.listCollectionListings({
        limit: 12,
        symbolMagicEden: 'alpha-symbol',
      }),
    ).rejects.toThrow('Magic Eden request timed out.')
  })

  test('getBySlug returns not found for an unknown slug', async () => {
    await expectORPCError(
      communityRouter.getBySlug.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        slug: 'missing-community',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Community not found.',
        status: 404,
      },
    )
  })

  test('listCollectionAssets filters assets by owner username, owner address, and text query while preserving alphabetical order', async () => {
    const collectionFacetTotals = {
      background: {
        label: 'Background',
        options: {
          desert: {
            label: 'Desert',
            total: 1,
          },
          forest: {
            label: 'Forest',
            total: 2,
          },
        },
        total: 3,
      },
      hat: {
        label: 'Hat',
        options: {
          cap: {
            label: 'Cap',
            total: 1,
          },
          crown: {
            label: 'Crown',
            total: 1,
          },
        },
        total: 2,
      },
    } as const

    function getExpectedFacetTotals(input: {
      background: {
        desert: number
        forest: number
        total: number
      }
      hat: {
        cap: number
        crown: number
        total: number
      }
    }) {
      return {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: input.background.desert,
            },
            forest: {
              label: 'Forest',
              total: input.background.forest,
            },
          },
          total: input.background.total,
        },
        hat: {
          label: 'Hat',
          options: {
            cap: {
              label: 'Cap',
              total: input.hat.cap,
            },
            crown: {
              label: 'Crown',
              total: input.hat.crown,
            },
          },
          total: input.hat.total,
        },
      }
    }

    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      facetTotals: collectionFacetTotals,
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertAssetGroup({
      address: 'collection-beta',
      id: 'asset-group-beta',
      label: 'Beta Collection',
      type: 'collection',
    })
    await insertUser({
      id: 'user-alpha-owner',
      name: 'Alpha Owner',
      username: 'alpha-owner',
    })
    await insertUser({
      id: 'user-beta-owner',
      name: 'Beta Owner',
      username: 'beta-owner',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })
    await insertSolanaWallet({
      address: 'owner-alpha',
      userId: 'user-alpha-owner',
    })
    await insertSolanaWallet({
      address: 'owner-beta',
      userId: 'user-beta-owner',
    })
    await insertSolanaWallet({
      address: 'owner-zed',
      userId: 'user-alpha-owner',
    })
    await insertAsset({
      address: 'mint-zed',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-3',
      metadataImageUrl: 'https://example.com/mint-zed.png',
      metadataName: 'Zulu',
      metadataSymbol: 'ZULU',
      owner: 'owner-zed',
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
      address: 'mint-alpha',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-1',
      metadataImageUrl: 'https://example.com/mint-alpha.png',
      metadataName: 'Alpha',
      metadataSymbol: 'ALPHA',
      owner: 'owner-beta',
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
          value: 'cap',
          valueLabel: 'Cap',
        },
      ],
    })
    await insertAsset({
      address: 'fallback-asset',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-2',
      owner: 'owner-alpha',
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'desert',
          valueLabel: 'Desert',
        },
      ],
    })
    await insertAsset({
      address: 'mint-hidden',
      assetGroupId: 'asset-group-beta',
      id: 'asset-4',
      metadataName: 'Hidden',
      owner: 'owner-hidden',
    })

    const callable = communityRouter.listCollectionAssets.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )

    expect(
      await callable({
        address: 'collection-alpha',
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [
        {
          address: 'mint-alpha',
          id: 'asset-1',
          metadataImageUrl: 'https://example.com/mint-alpha.png',
          metadataName: 'Alpha',
          metadataSymbol: 'ALPHA',
          owner: 'owner-beta',
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
              value: 'cap',
              valueLabel: 'Cap',
            },
          ],
        },
        {
          address: 'fallback-asset',
          id: 'asset-2',
          metadataImageUrl: null,
          metadataName: null,
          metadataSymbol: null,
          owner: 'owner-alpha',
          traits: [
            {
              groupId: 'background',
              groupLabel: 'Background',
              value: 'desert',
              valueLabel: 'Desert',
            },
          ],
        },
        {
          address: 'mint-zed',
          id: 'asset-3',
          metadataImageUrl: 'https://example.com/mint-zed.png',
          metadataName: 'Zulu',
          metadataSymbol: 'ZULU',
          owner: 'owner-zed',
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
      ],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 1,
          forest: 2,
          total: 3,
        },
        hat: {
          cap: 1,
          crown: 1,
          total: 2,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        owner: 'alpha-owner',
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [
        {
          address: 'fallback-asset',
          id: 'asset-2',
          metadataImageUrl: null,
          metadataName: null,
          metadataSymbol: null,
          owner: 'owner-alpha',
          traits: [
            {
              groupId: 'background',
              groupLabel: 'Background',
              value: 'desert',
              valueLabel: 'Desert',
            },
          ],
        },
        {
          address: 'mint-zed',
          id: 'asset-3',
          metadataImageUrl: 'https://example.com/mint-zed.png',
          metadataName: 'Zulu',
          metadataSymbol: 'ZULU',
          owner: 'owner-zed',
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
      ],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 1,
          forest: 1,
          total: 2,
        },
        hat: {
          cap: 0,
          crown: 1,
          total: 1,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        owner: 'beta',
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [
        {
          address: 'mint-alpha',
          id: 'asset-1',
          metadataImageUrl: 'https://example.com/mint-alpha.png',
          metadataName: 'Alpha',
          metadataSymbol: 'ALPHA',
          owner: 'owner-beta',
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
              value: 'cap',
              valueLabel: 'Cap',
            },
          ],
        },
      ],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 0,
          forest: 1,
          total: 1,
        },
        hat: {
          cap: 1,
          crown: 0,
          total: 1,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        owner: 'missing-owner',
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 0,
          forest: 0,
          total: 0,
        },
        hat: {
          cap: 0,
          crown: 0,
          total: 0,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        query: 'fallback',
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [
        {
          address: 'fallback-asset',
          id: 'asset-2',
          metadataImageUrl: null,
          metadataName: null,
          metadataSymbol: null,
          owner: 'owner-alpha',
          traits: [
            {
              groupId: 'background',
              groupLabel: 'Background',
              value: 'desert',
              valueLabel: 'Desert',
            },
          ],
        },
      ],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 1,
          forest: 0,
          total: 1,
        },
        hat: {
          cap: 0,
          crown: 0,
          total: 0,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        facets: {
          background: ['forest'],
        },
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [
        {
          address: 'mint-alpha',
          id: 'asset-1',
          metadataImageUrl: 'https://example.com/mint-alpha.png',
          metadataName: 'Alpha',
          metadataSymbol: 'ALPHA',
          owner: 'owner-beta',
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
              value: 'cap',
              valueLabel: 'Cap',
            },
          ],
        },
        {
          address: 'mint-zed',
          id: 'asset-3',
          metadataImageUrl: 'https://example.com/mint-zed.png',
          metadataName: 'Zulu',
          metadataSymbol: 'ZULU',
          owner: 'owner-zed',
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
      ],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 1,
          forest: 2,
          total: 3,
        },
        hat: {
          cap: 1,
          crown: 1,
          total: 2,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        facets: {
          background: ['forest', 'desert'],
          hat: ['crown'],
        },
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [
        {
          address: 'mint-zed',
          id: 'asset-3',
          metadataImageUrl: 'https://example.com/mint-zed.png',
          metadataName: 'Zulu',
          metadataSymbol: 'ZULU',
          owner: 'owner-zed',
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
      ],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 0,
          forest: 1,
          total: 1,
        },
        hat: {
          cap: 1,
          crown: 1,
          total: 2,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        facets: {
          ' Background ': [' desert '],
          background: [' Forest ', 'forest'],
          Hat: [' Crown '],
        },
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [
        {
          address: 'mint-zed',
          id: 'asset-3',
          metadataImageUrl: 'https://example.com/mint-zed.png',
          metadataName: 'Zulu',
          metadataSymbol: 'ZULU',
          owner: 'owner-zed',
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
      ],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 0,
          forest: 1,
          total: 1,
        },
        hat: {
          cap: 1,
          crown: 1,
          total: 2,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        facets: {
          unknown: ['missing'],
        },
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 0,
          forest: 0,
          total: 0,
        },
        hat: {
          cap: 0,
          crown: 0,
          total: 0,
        },
      }),
    })

    expect(
      await callable({
        address: 'collection-alpha',
        query: 'FALLBACK',
        slug: 'alpha-dao',
      }),
    ).toEqual({
      assets: [],
      facetTotals: getExpectedFacetTotals({
        background: {
          desert: 0,
          forest: 0,
          total: 0,
        },
        hat: {
          cap: 0,
          crown: 0,
          total: 0,
        },
      }),
    })
  })

  test('getCollectionInsights returns indexed asset totals and trait breakdowns', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      facetTotals: {
        background: {
          label: 'Background',
          options: {
            desert: {
              label: 'Desert',
              total: 1,
            },
            forest: {
              label: 'Forest',
              total: 2,
            },
          },
          total: 3,
        },
        hat: {
          label: 'Hat',
          options: {
            cap: {
              label: 'Cap',
              total: 1,
            },
          },
          total: 1,
        },
      },
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })
    await insertAsset({
      address: 'mint-alpha',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-alpha',
      owner: 'owner-alpha',
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
          value: 'cap',
          valueLabel: 'Cap',
        },
      ],
    })
    await insertAsset({
      address: 'mint-beta',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-beta',
      owner: 'owner-beta',
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'desert',
          valueLabel: 'Desert',
        },
      ],
    })
    await insertAsset({
      address: 'mint-gamma',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-gamma',
      owner: 'owner-gamma',
      traits: [
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'forest',
          valueLabel: 'Forest',
        },
      ],
    })

    const result = await communityRouter.getCollectionInsights.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      address: 'collection-alpha',
      slug: 'alpha-dao',
    })

    expect(result).toEqual({
      assetTotal: 3,
      traitGroups: [
        {
          groupId: 'background',
          label: 'Background',
          options: [
            {
              label: 'Forest',
              total: 2,
              value: 'forest',
            },
            {
              label: 'Desert',
              total: 1,
              value: 'desert',
            },
          ],
          total: 3,
        },
        {
          groupId: 'hat',
          label: 'Hat',
          options: [
            {
              label: 'Cap',
              total: 1,
              value: 'cap',
            },
          ],
          total: 1,
        },
      ],
    })
  })

  test('listCollectionLeaderboard ranks profile groups and keeps unlinked wallets separate', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertUser({
      id: 'user-alpha-owner',
      name: 'Alpha Owner',
      username: 'alpha-owner',
    })
    await insertUser({
      id: 'user-beta-owner',
      name: 'Beta Owner',
      username: 'beta-owner',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })
    await insertSolanaWallet({
      address: 'owner-alpha-a',
      id: 'wallet-alpha-a',
      userId: 'user-alpha-owner',
    })
    await insertSolanaWallet({
      address: 'owner-alpha-b',
      id: 'wallet-alpha-b',
      userId: 'user-alpha-owner',
    })
    await insertSolanaWallet({
      address: 'owner-beta',
      id: 'wallet-beta',
      userId: 'user-beta-owner',
    })
    await insertAsset({
      address: 'mint-alpha-a',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-alpha-a',
      owner: 'owner-alpha-a',
    })
    await insertAsset({
      address: 'mint-alpha-b',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-alpha-b',
      owner: 'owner-alpha-a',
    })
    await insertAsset({
      address: 'mint-alpha-c',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-alpha-c',
      owner: 'owner-alpha-b',
    })
    await insertAsset({
      address: 'mint-beta',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-beta',
      owner: 'owner-beta',
    })
    await insertAsset({
      address: 'mint-zed-a',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-zed-a',
      owner: 'owner-zed',
    })
    await insertAsset({
      address: 'mint-zed-b',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-zed-b',
      owner: 'owner-zed',
    })

    const result = await communityRouter.listCollectionLeaderboard.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      address: 'collection-alpha',
      slug: 'alpha-dao',
    })

    expect(result).toEqual({
      assetTotal: 6,
      holders: [
        {
          assetTotal: 3,
          displayName: '@alpha-owner',
          holderId: 'user:user-alpha-owner',
          kind: 'user',
          rank: 1,
          user: {
            id: 'user-alpha-owner',
            image: null,
            name: 'Alpha Owner',
            username: 'alpha-owner',
          },
          wallets: [
            {
              address: 'owner-alpha-a',
              assets: [
                {
                  address: 'mint-alpha-a',
                  id: 'asset-alpha-a',
                  metadataImageUrl: null,
                  metadataName: null,
                  metadataSymbol: null,
                },
                {
                  address: 'mint-alpha-b',
                  id: 'asset-alpha-b',
                  metadataImageUrl: null,
                  metadataName: null,
                  metadataSymbol: null,
                },
              ],
              assetTotal: 2,
              id: 'wallet-alpha-a',
              name: null,
            },
            {
              address: 'owner-alpha-b',
              assets: [
                {
                  address: 'mint-alpha-c',
                  id: 'asset-alpha-c',
                  metadataImageUrl: null,
                  metadataName: null,
                  metadataSymbol: null,
                },
              ],
              assetTotal: 1,
              id: 'wallet-alpha-b',
              name: null,
            },
          ],
        },
        {
          assetTotal: 2,
          displayName: 'owner-zed',
          holderId: 'wallet:owner-zed',
          kind: 'wallet',
          rank: 2,
          user: null,
          wallets: [
            {
              address: 'owner-zed',
              assets: [
                {
                  address: 'mint-zed-a',
                  id: 'asset-zed-a',
                  metadataImageUrl: null,
                  metadataName: null,
                  metadataSymbol: null,
                },
                {
                  address: 'mint-zed-b',
                  id: 'asset-zed-b',
                  metadataImageUrl: null,
                  metadataName: null,
                  metadataSymbol: null,
                },
              ],
              assetTotal: 2,
              id: null,
              name: null,
            },
          ],
        },
        {
          assetTotal: 1,
          displayName: '@beta-owner',
          holderId: 'user:user-beta-owner',
          kind: 'user',
          rank: 3,
          user: {
            id: 'user-beta-owner',
            image: null,
            name: 'Beta Owner',
            username: 'beta-owner',
          },
          wallets: [
            {
              address: 'owner-beta',
              assets: [
                {
                  address: 'mint-beta',
                  id: 'asset-beta',
                  metadataImageUrl: null,
                  metadataName: null,
                  metadataSymbol: null,
                },
              ],
              assetTotal: 1,
              id: 'wallet-beta',
              name: null,
            },
          ],
        },
      ],
      holderTotal: 3,
    })

    const knownResult = await communityRouter.listCollectionLeaderboard.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      address: 'collection-alpha',
      holderFilter: 'known',
      slug: 'alpha-dao',
    })
    const unknownResult = await communityRouter.listCollectionLeaderboard.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      address: 'collection-alpha',
      holderFilter: 'unknown',
      slug: 'alpha-dao',
    })

    expect(knownResult.assetTotal).toBe(6)
    expect(knownResult.holderTotal).toBe(2)
    expect(knownResult.holders.map((holder) => ({ holderId: holder.holderId, rank: holder.rank }))).toEqual([
      {
        holderId: 'user:user-alpha-owner',
        rank: 1,
      },
      {
        holderId: 'user:user-beta-owner',
        rank: 2,
      },
    ])
    expect(unknownResult.assetTotal).toBe(6)
    expect(unknownResult.holderTotal).toBe(1)
    expect(unknownResult.holders.map((holder) => ({ holderId: holder.holderId, rank: holder.rank }))).toEqual([
      {
        holderId: 'wallet:owner-zed',
        rank: 1,
      },
    ])
  })

  test('listCollectionLeaderboard clamps default and explicit holder limits', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })

    for (let index = 0; index < 101; index++) {
      const paddedIndex = String(index).padStart(3, '0')

      await insertAsset({
        address: `mint-${paddedIndex}`,
        assetGroupId: 'asset-group-alpha',
        id: `asset-${paddedIndex}`,
        owner: `owner-${paddedIndex}`,
      })
    }

    const defaultResult = await communityRouter.listCollectionLeaderboard.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      address: 'collection-alpha',
      slug: 'alpha-dao',
    })
    const expandedResult = await communityRouter.listCollectionLeaderboard.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      address: 'collection-alpha',
      limit: 101,
      slug: 'alpha-dao',
    })
    const minimumResult = await communityListCollectionLeaderboard({
      address: 'collection-alpha',
      limit: 0,
      slug: 'alpha-dao',
    })
    const negativeResult = await communityListCollectionLeaderboard({
      address: 'collection-alpha',
      limit: -1,
      slug: 'alpha-dao',
    })

    expect(defaultResult.assetTotal).toBe(101)
    expect(defaultResult.holderTotal).toBe(101)
    expect(defaultResult.holders.length).toBe(100)
    expect(defaultResult.holders.at(-1)?.rank).toBe(100)
    expect(defaultResult.holders.at(-1)?.holderId).toBe('wallet:owner-099')
    expect(expandedResult.holderTotal).toBe(101)
    expect(expandedResult.holders.length).toBe(101)
    expect(expandedResult.holders.at(-1)?.rank).toBe(101)
    expect(expandedResult.holders.at(-1)?.holderId).toBe('wallet:owner-100')
    expect(minimumResult?.holderTotal).toBe(101)
    expect(minimumResult?.holders.length).toBe(1)
    expect(minimumResult?.holders[0]?.holderId).toBe('wallet:owner-000')
    expect(negativeResult?.holderTotal).toBe(101)
    expect(negativeResult?.holders.length).toBe(1)
    expect(negativeResult?.holders[0]?.holderId).toBe('wallet:owner-000')
  })

  test('collection analytics return not found for unknown collection addresses', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })

    await expectORPCError(
      communityRouter.getCollectionInsights.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        address: 'missing-collection',
        slug: 'alpha-dao',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Collection not found.',
        status: 404,
      },
    )
    await expectORPCError(
      communityRouter.listCollectionLeaderboard.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        address: 'missing-collection',
        slug: 'alpha-dao',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Collection not found.',
        status: 404,
      },
    )
    await expectORPCError(
      communityRouter.getCollectionInsights.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        address: 'collection-alpha',
        slug: 'missing-community',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Collection not found.',
        status: 404,
      },
    )
  })

  test('listCollectionOwnerCandidates returns username and wallet suggestions in alphabetical order', async () => {
    await insertUser({
      id: 'user-alpha-owner',
      name: 'Alpha Owner',
      username: 'alpha-owner',
    })
    await insertUser({
      id: 'user-anon',
      name: 'Anon Owner',
      username: null,
    })
    await insertUser({
      id: 'user-beta-owner',
      name: 'Beta Owner',
      username: 'beta-owner',
    })
    await insertSolanaWallet({
      address: 'owner-alpha',
      id: 'wallet-alpha',
      userId: 'user-alpha-owner',
    })
    await insertSolanaWallet({
      address: 'owner-anon',
      id: 'wallet-anon',
      userId: 'user-anon',
    })
    await insertSolanaWallet({
      address: 'owner-beta',
      id: 'wallet-beta',
      userId: 'user-beta-owner',
    })
    await insertSolanaWallet({
      address: 'owner-zed',
      id: 'wallet-zed',
      userId: 'user-alpha-owner',
    })

    const result = await communityRouter.listCollectionOwnerCandidates.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      search: 'owner',
    })

    expect(result).toEqual([
      {
        address: null,
        id: 'user-alpha-owner',
        kind: 'user',
        name: 'Alpha Owner',
        username: 'alpha-owner',
        value: 'alpha-owner',
      },
      {
        address: null,
        id: 'user-beta-owner',
        kind: 'user',
        name: 'Beta Owner',
        username: 'beta-owner',
        value: 'beta-owner',
      },
      {
        address: 'owner-alpha',
        id: 'wallet-alpha',
        kind: 'wallet',
        name: 'Alpha Owner',
        username: 'alpha-owner',
        value: 'owner-alpha',
      },
      {
        address: 'owner-anon',
        id: 'wallet-anon',
        kind: 'wallet',
        name: 'Anon Owner',
        username: null,
        value: 'owner-anon',
      },
      {
        address: 'owner-beta',
        id: 'wallet-beta',
        kind: 'wallet',
        name: 'Beta Owner',
        username: 'beta-owner',
        value: 'owner-beta',
      },
      {
        address: 'owner-zed',
        id: 'wallet-zed',
        kind: 'wallet',
        name: 'Alpha Owner',
        username: 'alpha-owner',
        value: 'owner-zed',
      },
    ])
  })

  test('listCollectionAssets returns not found for an unknown collection address', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })

    await expectORPCError(
      communityRouter.listCollectionAssets.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        address: 'missing-collection',
        slug: 'alpha-dao',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Collection not found.',
        status: 404,
      },
    )
  })

  test('getCollectionAsset returns asset detail with parsed metadata json and alphabetized traits', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })
    await insertAsset({
      address: 'mint-alpha',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-1',
      metadataImageUrl: 'https://example.com/mint-alpha.png',
      metadataJson: {
        attributes: [
          {
            trait_type: 'Background',
            value: 'Forest',
          },
        ],
        image: 'https://example.com/mint-alpha.png',
        name: 'Alpha',
      },
      metadataJsonUrl: 'https://example.com/mint-alpha.json',
      metadataName: 'Alpha',
      metadataSymbol: 'ALPHA',
      owner: 'owner-alpha',
      traits: [
        {
          groupId: 'hat',
          groupLabel: 'Hat',
          value: 'cap',
          valueLabel: 'Cap',
        },
        {
          groupId: 'background',
          groupLabel: 'Background',
          value: 'forest',
          valueLabel: 'Forest',
        },
      ],
    })
    await insertAsset({
      address: 'mint-beta',
      assetGroupId: 'asset-group-alpha',
      id: 'asset-2',
      metadataName: 'Beta',
      owner: 'owner-beta',
    })

    const result = await communityRouter.getCollectionAsset.callable(
      createCallContext({
        userId: 'viewer-user-id',
        username: 'viewer',
      }),
    )({
      address: 'collection-alpha',
      asset: 'mint-alpha',
      slug: 'alpha-dao',
    })

    expect(result).toEqual({
      address: 'mint-alpha',
      id: 'asset-1',
      metadataImageUrl: 'https://example.com/mint-alpha.png',
      metadataJson: {
        attributes: [
          {
            trait_type: 'Background',
            value: 'Forest',
          },
        ],
        image: 'https://example.com/mint-alpha.png',
        name: 'Alpha',
      },
      metadataJsonUrl: 'https://example.com/mint-alpha.json',
      metadataName: 'Alpha',
      metadataSymbol: 'ALPHA',
      owner: 'owner-alpha',
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
          value: 'cap',
          valueLabel: 'Cap',
        },
      ],
    })
  })

  test('getCollectionAsset returns not found for an unknown asset address', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertTeam({
      id: 'team-alpha',
      name: 'Alpha Team',
      organizationId: 'org-alpha',
    })
    await insertAssetGroup({
      address: 'collection-alpha',
      id: 'asset-group-alpha',
      label: 'Alpha Collection',
      type: 'collection',
    })
    await insertCommunityRole({
      enabled: true,
      id: 'community-role-alpha',
      matchMode: 'all',
      name: 'Collectors',
      organizationId: 'org-alpha',
      slug: 'collectors',
      teamId: 'team-alpha',
    })
    await insertCommunityRoleCondition({
      assetGroupId: 'asset-group-alpha',
      communityRoleId: 'community-role-alpha',
      minimumAmount: '1',
    })

    await expectORPCError(
      communityRouter.getCollectionAsset.callable(
        createCallContext({
          userId: 'viewer-user-id',
          username: 'viewer',
        }),
      )({
        address: 'collection-alpha',
        asset: 'missing-asset',
        slug: 'alpha-dao',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
        status: 404,
      },
    )
  })

  test('requires authentication', async () => {
    await expectORPCError(communityRouter.list.callable(createUnauthorizedContext())(), {
      code: 'UNAUTHORIZED',
      status: 401,
    })
  })
})
