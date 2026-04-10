import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AuthSchema = typeof import('@tokengator/db/schema/auth')
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type AdminCommunityRoleRouter =
  typeof import('../src/features/admin-community-role/feature/admin-community-role-router').adminCommunityRoleRouter
type InspectDiscordGuildRolesResult =
  import('@tokengator/discord/inspect-discord-guild-roles').InspectDiscordGuildRolesResult

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-api-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community-role-discord-mapping.sqlite')).toString()

let adminCommunityRoleRouter: AdminCommunityRoleRouter
let authSchema: AuthSchema
let communityRoleSchema: CommunityRoleSchema
let database: DatabaseClient
let inspectDiscordGuildRolesCallCount = 0
let inspectDiscordGuildRolesImplementation: () => Promise<InspectDiscordGuildRolesResult>

function createInspectionResult(
  input: Partial<InspectDiscordGuildRolesResult> & {
    roles?: InspectDiscordGuildRolesResult['roles']
  } = {},
): InspectDiscordGuildRolesResult {
  const checks = input.diagnostics?.checks ?? []

  return {
    diagnostics: {
      botHighestRole: input.diagnostics?.botHighestRole ?? {
        id: 'bot-role-id',
        name: 'TokenGator',
        position: 10,
      },
      checks,
      guild: input.diagnostics?.guild ?? {
        id: '123456789012345678',
        name: 'Acme Guild',
      },
      permissions: input.diagnostics?.permissions ?? {
        administrator: false,
        manageRoles: true,
      },
    },
    guildName: input.guildName ?? 'Acme Guild',
    lastCheckedAt: input.lastCheckedAt ?? new Date('2026-04-02T12:10:00.000Z'),
    roles: input.roles ?? [
      {
        assignable: true,
        checks: [],
        id: 'discord-role-collectors',
        isDefault: false,
        managed: false,
        name: 'Collectors',
        position: 5,
      },
    ],
    status: input.status ?? (checks.length === 0 ? 'connected' : 'needs_attention'),
  }
}

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

async function insertTeam(input: { id: string; name: string; organizationId: string }) {
  await database.insert(authSchema.team).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    id: input.id,
    name: input.name,
    organizationId: input.organizationId,
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
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

  inspectDiscordGuildRolesImplementation = async () => createInspectionResult()

  mock.module('@tokengator/discord/inspect-discord-guild-roles', () => ({
    inspectDiscordGuildRoles: async () => {
      inspectDiscordGuildRolesCallCount += 1

      return await inspectDiscordGuildRolesImplementation()
    },
  }))

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  authSchema = await import('@tokengator/db/schema/auth')
  communityRoleSchema = await import('@tokengator/db/schema/community-role')
  ;({ adminCommunityRoleRouter } =
    await import('../src/features/admin-community-role/feature/admin-community-role-router'))
}, 15_000)

beforeEach(async () => {
  inspectDiscordGuildRolesCallCount = 0
  inspectDiscordGuildRolesImplementation = async () => createInspectionResult()

  await database.delete(communityRoleSchema.communityDiscordConnection).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRoleCondition).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityRole).where(sql`1 = 1`)
  await database.delete(authSchema.team).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
})

