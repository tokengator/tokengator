import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { asc, eq } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { alice, bob } from '../src/dev-seed-users'

const ALICE_NAME = 'Alice'
const ALICE_USERNAME = 'alice'
const BOB_NAME = 'Bob'
const BOB_USERNAME = 'bob'
const CAROL_NAME = 'Carol'
const CAROL_USERNAME = 'carol'
const DB_PACKAGE_DIR = resolve(import.meta.dir, '..')
const PRIMARY_ORGANIZATION_SLUG = 'acme'
const SEED_SKIPPED_MESSAGE = 'Skipping local development seed because existing user or organization data was found.'
const SECONDARY_ORGANIZATION_SLUG = 'beacon'

let tempDir = ''

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function createDatabaseUrl(filename: string) {
  return pathToFileURL(resolve(tempDir, filename)).toString()
}

function createSeedEnv(databaseAuthToken: string, databaseUrl: string, envOverrides: Record<string, string> = {}) {
  return {
    ...process.env,
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
    BETTER_AUTH_URL: 'http://localhost:3000',
    CORS_ORIGINS: 'http://localhost:3001',
    DATABASE_AUTH_TOKEN: databaseAuthToken,
    DATABASE_URL: databaseUrl,
    DISCORD_BOT_TOKEN: 'discord-bot-token',
    DISCORD_CLIENT_ID: 'discord-client-id',
    DISCORD_CLIENT_SECRET: 'discord-client-secret',
    HELIUS_API_KEY: 'helius-api-key',
    HELIUS_CLUSTER: 'devnet',
    NODE_ENV: 'test',
    SOLANA_CLUSTER: 'devnet',
    SOLANA_ENDPOINT_PUBLIC: 'https://api.devnet.solana.com',
    ...envOverrides,
  }
}

