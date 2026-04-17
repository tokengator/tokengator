import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AdminOrganizationRouter =
  typeof import('../src/features/admin-organization/feature/admin-organization-router').adminOrganizationRouter
type AuthSchema = typeof import('@tokengator/db/schema/auth')
type CommunityRoleSchema = typeof import('@tokengator/db/schema/community-role')
type PublishCommunityDiscordAnnouncement =
  (typeof import('../src/features/community-discord-announcement'))['publishCommunityDiscordAnnouncement']
type DatabaseClient = (typeof import('@tokengator/db'))['db']

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-api-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community-discord-announcement.sqlite')).toString()

let adminOrganizationRouter: AdminOrganizationRouter
let announcementInspectionResult: {
  channels: Array<{
    canPost: boolean
    checks: string[]
    id: string
    name: string
    type: 'announcement' | 'text'
  }>
  diagnostics: {
    checks: string[]
    guild: {
      id: string
      name: string | null
    }
    permissions: {
      administrator: boolean
    }
  }
  guildName: string | null
  lastCheckedAt: Date
  status: 'connected' | 'needs_attention'
}
let authSchema: AuthSchema
let communityRoleSchema: CommunityRoleSchema
let database: DatabaseClient
let publishCommunityDiscordAnnouncement: PublishCommunityDiscordAnnouncement
let sentDiscordMessages: Array<{
  body?: {
    allowed_mentions?: {
      parse?: string[]
      users?: string[]
    }
    content?: string
    embeds?: Array<{
      color?: number
      description?: string
      title?: string
    }>
  }
  channelId: string
  content?: string
}>

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
    channels: [
      {
        canPost: true,
        checks: [],
        id: '223456789012345678',
        name: 'admin-role-updates',
        type: 'text' as const,
      },
      {
        canPost: true,
        checks: [],
        id: '323456789012345678',
        name: 'ops-log',
        type: 'announcement' as const,
      },
    ],
    diagnostics: {
      checks: [],
      guild: {
        id: '123456789012345678',
        name: 'Acme Guild',
      },
      permissions: {
        administrator: false,
      },
    },
    guildName: 'Acme Guild',
    lastCheckedAt: new Date('2026-04-02T12:05:00.000Z'),
    status: 'connected' as const,
  }
}

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

async function insertCommunityDiscordConnection(input: { guildId: string; organizationId: string }) {
  await database.insert(communityRoleSchema.communityDiscordConnection).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    diagnostics: null,
    guildId: input.guildId,
    guildName: 'Acme Guild',
    lastCheckedAt: null,
    organizationId: input.organizationId,
    roleSyncEnabled: true,
    status: 'connected',
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

async function insertDiscordIdentity(input: { providerId: string; userId: string }) {
  await database.insert(authSchema.identity).values({
    avatarUrl: null,
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    displayName: 'Admin User',
    email: 'admin@example.com',
    id: crypto.randomUUID(),
    isPrimary: true,
    lastSyncedAt: new Date('2026-04-02T12:00:00.000Z'),
    linkedAt: new Date('2026-04-02T12:00:00.000Z'),
    profile: null,
    provider: 'discord',
    providerId: input.providerId,
    referenceId: `discord-account-${input.providerId}`,
    referenceType: 'account',
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    userId: input.userId,
    username: 'admin',
  })
}

async function insertUser(input: { email: string; id: string; name: string; username: string }) {
  await database.insert(authSchema.user).values({
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
    developerMode: false,
    displayUsername: input.username,
    email: input.email,
    emailVerified: true,
    id: input.id,
    image: null,
    name: input.name,
    private: false,
    role: 'admin',
    updatedAt: new Date('2026-04-02T12:00:00.000Z'),
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
    class MockDiscordChannelMessageError extends Error {
      code = 'unknown'
      discordCode = null
      status = null
    }

    class MockDiscordGuildMemberLookupError extends Error {
      code = 'unknown'
      discordCode = null
      status = null
    }

    class MockDiscordGuildMemberRoleMutationError extends Error {
      code = 'unknown'
      discordCode = null
      status = null
    }

    return {
      addDiscordGuildMemberRole: async () => {},
      DiscordChannelMessageError: MockDiscordChannelMessageError,
      DiscordGuildMemberLookupError: MockDiscordGuildMemberLookupError,
      DiscordGuildMemberRoleMutationError: MockDiscordGuildMemberRoleMutationError,
      getDiscordGuildMember: async () => null,
      inspectDiscordGuildAnnouncementChannels: async () => announcementInspectionResult,
      inspectDiscordGuildRoles: async () => ({
        checks: [],
        guildId: '123456789012345678',
        guildName: 'Acme Guild',
        lastCheckedAt: new Date('2026-04-02T12:05:00.000Z'),
        roles: [],
        status: 'connected' as const,
      }),
      removeDiscordGuildMemberRole: async () => {},
      sendDiscordChannelMessage: async (
        _ctx: unknown,
        input: {
          body?: {
            allowed_mentions?: {
              parse?: string[]
              users?: string[]
            }
            content?: string
            embeds?: Array<{
              color?: number
              description?: string
              title?: string
            }>
          }
          channelId: string
          content?: string
        },
      ) => {
        sentDiscordMessages.push(input)
      },
    }
  })

  syncDatabase(TEST_DATABASE_URL)

  announcementInspectionResult = createInspectionResult()
  sentDiscordMessages = []
  ;({ publishCommunityDiscordAnnouncement } = await import('../src/features/community-discord-announcement'))
  ;({ adminOrganizationRouter } = await import('../src/features/admin-organization/feature/admin-organization-router'))
  ;({ db: database } = await import('@tokengator/db'))
  authSchema = await import('@tokengator/db/schema/auth')
  communityRoleSchema = await import('@tokengator/db/schema/community-role')
}, 30_000)

