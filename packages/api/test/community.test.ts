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
  id: string
  label: string
  type: 'collection' | 'mint'
}) {
  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    enabled: input.enabled ?? true,
    id: input.id,
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

async function insertTeam(input: { id: string; name: string; organizationId: string }) {
  await database.insert(authSchema.team).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    name: input.name,
    organizationId: input.organizationId,
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
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
  await database.delete(communityRoleSchema.communityRoleCondition).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRole).where(sql`1 = 1`)
  await database.delete(authSchema.teamMember).where(sql`1 = 1`)
  await database.delete(authSchema.team).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
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
      id: 'asset-group-alpha',
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
          id: 'asset-group-alpha',
          label: 'Alpha Collection',
          type: 'collection',
        },
        {
          address: 'collection-gamma',
          id: 'asset-group-gamma',
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
          id: 'asset-group-alpha',
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

  test('requires authentication', async () => {
    await expectORPCError(communityRouter.list.callable(createUnauthorizedContext())(), {
      code: 'UNAUTHORIZED',
      status: 401,
    })
  })
})
