import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { asc, eq, sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AssetSchema = typeof import('@tokengator/db/schema/asset')
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type AutomationSchema = typeof import('@tokengator/db/schema/automation')
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type ApplyCommunityRoleSync = (typeof import('../src/features/community-role-sync'))['applyCommunityRoleSync']
type EvaluateCommunityRoles = (typeof import('../src/features/community-role-sync'))['evaluateCommunityRoles']
type GetCommunityRoleSyncStatus = (typeof import('../src/features/community-role-sync'))['getCommunityRoleSyncStatus']
type ListCommunityMembershipSyncRuns =
  (typeof import('../src/features/community-role-sync'))['listCommunityMembershipSyncRuns']
type ListOrganizationsDueForScheduledCommunityMembershipSync =
  (typeof import('../src/features/community-role-sync'))['listOrganizationsDueForScheduledCommunityMembershipSync']
type PreviewCommunityRoleSync = (typeof import('../src/features/community-role-sync'))['previewCommunityRoleSync']
type RemoveCommunityRoleById = (typeof import('../src/features/community-role-sync'))['removeCommunityRoleById']
type RunScheduledCommunityRoleSync =
  (typeof import('../src/features/community-role-sync'))['runScheduledCommunityRoleSync']

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-api-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'test.sqlite')).toString()

let applyCommunityRoleSync: ApplyCommunityRoleSync
let assetSchema: AssetSchema
let authSchema: AuthSchema
let automationSchema: AutomationSchema
let communityRoleSchema: CommunityRoleSchema
let database: DatabaseClient
let evaluateCommunityRoles: EvaluateCommunityRoles
let getCommunityRoleSyncStatus: GetCommunityRoleSyncStatus
let listCommunityMembershipSyncRuns: ListCommunityMembershipSyncRuns
let listOrganizationsDueForScheduledCommunityMembershipSync: ListOrganizationsDueForScheduledCommunityMembershipSync
let previewCommunityRoleSync: PreviewCommunityRoleSync
let removeCommunityRoleById: RemoveCommunityRoleById
let runScheduledCommunityRoleSync: RunScheduledCommunityRoleSync
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

function createInsertFailureDatabase(failingTable: unknown) {
  return new Proxy(database, {
    get(target, property, receiver) {
      if (property === 'insert') {
        return (table: unknown) => {
          if (table === failingTable) {
            throw new Error('Run insert failed.')
          }

          return target.insert(table as never)
        }
      }

      const value = Reflect.get(target, property, receiver)

      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

function createSelectFailureDatabase(message: string) {
  return new Proxy(database, {
    get(target, property, receiver) {
      if (property === 'select') {
        return () => {
          throw new Error(message)
        }
      }

      const value = Reflect.get(target, property, receiver)

      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

async function insertAsset(input: {
  address: string
  amount: string
  assetGroupId: string
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
}) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(assetSchema.asset).values({
    address: input.address,
    addressLower: input.address.toLowerCase(),
    amount: input.amount,
    assetGroupId: input.assetGroupId,
    firstSeenAt: now,
    id: crypto.randomUUID(),
    indexedAssetId: `v2:${JSON.stringify([input.assetGroupId, input.address, input.owner, input.resolverKind])}`,
    indexedAt: now,
    lastSeenAt: now,
    metadata: null,
    metadataDescription: null,
    metadataImageUrl: null,
    metadataJson: null,
    metadataJsonUrl: null,
    metadataName: null,
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

async function insertAssetGroup(input: {
  address: string
  enabled: boolean
  id: string
  label: string
  type: 'collection' | 'mint'
}) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: now,
    enabled: input.enabled,
    id: input.id,
    indexingStartedAt: null,
    label: input.label,
    type: input.type,
    updatedAt: now,
  })
}

async function insertCommunityManagedMember(input: { organizationId: string; userId: string }) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(communityRoleSchema.communityManagedMember).values({
    createdAt: now,
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    updatedAt: now,
    userId: input.userId,
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
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(communityRoleSchema.communityRole).values({
    createdAt: now,
    enabled: input.enabled,
    id: input.id,
    matchMode: input.matchMode,
    name: input.name,
    organizationId: input.organizationId,
    slug: input.slug,
    teamId: input.teamId,
    updatedAt: now,
  })
}

async function insertCommunityRoleCondition(input: {
  assetGroupId: string
  communityRoleId: string
  maximumAmount?: string | null
  minimumAmount: string
}) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(communityRoleSchema.communityRoleCondition).values({
    assetGroupId: input.assetGroupId,
    communityRoleId: input.communityRoleId,
    createdAt: now,
    id: crypto.randomUUID(),
    maximumAmount: input.maximumAmount ?? null,
    minimumAmount: input.minimumAmount,
    updatedAt: now,
  })
}

async function insertMember(input: { organizationId: string; role: string; userId: string }) {
  await database.insert(authSchema.member).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    role: input.role,
    userId: input.userId,
  })
}

async function insertOrganization(input: { id: string; name: string; slug: string }) {
  await database.insert(authSchema.organization).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: input.id,
    logo: null,
    metadata: null,
    name: input.name,
    slug: input.slug,
  })
}

async function insertSession(input: {
  activeOrganizationId?: string | null
  activeTeamId?: string | null
  token: string
  userId: string
}) {
  await database.insert(authSchema.session).values({
    activeOrganizationId: input.activeOrganizationId ?? null,
    activeTeamId: input.activeTeamId ?? null,
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    expiresAt: new Date('2026-04-09T12:00:00.000Z'),
    id: crypto.randomUUID(),
    token: input.token,
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    userId: input.userId,
  })
}

async function insertSolanaWallet(input: { address: string; isPrimary?: boolean; userId: string }) {
  await database.insert(authSchema.solanaWallet).values({
    address: input.address,
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: crypto.randomUUID(),
    isPrimary: input.isPrimary ?? true,
    name: null,
    userId: input.userId,
  })
}

async function insertTeam(input: { id: string; name: string; organizationId: string }) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(authSchema.team).values({
    createdAt: now,
    id: input.id,
    name: input.name,
    organizationId: input.organizationId,
    updatedAt: now,
  })
}

async function insertTeamMember(input: { teamId: string; userId: string }) {
  await database.insert(authSchema.teamMember).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: crypto.randomUUID(),
    teamId: input.teamId,
    userId: input.userId,
  })
}

