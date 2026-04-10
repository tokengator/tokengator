import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AssetSchema = typeof import('@tokengator/db/schema/asset')
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type AutomationSchema = typeof import('@tokengator/db/schema/automation')
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type AdminCommunityRoleRouter =
  typeof import('../src/features/admin-community-role/feature/admin-community-role-router').adminCommunityRoleRouter
type GetCommunityRoleSyncStatus = (typeof import('../src/features/community-role-sync'))['getCommunityRoleSyncStatus']
type ListCommunityDiscordSyncRuns =
  (typeof import('../src/features/community-role-sync'))['listCommunityDiscordSyncRuns']
type ListOrganizationsDueForScheduledCommunityDiscordSync =
  (typeof import('../src/features/community-role-sync'))['listOrganizationsDueForScheduledCommunityDiscordSync']
type RunScheduledCommunityRoleDiscordSync =
  (typeof import('../src/features/community-role-sync'))['runScheduledCommunityRoleDiscordSync']

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-api-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community-role-discord-sync.sqlite')).toString()

let adminCommunityRoleRouter: AdminCommunityRoleRouter
let assetSchema: AssetSchema
let authSchema: AuthSchema
let automationSchema: AutomationSchema
let communityRoleSchema: CommunityRoleSchema
let database: DatabaseClient
let getCommunityRoleSyncStatus: GetCommunityRoleSyncStatus
let guildMembersByDiscordUserId = new Map<string, { discordUserId: string; roleIds: string[] }>()
let guildRoles: Array<{
  assignable: boolean
  checks: string[]
  id: string
  isDefault: boolean
  managed: boolean
  name: string
  position: number
}> = [
  {
    assignable: true,
    checks: [],
    id: 'discord-role-default',
    isDefault: false,
    managed: false,
    name: 'Default',
    position: 5,
  },
]
let inspectionChecks: string[] = []
let inspectionStatus: 'connected' | 'needs_attention' = 'connected'
let listCommunityDiscordSyncRuns: ListCommunityDiscordSyncRuns
let listOrganizationsDueForScheduledCommunityDiscordSync: ListOrganizationsDueForScheduledCommunityDiscordSync
let memberLookupFailures = new Map<string, unknown>()
let mutationFailures = new Map<string, unknown>()
let mutationObserver:
  | ((input: { action: 'grant' | 'revoke'; roleId: string; userId: string }) => Promise<void> | void)
  | null = null
let runScheduledCommunityRoleDiscordSync: RunScheduledCommunityRoleDiscordSync

function createAdminCallContext(): any {
  return {
    context: {
      requestHeaders: new Headers(),
      requestSignal: new AbortController().signal,
      responseHeaders: new Headers(),
      session: {
        session: {
          createdAt: new Date('2026-04-02T12:00:00.000Z'),
          expiresAt: new Date('2026-04-09T12:00:00.000Z'),
          id: 'admin-session-id',
          token: 'admin-session-token',
          updatedAt: new Date('2026-04-02T12:00:00.000Z'),
          userId: 'admin-user-id',
        },
        user: {
          id: 'admin-user-id',
          name: 'Admin User',
          role: 'admin',
          username: 'admin',
        },
      },
    },
  }
}

function createInspectionResult() {
  return {
    diagnostics: {
      botHighestRole: {
        id: 'bot-role-id',
        name: 'TokenGator',
        position: 10,
      },
      checks: [...inspectionChecks],
      guild: {
        id: '123456789012345678',
        name: 'Acme Guild',
      },
      permissions: {
        administrator: false,
        manageRoles: true,
      },
    },
    guildName: 'Acme Guild',
    lastCheckedAt: new Date('2026-04-02T12:10:00.000Z'),
    roles: guildRoles,
    status: inspectionStatus,
  }
}

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function getMutationKey(action: 'grant' | 'revoke', userId: string, roleId: string) {
  return `${action}:${userId}:${roleId}`
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

function resetDiscordMockState() {
  guildMembersByDiscordUserId = new Map()
  guildRoles = [
    {
      assignable: true,
      checks: [],
      id: 'discord-role-default',
      isDefault: false,
      managed: false,
      name: 'Default',
      position: 5,
    },
  ]
  inspectionChecks = []
  inspectionStatus = 'connected'
  memberLookupFailures = new Map()
  mutationFailures = new Map()
  mutationObserver = null
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

async function insertAccount(input: {
  accountId: string
  createdAt?: Date
  id?: string
  providerId?: string
  userId: string
}) {
  const createdAt = input.createdAt ?? new Date('2026-04-02T12:00:00.000Z')
  const id = input.id ?? crypto.randomUUID()
  const providerId = input.providerId ?? 'discord'

  await database.insert(authSchema.account).values({
    accountId: input.accountId,
    createdAt,
    id,
    providerId,
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    userId: input.userId,
  })

  if (providerId !== 'discord') {
    return
  }

  const discordIdentityRows = await database
    .select({
      id: authSchema.identity.id,
    })
    .from(authSchema.identity)
    .where(sql`${authSchema.identity.provider} = 'discord' and ${authSchema.identity.userId} = ${input.userId}`)
    .orderBy(authSchema.identity.linkedAt, authSchema.identity.id)

  await database.insert(authSchema.identity).values({
    avatarUrl: null,
    createdAt,
    displayName: null,
    email: null,
    id: crypto.randomUUID(),
    isPrimary: discordIdentityRows.length === 0,
    lastSyncedAt: createdAt,
    linkedAt: createdAt,
    profile: null,
    provider: 'discord',
    providerId: input.accountId,
    referenceId: id,
    referenceType: 'account',
    updatedAt: createdAt,
    userId: input.userId,
    username: null,
  })

  const canonicalIdentityRows = await database
    .select({
      id: authSchema.identity.id,
    })
    .from(authSchema.identity)
    .where(sql`${authSchema.identity.provider} = 'discord' and ${authSchema.identity.userId} = ${input.userId}`)
    .orderBy(authSchema.identity.linkedAt, authSchema.identity.id)

  await database
    .update(authSchema.identity)
    .set({
      isPrimary: false,
    })
    .where(sql`${authSchema.identity.provider} = 'discord' and ${authSchema.identity.userId} = ${input.userId}`)

  const [primaryIdentity] = canonicalIdentityRows

  if (primaryIdentity) {
    await database
      .update(authSchema.identity)
      .set({
        isPrimary: true,
      })
      .where(sql`${authSchema.identity.id} = ${primaryIdentity.id}`)
  }
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
  enabled?: boolean
  id: string
  label: string
  type: 'collection' | 'mint'
}) {
  const now = new Date('2026-04-02T12:00:00.000Z')

  await database.insert(assetSchema.assetGroup).values({
    address: input.address,
    createdAt: now,
    enabled: input.enabled ?? true,
    id: input.id,
    indexingStartedAt: null,
    label: input.label,
    type: input.type,
    updatedAt: now,
  })
}

async function insertCommunityDiscordConnection(input: { guildId: string; organizationId: string }) {
  await database.insert(communityRoleSchema.communityDiscordConnection).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    diagnostics: null,
    guildId: input.guildId,
    guildName: 'Stored Guild Name',
    lastCheckedAt: new Date('2026-04-02T12:00:00.000Z'),
    organizationId: input.organizationId,
    status: 'connected',
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
  })
}

