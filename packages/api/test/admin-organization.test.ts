import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { eq, sql } from 'drizzle-orm'

type AdminOrganizationRouter =
  typeof import('../src/features/admin-organization/feature/admin-organization-router').adminOrganizationRouter
type AuthSchema = typeof import('@tokengator/db/schema/auth')
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
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-admin-organization-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'admin-organization.sqlite')).toString()

let adminOrganizationRouter: AdminOrganizationRouter
let authSchema: AuthSchema
let database: DatabaseClient

function createAdminCallContext(): any {
  return {
    context: {
      requestHeaders: new Headers(),
      requestSignal: new AbortController().signal,
      responseHeaders: new Headers(),
      session: {
        session: {
          createdAt: new Date('2026-04-11T00:00:00.000Z'),
          expiresAt: new Date('2026-04-18T00:00:00.000Z'),
          id: 'admin-session-id',
          token: 'admin-session-token',
          updatedAt: new Date('2026-04-11T00:00:00.000Z'),
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

async function insertOrganization(input: { id: string; name: string; slug: string }) {
  await database.insert(authSchema.organization).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    id: input.id,
    logo: null,
    metadata: null,
    name: input.name,
    slug: input.slug,
  })
}

async function insertUser(input: {
  email: string
  id: string
  name: string
  role?: 'admin' | 'user'
  username: string
}) {
  await database.insert(authSchema.user).values({
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    email: input.email,
    emailVerified: true,
    id: input.id,
    image: null,
    name: input.name,
    role: input.role ?? 'user',
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    username: input.username,
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
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  syncDatabase(TEST_DATABASE_URL)

  ;({ adminOrganizationRouter } = await import('../src/features/admin-organization/feature/admin-organization-router'))
  ;({ db: database } = await import('@tokengator/db'))
  authSchema = await import('@tokengator/db/schema/auth')
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
  await database.delete(authSchema.member).where(sql`1 = 1`)
  await database.delete(authSchema.organization).where(sql`1 = 1`)
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('admin organization update', () => {
  test('saves and clears optional community profile fields', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })

    const updated = await adminOrganizationRouter.update.callable(createAdminCallContext())({
      data: {
        description: '  Alpha community profile  ',
        discordUrl: '  https://discord.gg/alpha  ',
        githubUrl: '  https://github.com/alpha  ',
        logo: '  https://example.com/alpha.png  ',
        metadata: {
          seed: 'dev',
          slug: 'alpha-dao',
        },
        name: '  Alpha DAO Updated  ',
        slug: '  alpha-dao-updated  ',
        telegramUrl: '  https://t.me/alpha  ',
        websiteUrl: '  https://alpha.example.com  ',
        xUrl: '  https://x.com/alpha  ',
      },
      organizationId: 'org-alpha',
    })

    expect(updated).toMatchObject({
      description: 'Alpha community profile',
      discordUrl: 'https://discord.gg/alpha',
      githubUrl: 'https://github.com/alpha',
      logo: 'https://example.com/alpha.png',
      metadata: {
        seed: 'dev',
        slug: 'alpha-dao',
      },
      name: 'Alpha DAO Updated',
      slug: 'alpha-dao-updated',
      telegramUrl: 'https://t.me/alpha',
      websiteUrl: 'https://alpha.example.com',
      xUrl: 'https://x.com/alpha',
    })

    const cleared = await adminOrganizationRouter.update.callable(createAdminCallContext())({
      data: {
        description: '',
        discordUrl: '   ',
        logo: '',
        name: 'Alpha DAO',
        slug: 'alpha-dao',
      },
      organizationId: 'org-alpha',
    })

    expect(cleared).toMatchObject({
      description: null,
      discordUrl: null,
      githubUrl: null,
      logo: null,
      name: 'Alpha DAO',
      slug: 'alpha-dao',
      telegramUrl: null,
      websiteUrl: null,
      xUrl: null,
    })

    const [record] = await database
      .select({
        description: authSchema.organization.description,
        discordUrl: authSchema.organization.discordUrl,
        githubUrl: authSchema.organization.githubUrl,
        metadata: authSchema.organization.metadata,
        telegramUrl: authSchema.organization.telegramUrl,
        websiteUrl: authSchema.organization.websiteUrl,
        xUrl: authSchema.organization.xUrl,
      })
      .from(authSchema.organization)
      .where(eq(authSchema.organization.id, 'org-alpha'))

    expect(record).toEqual({
      description: null,
      discordUrl: null,
      githubUrl: null,
      metadata: JSON.stringify({
        seed: 'dev',
        slug: 'alpha-dao',
      }),
      telegramUrl: null,
      websiteUrl: null,
      xUrl: null,
    })

    await expect(
      adminOrganizationRouter.update.callable(createAdminCallContext())({
        data: {
          description: 'a'.repeat(257),
          name: 'Alpha DAO',
          slug: 'alpha-dao',
        },
        organizationId: 'org-alpha',
      }),
    ).rejects.toThrow()

    for (const urlField of ['discordUrl', 'githubUrl', 'telegramUrl', 'websiteUrl', 'xUrl'] as const) {
      await expect(
        adminOrganizationRouter.update.callable(createAdminCallContext())({
          data: {
            name: 'Alpha DAO',
            slug: 'alpha-dao',
            [urlField]: 'not-a-url',
          },
          organizationId: 'org-alpha',
        }),
      ).rejects.toThrow()
    }
  })

  test('adds new members and updates existing member roles', async () => {
    await insertOrganization({
      id: 'org-alpha',
      name: 'Alpha DAO',
      slug: 'alpha-dao',
    })
    await insertUser({
      email: 'member@example.com',
      id: 'member-user-id',
      name: 'Member User',
      username: 'member',
    })

    const added = await adminOrganizationRouter.addMember.callable(createAdminCallContext())({
      organizationId: 'org-alpha',
      role: 'member',
      userId: 'member-user-id',
    })
    const updated = await adminOrganizationRouter.addMember.callable(createAdminCallContext())({
      organizationId: 'org-alpha',
      role: 'admin',
      userId: 'member-user-id',
    })

    expect(updated.memberId).toBe(added.memberId)
    expect(updated).toMatchObject({
      organizationId: 'org-alpha',
      role: 'admin',
      userId: 'member-user-id',
    })

    const members = await database
      .select({
        role: authSchema.member.role,
        userId: authSchema.member.userId,
      })
      .from(authSchema.member)
      .where(eq(authSchema.member.organizationId, 'org-alpha'))

    expect(members).toEqual([
      {
        role: 'admin',
        userId: 'member-user-id',
      },
    ])
  })
})
