import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AuthSchema = typeof import('@tokengator/db/schema/auth')
type AdminOrganizationRouter =
  typeof import('../src/features/admin-organization/feature/admin-organization-router').adminOrganizationRouter
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type DeleteCommunityDiscordConnectionByOrganizationId =
  (typeof import('../src/features/community-discord-connection'))['deleteCommunityDiscordConnectionByOrganizationId']
type GetCommunityDiscordConnectionByOrganizationId =
  (typeof import('../src/features/community-discord-connection'))['getCommunityDiscordConnectionByOrganizationId']
type InspectDiscordGuildConnectionResult =
  import('@tokengator/discord/inspect-discord-guild-connection').InspectDiscordGuildConnectionResult
type RefreshCommunityDiscordConnection =
  (typeof import('../src/features/community-discord-connection'))['refreshCommunityDiscordConnection']
type UpsertCommunityDiscordConnection =
  (typeof import('../src/features/community-discord-connection'))['upsertCommunityDiscordConnection']

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-api-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community-discord-connection.sqlite')).toString()

let authSchema: AuthSchema
let adminOrganizationRouter: AdminOrganizationRouter
let communityRoleSchema: CommunityRoleSchema
let database: DatabaseClient
let deleteCommunityDiscordConnectionByOrganizationId: DeleteCommunityDiscordConnectionByOrganizationId
let getCommunityDiscordConnectionByOrganizationId: GetCommunityDiscordConnectionByOrganizationId
let refreshCommunityDiscordConnection: RefreshCommunityDiscordConnection
let upsertCommunityDiscordConnection: UpsertCommunityDiscordConnection

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

function createConnectedResult(guildId: string, lastCheckedAt: Date): InspectDiscordGuildConnectionResult {
  return {
    diagnostics: {
      checks: [],
      commands: {
        errorMessage: null,
        registered: true,
      },
      guild: {
        id: guildId,
        name: 'Acme Guild',
      },
      permissions: {
        administrator: false,
        manageRoles: true,
      },
    },
    guildName: 'Acme Guild',
    lastCheckedAt,
    status: 'connected' as const,
  }
}

function createNeedsAttentionResult(guildId: string, lastCheckedAt: Date): InspectDiscordGuildConnectionResult {
  return {
    diagnostics: {
      checks: ['bot_token_missing'],
      commands: {
        errorMessage: null,
        registered: false,
      },
      guild: {
        id: guildId,
        name: null,
      },
      permissions: {
        administrator: false,
        manageRoles: false,
      },
    },
    guildName: null,
    lastCheckedAt,
    status: 'needs_attention' as const,
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

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  ;({ adminOrganizationRouter } = await import('../src/features/admin-organization/feature/admin-organization-router'))
  authSchema = await import('@tokengator/db/schema/auth')
  communityRoleSchema = await import('@tokengator/db/schema/community-role')
  ;({
    deleteCommunityDiscordConnectionByOrganizationId,
    getCommunityDiscordConnectionByOrganizationId,
    refreshCommunityDiscordConnection,
    upsertCommunityDiscordConnection,
  } = await import('../src/features/community-discord-connection'))
}, 30_000)

beforeEach(async () => {
  await database.delete(communityRoleSchema.communityDiscordAnnouncement).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityDiscordConnection).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
})