async function insertCommunityManagedMember(input: { organizationId: string; userId: string }) {
  await database.insert(communityRoleSchema.communityManagedMember).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    userId: input.userId,
  })
}

async function insertCommunityRole(input: {
  discordRoleId?: string | null
  enabled?: boolean
  id: string
  matchMode?: 'all' | 'any'
  name: string
  organizationId: string
  slug: string
  teamId: string
}) {
  await database.insert(communityRoleSchema.communityRole).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    discordRoleId: input.discordRoleId ?? null,
    enabled: input.enabled ?? true,
    id: input.id,
    matchMode: input.matchMode ?? 'any',
    name: input.name,
    organizationId: input.organizationId,
    slug: input.slug,
    teamId: input.teamId,
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
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

async function insertSolanaWallet(input: { address: string; userId: string }) {
  await database.insert(authSchema.solanaWallet).values({
    address: input.address,
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: crypto.randomUUID(),
    isPrimary: true,
    name: null,
    userId: input.userId,
  })
}

async function insertTeam(input: { id: string; name: string; organizationId: string }) {
  await database.insert(authSchema.team).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: input.id,
    name: input.name,
    organizationId: input.organizationId,
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
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

  mock.module('@tokengator/discord', () => {
    class MockDiscordGuildMemberLookupError extends Error {
      code: string
      discordCode: number | null
      status: number | null

      constructor(input: { code: string; discordCode: number | null; message: string; status: number | null }) {
        super(input.message)
        this.code = input.code
        this.discordCode = input.discordCode
        this.name = 'DiscordGuildMemberLookupError'
        this.status = input.status
      }
    }

    class MockDiscordGuildMemberRoleMutationError extends Error {
      code: string
      discordCode: number | null
      status: number | null

      constructor(input: { code: string; discordCode: number | null; message: string; status: number | null }) {
        super(input.message)
        this.code = input.code
        this.discordCode = input.discordCode
        this.name = 'DiscordGuildMemberRoleMutationError'
        this.status = input.status
      }
    }

    function toMockMutationError(failure: unknown) {
      const discordCode =
        typeof failure === 'object' && failure !== null && 'code' in failure && typeof failure.code === 'number'
          ? failure.code
          : null

      return new MockDiscordGuildMemberRoleMutationError({
        code: discordCode === 10_007 ? 'guild_member_not_found' : 'unknown',
        discordCode,
        message:
          typeof failure === 'object' && failure !== null && 'message' in failure && typeof failure.message === 'string'
            ? failure.message
            : 'Discord request failed.',
        status: typeof failure === 'object' && failure !== null && 'status' in failure ? Number(failure.status) : null,
      })
    }

    function toMockLookupError(failure: unknown) {
      const discordCode =
        typeof failure === 'object' && failure !== null && 'code' in failure && typeof failure.code === 'number'
          ? failure.code
          : null
      const status =
        typeof failure === 'object' && failure !== null && 'status' in failure ? Number(failure.status) : null

      return new MockDiscordGuildMemberLookupError({
        code: status === 403 ? 'forbidden' : status === 429 ? 'rate_limited' : 'unknown',
        discordCode,
        message:
          typeof failure === 'object' && failure !== null && 'message' in failure && typeof failure.message === 'string'
            ? failure.message
            : 'Discord request failed.',
        status,
      })
    }

    return {
      addDiscordGuildMemberRole: async (_ctx: unknown, options: { roleId: string; userId: string }) => {
        const failure = mutationFailures.get(getMutationKey('grant', options.userId, options.roleId))

        if (failure) {
          if (failure instanceof Error) {
            throw failure
          }

          throw toMockMutationError(failure)
        }

        const currentMember = guildMembersByDiscordUserId.get(options.userId)

        if (!currentMember) {
          throw new MockDiscordGuildMemberRoleMutationError({
            code: 'guild_member_not_found',
            discordCode: 10_007,
            message: 'Unknown Member',
            status: 404,
          })
        }

        guildMembersByDiscordUserId.set(options.userId, {
          discordUserId: options.userId,
          roleIds: [...new Set([...currentMember.roleIds, options.roleId])].sort((left, right) =>
            left.localeCompare(right),
          ),
        })
        await mutationObserver?.({
          action: 'grant',
          roleId: options.roleId,
          userId: options.userId,
        })
      },
      DiscordGuildMemberLookupError: MockDiscordGuildMemberLookupError,
      DiscordGuildMemberRoleMutationError: MockDiscordGuildMemberRoleMutationError,
      getDiscordGuildMember: async (_ctx: unknown, options: { userId: string }) => {
        const failure = memberLookupFailures.get(options.userId)

        if (failure) {
          if (failure instanceof Error) {
            throw failure
          }

          throw toMockLookupError(failure)
        }

        const currentMember = guildMembersByDiscordUserId.get(options.userId)

        return currentMember
          ? {
              discordUserId: currentMember.discordUserId,
              roleIds: [...currentMember.roleIds],
            }
          : null
      },
      inspectDiscordGuildRoles: async () => createInspectionResult(),
      listDiscordGuildMembers: async () =>
        [...guildMembersByDiscordUserId.values()].map((guildMember) => ({
          discordUserId: guildMember.discordUserId,
          roleIds: [...guildMember.roleIds],
        })),
      removeDiscordGuildMemberRole: async (_ctx: unknown, options: { roleId: string; userId: string }) => {
        const failure = mutationFailures.get(getMutationKey('revoke', options.userId, options.roleId))

        if (failure) {
          if (failure instanceof Error) {
            throw failure
          }

          throw toMockMutationError(failure)
        }

        const currentMember = guildMembersByDiscordUserId.get(options.userId)

        if (!currentMember) {
          throw new MockDiscordGuildMemberRoleMutationError({
            code: 'guild_member_not_found',
            discordCode: 10_007,
            message: 'Unknown Member',
            status: 404,
          })
        }

        guildMembersByDiscordUserId.set(options.userId, {
          discordUserId: options.userId,
          roleIds: currentMember.roleIds.filter((roleId) => roleId !== options.roleId),
        })
        await mutationObserver?.({
          action: 'revoke',
          roleId: options.roleId,
          userId: options.userId,
        })
      },
    }
  })

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  assetSchema = await import('@tokengator/db/schema/asset')
  authSchema = await import('@tokengator/db/schema/auth')
  automationSchema = await import('@tokengator/db/schema/automation')
  communityRoleSchema = await import('@tokengator/db/schema/community-role')
  ;({
    getCommunityRoleSyncStatus,
    listCommunityDiscordSyncRuns,
    listOrganizationsDueForScheduledCommunityDiscordSync,
    runScheduledCommunityRoleDiscordSync,
  } = await import('../src/features/community-role-sync'))
  ;({ adminCommunityRoleRouter } =
    await import('../src/features/admin-community-role/feature/admin-community-role-router'))
}, 15_000)