describe('admin community role Discord mapping', () => {
  test('list returns stored discord role ids for community roles', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertTeam({
      id: 'team-collectors',
      name: 'Collectors',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-collectors',
      id: 'role-collectors',
      name: 'Collectors',
      organizationId,
      slug: 'collectors',
      teamId: 'team-collectors',
    })

    const list = await adminCommunityRoleRouter.list.callable(createAdminCallContext())({
      organizationId,
    })

    expect(list.communityRoles).toMatchObject([
      {
        discordRoleId: 'discord-role-collectors',
        id: 'role-collectors',
      },
    ])
  })

  test('listDiscordGuildRoles returns the live guild role catalog for the connected guild', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    inspectDiscordGuildRolesImplementation = async () =>
      createInspectionResult({
        roles: [
          {
            assignable: true,
            checks: [],
            id: 'discord-role-collectors',
            isDefault: false,
            managed: false,
            name: 'Collectors',
            position: 5,
          },
          {
            assignable: false,
            checks: ['discord_role_managed'],
            id: 'discord-role-managed',
            isDefault: false,
            managed: true,
            name: 'Discord Activities',
            position: 4,
          },
        ],
      })

    const guildRoles = await adminCommunityRoleRouter.listDiscordGuildRoles.callable(createAdminCallContext())({
      organizationId,
    })

    expect(inspectDiscordGuildRolesCallCount).toBe(1)
    expect(guildRoles).toMatchObject({
      connection: {
        diagnostics: {
          botHighestRole: {
            id: 'bot-role-id',
            name: 'TokenGator',
            position: 10,
          },
          checks: [],
        },
        guildId: '123456789012345678',
        guildName: 'Acme Guild',
        status: 'connected',
      },
      guildRoles: [
        {
          id: 'discord-role-collectors',
          name: 'Collectors',
        },
        {
          id: 'discord-role-managed',
          managed: true,
          name: 'Discord Activities',
        },
      ],
    })
  })

  test('clears an existing Discord mapping without hitting Discord', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertTeam({
      id: 'team-collectors',
      name: 'Collectors',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-collectors',
      id: 'role-collectors',
      name: 'Collectors',
      organizationId,
      slug: 'collectors',
      teamId: 'team-collectors',
    })

    const result = await adminCommunityRoleRouter.setDiscordRoleMapping.callable(createAdminCallContext())({
      communityRoleId: 'role-collectors',
      discordRoleId: null,
    })

    expect(inspectDiscordGuildRolesCallCount).toBe(0)
    expect(result).toMatchObject({
      communityRole: {
        discordRoleId: null,
        id: 'role-collectors',
      },
      mapping: {
        checks: [],
        status: 'not_mapped',
      },
    })
  })

  test('rejects duplicate, missing, and managed Discord role targets', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertTeam({
      id: 'team-collectors',
      name: 'Collectors',
      organizationId,
    })
    await insertTeam({
      id: 'team-whales',
      name: 'Whales',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-collectors',
      id: 'role-collectors',
      name: 'Collectors',
      organizationId,
      slug: 'collectors',
      teamId: 'team-collectors',
    })
    await insertCommunityRole({
      id: 'role-whales',
      name: 'Whales',
      organizationId,
      slug: 'whales',
      teamId: 'team-whales',
    })

    inspectDiscordGuildRolesImplementation = async () =>
      createInspectionResult({
        roles: [
          {
            assignable: true,
            checks: [],
            id: 'discord-role-collectors',
            isDefault: false,
            managed: false,
            name: 'Collectors',
            position: 5,
          },
          {
            assignable: false,
            checks: ['discord_role_managed'],
            id: 'discord-role-managed',
            isDefault: false,
            managed: true,
            name: 'Discord Activities',
            position: 4,
          },
        ],
      })

    await expect(
      adminCommunityRoleRouter.setDiscordRoleMapping.callable(createAdminCallContext())({
        communityRoleId: 'role-whales',
        discordRoleId: 'discord-role-collectors',
      }),
    ).rejects.toThrow('Discord role is already mapped to Collectors.')
    expect(inspectDiscordGuildRolesCallCount).toBe(0)

    await expect(
      adminCommunityRoleRouter.setDiscordRoleMapping.callable(createAdminCallContext())({
        communityRoleId: 'role-whales',
        discordRoleId: 'discord-role-missing',
      }),
    ).rejects.toThrow('Selected Discord role was not found in the connected server.')

    await expect(
      adminCommunityRoleRouter.setDiscordRoleMapping.callable(createAdminCallContext())({
        communityRoleId: 'role-whales',
        discordRoleId: 'discord-role-managed',
      }),
    ).rejects.toThrow('Managed Discord roles cannot be mapped.')
  })

  test('saves a mapping with needs_attention when permissions or hierarchy are not ready', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertTeam({
      id: 'team-whales',
      name: 'Whales',
      organizationId,
    })
    await insertCommunityRole({
      id: 'role-whales',
      name: 'Whales',
      organizationId,
      slug: 'whales',
      teamId: 'team-whales',
    })
    inspectDiscordGuildRolesImplementation = async () =>
      createInspectionResult({
        diagnostics: {
          botHighestRole: {
            id: 'bot-role-id',
            name: 'TokenGator',
            position: 5,
          },
          checks: ['manage_roles_missing'],
          guild: {
            id: '123456789012345678',
            name: 'Acme Guild',
          },
          permissions: {
            administrator: false,
            manageRoles: false,
          },
        },
        roles: [
          {
            assignable: false,
            checks: ['discord_role_hierarchy_blocked'],
            id: 'discord-role-whales',
            isDefault: false,
            managed: false,
            name: 'Whales',
            position: 8,
          },
        ],
        status: 'needs_attention',
      })

    const result = await adminCommunityRoleRouter.setDiscordRoleMapping.callable(createAdminCallContext())({
      communityRoleId: 'role-whales',
      discordRoleId: 'discord-role-whales',
    })

    expect(result).toMatchObject({
      communityRole: {
        discordRoleId: 'discord-role-whales',
        id: 'role-whales',
      },
      mapping: {
        checks: ['discord_role_hierarchy_blocked', 'manage_roles_missing'],
        status: 'needs_attention',
      },
    })
  })

  test('surfaces stale mappings by keeping the stored discord role id while the live catalog no longer contains it', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await insertTeam({
      id: 'team-collectors',
      name: 'Collectors',
      organizationId,
    })
    await insertCommunityRole({
      discordRoleId: 'discord-role-deleted',
      id: 'role-collectors',
      name: 'Collectors',
      organizationId,
      slug: 'collectors',
      teamId: 'team-collectors',
    })
    inspectDiscordGuildRolesImplementation = async () =>
      createInspectionResult({
        roles: [
          {
            assignable: true,
            checks: [],
            id: 'discord-role-current',
            isDefault: false,
            managed: false,
            name: 'Collectors',
            position: 5,
          },
        ],
      })

    const [list, guildRoles] = await Promise.all([
      adminCommunityRoleRouter.list.callable(createAdminCallContext())({
        organizationId,
      }),
      adminCommunityRoleRouter.listDiscordGuildRoles.callable(createAdminCallContext())({
        organizationId,
      }),
    ])

    expect(list.communityRoles).toMatchObject([
      {
        discordRoleId: 'discord-role-deleted',
        id: 'role-collectors',
      },
    ])
    expect(guildRoles.guildRoles.find((guildRole) => guildRole.id === 'discord-role-deleted')).toBeUndefined()
  })
})