function getOrganizationIdsBySlug(
  organizations: Array<{
    id: string
    slug: string
  }>,
) {
  return Object.fromEntries(
    organizations
      .map((organization) => [organization.slug, organization.id] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

function restoreEnvVar(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

function runSeedScript(databaseAuthToken: string, databaseUrl: string, envOverrides: Record<string, string> = {}) {
  return Bun.spawnSync({
    cmd: ['bun', 'run', 'src/seed.ts'],
    cwd: DB_PACKAGE_DIR,
    env: createSeedEnv(databaseAuthToken, databaseUrl, envOverrides),
    stderr: 'pipe',
    stdout: 'pipe',
  })
}

function syncDatabase(databaseUrl: string, databaseAuthToken = 'test-token') {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'db:push', '--force'],
    cwd: DB_PACKAGE_DIR,
    env: {
      ...process.env,
      DATABASE_AUTH_TOKEN: databaseAuthToken,
      DATABASE_URL: databaseUrl,
    },
    stderr: 'pipe',
    stdout: 'pipe',
  })

  if (result.exitCode !== 0) {
    const stderr = decodeOutput(result.stderr)
    const stdout = decodeOutput(result.stdout)

    throw new Error(`Failed to sync the test database.\n${stdout}\n${stderr}`)
  }
}

async function executeStatement(databaseUrl: string, statement: string, databaseAuthToken = 'test-token') {
  const { createClient } = await import('@libsql/client')
  const client = createClient({
    authToken: databaseAuthToken,
    url: databaseUrl,
  })

  await client.execute(statement)
}

async function getTableCount(databaseUrl: string, tableName: string, databaseAuthToken = 'test-token') {
  const { createClient } = await import('@libsql/client')
  const client = createClient({
    authToken: databaseAuthToken,
    url: databaseUrl,
  })
  const result = await client.execute(`select count(*) as count from ${tableName}`)

  return Number(result.rows[0]?.count ?? 0)
}

beforeAll(() => {
  tempDir = mkdtempSync(resolve(tmpdir(), 'tokengator-db-seed-'))

  const databaseUrl = pathToFileURL(resolve(tempDir, 'test.sqlite')).toString()

  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_URL = 'http://localhost:3000'
  process.env.CORS_ORIGINS = 'http://localhost:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = databaseUrl
  process.env.DISCORD_BOT_TOKEN = 'discord-bot-token'
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  syncDatabase(databaseUrl)
})

afterAll(() => {
  if (tempDir) {
    rmSync(tempDir, {
      force: true,
      recursive: true,
    })
  }
})

describe('seedDatabase', () => {
  test('creates the baseline dataset with hidden compatibility emails and seeded SIWS identities', async () => {
    const { devSeed, seedDatabase } = await import('../src/seed')
    const [{ db }, assetSchema, authSchema, communityRoleSchema] = await Promise.all([
      import('../src/index'),
      import('../src/schema/asset'),
      import('../src/schema/auth'),
      import('../src/schema/community-role'),
    ])
    const summary = await seedDatabase()
    const accounts = await db
      .select({
        accountId: authSchema.account.accountId,
        providerId: authSchema.account.providerId,
        username: authSchema.user.username,
      })
      .from(authSchema.account)
      .innerJoin(authSchema.user, eq(authSchema.account.userId, authSchema.user.id))
      .orderBy(asc(authSchema.user.username), asc(authSchema.account.providerId))
    const assetGroups = await db
      .select({
        address: assetSchema.assetGroup.address,
        enabled: assetSchema.assetGroup.enabled,
        label: assetSchema.assetGroup.label,
        type: assetSchema.assetGroup.type,
      })
      .from(assetSchema.assetGroup)
      .orderBy(asc(assetSchema.assetGroup.label), asc(assetSchema.assetGroup.address))
    const organizations = await db
      .select({
        id: authSchema.organization.id,
        metadata: authSchema.organization.metadata,
        name: authSchema.organization.name,
        slug: authSchema.organization.slug,
      })
      .from(authSchema.organization)
      .orderBy(asc(authSchema.organization.slug))
    const seedMemberships = await db
      .select({
        organizationSlug: authSchema.organization.slug,
        role: authSchema.member.role,
        username: authSchema.user.username,
      })
      .from(authSchema.member)
      .innerJoin(authSchema.organization, eq(authSchema.member.organizationId, authSchema.organization.id))
      .innerJoin(authSchema.user, eq(authSchema.member.userId, authSchema.user.id))
      .orderBy(asc(authSchema.organization.slug), asc(authSchema.user.username))
    const seededCommunityRoles = await db
      .select({
        assetGroupLabel: assetSchema.assetGroup.label,
        enabled: communityRoleSchema.communityRole.enabled,
        matchMode: communityRoleSchema.communityRole.matchMode,
        maximumAmount: communityRoleSchema.communityRoleCondition.maximumAmount,
        minimumAmount: communityRoleSchema.communityRoleCondition.minimumAmount,
        name: communityRoleSchema.communityRole.name,
        organizationSlug: authSchema.organization.slug,
        slug: communityRoleSchema.communityRole.slug,
        teamName: authSchema.team.name,
      })
      .from(communityRoleSchema.communityRole)
      .innerJoin(
        authSchema.organization,
        eq(communityRoleSchema.communityRole.organizationId, authSchema.organization.id),
      )
      .innerJoin(authSchema.team, eq(communityRoleSchema.communityRole.teamId, authSchema.team.id))
      .innerJoin(
        communityRoleSchema.communityRoleCondition,
        eq(communityRoleSchema.communityRoleCondition.communityRoleId, communityRoleSchema.communityRole.id),
      )
      .innerJoin(
        assetSchema.assetGroup,
        eq(communityRoleSchema.communityRoleCondition.assetGroupId, assetSchema.assetGroup.id),
      )
      .orderBy(
        asc(authSchema.organization.slug),
        asc(communityRoleSchema.communityRole.slug),
        asc(assetSchema.assetGroup.label),
        asc(communityRoleSchema.communityRoleCondition.minimumAmount),
      )
    const sessions = await db
      .select({
        id: authSchema.session.id,
      })
      .from(authSchema.session)
    const solanaWallets = await db
      .select({
        address: authSchema.solanaWallet.address,
        isPrimary: authSchema.solanaWallet.isPrimary,
        name: authSchema.solanaWallet.name,
        username: authSchema.user.username,
      })
      .from(authSchema.solanaWallet)
      .innerJoin(authSchema.user, eq(authSchema.solanaWallet.userId, authSchema.user.id))
      .orderBy(asc(authSchema.user.username), asc(authSchema.solanaWallet.address))
    const users = await db
      .select({
        email: authSchema.user.email,
        name: authSchema.user.name,
        role: authSchema.user.role,
        username: authSchema.user.username,
      })
      .from(authSchema.user)
      .orderBy(asc(authSchema.user.username))
    const organizationIdsBySlug = getOrganizationIdsBySlug(organizations)

    expect(summary.skipped).toBe(false)

    if (summary.skipped) {
      throw new Error('Expected the initial seed to populate the empty database.')
    }

    expect(summary.organizationId.length).toBeGreaterThan(0)
    expect(summary.organizationCount).toBe(devSeed.organizations.length)
    expect(summary.organizationIdsBySlug).toEqual(organizationIdsBySlug)
    expect(accounts).toEqual([
      {
        accountId: alice.solana.publicKey,
        providerId: 'siws',
        username: ALICE_USERNAME,
      },
      {
        accountId: bob.solana.publicKey,
        providerId: 'siws',
        username: BOB_USERNAME,
      },
    ])
    expect(assetGroups).toEqual([...devSeed.assetGroups])
    expect(organizations.map(({ metadata, name, slug }) => ({ metadata, name, slug }))).toEqual(
      devSeed.organizations.map((organization) => ({
        metadata: organization.metadata,
        name: organization.name,
        slug: organization.slug,
      })),
    )
    expect(seedMemberships).toEqual([
      {
        organizationSlug: PRIMARY_ORGANIZATION_SLUG,
        role: 'admin',
        username: ALICE_USERNAME,
      },
      {
        organizationSlug: PRIMARY_ORGANIZATION_SLUG,
        role: 'owner',
        username: BOB_USERNAME,
      },
      {
        organizationSlug: SECONDARY_ORGANIZATION_SLUG,
        role: 'admin',
        username: ALICE_USERNAME,
      },
      {
        organizationSlug: SECONDARY_ORGANIZATION_SLUG,
        role: 'owner',
        username: CAROL_USERNAME,
      },
    ])
    expect(seededCommunityRoles).toEqual(
      devSeed.organizations.flatMap((organization) =>
        devSeed.communityRoles.flatMap((communityRole) =>
          communityRole.conditions.map((condition) => ({
            assetGroupLabel: condition.assetGroupLabel,
            enabled: communityRole.enabled,
            matchMode: communityRole.matchMode,
            maximumAmount: condition.maximumAmount,
            minimumAmount: condition.minimumAmount,
            name: communityRole.name,
            organizationSlug: organization.slug,
            slug: communityRole.slug,
            teamName: communityRole.name,
          })),
        ),
      ),
    )
    expect(sessions).toHaveLength(0)
    expect(solanaWallets).toEqual([
      {
        address: alice.solana.publicKey,
        isPrimary: true,
        name: null,
        username: ALICE_USERNAME,
      },
      {
        address: bob.solana.publicKey,
        isPrimary: true,
        name: null,
        username: BOB_USERNAME,
      },
    ])
    expect(users).toEqual([
      {
        email: 'alice@example.com',
        name: ALICE_NAME,
        role: 'admin',
        username: ALICE_USERNAME,
      },
      {
        email: 'bob@example.com',
        name: BOB_NAME,
        role: 'user',
        username: BOB_USERNAME,
      },
      {
        email: 'carol@example.com',
        name: CAROL_NAME,
        role: 'user',
        username: CAROL_USERNAME,
      },
    ])
  })

  test('returns a skipped result when the current database is already initialized', async () => {
    const { seedDatabase } = await import('../src/seed')
    const result = await seedDatabase()

    expect(result).toEqual({
      skipped: true,
    })
  })

  test('skips when a user row already exists', async () => {
    const databaseUrl = createDatabaseUrl('skip-user.sqlite')

    syncDatabase(databaseUrl)
    await executeStatement(
      databaseUrl,
      `insert into user (email, id, name) values ('manual-user@example.com', 'manual-user', 'Manual User')`,
    )

    const result = runSeedScript('test-token', databaseUrl)
    const output = [decodeOutput(result.stdout), decodeOutput(result.stderr)].join('\n')

    expect(result.exitCode).toBe(0)
    expect(output).toContain(SEED_SKIPPED_MESSAGE)
    expect(await getTableCount(databaseUrl, 'organization')).toBe(0)
    expect(await getTableCount(databaseUrl, 'user')).toBe(1)
  })

  test('skips when an organization row already exists', async () => {
    const databaseUrl = createDatabaseUrl('skip-organization.sqlite')

    syncDatabase(databaseUrl)
    await executeStatement(
      databaseUrl,
      `insert into organization (id, name, slug) values ('manual-organization', 'Manual Organization', 'manual-organization')`,
    )

    const result = runSeedScript('test-token', databaseUrl)
    const output = [decodeOutput(result.stdout), decodeOutput(result.stderr)].join('\n')

    expect(result.exitCode).toBe(0)
    expect(output).toContain(SEED_SKIPPED_MESSAGE)
    expect(await getTableCount(databaseUrl, 'organization')).toBe(1)
    expect(await getTableCount(databaseUrl, 'user')).toBe(0)
  })

  test('still seeds when unrelated verification data already exists', async () => {
    const { devSeed } = await import('../src/seed')
    const databaseUrl = createDatabaseUrl('seed-with-verification.sqlite')

    syncDatabase(databaseUrl)
    await executeStatement(
      databaseUrl,
      `insert into verification (expires_at, id, identifier, value) values (0, 'verification-1', 'manual@example.com', 'token')`,
    )

    const result = runSeedScript('test-token', databaseUrl)
    const output = [decodeOutput(result.stdout), decodeOutput(result.stderr)].join('\n')

    expect(result.exitCode).toBe(0)
    expect(output).toContain('Seeded local development data.')
    expect(output).not.toContain(SEED_SKIPPED_MESSAGE)
    expect(output).not.toContain('Admin user:')
    expect(output).not.toContain('password')
    expect(output).toContain('Solana sign-in fixtures: @alice, @bob')
    expect(await getTableCount(databaseUrl, 'account')).toBe(2)
    expect(await getTableCount(databaseUrl, 'asset_group')).toBe(2)
    expect(await getTableCount(databaseUrl, 'community_role')).toBe(
      devSeed.organizations.length * devSeed.communityRoles.length,
    )
    expect(await getTableCount(databaseUrl, 'community_role_condition')).toBe(
      devSeed.organizations.length *
        devSeed.communityRoles.reduce((count, communityRole) => count + communityRole.conditions.length, 0),
    )
    expect(await getTableCount(databaseUrl, 'organization')).toBe(2)
    expect(await getTableCount(databaseUrl, 'solana_wallet')).toBe(2)
    expect(await getTableCount(databaseUrl, 'team')).toBe(devSeed.organizations.length * devSeed.communityRoles.length)
    expect(await getTableCount(databaseUrl, 'user')).toBe(3)
    expect(await getTableCount(databaseUrl, 'verification')).toBe(1)
  })

  test('rejects non-local database urls before loading the runtime', async () => {
    const { seedDatabase } = await import('../src/seed')
    const previousDatabaseAuthToken = process.env.DATABASE_AUTH_TOKEN
    const previousDatabaseUrl = process.env.DATABASE_URL
    const previousNodeEnv = process.env.NODE_ENV

    process.env.DATABASE_AUTH_TOKEN = 'no-token'
    process.env.DATABASE_URL = 'https://example.turso.io'
    process.env.NODE_ENV = 'development'

    try {
      await expect(seedDatabase()).rejects.toThrow('db:seed only supports local DATABASE_URL values.')
    } finally {
      restoreEnvVar('DATABASE_AUTH_TOKEN', previousDatabaseAuthToken)
      restoreEnvVar('DATABASE_URL', previousDatabaseUrl)
      restoreEnvVar('NODE_ENV', previousNodeEnv)
    }
  })

  test('rejects remote file database urls before loading the runtime', async () => {
    const { seedDatabase } = await import('../src/seed')
    const previousDatabaseAuthToken = process.env.DATABASE_AUTH_TOKEN
    const previousDatabaseUrl = process.env.DATABASE_URL
    const previousNodeEnv = process.env.NODE_ENV

    process.env.DATABASE_AUTH_TOKEN = 'no-token'
    process.env.DATABASE_URL = 'file://fileserver/share/dev.sqlite'
    process.env.NODE_ENV = 'development'

    try {
      await expect(seedDatabase()).rejects.toThrow('db:seed only supports local DATABASE_URL values.')
    } finally {
      restoreEnvVar('DATABASE_AUTH_TOKEN', previousDatabaseAuthToken)
      restoreEnvVar('DATABASE_URL', previousDatabaseUrl)
      restoreEnvVar('NODE_ENV', previousNodeEnv)
    }
  })

  test('rejects localhost network databases that still require auth tokens', async () => {
    const { seedDatabase } = await import('../src/seed')
    const previousDatabaseAuthToken = process.env.DATABASE_AUTH_TOKEN
    const previousDatabaseUrl = process.env.DATABASE_URL
    const previousNodeEnv = process.env.NODE_ENV

    process.env.DATABASE_AUTH_TOKEN = 'proxy-token'
    process.env.DATABASE_URL = 'http://localhost:8080'
    process.env.NODE_ENV = 'development'

    try {
      await expect(seedDatabase()).rejects.toThrow(
        'db:seed only supports local network DATABASE_URL values when DATABASE_AUTH_TOKEN=no-token.',
      )
    } finally {
      restoreEnvVar('DATABASE_AUTH_TOKEN', previousDatabaseAuthToken)
      restoreEnvVar('DATABASE_URL', previousDatabaseUrl)
      restoreEnvVar('NODE_ENV', previousNodeEnv)
    }
  })

  test('allows the no-token fallback before local network validation', () => {
    const result = runSeedScript('', 'http://127.0.0.1:65535')
    const output = [decodeOutput(result.stdout), decodeOutput(result.stderr)].join('\n')

    expect(result.exitCode).not.toBe(0)
    expect(output).not.toContain(
      'db:seed only supports local network DATABASE_URL values when DATABASE_AUTH_TOKEN=no-token.',
    )
  })

  test('supports file database urls without requiring a database auth token', () => {
    const databaseUrl = createDatabaseUrl('file-tokenless.sqlite')

    syncDatabase(databaseUrl, 'no-token')

    const result = runSeedScript('', databaseUrl)

    expect(result.exitCode).toBe(0)
  })
})