beforeEach(async () => {
  resetDiscordMockState()

  await database.delete(authSchema.account).where(sql`1 = 1`)
  await database.delete(automationSchema.automationLock).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityDiscordConnection).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityManagedMember).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRoleCondition).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRole).where(sql`1 = 1`)
  await database.delete(authSchema.team).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(assetSchema.asset).where(sql`1 = 1`)
  await database.delete(assetSchema.assetGroup).where(sql`1 = 1`)
  await database.delete(authSchema.solanaWallet).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('admin community role Discord sync', () => {
  test('returns failed when scheduled Discord preflight queries throw', async () => {
    const originalSelect = database.select.bind(database)

    try {
      Object.assign(database, {
        select() {
          throw new Error('Discord preflight failed.')
        },
      })

      await expect(
        runScheduledCommunityRoleDiscordSync({
          organizationId: 'org-discord-preflight-failure',
        }),
      ).resolves.toEqual({
        errorMessage: 'Discord preflight failed.',
        organizationId: 'org-discord-preflight-failure',
        status: 'failed',
      })
    } finally {
      Object.assign(database, {
        select: originalSelect,
      })
    }
  })

  test('releases the shared sync lock when the Discord run insert fails', async () => {
    const organizationId = 'org-discord-lock-release'

    await insertOrganization({
      id: organizationId,
      name: 'Discord Lock Release Org',
      slug: 'discord-lock-release-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertTeam({
      id: 'team-discord-lock-release',
      name: 'Discord Lock Release Team',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-lock-release',
      id: 'role-discord-lock-release',
      name: 'Discord Lock Release Role',
      organizationId,
      slug: 'discord-lock-release-role',
      teamId: 'team-discord-lock-release',
    })

    await expect(
      runScheduledCommunityRoleDiscordSync({
        database: createInsertFailureDatabase(communityRoleSchema.communityDiscordSyncRun) as never,
        organizationId,
      }),
    ).resolves.toEqual({
      errorMessage: 'Run insert failed.',
      organizationId,
      status: 'failed',
    })

    expect(await database.select().from(automationSchema.automationLock)).toHaveLength(0)
  })

  test('uses the injected database for scheduled Discord preflight reads', async () => {
    await expect(
      runScheduledCommunityRoleDiscordSync({
        database: createSelectFailureDatabase('Injected Discord preflight failed.') as never,
        organizationId: 'org-injected-discord-preflight-failure',
      }),
    ).resolves.toEqual({
      errorMessage: 'Injected Discord preflight failed.',
      organizationId: 'org-injected-discord-preflight-failure',
      status: 'failed',
    })
  })

  test('rejects missing organizations and missing Discord connections', async () => {
    await expect(
      adminCommunityRoleRouter.previewDiscordRoleSync.callable(createAdminCallContext())({
        organizationId: 'missing-org',
      }),
    ).rejects.toThrow('Organization not found.')

    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })

    await expect(
      adminCommunityRoleRouter.applyDiscordRoleSync.callable(createAdminCallContext())({
        organizationId,
      }),
    ).rejects.toThrow('Connect a Discord server for this community before syncing Discord roles.')
  })

  test('skips guild member lookups when Discord diagnostics are already blocking', async () => {
    const organizationId = 'org-blocking-diagnostics'
    const groupId = 'asset-group'

    inspectionChecks = ['bot_token_missing']
    inspectionStatus = 'needs_attention'
    guildRoles = []

    await insertOrganization({
      id: organizationId,
      name: 'Blocking Diagnostics Org',
      slug: 'blocking-diagnostics-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-address',
      id: groupId,
      label: 'Collection',
      type: 'collection',
    })
    await insertTeam({
      id: 'team-vip',
      name: 'VIP',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-vip',
      id: 'role-vip',
      name: 'VIP',
      organizationId,
      slug: 'vip',
      teamId: 'team-vip',
    })
    await insertCommunityRoleCondition({
      assetGroupId: groupId,
      communityRoleId: 'role-vip',
      minimumAmount: '1',
    })
    await insertUser({
      email: 'vip@example.com',
      id: 'user-vip',
      name: 'VIP User',
      username: 'vip',
    })
    await insertSolanaWallet({
      address: 'vip-wallet',
      userId: 'user-vip',
    })
    await insertAsset({
      address: 'vip-asset',
      amount: '1',
      assetGroupId: groupId,
      owner: 'vip-wallet',
      resolverKind: 'helius-collection-assets',
    })
    await insertAccount({
      accountId: 'discord-vip',
      userId: 'user-vip',
    })

    memberLookupFailures.set('discord-vip', new Error('member lookup should be skipped'))

    const preview = await adminCommunityRoleRouter.previewDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!preview) {
      throw new Error('Expected Discord preview result.')
    }

    expect(preview.connection.status).toBe('needs_attention')
    expect(preview.users).toHaveLength(1)
    expect(preview.users[0]?.outcomes.map((outcome) => outcome.status)).toEqual(['mapping_not_assignable'])
  })

  test('returns a bad request when Discord member lookups are forbidden', async () => {
    const organizationId = 'org-member-lookup-forbidden'
    const groupId = 'asset-group'

    await insertOrganization({
      id: organizationId,
      name: 'Forbidden Lookup Org',
      slug: 'forbidden-lookup-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-address',
      id: groupId,
      label: 'Collection',
      type: 'collection',
    })
    await insertTeam({
      id: 'team-vip',
      name: 'VIP',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-vip',
      id: 'role-vip',
      name: 'VIP',
      organizationId,
      slug: 'vip',
      teamId: 'team-vip',
    })
    await insertCommunityRoleCondition({
      assetGroupId: groupId,
      communityRoleId: 'role-vip',
      minimumAmount: '1',
    })
    await insertUser({
      email: 'vip@example.com',
      id: 'user-vip',
      name: 'VIP User',
      username: 'vip',
    })
    await insertSolanaWallet({
      address: 'vip-wallet',
      userId: 'user-vip',
    })
    await insertAsset({
      address: 'vip-asset',
      amount: '1',
      assetGroupId: groupId,
      owner: 'vip-wallet',
      resolverKind: 'helius-collection-assets',
    })
    await insertAccount({
      accountId: 'discord-vip',
      userId: 'user-vip',
    })

    memberLookupFailures.set('discord-vip', {
      code: 50_001,
      message: 'Missing Access',
      status: 403,
    })

    await expect(
      adminCommunityRoleRouter.previewDiscordRoleSync.callable(createAdminCallContext())({
        organizationId,
      }),
    ).rejects.toThrow('TokenGator could not load Discord member state for this server: Missing Access.')
  })

  test('skips Discord lookups for linked users with no wallet or community state', async () => {
    const organizationId = 'org-relevant-lookups'
    const groupId = 'asset-group'

    guildRoles = [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-vip',
        isDefault: false,
        managed: false,
        name: 'VIP',
        position: 5,
      },
    ]

    await insertOrganization({
      id: organizationId,
      name: 'Relevant Lookup Org',
      slug: 'relevant-lookup-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-address',
      id: groupId,
      label: 'Collection',
      type: 'collection',
    })
    await insertTeam({
      id: 'team-vip',
      name: 'VIP',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-vip',
      id: 'role-vip',
      name: 'VIP',
      organizationId,
      slug: 'vip',
      teamId: 'team-vip',
    })
    await insertCommunityRoleCondition({
      assetGroupId: groupId,
      communityRoleId: 'role-vip',
      minimumAmount: '1',
    })
    await insertUser({
      email: 'vip@example.com',
      id: 'user-vip',
      name: 'VIP User',
      username: 'vip',
    })
    await insertSolanaWallet({
      address: 'vip-wallet',
      userId: 'user-vip',
    })
    await insertAsset({
      address: 'vip-asset',
      amount: '1',
      assetGroupId: groupId,
      owner: 'vip-wallet',
      resolverKind: 'helius-collection-assets',
    })
    await insertAccount({
      accountId: 'discord-vip',
      userId: 'user-vip',
    })
    await insertUser({
      email: 'unrelated@example.com',
      id: 'user-unrelated',
      name: 'Unrelated User',
      username: 'unrelated',
    })
    await insertSolanaWallet({
      address: 'unrelated-wallet',
      userId: 'user-unrelated',
    })
    await insertAccount({
      accountId: 'discord-unrelated',
      userId: 'user-unrelated',
    })

    guildMembersByDiscordUserId = new Map([
      [
        'discord-vip',
        {
          discordUserId: 'discord-vip',
          roleIds: [],
        },
      ],
    ])

    memberLookupFailures.set('discord-unrelated', {
      code: 50_001,
      message: 'Missing Access',
      status: 403,
    })

    const preview = await adminCommunityRoleRouter.previewDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!preview) {
      throw new Error('Expected Discord preview result.')
    }

    expect(preview.summary.counts.will_grant).toBe(1)
    expect(preview.users.map((currentUser) => currentUser.userId)).toEqual(['user-vip'])
  })

  test('previews Discord reconcile outcomes across grants, revokes, stale mappings, and missing links', async () => {
    const organizationId = 'org-preview'

    await insertOrganization({
      id: organizationId,
      name: 'Preview Org',
      slug: 'preview-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })

    const roles = [
      [
        'role-already-correct',
        'Already Correct',
        'already-correct',
        'team-already-correct',
        'discord-role-already-correct',
        true,
        'group-already-correct',
      ],
      ['role-grant', 'Grant', 'grant', 'team-grant', 'discord-role-grant', true, 'group-grant'],
      [
        'role-link-missing',
        'Link Missing',
        'link-missing',
        'team-link-missing',
        'discord-role-link-missing',
        true,
        'group-link-missing',
      ],
      [
        'role-mapping-missing',
        'Mapping Missing',
        'mapping-missing',
        'team-mapping-missing',
        null,
        true,
        'group-mapping-missing',
      ],
      [
        'role-mapping-not-assignable',
        'Mapping Not Assignable',
        'mapping-not-assignable',
        'team-mapping-not-assignable',
        'discord-role-mapping-not-assignable',
        true,
        'group-mapping-not-assignable',
      ],
      [
        'role-not-in-guild',
        'Not In Guild',
        'not-in-guild',
        'team-not-in-guild',
        'discord-role-not-in-guild',
        true,
        'group-not-in-guild',
      ],
      [
        'role-role-missing',
        'Role Missing',
        'role-missing',
        'team-role-missing',
        'discord-role-role-missing',
        true,
        'group-role-missing',
      ],
      [
        'role-revoke-disabled',
        'Revoke Disabled',
        'revoke-disabled',
        'team-revoke-disabled',
        'discord-role-revoke-disabled',
        false,
        'group-revoke-disabled',
      ],
    ] as const
    const assetGroupIdByRoleId = new Map(roles.map((currentRole) => [currentRole[0], currentRole[6]] as const))

    guildRoles = [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-already-correct',
        isDefault: false,
        managed: false,
        name: 'Already Correct',
        position: 5,
      },
      {
        assignable: true,
        checks: [],
        id: 'discord-role-grant',
        isDefault: false,
        managed: false,
        name: 'Grant',
        position: 5,
      },
      {
        assignable: true,
        checks: [],
        id: 'discord-role-link-missing',
        isDefault: false,
        managed: false,
        name: 'Link Missing',
        position: 5,
      },
      {
        assignable: false,
        checks: ['discord_role_hierarchy_blocked'],
        id: 'discord-role-mapping-not-assignable',
        isDefault: false,
        managed: false,
        name: 'Mapping Not Assignable',
        position: 9,
      },
      {
        assignable: true,
        checks: [],
        id: 'discord-role-not-in-guild',
        isDefault: false,
        managed: false,
        name: 'Not In Guild',
        position: 5,
      },
      {
        assignable: true,
        checks: [],
        id: 'discord-role-revoke-disabled',
        isDefault: false,
        managed: false,
        name: 'Revoke Disabled',
        position: 5,
      },
    ]

    const users = [
      ['user-already-correct', 'alreadycorrect', 'alreadycorrect@example.com', 'Already Correct'],
      ['user-grant', 'grantuser', 'grant@example.com', 'Grant User'],
      ['user-link-missing', 'nolink', 'nolink@example.com', 'No Link'],
      ['user-mapping-missing', 'mappingmissing', 'mappingmissing@example.com', 'Mapping Missing'],
      ['user-mapping-not-assignable', 'notassignable', 'notassignable@example.com', 'Not Assignable'],
      ['user-not-in-guild', 'notinguild', 'notinguild@example.com', 'Not In Guild'],
      ['user-revoke-disabled', 'revokedisabled', 'revokedisabled@example.com', 'Revoke Disabled'],
      ['user-role-missing', 'rolemissing', 'rolemissing@example.com', 'Role Missing'],
    ] as const

    for (const currentUser of users) {
      await insertUser({
        email: currentUser[2],
        id: currentUser[0],
        name: currentUser[3],
        username: currentUser[1],
      })
      await insertSolanaWallet({
        address: `${currentUser[0]}-wallet`,
        userId: currentUser[0],
      })
    }

    await insertSolanaWallet({
      address: 'user-grant-wallet-2',
      userId: 'user-grant',
    })

    for (const currentRole of roles) {
      await insertAssetGroup({
        address: `${currentRole[6]}-address`,
        id: currentRole[6],
        label: currentRole[1],
        type: 'collection',
      })
      await insertTeam({
        id: currentRole[3],
        name: currentRole[1],
        organizationId,
      })
      await insertCommunityRole({
        discordRoleId: currentRole[4],
        enabled: currentRole[5],
        id: currentRole[0],
        name: currentRole[1],
        organizationId,
        slug: currentRole[2],
        teamId: currentRole[3],
      })
      await insertCommunityRoleCondition({
        assetGroupId: currentRole[6],
        communityRoleId: currentRole[0],
        minimumAmount: '1',
      })
    }

    const qualifyingUsersByRoleId = new Map<(typeof roles)[number][0], string[]>([
      ['role-already-correct', ['user-already-correct']],
      ['role-grant', ['user-grant']],
      ['role-link-missing', ['user-link-missing']],
      ['role-mapping-missing', ['user-mapping-missing']],
      ['role-mapping-not-assignable', ['user-mapping-not-assignable']],
      ['role-not-in-guild', ['user-not-in-guild']],
      ['role-role-missing', ['user-role-missing']],
    ])

    for (const [roleId, roleUserIds] of qualifyingUsersByRoleId) {
      for (const userId of roleUserIds) {
        await insertAsset({
          address: `${roleId}-${userId}`,
          amount: '1',
          assetGroupId: assetGroupIdByRoleId.get(roleId) ?? 'missing-group',
          owner: `${userId}-wallet`,
          resolverKind: 'helius-collection-assets',
        })
      }
    }

    await insertAsset({
      address: 'grant-bonus',
      amount: '1',
      assetGroupId: assetGroupIdByRoleId.get('role-grant') ?? 'missing-group',
      owner: 'user-grant-wallet-2',
      resolverKind: 'helius-collection-assets',
    })

    await insertAccount({
      accountId: 'discord-already-correct',
      userId: 'user-already-correct',
    })
    await insertAccount({
      accountId: 'discord-grant',
      userId: 'user-grant',
    })
    await insertAccount({
      accountId: 'discord-not-in-guild',
      userId: 'user-not-in-guild',
    })
    await insertAccount({
      accountId: 'discord-revoke-disabled',
      userId: 'user-revoke-disabled',
    })
    await insertAccount({
      accountId: 'discord-role-missing',
      userId: 'user-role-missing',
    })
    await insertAccount({
      accountId: 'discord-not-assignable',
      userId: 'user-mapping-not-assignable',
    })
    await insertCommunityManagedMember({
      organizationId,
      userId: 'user-revoke-disabled',
    })

    guildMembersByDiscordUserId = new Map([
      [
        'discord-already-correct',
        {
          discordUserId: 'discord-already-correct',
          roleIds: ['discord-role-already-correct'],
        },
      ],
      [
        'discord-grant',
        {
          discordUserId: 'discord-grant',
          roleIds: [],
        },
      ],
      [
        'discord-revoke-disabled',
        {
          discordUserId: 'discord-revoke-disabled',
          roleIds: ['discord-role-revoke-disabled'],
        },
      ],
      [
        'discord-role-missing',
        {
          discordUserId: 'discord-role-missing',
          roleIds: [],
        },
      ],
      [
        'discord-not-assignable',
        {
          discordUserId: 'discord-not-assignable',
          roleIds: [],
        },
      ],
    ])

    const preview = await adminCommunityRoleRouter.previewDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!preview) {
      throw new Error('Expected Discord preview result.')
    }

    expect(preview.summary.counts).toEqual({
      already_correct: 1,
      discord_role_missing: 1,
      linked_but_not_in_guild: 1,
      mapping_missing: 1,
      mapping_not_assignable: 1,
      no_discord_account_linked: 1,
      will_grant: 1,
      will_revoke: 1,
    })
    expect(preview.summary.usersChangedCount).toBe(2)
    expect(
      Object.fromEntries(
        preview.users.map((currentUser) => [currentUser.userId, currentUser.outcomes.map((outcome) => outcome.status)]),
      ),
    ).toEqual({
      'user-already-correct': ['already_correct'],
      'user-grant': ['will_grant'],
      'user-link-missing': ['no_discord_account_linked'],
      'user-mapping-missing': ['mapping_missing'],
      'user-mapping-not-assignable': ['mapping_not_assignable'],
      'user-not-in-guild': ['linked_but_not_in_guild'],
      'user-revoke-disabled': ['will_revoke'],
      'user-role-missing': ['discord_role_missing'],
    })
    expect(
      Object.fromEntries(
        preview.roles.map((role) => [
          role.communityRoleId,
          {
            counts: role.counts,
            mappingStatus: role.mappingStatus,
            qualifiedUserCount: role.qualifiedUserCount,
          },
        ]),
      ),
    ).toMatchObject({
      'role-grant': {
        counts: {
          will_grant: 1,
        },
        mappingStatus: 'ready',
        qualifiedUserCount: 1,
      },
      'role-mapping-missing': {
        counts: {
          mapping_missing: 1,
        },
        mappingStatus: 'mapping_missing',
        qualifiedUserCount: 1,
      },
      'role-mapping-not-assignable': {
        counts: {
          mapping_not_assignable: 1,
        },
        mappingStatus: 'mapping_not_assignable',
        qualifiedUserCount: 1,
      },
      'role-revoke-disabled': {
        counts: {
          will_revoke: 1,
        },
        mappingStatus: 'ready',
        qualifiedUserCount: 0,
      },
      'role-role-missing': {
        counts: {
          discord_role_missing: 1,
        },
        mappingStatus: 'discord_role_missing',
        qualifiedUserCount: 1,
      },
    })
  })

  test('applies Discord grants and revokes idempotently on repeat runs', async () => {
    const organizationId = 'org-apply'
    const groupId = 'asset-group'

    await insertOrganization({
      id: organizationId,
      name: 'Apply Org',
      slug: 'apply-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-address',
      id: groupId,
      label: 'Collection',
      type: 'collection',
    })

    const roleDefs = [
      ['role-grant', 'Grant', 'grant', 'team-grant', 'discord-role-grant', true],
      ['role-revoke', 'Revoke', 'revoke', 'team-revoke', 'discord-role-revoke', false],
    ] as const

    for (const roleDef of roleDefs) {
      await insertTeam({
        id: roleDef[3],
        name: roleDef[1],
        organizationId,
      })
      await insertCommunityRole({
        discordRoleId: roleDef[4],
        enabled: roleDef[5],
        id: roleDef[0],
        name: roleDef[1],
        organizationId,
        slug: roleDef[2],
        teamId: roleDef[3],
      })
      await insertCommunityRoleCondition({
        assetGroupId: groupId,
        communityRoleId: roleDef[0],
        minimumAmount: '1',
      })
    }

    guildRoles = [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-grant',
        isDefault: false,
        managed: false,
        name: 'Grant',
        position: 5,
      },
      {
        assignable: true,
        checks: [],
        id: 'discord-role-revoke',
        isDefault: false,
        managed: false,
        name: 'Revoke',
        position: 5,
      },
    ]

    await insertUser({
      email: 'grant@example.com',
      id: 'user-grant',
      name: 'Grant',
      username: 'grant',
    })
    await insertUser({
      email: 'revoke@example.com',
      id: 'user-revoke',
      name: 'Revoke',
      username: 'revoke',
    })
    await insertSolanaWallet({
      address: 'grant-wallet',
      userId: 'user-grant',
    })
    await insertSolanaWallet({
      address: 'revoke-wallet',
      userId: 'user-revoke',
    })
    await insertAsset({
      address: 'grant-asset',
      amount: '1',
      assetGroupId: groupId,
      owner: 'grant-wallet',
      resolverKind: 'helius-collection-assets',
    })
    await insertAccount({
      accountId: 'discord-grant',
      userId: 'user-grant',
    })
    await insertAccount({
      accountId: 'discord-revoke',
      userId: 'user-revoke',
    })
    await insertCommunityManagedMember({
      organizationId,
      userId: 'user-revoke',
    })

    guildMembersByDiscordUserId = new Map([
      [
        'discord-grant',
        {
          discordUserId: 'discord-grant',
          roleIds: [],
        },
      ],
      [
        'discord-revoke',
        {
          discordUserId: 'discord-revoke',
          roleIds: ['discord-role-revoke'],
        },
      ],
    ])

    const firstApply = await adminCommunityRoleRouter.applyDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!firstApply) {
      throw new Error('Expected Discord apply result.')
    }

    expect(firstApply.summary.appliedGrantCount).toBe(1)
    expect(firstApply.summary.appliedRevokeCount).toBe(1)
    expect(firstApply.summary.failedCount).toBe(0)
    expect(guildMembersByDiscordUserId.get('discord-grant')?.roleIds).toEqual(['discord-role-grant'])
    expect(guildMembersByDiscordUserId.get('discord-revoke')?.roleIds).toEqual([])

    const secondApply = await adminCommunityRoleRouter.applyDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!secondApply) {
      throw new Error('Expected second Discord apply result.')
    }

    expect(secondApply.summary.appliedGrantCount).toBe(0)
    expect(secondApply.summary.appliedRevokeCount).toBe(0)
    expect(secondApply.summary.failedCount).toBe(0)
    expect(secondApply.summary.counts.will_grant).toBe(0)
    expect(secondApply.summary.counts.will_revoke).toBe(0)
    expect(secondApply.summary.counts.already_correct).toBe(1)
    await expect(
      listCommunityDiscordSyncRuns({
        limit: 5,
        organizationId,
      }),
    ).resolves.toMatchObject([
      {
        appliedGrantCount: 0,
        appliedRevokeCount: 0,
        failedCount: 0,
        status: 'succeeded',
        triggerSource: 'manual',
      },
      {
        appliedGrantCount: 1,
        appliedRevokeCount: 1,
        failedCount: 0,
        status: 'succeeded',
        triggerSource: 'manual',
      },
    ])
    await expect(
      getCommunityRoleSyncStatus({
        organizationId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        discordStatus: expect.objectContaining({
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

  test('fails with lock_lost during Discord apply and preserves partial progress', async () => {
    const now = new Date('2026-04-02T12:00:00.000Z')
    const organizationId = 'org-lock-loss'
    const groupId = 'asset-group-lock-loss'
    let leaseLost = false

    await insertOrganization({
      id: organizationId,
      name: 'Lock Loss Org',
      slug: 'lock-loss-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-lock-loss',
      id: groupId,
      label: 'Collection Lock Loss',
      type: 'collection',
    })
    await insertTeam({
      id: 'team-lock-loss',
      name: 'Lock Loss Team',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-lock-loss',
      enabled: true,
      id: 'role-lock-loss',
      name: 'Lock Loss Role',
      organizationId,
      slug: 'lock-loss-role',
      teamId: 'team-lock-loss',
    })
    await insertCommunityRoleCondition({
      assetGroupId: groupId,
      communityRoleId: 'role-lock-loss',
      minimumAmount: '1',
    })
    await database.insert(assetSchema.assetGroupIndexRun).values({
      assetGroupId: groupId,
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

    guildRoles = [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-lock-loss',
        isDefault: false,
        managed: false,
        name: 'Lock Loss',
        position: 5,
      },
    ]

    for (const currentUser of [
      ['alice@example.com', 'user-alice', 'Alice', 'alice', 'wallet-alice', 'asset-alice', 'discord-alice'],
      ['bob@example.com', 'user-bob', 'Bob', 'bob', 'wallet-bob', 'asset-bob', 'discord-bob'],
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
        assetGroupId: groupId,
        owner: currentUser[4],
        resolverKind: 'helius-collection-assets',
      })
      await insertAccount({
        accountId: currentUser[6],
        userId: currentUser[1],
      })
    }

    guildMembersByDiscordUserId = new Map([
      [
        'discord-alice',
        {
          discordUserId: 'discord-alice',
          roleIds: [],
        },
      ],
      [
        'discord-bob',
        {
          discordUserId: 'discord-bob',
          roleIds: [],
        },
      ],
    ])
    mutationObserver = ({ action }) => {
      if (leaseLost || action !== 'grant') {
        return
      }

      leaseLost = true
    }
    const leaseLossDatabase = new Proxy(database, {
      get(target, property, receiver) {
        if (property === 'select') {
          return (...args: Parameters<DatabaseClient['select']>) => {
            const selectBuilder = target.select(...args)

            return new Proxy(selectBuilder, {
              get(currentBuilder, currentProperty, currentReceiver) {
                if (currentProperty === 'from') {
                  return (table: unknown) => {
                    if (leaseLost && table === automationSchema.automationLock) {
                      return {
                        where() {
                          return {
                            async limit() {
                              return []
                            },
                          }
                        },
                      }
                    }

                    return currentBuilder.from(table as never)
                  }
                }

                const value = Reflect.get(currentBuilder, currentProperty, currentReceiver)

                return typeof value === 'function' ? value.bind(currentBuilder) : value
              },
            })
          }
        }

        const value = Reflect.get(target, property, receiver)

        return typeof value === 'function' ? value.bind(target) : value
      },
    })

    await expect(
      runScheduledCommunityRoleDiscordSync({
        database: leaseLossDatabase as never,
        now: () => now,
        organizationId,
      }),
    ).resolves.toMatchObject({
      organizationId,
      status: 'failed',
    })

    expect(leaseLost).toBe(true)
    expect(
      ['discord-alice', 'discord-bob'].filter((discordUserId) =>
        guildMembersByDiscordUserId.get(discordUserId)?.roleIds.includes('discord-role-lock-loss'),
      ),
    ).toHaveLength(1)
    await expect(
      listCommunityDiscordSyncRuns({
        limit: 5,
        organizationId,
      }),
    ).resolves.toMatchObject([
      {
        appliedGrantCount: 1,
        appliedRevokeCount: 0,
        errorPayload: {
          reason: 'lock_lost',
        },
        failedCount: 0,
        outcomeCounts: {
          already_correct: 0,
          discord_role_missing: 0,
          linked_but_not_in_guild: 0,
          mapping_missing: 0,
          mapping_not_assignable: 0,
          no_discord_account_linked: 0,
          will_grant: 1,
          will_revoke: 0,
        },
        status: 'failed',
        triggerSource: 'scheduled',
        usersChangedCount: 1,
      },
    ])
  })

  test('applies canonical Discord account selection when duplicate Discord identities exist unexpectedly', async () => {
    const organizationId = 'org-canonical'
    const groupId = 'asset-group'

    await insertOrganization({
      id: organizationId,
      name: 'Canonical Org',
      slug: 'canonical-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-address',
      id: groupId,
      label: 'Collection',
      type: 'collection',
    })
    await insertTeam({
      id: 'team-vip',
      name: 'VIP',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-vip',
      id: 'role-vip',
      name: 'VIP',
      organizationId,
      slug: 'vip',
      teamId: 'team-vip',
    })
    await insertCommunityRoleCondition({
      assetGroupId: groupId,
      communityRoleId: 'role-vip',
      minimumAmount: '1',
    })
    await insertUser({
      email: 'vip@example.com',
      id: 'user-vip',
      name: 'VIP User',
      username: 'vip',
    })
    await insertSolanaWallet({
      address: 'vip-wallet',
      userId: 'user-vip',
    })
    await insertAsset({
      address: 'vip-asset',
      amount: '1',
      assetGroupId: groupId,
      owner: 'vip-wallet',
      resolverKind: 'helius-collection-assets',
    })
    await insertAccount({
      accountId: 'discord-primary',
      createdAt: new Date('2026-04-02T12:00:00.000Z'),
      id: 'account-primary',
      userId: 'user-vip',
    })
    await insertAccount({
      accountId: 'discord-secondary',
      createdAt: new Date('2026-04-02T12:01:00.000Z'),
      id: 'account-secondary',
      userId: 'user-vip',
    })

    guildRoles = [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-vip',
        isDefault: false,
        managed: false,
        name: 'VIP',
        position: 5,
      },
    ]
    guildMembersByDiscordUserId = new Map([
      [
        'discord-secondary',
        {
          discordUserId: 'discord-secondary',
          roleIds: ['discord-role-vip'],
        },
      ],
    ])

    const preview = await adminCommunityRoleRouter.previewDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!preview) {
      throw new Error('Expected canonical Discord preview result.')
    }

    expect(preview.users).toHaveLength(1)
    expect(preview.users[0]).toMatchObject({
      discordAccountId: 'discord-primary',
      guildMemberPresent: false,
      userId: 'user-vip',
    })
    expect(preview.users[0]?.outcomes.map((outcome) => outcome.status)).toEqual(['linked_but_not_in_guild'])
  })

  test('falls back to Discord accounts when identity projection rows are missing', async () => {
    const organizationId = 'org-legacy-account-fallback'
    const groupId = 'asset-group'

    await insertOrganization({
      id: organizationId,
      name: 'Legacy Account Fallback Org',
      slug: 'legacy-account-fallback-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-address',
      id: groupId,
      label: 'Collection',
      type: 'collection',
    })
    await insertTeam({
      id: 'team-legacy-account-fallback',
      name: 'Legacy Account Fallback Team',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-legacy-account-fallback',
      id: 'role-legacy-account-fallback',
      name: 'Legacy Account Fallback',
      organizationId,
      slug: 'legacy-account-fallback',
      teamId: 'team-legacy-account-fallback',
    })
    await insertCommunityRoleCondition({
      assetGroupId: groupId,
      communityRoleId: 'role-legacy-account-fallback',
      minimumAmount: '1',
    })
    await insertUser({
      email: 'legacy@example.com',
      id: 'user-legacy-account-fallback',
      name: 'Legacy Account Fallback User',
      username: 'legacy',
    })
    await insertSolanaWallet({
      address: 'legacy-wallet',
      userId: 'user-legacy-account-fallback',
    })
    await insertAsset({
      address: 'legacy-asset',
      amount: '1',
      assetGroupId: groupId,
      owner: 'legacy-wallet',
      resolverKind: 'helius-collection-assets',
    })
    await insertAccount({
      accountId: 'discord-legacy-account-fallback',
      id: 'account-legacy-account-fallback',
      userId: 'user-legacy-account-fallback',
    })
    await database
      .delete(authSchema.identity)
      .where(
        sql`${authSchema.identity.userId} = 'user-legacy-account-fallback' and ${authSchema.identity.provider} = 'discord'`,
      )
    guildRoles = [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-legacy-account-fallback',
        isDefault: false,
        managed: false,
        name: 'Legacy Account Fallback',
        position: 5,
      },
    ]

    const preview = await adminCommunityRoleRouter.previewDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!preview) {
      throw new Error('Expected legacy account fallback preview result.')
    }

    expect(preview.users).toHaveLength(1)
    expect(preview.users[0]).toMatchObject({
      discordAccountId: 'discord-legacy-account-fallback',
      guildMemberPresent: false,
      userId: 'user-legacy-account-fallback',
    })
    expect(preview.users[0]?.outcomes.map((outcome) => outcome.status)).toEqual(['linked_but_not_in_guild'])
  })

  test('marks missing members as skipped and generic Discord failures as discord_api_failure during apply', async () => {
    const organizationId = 'org-failures'
    const groupId = 'asset-group'

    await insertOrganization({
      id: organizationId,
      name: 'Failure Org',
      slug: 'failure-org',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertAssetGroup({
      address: 'collection-address',
      id: groupId,
      label: 'Collection',
      type: 'collection',
    })

    const roleDefs = [
      ['role-grant', 'Grant', 'grant', 'team-grant', 'discord-role-grant', true],
      ['role-revoke', 'Revoke', 'revoke', 'team-revoke', 'discord-role-revoke', false],
    ] as const

    for (const roleDef of roleDefs) {
      await insertTeam({
        id: roleDef[3],
        name: roleDef[1],
        organizationId,
      })
      await insertCommunityRole({
        discordRoleId: roleDef[4],
        enabled: roleDef[5],
        id: roleDef[0],
        name: roleDef[1],
        organizationId,
        slug: roleDef[2],
        teamId: roleDef[3],
      })
      await insertCommunityRoleCondition({
        assetGroupId: groupId,
        communityRoleId: roleDef[0],
        minimumAmount: '1',
      })
    }

    guildRoles = [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-grant',
        isDefault: false,
        managed: false,
        name: 'Grant',
        position: 5,
      },
      {
        assignable: true,
        checks: [],
        id: 'discord-role-revoke',
        isDefault: false,
        managed: false,
        name: 'Revoke',
        position: 5,
      },
    ]

    await insertUser({
      email: 'grant@example.com',
      id: 'user-grant',
      name: 'Grant',
      username: 'grant',
    })
    await insertUser({
      email: 'revoke@example.com',
      id: 'user-revoke',
      name: 'Revoke',
      username: 'revoke',
    })
    await insertSolanaWallet({
      address: 'grant-wallet',
      userId: 'user-grant',
    })
    await insertSolanaWallet({
      address: 'revoke-wallet',
      userId: 'user-revoke',
    })
    await insertAsset({
      address: 'grant-asset',
      amount: '1',
      assetGroupId: groupId,
      owner: 'grant-wallet',
      resolverKind: 'helius-collection-assets',
    })
    await insertAccount({
      accountId: 'discord-grant',
      userId: 'user-grant',
    })
    await insertAccount({
      accountId: 'discord-revoke',
      userId: 'user-revoke',
    })
    await insertCommunityManagedMember({
      organizationId,
      userId: 'user-revoke',
    })

    guildMembersByDiscordUserId = new Map([
      [
        'discord-grant',
        {
          discordUserId: 'discord-grant',
          roleIds: [],
        },
      ],
      [
        'discord-revoke',
        {
          discordUserId: 'discord-revoke',
          roleIds: ['discord-role-revoke'],
        },
      ],
    ])
    mutationFailures.set(getMutationKey('grant', 'discord-grant', 'discord-role-grant'), {
      code: 10_007,
      message: 'Unknown Member',
      status: 404,
    })
    mutationFailures.set(
      getMutationKey('revoke', 'discord-revoke', 'discord-role-revoke'),
      new Error('Discord exploded.'),
    )

    const applied = await adminCommunityRoleRouter.applyDiscordRoleSync.callable(createAdminCallContext())({
      organizationId,
    })

    if (!applied) {
      throw new Error('Expected Discord apply failure result.')
    }

    expect(applied.summary.appliedGrantCount).toBe(0)
    expect(applied.summary.appliedRevokeCount).toBe(0)
    expect(applied.summary.failedCount).toBe(1)
    expect(applied.summary.counts).toEqual({
      already_correct: 0,
      discord_role_missing: 0,
      linked_but_not_in_guild: 1,
      mapping_missing: 0,
      mapping_not_assignable: 0,
      no_discord_account_linked: 0,
      will_grant: 0,
      will_revoke: 0,
    })
    expect(Object.fromEntries(applied.roles.map((role) => [role.communityRoleId, role.counts]))).toEqual({
      'role-grant': {
        already_correct: 0,
        discord_role_missing: 0,
        linked_but_not_in_guild: 1,
        mapping_missing: 0,
        mapping_not_assignable: 0,
        no_discord_account_linked: 0,
        will_grant: 0,
        will_revoke: 0,
      },
      'role-revoke': {
        already_correct: 0,
        discord_role_missing: 0,
        linked_but_not_in_guild: 0,
        mapping_missing: 0,
        mapping_not_assignable: 0,
        no_discord_account_linked: 0,
        will_grant: 0,
        will_revoke: 0,
      },
    })
    expect(
      Object.fromEntries(
        applied.users.map((currentUser) => [
          currentUser.userId,
          currentUser.outcomes.map((outcome) => ({
            execution: outcome.execution,
            status: outcome.status,
          })),
        ]),
      ),
    ).toEqual({
      'user-grant': [
        {
          execution: 'skipped',
          status: 'linked_but_not_in_guild',
        },
      ],
      'user-revoke': [
        {
          execution: 'failed',
          status: 'discord_api_failure',
        },
      ],
    })
  })

  test('chunks large organization ID sets when selecting due scheduled Discord sync', async () => {
    const now = new Date('2026-04-02T12:00:00.000Z')
    const organizations = Array.from({ length: 901 }, (_, index) => {
      const suffix = String(index).padStart(4, '0')

      return {
        createdAt: now,
        id: `org-discord-${suffix}`,
        logo: null,
        metadata: null,
        name: `Discord Org ${suffix}`,
        slug: `discord-org-${suffix}`,
      }
    })
    const teams = organizations.map((record, index) => {
      const suffix = String(index).padStart(4, '0')

      return {
        createdAt: now,
        id: `team-discord-${suffix}`,
        name: `Discord Collectors ${suffix}`,
        organizationId: record.id,
        updatedAt: now,
      }
    })
    const roles = organizations.map((record, index) => {
      const suffix = String(index).padStart(4, '0')

      return {
        createdAt: now,
        discordRoleId: `discord-role-${suffix}`,
        enabled: true,
        id: `role-discord-${suffix}`,
        matchMode: 'any' as const,
        name: `Discord Collectors ${suffix}`,
        organizationId: record.id,
        slug: `discord-collectors-${suffix}`,
        teamId: `team-discord-${suffix}`,
        updatedAt: now,
      }
    })
    const connections = organizations.map((record) => ({
      createdAt: now,
      guildId: `guild-${record.id}`,
      guildName: null,
      id: crypto.randomUUID(),
      lastCheckedAt: null,
      organizationId: record.id,
      status: 'connected' as const,
      updatedAt: now,
    }))

    await database.insert(authSchema.organization).values(organizations)
    await database.insert(authSchema.team).values(teams)
    await database.insert(communityRoleSchema.communityRole).values(roles)
    await database.insert(communityRoleSchema.communityDiscordConnection).values(connections)

    const dueOrganizationIds = await listOrganizationsDueForScheduledCommunityDiscordSync({
      now: () => new Date('2026-04-02T12:01:00.000Z'),
    })

    expect(dueOrganizationIds).toHaveLength(901)
    expect(dueOrganizationIds[0]).toBe('org-discord-0000')
    expect(dueOrganizationIds.at(-1)).toBe('org-discord-0900')
  })
})
