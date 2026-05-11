import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { asc, eq, sql } from 'drizzle-orm'

type AuthSchema = typeof import('@tokengator/db/schema/auth')
type DatabaseClient = (typeof import('@tokengator/db'))['db']
type DevImportModule = typeof import('../src/features/dev/data-access/dev-pubkey-link-import')

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const ENV_KEYS = [
  'API_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_SOLANA_SIGN_IN_ENABLED',
  'CORS_ORIGINS',
  'DATABASE_AUTH_TOKEN',
  'DATABASE_URL',
  'DISCORD_ADMIN_IDS',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'HELIUS_API_KEY',
  'HELIUS_CLUSTER',
  'NODE_ENV',
  'SOLANA_ADMIN_ADDRESSES',
  'SOLANA_CLUSTER',
  'SOLANA_ENDPOINT_PUBLIC',
] as const
const FIXED_NOW = new Date('2026-04-20T12:00:00.000Z')
const PREVIOUS_ENV = {} as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-api-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'dev-pubkey-link-import.sqlite')).toString()

let authSchema: AuthSchema
let database: DatabaseClient
let devImportModule: DevImportModule

function createBackupPayload() {
  return {
    data: {
      users: [
        {
          avatarUrl: 'https://cdn.discordapp.com/avatars/111111111111111111/avatar.png?size=512',
          createdAt: '2025-01-01T00:00:00.000Z',
          id: 'backup-beta',
          identities: [
            {
              createdAt: '2025-01-01T00:00:00.000Z',
              profile: {
                avatarUrl: 'https://cdn.discordapp.com/avatars/111111111111111111/avatar.png?size=512',
                name: 'Imported Beta',
                username: 'merge.me',
              },
              provider: 'Discord',
              providerId: '111111111111111111',
              updatedAt: '2025-01-02T00:00:00.000Z',
            },
            {
              createdAt: '2025-01-01T00:05:00.000Z',
              profile: null,
              provider: 'Solana',
              providerId: 'BetaWallet1111111111111111111111111111111111',
              updatedAt: '2025-01-02T00:05:00.000Z',
            },
          ],
          name: 'Imported Beta',
          updatedAt: '2025-01-02T00:00:00.000Z',
          username: 'merge.me',
        },
        {
          avatarUrl: 'https://cdn.discordapp.com/avatars/140293864211611648/avatar.png?size=512',
          createdAt: '2025-02-01T00:00:00.000Z',
          id: 'backup-sosilver',
          identities: [
            {
              createdAt: '2025-02-01T00:00:00.000Z',
              profile: {
                avatarUrl: 'https://cdn.discordapp.com/avatars/140293864211611648/avatar.png?size=512',
                name: 'SoSilver',
                username: 'sosilver',
              },
              provider: 'Discord',
              providerId: '140293864211611648',
              updatedAt: '2025-02-01T00:00:00.000Z',
            },
            {
              createdAt: '2025-02-01T00:10:00.000Z',
              profile: {
                avatarUrl: 'https://cdn.discordapp.com/avatars/628311820524060703/avatar.png?size=512',
                name: 'SoSilver Alt',
                username: 'sosilver_alt',
              },
              provider: 'Discord',
              providerId: '628311820524060703',
              updatedAt: '2025-02-01T00:10:00.000Z',
            },
            {
              createdAt: '2025-02-01T00:20:00.000Z',
              profile: null,
              provider: 'Solana',
              providerId: '5eU4n3tGs1XkHXmHP1LgGWPWzog6MwuoEEhE4A9GV9fs',
              updatedAt: '2025-02-01T00:20:00.000Z',
            },
            {
              createdAt: '2025-02-01T00:21:00.000Z',
              profile: null,
              provider: 'Solana',
              providerId: '6taovJWhjQrFiHrUznrjKN7Mp42CVkVHibcoL6dqSssa',
              updatedAt: '2025-02-01T00:21:00.000Z',
            },
          ],
          name: 'SoSilver',
          updatedAt: '2025-02-01T00:00:00.000Z',
          username: 'sosilver',
        },
        {
          avatarUrl: null,
          createdAt: '2025-03-01T00:00:00.000Z',
          id: 'backup-gamma',
          identities: [
            {
              createdAt: '2025-03-01T00:00:00.000Z',
              profile: null,
              provider: 'Solana',
              providerId: 'GammaWallet111111111111111111111111111111111',
              updatedAt: '2025-03-01T00:00:00.000Z',
            },
          ],
          name: 'Gamma',
          updatedAt: '2025-03-01T00:00:00.000Z',
          username: 'gamma',
        },
        {
          avatarUrl: 'https://cdn.discordapp.com/avatars/222222222222222222/avatar.png?size=512',
          createdAt: '2025-04-01T00:00:00.000Z',
          id: 'backup-delta',
          identities: [
            {
              createdAt: '2025-04-01T00:00:00.000Z',
              profile: {
                avatarUrl: 'https://cdn.discordapp.com/avatars/222222222222222222/avatar.png?size=512',
                name: 'Delta',
                username: 'delta',
              },
              provider: 'Discord',
              providerId: '222222222222222222',
              updatedAt: '2025-04-01T00:00:00.000Z',
            },
            {
              createdAt: '2025-04-01T00:10:00.000Z',
              profile: null,
              provider: 'Solana',
              providerId: 'DeltaWallet111111111111111111111111111111111',
              updatedAt: '2025-04-01T00:10:00.000Z',
            },
          ],
          name: 'Delta',
          updatedAt: '2025-04-01T00:00:00.000Z',
          username: 'delta',
        },
        {
          avatarUrl: 'https://cdn.discordapp.com/avatars/333333333456789/avatar.png?size=512',
          createdAt: '2025-05-01T00:00:00.000Z',
          id: 'backup-takenname',
          identities: [
            {
              createdAt: '2025-05-01T00:00:00.000Z',
              profile: {
                avatarUrl: 'https://cdn.discordapp.com/avatars/333333333456789/avatar.png?size=512',
                name: 'Taken Name',
                username: 'takenname',
              },
              provider: 'Discord',
              providerId: '333333333456789',
              updatedAt: '2025-05-01T00:00:00.000Z',
            },
          ],
          name: 'Taken Name',
          updatedAt: '2025-05-01T00:00:00.000Z',
          username: 'takenname',
        },
      ],
      usersCount: 5,
    },
    meta: {
      backupName: 'sample.backup.json',
      timestamp: '2026-04-20T09:32:25.934Z',
    },
  }
}