async function insertUser(input: { email: string; id: string; name: string; username: string }) {
  await database.insert(authSchema.user).values({
    email: input.email,
    emailVerified: true,
    id: input.id,
    name: input.name,
    role: 'user',
    username: input.username,
  })
}

beforeAll(async () => {
  mkdirSync(TEST_DATABASE_DIR, {
    recursive: true,
  })

  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED = 'true'
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'
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
  automationSchema = await import('@tokengator/db/schema/automation')
  communityRoleSchema = await import('@tokengator/db/schema/community-role')
  ;({
    applyCommunityRoleSync,
    evaluateCommunityRoles,
    getCommunityRoleSyncStatus,
    listCommunityMembershipSyncRuns,
    listOrganizationsDueForScheduledCommunityMembershipSync,
    previewCommunityRoleSync,
    removeCommunityRoleById,
    runScheduledCommunityRoleSync,
  } = await import('../src/features/community-role-sync'))
}, 15_000)

beforeEach(async () => {
  await database.delete(automationSchema.automationLock).where(sql`1 = 1`)
  await database.delete(authSchema.session).where(sql`1 = 1`)
  await database.delete(authSchema.teamMember).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRoleCondition).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityManagedMember).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRole).where(sql`1 = 1`)
  await database.delete(authSchema.team).where(sql`1 = 1`)
  await database.delete(authSchema.member).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(assetSchema.asset).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
  await database.delete(authSchema.solanaWallet).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

afterAll(() => {})