describe('admin community Discord connection', () => {
  test('upserts a connected guild and returns the derived invite URL', async () => {
    const lastCheckedAt = new Date('2026-04-02T12:05:00.000Z')
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })

    const connection = await upsertCommunityDiscordConnection(
      {
        guildId: '123456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async () => createConnectedResult('123456789012345678', lastCheckedAt),
      },
    )

    expect(connection).toMatchObject({
      diagnostics: {
        checks: [],
        commands: {
          errorMessage: null,
          registered: true,
        },
        guild: {
          id: '123456789012345678',
          name: 'Acme Guild',
        },
        permissions: {
          administrator: false,
          manageRoles: true,
        },
      },
      guildId: '123456789012345678',
      guildName: 'Acme Guild',
      inviteUrl:
        'https://discord.com/oauth2/authorize?client_id=discord-client-id&disable_guild_select=true&guild_id=123456789012345678&permissions=268454912&scope=applications.commands+bot',
      lastCheckedAt,
      roleSyncEnabled: true,
      status: 'connected',
    })
  })

  test('persists the guild when capability checks return needs_attention', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })

    const connection = await upsertCommunityDiscordConnection(
      {
        guildId: '123456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async () =>
          createNeedsAttentionResult('123456789012345678', new Date('2026-04-02T12:10:00.000Z')),
      },
    )
    const storedConnection = await database
      .select({
        guildId: communityRoleSchema.communityDiscordConnection.guildId,
        roleSyncEnabled: communityRoleSchema.communityDiscordConnection.roleSyncEnabled,
        status: communityRoleSchema.communityDiscordConnection.status,
      })
      .from(communityRoleSchema.communityDiscordConnection)
      .where(eq(communityRoleSchema.communityDiscordConnection.organizationId, organizationId))
      .limit(1)

    expect(connection.status).toBe('needs_attention')
    expect(connection.diagnostics?.checks).toEqual(['bot_token_missing'])
    expect(storedConnection).toEqual([
      {
        guildId: '123456789012345678',
        roleSyncEnabled: true,
        status: 'needs_attention',
      },
    ])
  })

  test('rejects a guild that is already connected to another community', async () => {
    const firstOrganizationId = crypto.randomUUID()
    const secondOrganizationId = crypto.randomUUID()

    await insertOrganization({
      id: firstOrganizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertOrganization({
      id: secondOrganizationId,
      name: 'Beacon',
      slug: 'beacon',
    })
    await upsertCommunityDiscordConnection(
      {
        guildId: '123456789012345678',
        organizationId: firstOrganizationId,
      },
      {
        checkGuildConnection: async () =>
          createConnectedResult('123456789012345678', new Date('2026-04-02T12:15:00.000Z')),
      },
    )

    await expect(
      upsertCommunityDiscordConnection(
        {
          guildId: '123456789012345678',
          organizationId: secondOrganizationId,
        },
        {
          checkGuildConnection: async () =>
            createConnectedResult('123456789012345678', new Date('2026-04-02T12:20:00.000Z')),
        },
      ),
    ).rejects.toThrow('Discord server is already connected to Acme (acme).')
  })

  test('refreshes diagnostics without changing the stored guild ID', async () => {
    const checkCalls: string[] = []
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await upsertCommunityDiscordConnection(
      {
        guildId: '123456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async (_ctx: object, options: { guildId: string }) => {
          checkCalls.push(options.guildId)

          return createNeedsAttentionResult(options.guildId, new Date('2026-04-02T12:25:00.000Z'))
        },
      },
    )

    const refreshedConnection = await refreshCommunityDiscordConnection(organizationId, {
      checkGuildConnection: async (_ctx: object, options: { guildId: string }) => {
        checkCalls.push(options.guildId)

        return createConnectedResult(options.guildId, new Date('2026-04-02T12:30:00.000Z'))
      },
    })

    expect(checkCalls).toEqual(['123456789012345678', '123456789012345678'])
    expect(refreshedConnection).toMatchObject({
      guildId: '123456789012345678',
      roleSyncEnabled: true,
      status: 'connected',
    })
  })

  test('toggles role sync through the admin mutation and preserves the flag across refresh and guild updates', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await upsertCommunityDiscordConnection(
      {
        guildId: '123456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async () =>
          createConnectedResult('123456789012345678', new Date('2026-04-02T12:40:00.000Z')),
      },
    )

    const updatedOrganization = await adminOrganizationRouter.setDiscordRoleSyncEnabled.callable(
      createAdminCallContext(),
    )({
      enabled: false,
      organizationId,
    })

    expect(updatedOrganization.discordConnection).toMatchObject({
      guildId: '123456789012345678',
      roleSyncEnabled: false,
    })

    const refreshedConnection = await refreshCommunityDiscordConnection(organizationId, {
      checkGuildConnection: async () =>
        createConnectedResult('123456789012345678', new Date('2026-04-02T12:45:00.000Z')),
    })

    expect(refreshedConnection).toMatchObject({
      guildId: '123456789012345678',
      roleSyncEnabled: false,
    })

    const updatedConnection = await upsertCommunityDiscordConnection(
      {
        guildId: '223456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async () =>
          createConnectedResult('223456789012345678', new Date('2026-04-02T12:50:00.000Z')),
      },
    )

    expect(updatedConnection).toMatchObject({
      guildId: '223456789012345678',
      roleSyncEnabled: false,
    })
  })

  test('clears announcement configs when the connected guild changes', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await upsertCommunityDiscordConnection(
      {
        guildId: '123456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async () =>
          createConnectedResult('123456789012345678', new Date('2026-04-02T12:40:00.000Z')),
      },
    )
    await database.insert(communityRoleSchema.communityDiscordAnnouncement).values({
      announcementType: 'role_updates',
      channelId: '223456789012345678',
      channelName: 'admins',
      createdAt: new Date('2026-04-02T12:41:00.000Z'),
      enabled: false,
      organizationId,
      updatedAt: new Date('2026-04-02T12:41:00.000Z'),
    })

    await upsertCommunityDiscordConnection(
      {
        guildId: '323456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async () =>
          createConnectedResult('323456789012345678', new Date('2026-04-02T12:45:00.000Z')),
      },
    )

    expect(await database.select().from(communityRoleSchema.communityDiscordAnnouncement)).toEqual([])
  })

  test('deletes the persisted connection', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await upsertCommunityDiscordConnection(
      {
        guildId: '123456789012345678',
        organizationId,
      },
      {
        checkGuildConnection: async () =>
          createConnectedResult('123456789012345678', new Date('2026-04-02T12:35:00.000Z')),
      },
    )
    await database.insert(communityRoleSchema.communityDiscordAnnouncement).values({
      announcementType: 'role_updates',
      channelId: '223456789012345678',
      channelName: 'admins',
      createdAt: new Date('2026-04-02T12:36:00.000Z'),
      enabled: true,
      organizationId,
      updatedAt: new Date('2026-04-02T12:36:00.000Z'),
    })

    await deleteCommunityDiscordConnectionByOrganizationId(organizationId)

    expect(await getCommunityDiscordConnectionByOrganizationId(organizationId)).toBeNull()
    expect(await database.select().from(communityRoleSchema.communityDiscordAnnouncement)).toEqual([])
  })
})