function createFetch(payload = createBackupPayload()) {
  return async () => Response.json(payload)
}

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

async function insertAccount(input: { accountId: string; createdAt?: Date; id: string; userId: string }) {
  const createdAt = input.createdAt ?? new Date('2026-04-10T00:00:00.000Z')

  await database.insert(authSchema.account).values({
    accountId: input.accountId,
    createdAt,
    id: input.id,
    providerId: 'discord',
    updatedAt: createdAt,
    userId: input.userId,
  })
}

async function insertIdentity(input: {
  avatarUrl?: string | null
  displayName?: string | null
  email?: string | null
  id: string
  isPrimary?: boolean
  linkedAt?: Date
  profile?: string | null
  provider: 'discord' | 'solana'
  providerId: string
  referenceId: string
  referenceType: 'account' | 'solana_wallet'
  userId: string
  username?: string | null
}) {
  const linkedAt = input.linkedAt ?? new Date('2026-04-10T00:00:00.000Z')

  await database.insert(authSchema.identity).values({
    avatarUrl: input.avatarUrl ?? null,
    createdAt: linkedAt,
    displayName: input.displayName ?? null,
    email: input.email ?? null,
    id: input.id,
    isPrimary: input.isPrimary ?? false,
    lastSyncedAt: linkedAt,
    linkedAt,
    profile: input.profile ?? null,
    provider: input.provider,
    providerId: input.providerId,
    referenceId: input.referenceId,
    referenceType: input.referenceType,
    updatedAt: linkedAt,
    userId: input.userId,
    username: input.username ?? null,
  })
}

async function insertSolanaWallet(input: {
  address: string
  createdAt?: Date
  id: string
  isPrimary?: boolean
  userId: string
}) {
  await database.insert(authSchema.solanaWallet).values({
    address: input.address,
    createdAt: input.createdAt ?? new Date('2026-04-10T00:00:00.000Z'),
    id: input.id,
    isPrimary: input.isPrimary ?? false,
    name: null,
    userId: input.userId,
  })
}

