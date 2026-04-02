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
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'community-discord-connection.sqlite')).toString()

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
  await database.delete(communityRoleSchema.communityDiscordConnection).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
})

describe('communityDiscordConnection schema', () => {
  test('stores diagnostic JSON for a saved connection', async () => {
    const organizationId = crypto.randomUUID()

    await insertOrganization({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
    })
    await database.insert(communityRoleSchema.communityDiscordConnection).values({
      createdAt: new Date('2026-04-02T12:00:00.000Z'),
      diagnostics: JSON.stringify({
        checks: ['bot_token_missing'],
        commands: {
          errorMessage: null,
          registered: false,
        },
        guild: {
          id: '123456789012345678',
          name: null,
        },
        permissions: {
          administrator: false,
          manageRoles: false,
        },
      }),
      guildId: '123456789012345678',
      guildName: null,
      lastCheckedAt: new Date('2026-04-02T12:01:00.000Z'),
      organizationId,
      status: 'needs_attention',
      updatedAt: new Date('2026-04-02T12:01:00.000Z'),
    })

    const [record] = await database
      .select({
        diagnostics: communityRoleSchema.communityDiscordConnection.diagnostics,
        guildId: communityRoleSchema.communityDiscordConnection.guildId,
        status: communityRoleSchema.communityDiscordConnection.status,
      })
      .from(communityRoleSchema.communityDiscordConnection)
      .where(eq(communityRoleSchema.communityDiscordConnection.organizationId, organizationId))
      .limit(1)

    expect(record).toEqual({
      diagnostics:
        '{"checks":["bot_token_missing"],"commands":{"errorMessage":null,"registered":false},"guild":{"id":"123456789012345678","name":null},"permissions":{"administrator":false,"manageRoles":false}}',
      guildId: '123456789012345678',
      status: 'needs_attention',
    })
  })

  test('enforces unique guild IDs across communities and cascades on organization delete', async () => {
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
    await database.insert(communityRoleSchema.communityDiscordConnection).values({
      createdAt: new Date('2026-04-02T12:00:00.000Z'),
      diagnostics: null,
      guildId: '123456789012345678',
      guildName: 'Acme Guild',
      lastCheckedAt: null,
      organizationId: firstOrganizationId,
      status: 'connected',
      updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    })

    await expect(
      database
        .insert(communityRoleSchema.communityDiscordConnection)
        .values({
          createdAt: new Date('2026-04-02T12:05:00.000Z'),
          diagnostics: null,
          guildId: '123456789012345678',
          guildName: null,
          lastCheckedAt: null,
          organizationId: secondOrganizationId,
          status: 'needs_attention',
          updatedAt: new Date('2026-04-02T12:05:00.000Z'),
        })
        .execute(),
    ).rejects.toThrow()

    await database.delete(authSchema.organization).where(eq(authSchema.organization.id, firstOrganizationId))

    const remainingConnections = await database
      .select({
        organizationId: communityRoleSchema.communityDiscordConnection.organizationId,
      })
      .from(communityRoleSchema.communityDiscordConnection)

    expect(remainingConnections).toEqual([])
  })
})
