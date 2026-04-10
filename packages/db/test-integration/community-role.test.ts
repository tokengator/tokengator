import { createClient } from '@libsql/client'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type AuthSchema = typeof import('../src/schema/auth')
type CommunityRoleSchema = typeof import('../src/schema/community-role')
type DatabaseClient = ReturnType<typeof drizzle>

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..')
const TEST_DATABASE_DIR = resolve(tmpdir(), 'tokengator-db-tests')
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community-role.sqlite')).toString()

let authSchema: AuthSchema
let communityRoleSchema: CommunityRoleSchema
let database: DatabaseClient

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

  authSchema = await import('../src/schema/auth')
  communityRoleSchema = await import('../src/schema/community-role')
  database = drizzle({
    client: createClient({
      authToken: 'test-token',
      url: TEST_DATABASE_URL,
    }),
    schema: await import('../src/schema'),
  })
})

beforeEach(async () => {
  await database.delete(authSchema.organization).where(sql`1 = 1`)
})

describe('communityRole schema', () => {
  test('stores nullable discord role ids on community roles', async () => {
    const organizationId = crypto.randomUUID()
    const firstTeamId = crypto.randomUUID()
    const secondTeamId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await insertTeam({
      id: firstTeamId,
      name: 'Collectors',
      organizationId,
    })
    await insertTeam({
      id: secondTeamId,
      name: 'Whales',
      organizationId,
    })
    await database.insert(communityRoleSchema.communityRole).values([
      {
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        discordRoleId: null,
        enabled: true,
        id: 'role-collectors',
        matchMode: 'any',
        name: 'Collectors',
        organizationId,
        slug: 'collectors',
        teamId: firstTeamId,
        updatedAt: new Date('2026-04-02T12:00:00.000Z'),
      },
      {
        createdAt: new Date('2026-04-02T12:05:00.000Z'),
        discordRoleId: '123456789012345678',
        enabled: true,
        id: 'role-whales',
        matchMode: 'all',
        name: 'Whales',
        organizationId,
        slug: 'whales',
        teamId: secondTeamId,
        updatedAt: new Date('2026-04-02T12:05:00.000Z'),
      },
    ])

    const storedRoles = await database
      .select({
        discordRoleId: communityRoleSchema.communityRole.discordRoleId,
        id: communityRoleSchema.communityRole.id,
      })
      .from(communityRoleSchema.communityRole)
      .where(eq(communityRoleSchema.communityRole.organizationId, organizationId))
      .orderBy(communityRoleSchema.communityRole.id)

    expect(storedRoles).toEqual([
      {
        discordRoleId: null,
        id: 'role-collectors',
      },
      {
        discordRoleId: '123456789012345678',
        id: 'role-whales',
      },
    ])
  })

  test('enforces one discord role target per organization while allowing reuse across organizations', async () => {
    const firstOrganizationId = crypto.randomUUID()
    const secondOrganizationId = crypto.randomUUID()
    const duplicateDiscordRoleId = '123456789012345678'

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
    await insertTeam({
      id: 'team-acme-1',
      name: 'Collectors',
      organizationId: firstOrganizationId,
    })
    await insertTeam({
      id: 'team-acme-2',
      name: 'Whales',
      organizationId: firstOrganizationId,
    })
    await insertTeam({
      id: 'team-beacon-1',
      name: 'Collectors',
      organizationId: secondOrganizationId,
    })
    await database.insert(communityRoleSchema.communityRole).values([
      {
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        discordRoleId: duplicateDiscordRoleId,
        enabled: true,
        id: 'role-acme-1',
        matchMode: 'any',
        name: 'Collectors',
        organizationId: firstOrganizationId,
        slug: 'collectors',
        teamId: 'team-acme-1',
        updatedAt: new Date('2026-04-02T12:00:00.000Z'),
      },
      {
        createdAt: new Date('2026-04-02T12:05:00.000Z'),
        discordRoleId: duplicateDiscordRoleId,
        enabled: true,
        id: 'role-beacon-1',
        matchMode: 'any',
        name: 'Collectors',
        organizationId: secondOrganizationId,
        slug: 'collectors',
        teamId: 'team-beacon-1',
        updatedAt: new Date('2026-04-02T12:05:00.000Z'),
      },
    ])

    await expect(
      database
        .insert(communityRoleSchema.communityRole)
        .values({
          createdAt: new Date('2026-04-02T12:10:00.000Z'),
          discordRoleId: duplicateDiscordRoleId,
          enabled: true,
          id: 'role-acme-2',
          matchMode: 'all',
          name: 'Whales',
          organizationId: firstOrganizationId,
          slug: 'whales',
          teamId: 'team-acme-2',
          updatedAt: new Date('2026-04-02T12:10:00.000Z'),
        })
        .execute(),
    ).rejects.toThrow()
  })

  test('cascades membership and Discord sync runs when the organization is deleted', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Cascade Org',
      slug: 'cascade-org',
    })
    await database.insert(communityRoleSchema.communityMembershipSyncRun).values({
      dependencyAssetGroupIds: JSON.stringify(['asset-group-1']),
      dependencyFreshAtStart: false,
      errorMessage: null,
      errorPayload: null,
      finishedAt: new Date('2026-04-02T12:05:00.000Z'),
      id: 'membership-run-1',
      organizationId,
      startedAt: new Date('2026-04-02T12:00:00.000Z'),
      status: 'succeeded',
      triggerSource: 'manual',
    })
    await database.insert(communityRoleSchema.communityDiscordSyncRun).values({
      dependencyAssetGroupIds: JSON.stringify(['asset-group-1']),
      dependencyFreshAtStart: false,
      errorMessage: null,
      errorPayload: null,
      finishedAt: new Date('2026-04-02T12:10:00.000Z'),
      id: 'discord-run-1',
      organizationId,
      outcomeCounts: JSON.stringify({
        already_correct: 0,
        discord_role_missing: 0,
        linked_but_not_in_guild: 0,
        mapping_missing: 0,
        mapping_not_assignable: 0,
        no_discord_account_linked: 0,
        will_grant: 0,
        will_revoke: 0,
      }),
      startedAt: new Date('2026-04-02T12:05:00.000Z'),
      status: 'succeeded',
      triggerSource: 'manual',
    })

    await database.delete(authSchema.organization).where(eq(authSchema.organization.id, organizationId))

    await expect(
      database
        .select({
          id: communityRoleSchema.communityMembershipSyncRun.id,
        })
        .from(communityRoleSchema.communityMembershipSyncRun)
        .where(eq(communityRoleSchema.communityMembershipSyncRun.organizationId, organizationId))
        .execute(),
    ).resolves.toEqual([])
    await expect(
      database
        .select({
          id: communityRoleSchema.communityDiscordSyncRun.id,
        })
        .from(communityRoleSchema.communityDiscordSyncRun)
        .where(eq(communityRoleSchema.communityDiscordSyncRun.organizationId, organizationId))
        .execute(),
    ).resolves.toEqual([])
  })
})