async function insertUser(input: {
  email: string
  id: string
  image?: string | null
  name: string
  username: string | null
}) {
  const now = new Date('2026-04-10T00:00:00.000Z')

  await database.insert(authSchema.user).values({
    createdAt: now,
    email: input.email,
    emailVerified: true,
    id: input.id,
    image: input.image ?? null,
    name: input.name,
    role: 'user',
    updatedAt: now,
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
  process.env.DISCORD_ADMIN_IDS = ''
  process.env.DISCORD_BOT_TOKEN = 'discord-bot-token'
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_ADMIN_ADDRESSES = ''
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  syncDatabase(TEST_DATABASE_URL)

  ;({ db: database } = await import('@tokengator/db'))
  authSchema = await import('@tokengator/db/schema/auth')
  devImportModule = await import('../src/features/dev/data-access/dev-pubkey-link-import')
}, 20_000)

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
  await database.delete(authSchema.user).where(sql`1 = 1`)
})

describe('dev pubkey-link import', () => {
  test('preview classifies creates, merges, skips, conflicts, and username rewrites', async () => {
    await insertUser({
      email: 'beta@example.com',
      id: 'user-beta',
      image: 'https://example.com/current-beta.png',
      name: 'Current Beta',
      username: 'currentbeta',
    })
    await insertAccount({
      accountId: '111111111111111111',
      id: 'account-beta',
      userId: 'user-beta',
    })
    await insertIdentity({
      avatarUrl: 'https://example.com/current-beta.png',
      displayName: 'Current Beta',
      email: 'beta@example.com',
      id: 'identity-beta',
      isPrimary: true,
      provider: 'discord',
      providerId: '111111111111111111',
      referenceId: 'account-beta',
      referenceType: 'account',
      userId: 'user-beta',
      username: 'currentbeta',
    })
    await insertUser({
      email: 'conflict-a@example.com',
      id: 'user-conflict-a',
      name: 'Conflict A',
      username: 'conflict.a',
    })
    await insertAccount({
      accountId: '222222222222222222',
      id: 'account-conflict-a',
      userId: 'user-conflict-a',
    })
    await insertUser({
      email: 'conflict-b@example.com',
      id: 'user-conflict-b',
      name: 'Conflict B',
      username: 'conflict.b',
    })
    await insertSolanaWallet({
      address: 'DeltaWallet111111111111111111111111111111111',
      id: 'wallet-conflict-b',
      isPrimary: true,
      userId: 'user-conflict-b',
    })
    await insertUser({
      email: 'taken@example.com',
      id: 'user-taken',
      name: 'Taken User',
      username: 'takenname',
    })

    const previewResult = await devImportModule.devPubkeyLinkImportPreview(
      {
        sourceUrl: 'https://example.com/pubkey-link.backup.json',
      },
      {
        database,
        fetch: createFetch(),
        now: () => FIXED_NOW,
      },
    )

    expect(previewResult.backup).toEqual({
      backupName: 'sample.backup.json',
      fetchedAt: FIXED_NOW.toISOString(),
      sourceUrl: 'https://example.com/pubkey-link.backup.json',
      sourceUsersCount: 5,
      timestamp: '2026-04-20T09:32:25.934Z',
    })
    expect(previewResult.summary).toEqual({
      createDiscordAccountCount: 3,
      createIdentityCount: 6,
      createSolanaWalletCount: 3,
      createUserCount: 2,
      mergeUserCount: 1,
      skipConflictCount: 1,
      skipEmailConflictCount: 0,
      skipMissingDiscordCount: 1,
      skipUserCount: 2,
      totalUserCount: 5,
      unchangedUserCount: 0,
      usernameRewriteCount: 1,
    })

    const betaUser = previewResult.users.find((user) => user.source.backupUserId === 'backup-beta')
    const deltaUser = previewResult.users.find((user) => user.source.backupUserId === 'backup-delta')
    const gammaUser = previewResult.users.find((user) => user.source.backupUserId === 'backup-gamma')
    const sosilverUser = previewResult.users.find((user) => user.source.backupUserId === 'backup-sosilver')
    const takenNameUser = previewResult.users.find((user) => user.source.backupUserId === 'backup-takenname')

    expect(betaUser).toMatchObject({
      action: 'merge',
      existingUser: {
        id: 'user-beta',
        username: 'currentbeta',
      },
      operations: {
        createDiscordAccountCount: 0,
        createIdentityCount: 1,
        createSolanaWalletCount: 1,
        createUser: false,
      },
    })
    expect(deltaUser).toMatchObject({
      action: 'skip',
      matches: [
        {
          id: 'user-conflict-a',
          kinds: ['discord'],
          username: 'conflict.a',
        },
        {
          id: 'user-conflict-b',
          kinds: ['solana'],
          username: 'conflict.b',
        },
      ],
      skipReason: 'conflict',
    })
    expect(gammaUser).toMatchObject({
      action: 'skip',
      skipReason: 'missing_discord_identity',
    })
    expect(sosilverUser).toMatchObject({
      action: 'create',
      operations: {
        createDiscordAccountCount: 2,
        createIdentityCount: 4,
        createSolanaWalletCount: 2,
        createUser: true,
      },
    })
    expect(takenNameUser?.usernameRewrite).toEqual({
      backupUserId: 'backup-takenname',
      finalUsername: 'takenname_456789',
      originalUsername: 'takenname',
      reason: 'collision',
    })
    expect(previewResult.usernameRewrites).toEqual([
      {
        backupUserId: 'backup-takenname',
        finalUsername: 'takenname_456789',
        originalUsername: 'takenname',
        reason: 'collision',
      },
    ])
  })

  test('preview rejects duplicate backup identifiers before planning', async () => {
    const payload = createBackupPayload()

    payload.data.users[1]!.identities[0]!.providerId = '111111111111111111'

    await expect(
      devImportModule.devPubkeyLinkImportPreview(
        {
          sourceUrl: 'https://example.com/pubkey-link.backup.json',
        },
        {
          database,
          fetch: createFetch(payload),
          now: () => FIXED_NOW,
        },
      ),
    ).rejects.toThrow('Backup contains duplicate identifiers across users: backup-beta, backup-sosilver.')
  })

  test('apply creates and merges users, preserves matched profile fields, and is idempotent', async () => {
    await insertUser({
      email: 'beta@example.com',
      id: 'user-beta',
      image: 'https://example.com/current-beta.png',
      name: 'Current Beta',
      username: 'currentbeta',
    })
    await insertAccount({
      accountId: '111111111111111111',
      id: 'account-beta',
      userId: 'user-beta',
    })
    await insertIdentity({
      avatarUrl: 'https://example.com/current-beta.png',
      displayName: 'Current Beta',
      email: 'beta@example.com',
      id: 'identity-beta',
      isPrimary: true,
      provider: 'discord',
      providerId: '111111111111111111',
      referenceId: 'account-beta',
      referenceType: 'account',
      userId: 'user-beta',
      username: 'currentbeta',
    })
    await insertUser({
      email: 'conflict-a@example.com',
      id: 'user-conflict-a',
      name: 'Conflict A',
      username: 'conflict.a',
    })
    await insertAccount({
      accountId: '222222222222222222',
      id: 'account-conflict-a',
      userId: 'user-conflict-a',
    })
    await insertUser({
      email: 'conflict-b@example.com',
      id: 'user-conflict-b',
      name: 'Conflict B',
      username: 'conflict.b',
    })
    await insertSolanaWallet({
      address: 'DeltaWallet111111111111111111111111111111111',
      id: 'wallet-conflict-b',
      isPrimary: true,
      userId: 'user-conflict-b',
    })
    await insertUser({
      email: 'taken@example.com',
      id: 'user-taken',
      name: 'Taken User',
      username: 'takenname',
    })

    const firstApplyResult = await devImportModule.devPubkeyLinkImportApply(
      {
        sourceUrl: 'https://example.com/pubkey-link.backup.json',
      },
      {
        database,
        fetch: createFetch(),
        now: () => FIXED_NOW,
      },
    )

    expect(firstApplyResult.appliedSummary).toEqual({
      appliedUserCount: 3,
      createDiscordAccountCount: 3,
      createIdentityCount: 6,
      createSolanaWalletCount: 3,
      createUserCount: 2,
    })

    const users = await database
      .select({
        email: authSchema.user.email,
        id: authSchema.user.id,
        image: authSchema.user.image,
        name: authSchema.user.name,
        username: authSchema.user.username,
      })
      .from(authSchema.user)
      .orderBy(asc(authSchema.user.username), asc(authSchema.user.id))
    const accounts = await database
      .select({
        accountId: authSchema.account.accountId,
        userId: authSchema.account.userId,
      })
      .from(authSchema.account)
      .where(eq(authSchema.account.providerId, 'discord'))
      .orderBy(asc(authSchema.account.accountId), asc(authSchema.account.userId))
    const identities = await database
      .select({
        provider: authSchema.identity.provider,
        providerId: authSchema.identity.providerId,
        userId: authSchema.identity.userId,
      })
      .from(authSchema.identity)
      .orderBy(asc(authSchema.identity.provider), asc(authSchema.identity.providerId), asc(authSchema.identity.userId))
    const wallets = await database
      .select({
        address: authSchema.solanaWallet.address,
        isPrimary: authSchema.solanaWallet.isPrimary,
        userId: authSchema.solanaWallet.userId,
      })
      .from(authSchema.solanaWallet)
      .orderBy(asc(authSchema.solanaWallet.address), asc(authSchema.solanaWallet.userId))

    const betaUser = users.find((userRecord) => userRecord.id === 'user-beta')
    const sosilverUser = users.find((userRecord) => userRecord.username === 'sosilver')
    const takenNameUser = users.find((userRecord) => userRecord.username === 'takenname_456789')
    const sosilverUserId = sosilverUser?.id
    const takenNameUserId = takenNameUser?.id

    if (!sosilverUserId || !takenNameUserId) {
      throw new Error('Expected the imported users to exist after apply.')
    }

    expect(betaUser).toEqual({
      email: 'beta@example.com',
      id: 'user-beta',
      image: 'https://example.com/current-beta.png',
      name: 'Current Beta',
      username: 'currentbeta',
    })
    expect(sosilverUser?.email).toBe('140293864211611648@discord.127.0.0.1')
    expect(takenNameUser?.email).toBe('333333333456789@discord.127.0.0.1')
    expect(accounts).toEqual([
      {
        accountId: '111111111111111111',
        userId: 'user-beta',
      },
      {
        accountId: '140293864211611648',
        userId: sosilverUserId,
      },
      {
        accountId: '222222222222222222',
        userId: 'user-conflict-a',
      },
      {
        accountId: '333333333456789',
        userId: takenNameUserId,
      },
      {
        accountId: '628311820524060703',
        userId: sosilverUserId,
      },
    ])
    expect(identities).toEqual(
      expect.arrayContaining([
        {
          provider: 'discord',
          providerId: '111111111111111111',
          userId: 'user-beta',
        },
        {
          provider: 'solana',
          providerId: 'BetaWallet1111111111111111111111111111111111',
          userId: 'user-beta',
        },
        {
          provider: 'discord',
          providerId: '140293864211611648',
          userId: sosilverUserId,
        },
        {
          provider: 'discord',
          providerId: '628311820524060703',
          userId: sosilverUserId,
        },
        {
          provider: 'solana',
          providerId: '5eU4n3tGs1XkHXmHP1LgGWPWzog6MwuoEEhE4A9GV9fs',
          userId: sosilverUserId,
        },
        {
          provider: 'solana',
          providerId: '6taovJWhjQrFiHrUznrjKN7Mp42CVkVHibcoL6dqSssa',
          userId: sosilverUserId,
        },
        {
          provider: 'discord',
          providerId: '333333333456789',
          userId: takenNameUserId,
        },
      ]),
    )
    expect(identities).toHaveLength(7)
    expect(wallets).toEqual(
      expect.arrayContaining([
        {
          address: '5eU4n3tGs1XkHXmHP1LgGWPWzog6MwuoEEhE4A9GV9fs',
          isPrimary: true,
          userId: sosilverUserId,
        },
        {
          address: '6taovJWhjQrFiHrUznrjKN7Mp42CVkVHibcoL6dqSssa',
          isPrimary: false,
          userId: sosilverUserId,
        },
        {
          address: 'BetaWallet1111111111111111111111111111111111',
          isPrimary: true,
          userId: 'user-beta',
        },
      ]),
    )
    expect(wallets).toHaveLength(4)

    const secondApplyResult = await devImportModule.devPubkeyLinkImportApply(
      {
        sourceUrl: 'https://example.com/pubkey-link.backup.json',
      },
      {
        database,
        fetch: createFetch(),
        now: () => FIXED_NOW,
      },
    )

    expect(secondApplyResult.appliedSummary).toEqual({
      appliedUserCount: 0,
      createDiscordAccountCount: 0,
      createIdentityCount: 0,
      createSolanaWalletCount: 0,
      createUserCount: 0,
    })
    expect(secondApplyResult.summary).toEqual({
      createDiscordAccountCount: 0,
      createIdentityCount: 0,
      createSolanaWalletCount: 0,
      createUserCount: 0,
      mergeUserCount: 0,
      skipConflictCount: 1,
      skipEmailConflictCount: 0,
      skipMissingDiscordCount: 1,
      skipUserCount: 2,
      totalUserCount: 5,
      unchangedUserCount: 3,
      usernameRewriteCount: 0,
    })
  })
})