describe('evaluateCommunityRoles', () => {
  test('matches ANY and ALL roles across aggregated wallet totals', () => {
    const result = evaluateCommunityRoles({
      roles: [
        {
          conditions: [
            {
              assetGroupAddress: 'group-a',
              assetGroupEnabled: true,
              assetGroupId: 'group-a',
              assetGroupLabel: 'Group A',
              assetGroupType: 'collection',
              id: 'condition-a',
              maximumAmount: null,
              minimumAmount: '2',
            },
          ],
          createdAt: new Date(),
          enabled: true,
          id: 'role-collectors',
          matchMode: 'any',
          name: 'Collectors',
          organizationId: 'org-1',
          slug: 'collectors',
          teamId: 'team-collectors',
          teamMemberCount: 0,
          teamName: 'Collectors',
          updatedAt: new Date(),
        },
        {
          conditions: [
            {
              assetGroupAddress: 'group-a',
              assetGroupEnabled: true,
              assetGroupId: 'group-a',
              assetGroupLabel: 'Group A',
              assetGroupType: 'collection',
              id: 'condition-b',
              maximumAmount: null,
              minimumAmount: '1',
            },
            {
              assetGroupAddress: 'group-b',
              assetGroupEnabled: true,
              assetGroupId: 'group-b',
              assetGroupLabel: 'Group B',
              assetGroupType: 'mint',
              id: 'condition-c',
              maximumAmount: null,
              minimumAmount: '100',
            },
          ],
          createdAt: new Date(),
          enabled: true,
          id: 'role-whales',
          matchMode: 'all',
          name: 'Whales',
          organizationId: 'org-1',
          slug: 'whales',
          teamId: 'team-whales',
          teamMemberCount: 0,
          teamName: 'Whales',
          updatedAt: new Date(),
        },
      ],
      users: [
        {
          id: 'alice',
          name: 'Alice',
          username: 'alice',
          wallets: ['wallet-a', 'wallet-a-2'],
        },
        {
          id: 'bob',
          name: 'Bob',
          username: 'bob',
          wallets: ['wallet-b'],
        },
      ],
      walletAmountsByAssetGroupId: new Map([
        [
          'group-a',
          new Map([
            ['alice', 2n],
            ['bob', 1n],
          ]),
        ],
        [
          'group-b',
          new Map([
            ['alice', 100n],
            ['bob', 99n],
          ]),
        ],
      ]),
    })

    expect(result.matchedRoleIdsByUserId.get('alice')).toEqual(['role-collectors', 'role-whales'])
    expect(result.matchedRoleIdsByUserId.get('bob')).toEqual([])
    expect([...(result.qualifiedUserIdsByRoleId.get('role-whales') ?? [])]).toEqual(['alice'])
  })

  test('treats disabled asset groups and disabled roles as non-matching', () => {
    const result = evaluateCommunityRoles({
      roles: [
        {
          conditions: [
            {
              assetGroupAddress: 'group-a',
              assetGroupEnabled: false,
              assetGroupId: 'group-a',
              assetGroupLabel: 'Group A',
              assetGroupType: 'collection',
              id: 'condition-a',
              maximumAmount: '1',
              minimumAmount: '1',
            },
          ],
          createdAt: new Date(),
          enabled: true,
          id: 'role-disabled-group',
          matchMode: 'any',
          name: 'Disabled Group',
          organizationId: 'org-1',
          slug: 'disabled-group',
          teamId: 'team-disabled-group',
          teamMemberCount: 0,
          teamName: 'Disabled Group',
          updatedAt: new Date(),
        },
        {
          conditions: [
            {
              assetGroupAddress: 'group-a',
              assetGroupEnabled: true,
              assetGroupId: 'group-a',
              assetGroupLabel: 'Group A',
              assetGroupType: 'collection',
              id: 'condition-b',
              maximumAmount: null,
              minimumAmount: '1',
            },
          ],
          createdAt: new Date(),
          enabled: false,
          id: 'role-disabled',
          matchMode: 'any',
          name: 'Disabled',
          organizationId: 'org-1',
          slug: 'disabled',
          teamId: 'team-disabled',
          teamMemberCount: 0,
          teamName: 'Disabled',
          updatedAt: new Date(),
        },
      ],
      users: [
        {
          id: 'alice',
          name: 'Alice',
          username: 'alice',
          wallets: ['wallet-a'],
        },
      ],
      walletAmountsByAssetGroupId: new Map([['group-a', new Map([['alice', 10n]])]]),
    })

    expect(result.matchedRoleIdsByUserId.get('alice')).toEqual([])
  })

  test('honors optional maximum amounts when matching tiered roles', () => {
    const result = evaluateCommunityRoles({
      roles: [
        {
          conditions: [
            {
              assetGroupAddress: 'perk',
              assetGroupEnabled: true,
              assetGroupId: 'perk',
              assetGroupLabel: 'PERK',
              assetGroupType: 'collection',
              id: 'condition-shrimp',
              maximumAmount: '1',
              minimumAmount: '1',
            },
          ],
          createdAt: new Date(),
          enabled: true,
          id: 'role-shrimp',
          matchMode: 'any',
          name: 'Perk shrimp',
          organizationId: 'org-1',
          slug: 'perk-shrimp',
          teamId: 'team-shrimp',
          teamMemberCount: 0,
          teamName: 'Perk shrimp',
          updatedAt: new Date(),
        },
        {
          conditions: [
            {
              assetGroupAddress: 'perk',
              assetGroupEnabled: true,
              assetGroupId: 'perk',
              assetGroupLabel: 'PERK',
              assetGroupType: 'collection',
              id: 'condition-shark',
              maximumAmount: '9',
              minimumAmount: '2',
            },
          ],
          createdAt: new Date(),
          enabled: true,
          id: 'role-shark',
          matchMode: 'any',
          name: 'Perk shark',
          organizationId: 'org-1',
          slug: 'perk-shark',
          teamId: 'team-shark',
          teamMemberCount: 0,
          teamName: 'Perk shark',
          updatedAt: new Date(),
        },
        {
          conditions: [
            {
              assetGroupAddress: 'perk',
              assetGroupEnabled: true,
              assetGroupId: 'perk',
              assetGroupLabel: 'PERK',
              assetGroupType: 'collection',
              id: 'condition-whale',
              maximumAmount: null,
              minimumAmount: '10',
            },
          ],
          createdAt: new Date(),
          enabled: true,
          id: 'role-whale',
          matchMode: 'any',
          name: 'Perk whale',
          organizationId: 'org-1',
          slug: 'perk-whale',
          teamId: 'team-whale',
          teamMemberCount: 0,
          teamName: 'Perk whale',
          updatedAt: new Date(),
        },
      ],
      users: [
        {
          id: 'shrimp',
          name: 'Shrimp',
          username: 'shrimp',
          wallets: ['wallet-shrimp'],
        },
        {
          id: 'shark',
          name: 'Shark',
          username: 'shark',
          wallets: ['wallet-shark'],
        },
        {
          id: 'whale',
          name: 'Whale',
          username: 'whale',
          wallets: ['wallet-whale'],
        },
      ],
      walletAmountsByAssetGroupId: new Map([
        [
          'perk',
          new Map([
            ['shark', 2n],
            ['shrimp', 1n],
            ['whale', 10n],
          ]),
        ],
      ]),
    })

    expect(result.matchedRoleIdsByUserId.get('shrimp')).toEqual(['role-shrimp'])
    expect(result.matchedRoleIdsByUserId.get('shark')).toEqual(['role-shark'])
    expect(result.matchedRoleIdsByUserId.get('whale')).toEqual(['role-whale'])
  })
})

