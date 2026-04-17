import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AssetSchema = typeof import('@tokengator/db/schema/asset')
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
type CommunityRouter = typeof import('../src/features/community/feature/community-router').communityRouter
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
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-api-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community.sqlite')).toString()

let assetSchema: AssetSchema
let authSchema: AuthSchema
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
  traits?: Array<{ groupId: string; groupLabel: string; value: string; valueLabel: string }>
}) {
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
  minimumAmount: string
}) {
  await database.insert(communityRoleSchema.communityRoleCondition).values({
    assetGroupId: input.assetGroupId,
    communityRoleId: input.communityRoleId,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: crypto.randomUUID(),
    maximumAmount: null,
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
  await database.delete(assetSchema.assetTrait).where(sql`1 = 1`)
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

    expect(result).toEqual({
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

    expect(result).toEqual({
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
          imageUrl: null,
          label: 'Gamma Collection',
          type: 'collection',
        },
      ],
      id: 'org-alpha',
      logo: 'https://example.com/alpha.png',
      name: 'Alpha DAO',
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

    expect(result).toEqual({
      collections: [
        {
          address: 'collection-alpha',
          facetTotals: {},
          id: 'asset-group-alpha',
          imageUrl: null,
          label: 'Alpha Collection',
          type: 'collection',
        },
      ],
      id: 'org-alpha',
      logo: null,
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
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