afterAll(() => {
  mock.restore()
})

beforeEach(async () => {
  announcementInspectionResult = createInspectionResult()
  sentDiscordMessages = []

  await database.delete(communityRoleSchema.communityDiscordAnnouncement).where(sql`1 = 1`)
  await database.delete(communityRoleSchema.communityDiscordConnection).where(sql`1 = 1`)
  await database.delete(authSchema.identity).where(sql`1 = 1`)
  await database.delete(authSchema.account).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('admin community Discord announcement catalog', () => {
  test('returns registered announcement configs and selectable channels', async () => {
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

    const catalog = await adminOrganizationRouter.getDiscordAnnouncementCatalog.callable(createAdminCallContext())({
      organizationId,
    })

    expect(catalog.channels).toEqual([
      {
        id: '223456789012345678',
        name: 'admin-role-updates',
        type: 'text',
      },
      {
        id: '323456789012345678',
        name: 'ops-log',
        type: 'announcement',
      },
    ])
    expect(catalog.configs).toEqual([
      {
        channelId: null,
        channelName: null,
        checks: [],
        description: 'Post a message when Discord reconcile grants or revokes roles for a user.',
        enabled: false,
        label: 'Role Updates',
        status: 'not_configured',
        type: 'role_updates',
      },
    ])
  })

  test('upserts an announcement config and preserves enabled when the channel changes', async () => {
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

    await adminOrganizationRouter.upsertDiscordAnnouncementConfig.callable(createAdminCallContext())({
      channelId: '223456789012345678',
      organizationId,
      type: 'role_updates',
    })
    await adminOrganizationRouter.setDiscordAnnouncementEnabled.callable(createAdminCallContext())({
      enabled: false,
      organizationId,
      type: 'role_updates',
    })
    await adminOrganizationRouter.upsertDiscordAnnouncementConfig.callable(createAdminCallContext())({
      channelId: '323456789012345678',
      organizationId,
      type: 'role_updates',
    })

    const [record] = await database
      .select({
        channelId: communityRoleSchema.communityDiscordAnnouncement.channelId,
        channelName: communityRoleSchema.communityDiscordAnnouncement.channelName,
        enabled: communityRoleSchema.communityDiscordAnnouncement.enabled,
      })
      .from(communityRoleSchema.communityDiscordAnnouncement)
      .where(eq(communityRoleSchema.communityDiscordAnnouncement.organizationId, organizationId))
      .limit(1)

    expect(record).toEqual({
      channelId: '323456789012345678',
      channelName: 'ops-log',
      enabled: false,
    })
  })

  test('rejects channels that are not postable by the bot', async () => {
    const organizationId = crypto.randomUUID()

    announcementInspectionResult = {
      ...createInspectionResult(),
      channels: [
        {
          canPost: false,
          checks: ['send_messages_missing'],
          id: '223456789012345678',
          name: 'admin-role-updates',
          type: 'text',
        },
      ],
    }

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })

    await expect(
      adminOrganizationRouter.upsertDiscordAnnouncementConfig.callable(createAdminCallContext())({
        channelId: '223456789012345678',
        organizationId,
        type: 'role_updates',
      }),
    ).rejects.toThrow('Discord channel is not postable by the bot.')
  })

  test('reports needs_attention when a configured channel loses post permissions', async () => {
    const organizationId = crypto.randomUUID()

    announcementInspectionResult = {
      ...createInspectionResult(),
      channels: [
        {
          canPost: false,
          checks: ['send_messages_missing'],
          id: '223456789012345678',
          name: 'admin-role-updates',
          type: 'text',
        },
        {
          canPost: true,
          checks: [],
          id: '323456789012345678',
          name: 'ops-log',
          type: 'announcement',
        },
      ],
      status: 'needs_attention',
    }

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })
    await database.insert(communityRoleSchema.communityDiscordAnnouncement).values({
      announcementType: 'role_updates',
      channelId: '223456789012345678',
      channelName: 'admin-role-updates',
      createdAt: new Date('2026-04-02T12:10:00.000Z'),
      enabled: true,
      organizationId,
      updatedAt: new Date('2026-04-02T12:10:00.000Z'),
    })

    const catalog = await adminOrganizationRouter.getDiscordAnnouncementCatalog.callable(createAdminCallContext())({
      organizationId,
    })

    expect(catalog.configs).toEqual([
      expect.objectContaining({
        checks: ['send_messages_missing'],
        status: 'needs_attention',
        type: 'role_updates',
      }),
    ])
  })

  test('sends a test message to the selected announcement channel', async () => {
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

    const result = await adminOrganizationRouter.testDiscordAnnouncementChannel.callable(createAdminCallContext())({
      channelId: '323456789012345678',
      organizationId,
      type: 'role_updates',
    })

    expect(result).toEqual({
      channelId: '323456789012345678',
      channelName: 'ops-log',
    })
    expect(sentDiscordMessages).toEqual([
      expect.objectContaining({
        channelId: '323456789012345678',
      }),
    ])
    expect(sentDiscordMessages[0]?.body?.embeds?.[0]).toMatchObject({
      color: 0x5865f2,
      title: '🧪 TokenGator Announcement Test',
    })
    expect(sentDiscordMessages[0]?.body?.embeds?.[0]?.description).toContain('**Announcement:** Role Updates')
    expect(sentDiscordMessages[0]?.body?.embeds?.[0]?.description).toContain('**Organization:** Acme')
  })

  test('swallows stored-config lookup failures while publishing announcements', async () => {
    const originalSelect = database.select.bind(database)

    try {
      Object.assign(database, {
        select() {
          throw new Error('Announcement config lookup failed.')
        },
      })

      await expect(
        publishCommunityDiscordAnnouncement({
          organizationId: crypto.randomUUID(),
          payload: {
            changes: [
              {
                action: 'grant',
                communityRoleName: 'Announcement Role',
                discordRoleName: 'Announcement Role',
              },
            ],
            discordAccountId: 'discord-account-id',
            userName: 'Announcement User',
            username: 'announce',
          },
          type: 'role_updates',
        }),
      ).resolves.toBeUndefined()
    } finally {
      Object.assign(database, {
        select: originalSelect,
      })
    }
  })

  test('mentions the requesting admin when a Discord identity is linked', async () => {
    const organizationId = crypto.randomUUID()

    await insertUser({
      email: 'admin@example.com',
      id: 'admin-user-id',
      name: 'Admin User',
      username: 'admin',
    })
    await insertDiscordIdentity({
      providerId: 'discord-admin-user',
      userId: 'admin-user-id',
    })
    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertCommunityDiscordConnection({
      guildId: '123456789012345678',
      organizationId,
    })

    await adminOrganizationRouter.testDiscordAnnouncementChannel.callable(createAdminCallContext())({
      channelId: '323456789012345678',
      organizationId,
      type: 'role_updates',
    })

    expect(sentDiscordMessages[0]?.body?.content).toBeUndefined()
    expect(sentDiscordMessages[0]?.body?.embeds?.[0]?.description).toContain('**Triggered by:** <@discord-admin-user>')
  })
})