describe('community role sync', () => {
  test('returns failed when scheduled membership preflight queries throw', async () => {
    const originalSelect = database.select.bind(database)

    try {
      Object.assign(database, {
        select() {
          throw new Error('Membership preflight failed.')
        },
      })

      await expect(
        runScheduledCommunityRoleSync({
          organizationId: 'org-preflight-failure',
        }),
      ).resolves.toEqual({
        errorMessage: 'Membership preflight failed.',
        organizationId: 'org-preflight-failure',
        status: 'failed',
      })
    } finally {
      Object.assign(database, {
        select: originalSelect,
      })
    }
  })

  test('releases the shared sync lock when the membership run insert fails', async () => {
    const organizationId = 'org-lock-release'

    await insertOrganization({
      id: organizationId,
      name: 'Lock Release Org',
      slug: 'lock-release-org',
    })
    await insertTeam({
      id: 'team-lock-release',
      name: 'Lock Release Team',
      organizationId,
    })
    await insertCommunityRole({
      enabled: true,
      id: 'role-lock-release',
      matchMode: 'any',
      name: 'Lock Release Role',
      organizationId,
      slug: 'lock-release-role',
      teamId: 'team-lock-release',
    })

    await expect(
      runScheduledCommunityRoleSync({
        database: createInsertFailureDatabase(communityRoleSchema.communityMembershipSyncRun) as never,
        organizationId,
      }),
    ).resolves.toEqual({
      errorMessage: 'Run insert failed.',
      organizationId,
      status: 'failed',
    })

    expect(await database.select().from(automationSchema.automationLock)).toHaveLength(0)
  })

  test('uses the injected database for scheduled membership preflight reads', async () => {
    await expect(
      runScheduledCommunityRoleSync({
        database: createSelectFailureDatabase('Injected membership preflight failed.') as never,
        organizationId: 'org-injected-preflight-failure',
      }),
    ).resolves.toEqual({
      errorMessage: 'Injected membership preflight failed.',
      organizationId: 'org-injected-preflight-failure',
      status: 'failed',
    })
  })

  test('deleting a community role removes its Better Auth team and clears active team sessions', async () => {
    const organizationId = 'org-delete'
    const roleId = 'role-delete'
    const teamId = 'team-delete'
    const userId = 'user-delete'

    await insertUser({
      email: 'delete@example.com',
      id: userId,
      name: 'Delete Me',
      username: 'deleteme',
    })
    await insertOrganization({
      id: organizationId,
      name: 'Delete Org',
      slug: 'delete-org',
    })
    await insertTeam({
      id: teamId,
      name: 'Delete Team',
      organizationId,
    })
    await insertCommunityRole({
      enabled: true,
      id: roleId,
      matchMode: 'any',
      name: 'Delete Team',
      organizationId,
      slug: 'delete-team',
      teamId,
    })
    await insertTeamMember({
      teamId,
      userId,
    })
    await insertSession({
      activeOrganizationId: organizationId,
      activeTeamId: teamId,
      token: 'delete-session',
      userId,
    })

    await expect(removeCommunityRoleById(roleId)).resolves.toEqual({
      id: roleId,
      organizationId,
      teamId,
    })
    expect(
      await database
        .select({
          id: communityRoleSchema.communityRole.id,
        })
        .from(communityRoleSchema.communityRole)
        .where(eq(communityRoleSchema.communityRole.id, roleId)),
    ).toEqual([])
    expect(
      await database
        .select({
          id: authSchema.team.id,
        })
        .from(authSchema.team)
        .where(eq(authSchema.team.id, teamId)),
    ).toEqual([])
    expect(
      await database
        .select({
          teamId: authSchema.teamMember.teamId,
          userId: authSchema.teamMember.userId,
        })
        .from(authSchema.teamMember)
        .where(eq(authSchema.teamMember.teamId, teamId)),
    ).toEqual([])
    expect(
      await database
        .select({
          activeOrganizationId: authSchema.session.activeOrganizationId,
          activeTeamId: authSchema.session.activeTeamId,
        })
        .from(authSchema.session)
        .where(eq(authSchema.session.token, 'delete-session')),
    ).toEqual([
      {
        activeOrganizationId: organizationId,
        activeTeamId: null,
      },
    ])
  })

  test('previews and applies gated organization and team changes deterministically', async () => {
    const organizationId = 'org-acme'
    const collectionGroupId = 'group-collection'
    const mintGroupId = 'group-mint'
    const gatedTeamId = 'team-gated'
    const whalesTeamId = 'team-whales'
    const manualTeamId = 'team-manual'
    const gatedRoleId = 'role-gated'
    const whalesRoleId = 'role-whales'
    const aliceId = 'user-alice'
    const bobId = 'user-bob'
    const carolId = 'user-carol'
    const daveId = 'user-dave'
    const erinId = 'user-erin'

    await Promise.all([
      insertUser({
        email: 'alice@example.com',
        id: aliceId,
        name: 'Alice',
        username: 'alice',
      }),
      insertUser({
        email: 'bob@example.com',
        id: bobId,
        name: 'Bob',
        username: 'bob',
      }),
      insertUser({
        email: 'carol@example.com',
        id: carolId,
        name: 'Carol',
        username: 'carol',
      }),
      insertUser({
        email: 'dave@example.com',
        id: daveId,
        name: 'Dave',
        username: 'dave',
      }),
      insertUser({
        email: 'erin@example.com',
        id: erinId,
        name: 'Erin',
        username: 'erin',
      }),
    ])
    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await Promise.all([
      insertMember({
        organizationId,
        role: 'owner',
        userId: aliceId,
      }),
      insertMember({
        organizationId,
        role: 'member',
        userId: carolId,
      }),
      insertMember({
        organizationId,
        role: 'member',
        userId: daveId,
      }),
      insertMember({
        organizationId,
        role: 'member',
        userId: erinId,
      }),
    ])
    await Promise.all([
      insertCommunityManagedMember({
        organizationId,
        userId: carolId,
      }),
      insertCommunityManagedMember({
        organizationId,
        userId: erinId,
      }),
    ])
    await Promise.all([
      insertSolanaWallet({
        address: 'wallet-alice',
        userId: aliceId,
      }),
      insertSolanaWallet({
        address: 'wallet-alice-2',
        userId: aliceId,
      }),
      insertSolanaWallet({
        address: 'wallet-bob',
        userId: bobId,
      }),
    ])
    await Promise.all([
      insertAssetGroup({
        address: 'collection-acme',
        enabled: true,
        id: collectionGroupId,
        label: 'Acme Collection',
        type: 'collection',
      }),
      insertAssetGroup({
        address: 'mint-acme',
        enabled: true,
        id: mintGroupId,
        label: 'Acme Mint',
        type: 'mint',
      }),
    ])
    await Promise.all([
      insertTeam({
        id: gatedTeamId,
        name: 'Collectors',
        organizationId,
      }),
      insertTeam({
        id: whalesTeamId,
        name: 'Whales',
        organizationId,
      }),
      insertTeam({
        id: manualTeamId,
        name: 'Manual Team',
        organizationId,
      }),
    ])
    await Promise.all([
      insertCommunityRole({
        enabled: true,
        id: gatedRoleId,
        matchMode: 'any',
        name: 'Collectors',
        organizationId,
        slug: 'collectors',
        teamId: gatedTeamId,
      }),
      insertCommunityRole({
        enabled: true,
        id: whalesRoleId,
        matchMode: 'all',
        name: 'Whales',
        organizationId,
        slug: 'whales',
        teamId: whalesTeamId,
      }),
    ])
    await Promise.all([
      insertCommunityRoleCondition({
        assetGroupId: collectionGroupId,
        communityRoleId: gatedRoleId,
        maximumAmount: null,
        minimumAmount: '1',
      }),
      insertCommunityRoleCondition({
        assetGroupId: collectionGroupId,
        communityRoleId: whalesRoleId,
        maximumAmount: null,
        minimumAmount: '1',
      }),
      insertCommunityRoleCondition({
        assetGroupId: mintGroupId,
        communityRoleId: whalesRoleId,
        maximumAmount: null,
        minimumAmount: '100',
      }),
    ])
    await Promise.all([
      insertTeamMember({
        teamId: gatedTeamId,
        userId: carolId,
      }),
      insertTeamMember({
        teamId: gatedTeamId,
        userId: daveId,
      }),
      insertTeamMember({
        teamId: manualTeamId,
        userId: erinId,
      }),
    ])
    await Promise.all([
      insertSession({
        activeOrganizationId: organizationId,
        activeTeamId: gatedTeamId,
        token: 'carol-session',
        userId: carolId,
      }),
      insertSession({
        activeOrganizationId: organizationId,
        activeTeamId: gatedTeamId,
        token: 'dave-session',
        userId: daveId,
      }),
    ])
    await Promise.all([
      insertAsset({
        address: 'asset-alice',
        amount: '1',
        assetGroupId: collectionGroupId,
        owner: 'wallet-alice',
        resolverKind: 'helius-collection-assets',
      }),
      insertAsset({
        address: 'asset-bob',
        amount: '1',
        assetGroupId: collectionGroupId,
        owner: 'wallet-bob',
        resolverKind: 'helius-collection-assets',
      }),
      insertAsset({
        address: 'mint-balance-alice',
        amount: '100',
        assetGroupId: mintGroupId,
        owner: 'wallet-alice-2',
        resolverKind: 'helius-token-accounts',
      }),
    ])

    const preview = await previewCommunityRoleSync(organizationId)

    expect(preview).toBeDefined()
    expect(preview?.summary).toEqual({
      addToOrganizationCount: 1,
      addToTeamCount: 3,
      qualifiedUserCount: 2,
      removeFromOrganizationCount: 1,
      removeFromTeamCount: 2,
      usersChangedCount: 4,
    })
    expect(
      preview?.roles.map((role) => ({
        addCount: role.addCount,
        id: role.id,
        qualifiedCount: role.qualifiedCount,
        removeCount: role.removeCount,
      })),
    ).toEqual([
      {
        addCount: 2,
        id: gatedRoleId,
        qualifiedCount: 2,
        removeCount: 2,
      },
      {
        addCount: 1,
        id: whalesRoleId,
        qualifiedCount: 1,
        removeCount: 0,
      },
    ])
    expect(
      preview?.users.map((currentUser) => ({
        addToOrganization: currentUser.addToOrganization,
        addToTeams: currentUser.addToTeams.map((role) => role.id),
        currentGatedRoles: currentUser.currentGatedRoles.map((role) => role.id),
        currentOrganizationRole: currentUser.currentOrganizationRole,
        managedMembership: currentUser.managedMembership,
        removeFromOrganization: currentUser.removeFromOrganization,
        removeFromTeams: currentUser.removeFromTeams.map((role) => role.id),
        userId: currentUser.userId,
      })),
    ).toEqual([
      {
        addToOrganization: false,
        addToTeams: [gatedRoleId, whalesRoleId],
        currentGatedRoles: [],
        currentOrganizationRole: 'owner',
        managedMembership: false,
        removeFromOrganization: false,
        removeFromTeams: [],
        userId: aliceId,
      },
      {
        addToOrganization: true,
        addToTeams: [gatedRoleId],
        currentGatedRoles: [],
        currentOrganizationRole: null,
        managedMembership: false,
        removeFromOrganization: false,
        removeFromTeams: [],
        userId: bobId,
      },
      {
        addToOrganization: false,
        addToTeams: [],
        currentGatedRoles: [gatedRoleId],
        currentOrganizationRole: 'member',
        managedMembership: true,
        removeFromOrganization: true,
        removeFromTeams: [gatedRoleId],
        userId: carolId,
      },
      {
        addToOrganization: false,
        addToTeams: [],
        currentGatedRoles: [gatedRoleId],
        currentOrganizationRole: 'member',
        managedMembership: false,
        removeFromOrganization: false,
        removeFromTeams: [gatedRoleId],
        userId: daveId,
      },
    ])

    const applied = await applyCommunityRoleSync(organizationId)

    expect(applied).toEqual(preview)
    expect(
      await database
        .select({
          role: authSchema.member.role,
          userId: authSchema.member.userId,
        })
        .from(authSchema.member)
        .where(eq(authSchema.member.organizationId, organizationId))
        .orderBy(asc(authSchema.member.userId)),
    ).toEqual([
      {
        role: 'owner',
        userId: aliceId,
      },
      {
        role: 'member',
        userId: bobId,
      },
      {
        role: 'member',
        userId: daveId,
      },
      {
        role: 'member',
        userId: erinId,
      },
    ])
    expect(
      await database
        .select({
          teamId: authSchema.teamMember.teamId,
          userId: authSchema.teamMember.userId,
        })
        .from(authSchema.teamMember)
        .orderBy(asc(authSchema.teamMember.teamId), asc(authSchema.teamMember.userId)),
    ).toEqual([
      {
        teamId: gatedTeamId,
        userId: aliceId,
      },
      {
        teamId: gatedTeamId,
        userId: bobId,
      },
      {
        teamId: manualTeamId,
        userId: erinId,
      },
      {
        teamId: whalesTeamId,
        userId: aliceId,
      },
    ])
    expect(
      await database
        .select({
          userId: communityRoleSchema.communityManagedMember.userId,
        })
        .from(communityRoleSchema.communityManagedMember)
        .where(eq(communityRoleSchema.communityManagedMember.organizationId, organizationId))
        .orderBy(asc(communityRoleSchema.communityManagedMember.userId)),
    ).toEqual([
      {
        userId: bobId,
      },
      {
        userId: erinId,
      },
    ])
    expect(
      await database
        .select({
          activeOrganizationId: authSchema.session.activeOrganizationId,
          activeTeamId: authSchema.session.activeTeamId,
          token: authSchema.session.token,
        })
        .from(authSchema.session)
        .orderBy(asc(authSchema.session.token)),
    ).toEqual([
      {
        activeOrganizationId: null,
        activeTeamId: null,
        token: 'carol-session',
      },
      {
        activeOrganizationId: organizationId,
        activeTeamId: null,
        token: 'dave-session',
      },
    ])
    await expect(
      listCommunityMembershipSyncRuns({
        limit: 5,
        organizationId,
      }),
    ).resolves.toMatchObject([
      {
        addToOrganizationCount: 1,
        addToTeamCount: 3,
        dependencyAssetGroupIds: [collectionGroupId, mintGroupId],
        errorMessage: null,
        qualifiedUserCount: 2,
        removeFromOrganizationCount: 1,
        removeFromTeamCount: 2,
        status: 'succeeded',
        triggerSource: 'manual',
        usersChangedCount: 4,
      },
    ])
    await expect(
      getCommunityRoleSyncStatus({
        organizationId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        membershipStatus: expect.objectContaining({
          freshnessStatus: 'stale',
          lastRun: expect.objectContaining({
            status: 'succeeded',
          }),
          lastSuccessfulRun: expect.objectContaining({
            status: 'succeeded',
          }),
        }),
      }),
    )
  })

  test('fails with lock_lost between membership users and preserves committed progress', async () => {
    const now = new Date('2026-04-02T12:00:00.000Z')
    const assetGroupId = 'asset-group-lock-loss'
    const organizationId = 'org-lock-loss'
    const roleId = 'role-lock-loss'
    const teamId = 'team-lock-loss'
    let lockStolen = false
    let transactionCount = 0

    await insertOrganization({
      id: organizationId,
      name: 'Lock Loss Org',
      slug: 'lock-loss-org',
    })
    await insertTeam({
      id: teamId,
      name: 'Lock Loss Team',
      organizationId,
    })
    await insertCommunityRole({
      enabled: true,
      id: roleId,
      matchMode: 'any',
      name: 'Lock Loss Role',
      organizationId,
      slug: 'lock-loss-role',
      teamId,
    })
    await insertAssetGroup({
      address: 'collection-lock-loss',
      enabled: true,
      id: assetGroupId,
      label: 'Collection Lock Loss',
      type: 'collection',
    })
    await insertCommunityRoleCondition({
      assetGroupId,
      communityRoleId: roleId,
      minimumAmount: '1',
    })
    await database.insert(assetSchema.assetGroupIndexRun).values({
      assetGroupId,
      deletedCount: 0,
      errorMessage: null,
      errorPayload: null,
      finishedAt: new Date('2026-04-02T11:59:00.000Z'),
      id: 'index-run-lock-loss',
      insertedCount: 2,
      pagesProcessed: 1,
      resolverKind: 'helius-collection-assets',
      startedAt: new Date('2026-04-02T11:58:00.000Z'),
      status: 'succeeded',
      totalCount: 2,
      triggerSource: 'scheduled',
      updatedCount: 0,
    })

    for (const currentUser of [
      ['alice@example.com', 'user-alice', 'Alice', 'alice', 'wallet-alice', 'asset-alice'],
      ['bob@example.com', 'user-bob', 'Bob', 'bob', 'wallet-bob', 'asset-bob'],
    ] as const) {
      await insertUser({
        email: currentUser[0],
        id: currentUser[1],
        name: currentUser[2],
        username: currentUser[3],
      })
      await insertSolanaWallet({
        address: currentUser[4],
        userId: currentUser[1],
      })
      await insertAsset({
        address: currentUser[5],
        amount: '1',
        assetGroupId,
        owner: currentUser[4],
        resolverKind: 'helius-collection-assets',
      })
    }

    const leaseLossDatabase = new Proxy(database, {
      get(target, property, receiver) {
        if (property === 'transaction') {
          return async (callback: Parameters<DatabaseClient['transaction']>[0]) => {
            transactionCount += 1
            const result = await target.transaction(callback)

            if (!lockStolen && transactionCount === 2) {
              lockStolen = true
              await target
                .update(automationSchema.automationLock)
                .set({
                  expiresAt: new Date('2026-04-02T12:30:00.000Z'),
                  runId: 'stolen-run',
                  startedAt: new Date('2026-04-02T12:15:00.000Z'),
                })
                .where(eq(automationSchema.automationLock.key, `community-sync:${organizationId}`))
            }

            return result
          }
        }

        const value = Reflect.get(target, property, receiver)

        return typeof value === 'function' ? value.bind(target) : value
      },
    })

    await expect(
      runScheduledCommunityRoleSync({
        database: leaseLossDatabase as never,
        now: () => now,
        organizationId,
      }),
    ).resolves.toMatchObject({
      organizationId,
      status: 'failed',
    })

    expect(
      await database
        .select({
          role: authSchema.member.role,
          userId: authSchema.member.userId,
        })
        .from(authSchema.member)
        .where(eq(authSchema.member.organizationId, organizationId))
        .orderBy(asc(authSchema.member.userId)),
    ).toEqual([
      {
        role: 'member',
        userId: 'user-alice',
      },
    ])
    expect(
      await database
        .select({
          teamId: authSchema.teamMember.teamId,
          userId: authSchema.teamMember.userId,
        })
        .from(authSchema.teamMember)
        .orderBy(asc(authSchema.teamMember.teamId), asc(authSchema.teamMember.userId)),
    ).toEqual([
      {
        teamId,
        userId: 'user-alice',
      },
    ])
    expect(
      await database
        .select({
          userId: communityRoleSchema.communityManagedMember.userId,
        })
        .from(communityRoleSchema.communityManagedMember)
        .where(eq(communityRoleSchema.communityManagedMember.organizationId, organizationId))
        .orderBy(asc(communityRoleSchema.communityManagedMember.userId)),
    ).toEqual([
      {
        userId: 'user-alice',
      },
    ])
    await expect(
      listCommunityMembershipSyncRuns({
        limit: 5,
        organizationId,
      }),
    ).resolves.toMatchObject([
      {
        addToOrganizationCount: 1,
        addToTeamCount: 1,
        errorPayload: {
          reason: 'lock_lost',
        },
        qualifiedUserCount: 1,
        removeFromOrganizationCount: 0,
        removeFromTeamCount: 0,
        status: 'failed',
        triggerSource: 'scheduled',
        usersChangedCount: 1,
      },
    ])
  })

  test('matches Solana wallets case-sensitively when assigning gated roles', async () => {
    const organizationId = 'org-case-sensitive'
    const assetGroupId = 'group-case-sensitive'
    const roleId = 'role-case-sensitive'
    const teamId = 'team-case-sensitive'
    const upperUserId = 'user-upper-wallet'
    const lowerUserId = 'user-lower-wallet'

    await Promise.all([
      insertUser({
        email: 'alpha@example.com',
        id: upperUserId,
        name: 'Alpha',
        username: 'alpha',
      }),
      insertUser({
        email: 'beta@example.com',
        id: lowerUserId,
        name: 'Beta',
        username: 'beta',
      }),
    ])
    await insertOrganization({
      id: organizationId,
      name: 'Case Sensitive Org',
      slug: 'case-sensitive-org',
    })
    await insertTeam({
      id: teamId,
      name: 'Case Sensitive Team',
      organizationId,
    })
    await insertCommunityRole({
      enabled: true,
      id: roleId,
      matchMode: 'any',
      name: 'Case Sensitive Role',
      organizationId,
      slug: 'case-sensitive-role',
      teamId,
    })
    await insertAssetGroup({
      address: 'collection-case-sensitive',
      enabled: true,
      id: assetGroupId,
      label: 'Case Sensitive Collection',
      type: 'collection',
    })
    await insertCommunityRoleCondition({
      assetGroupId,
      communityRoleId: roleId,
      minimumAmount: '1',
    })
    await Promise.all([
      insertSolanaWallet({
        address: 'AbC123Wallet',
        userId: upperUserId,
      }),
      insertSolanaWallet({
        address: 'abc123wallet',
        userId: lowerUserId,
      }),
    ])
    await Promise.all([
      insertAsset({
        address: 'asset-upper',
        amount: '1',
        assetGroupId,
        owner: 'AbC123Wallet',
        resolverKind: 'helius-collection-assets',
      }),
      insertAsset({
        address: 'asset-lower',
        amount: '1',
        assetGroupId,
        owner: 'abc123wallet',
        resolverKind: 'helius-collection-assets',
      }),
    ])

    const preview = await previewCommunityRoleSync(organizationId)

    expect(preview?.summary).toEqual({
      addToOrganizationCount: 2,
      addToTeamCount: 2,
      qualifiedUserCount: 2,
      removeFromOrganizationCount: 0,
      removeFromTeamCount: 0,
      usersChangedCount: 2,
    })
    expect(
      preview?.users.map((currentUser) => ({
        addToOrganization: currentUser.addToOrganization,
        addToTeams: currentUser.addToTeams.map((role) => role.id),
        userId: currentUser.userId,
      })),
    ).toEqual([
      {
        addToOrganization: true,
        addToTeams: [roleId],
        userId: upperUserId,
      },
      {
        addToOrganization: true,
        addToTeams: [roleId],
        userId: lowerUserId,
      },
    ])
  })

  test('skips scheduled membership sync when dependency asset groups are stale or unknown', async () => {
    const organizationId = 'org-scheduled-membership-skip'
    const assetGroupId = 'group-scheduled-membership-skip'
    const roleId = 'role-scheduled-membership-skip'
    const teamId = 'team-scheduled-membership-skip'

    await insertOrganization({
      id: organizationId,
      name: 'Scheduled Membership Skip',
      slug: 'scheduled-membership-skip',
    })
    await insertTeam({
      id: teamId,
      name: 'Collectors',
      organizationId,
    })
    await insertCommunityRole({
      enabled: true,
      id: roleId,
      matchMode: 'any',
      name: 'Collectors',
      organizationId,
      slug: 'collectors',
      teamId,
    })
    await insertAssetGroup({
      address: 'collection-scheduled-membership-skip',
      enabled: true,
      id: assetGroupId,
      label: 'Scheduled Membership Collection',
      type: 'collection',
    })
    await insertCommunityRoleCondition({
      assetGroupId,
      communityRoleId: roleId,
      minimumAmount: '1',
    })

    await expect(
      runScheduledCommunityRoleSync({
        organizationId,
      }),
    ).resolves.toEqual({
      organizationId,
      status: 'skipped',
    })
    await expect(
      listCommunityMembershipSyncRuns({
        limit: 5,
        organizationId,
      }),
    ).resolves.toMatchObject([
      {
        blockedAssetGroupIds: [assetGroupId],
        dependencyAssetGroupIds: [assetGroupId],
        dependencyFreshAtStart: false,
        errorMessage: 'Scheduled membership sync skipped because required asset groups are stale.',
        status: 'skipped',
        triggerSource: 'scheduled',
      },
    ])
  })

  test('chunks large organization ID sets when selecting due scheduled membership sync', async () => {
    const now = new Date('2026-04-02T12:00:00.000Z')
    const organizations = Array.from({ length: 901 }, (_, index) => {
      const suffix = String(index).padStart(4, '0')

      return {
        createdAt: now,
        id: `org-membership-${suffix}`,
        logo: null,
        metadata: null,
        name: `Membership Org ${suffix}`,
        slug: `membership-org-${suffix}`,
      }
    })
    const teams = organizations.map((record, index) => {
      const suffix = String(index).padStart(4, '0')

      return {
        createdAt: now,
        id: `team-membership-${suffix}`,
        name: `Collectors ${suffix}`,
        organizationId: record.id,
        updatedAt: now,
      }
    })
    const roles = organizations.map((record, index) => {
      const suffix = String(index).padStart(4, '0')

      return {
        createdAt: now,
        enabled: true,
        id: `role-membership-${suffix}`,
        matchMode: 'any' as const,
        name: `Collectors ${suffix}`,
        organizationId: record.id,
        slug: `collectors-${suffix}`,
        teamId: `team-membership-${suffix}`,
        updatedAt: now,
      }
    })

    await database.insert(authSchema.organization).values(organizations)
    await database.insert(authSchema.team).values(teams)
    await database.insert(communityRoleSchema.communityRole).values(roles)

    const dueOrganizationIds = await listOrganizationsDueForScheduledCommunityMembershipSync({
      now: () => new Date('2026-04-02T12:05:00.000Z'),
    })

    expect(dueOrganizationIds).toHaveLength(901)
    expect(dueOrganizationIds[0]).toBe('org-membership-0000')
    expect(dueOrganizationIds.at(-1)).toBe('org-membership-0900')
  })
})
