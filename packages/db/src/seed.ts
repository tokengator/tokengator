import dotenv from 'dotenv'
import { resolve } from 'node:path'

import { alice, bob, createDevSeedUsers } from './dev-seed-users'
import { isLocalDatabaseUrl } from './lib/local-database-url'
import * as assetSchema from './schema/asset'
import * as authSchema from './schema/auth'

const API_ENV_PATH = resolve(import.meta.dir, '..', '..', '..', 'apps', 'api', '.env')

dotenv.config({
  path: API_ENV_PATH,
  quiet: true,
})

const DEV_PRIMARY_ORGANIZATION_SLUG = 'acme'
const DEV_SEED_NAMESPACE = 'dev'
const SEED_SKIPPED_MESSAGE = 'Skipping local development seed because existing user or organization data was found.'
const devSeedUsers = createDevSeedUsers()
const devSeedAssetGroups = [
  {
    address: '5XSXoWkcmynUSiwoi7XByRDiV9eomTgZQywgWrpYzKZ8',
    enabled: true,
    label: 'PERK',
    type: 'collection',
  },
  {
    address: 'FLJYGHpCCcfYUdzhcfHSeSd2peb5SMajNWaCsRnhpump',
    enabled: true,
    label: 'STORE',
    type: 'mint',
  },
] as const

function createSeedOrganizationMetadata(slug: string) {
  return JSON.stringify({
    seed: DEV_SEED_NAMESPACE,
    slug,
  })
}

function getRequiredDevSeedUser(username: string) {
  const user = devSeedUsers.find((candidate) => candidate.username === username)

  if (!user) {
    throw new Error(`Missing dev seed user for username ${username}.`)
  }

  return user
}

const devAdminUser = getRequiredDevSeedUser(alice.username)
const devBobUser = getRequiredDevSeedUser(bob.username)
const devCarolUser = getRequiredDevSeedUser('carol')
const devSeedOrganizations = [
  {
    logo: null,
    members: [
      {
        email: devAdminUser.email,
        role: 'admin',
      },
      {
        email: devBobUser.email,
        role: 'owner',
      },
    ].sort((left, right) => left.email.localeCompare(right.email)),
    metadata: createSeedOrganizationMetadata('acme'),
    name: 'Acme',
    slug: 'acme',
  },
  {
    logo: null,
    members: [
      {
        email: devAdminUser.email,
        role: 'admin',
      },
      {
        email: devCarolUser.email,
        role: 'owner',
      },
    ].sort((left, right) => left.email.localeCompare(right.email)),
    metadata: createSeedOrganizationMetadata('beacon'),
    name: 'Beacon',
    slug: 'beacon',
  },
].sort((left, right) => left.slug.localeCompare(right.slug))
const primaryDevSeedOrganization = devSeedOrganizations.find(
  (organization) => organization.slug === DEV_PRIMARY_ORGANIZATION_SLUG,
)

if (!primaryDevSeedOrganization) {
  throw new Error(`Missing primary dev seed organization for slug ${DEV_PRIMARY_ORGANIZATION_SLUG}.`)
}

export const devSeed = {
  assetGroups: devSeedAssetGroups,
  organization: primaryDevSeedOrganization,
  organizations: devSeedOrganizations,
  users: devSeedUsers,
} as const

type RuntimeModules = {
  db: Awaited<typeof import('./index.ts')>['db']
}

type CompletedSeedResult = {
  organizationCount: number
  organizationId: string
  organizationIdsBySlug: Record<string, string>
  skipped: false
  userCount: number
}

type SeedOrganization = (typeof devSeed.organizations)[number]
type SeedResult = CompletedSeedResult | { skipped: true }
type SeedUser = (typeof devSeed.users)[number]
type SeededUserRecord = {
  email: string
  id: string
  name: string
  role: 'admin' | 'user'
  username: string
}

function hasSolanaFixture(seedUser: SeedUser): seedUser is SeedUser & { solana: NonNullable<SeedUser['solana']> } {
  return seedUser.solana !== undefined
}

function ensureSeedRuntimeEnv() {
  process.env.DATABASE_AUTH_TOKEN ||= 'no-token'
}

function assertLocalSeedRuntime() {
  const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN
  const databaseUrl = process.env.DATABASE_URL
  const nodeEnv = process.env.NODE_ENV ?? 'development'

  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error(`db:seed only supports local development and test runs. Received NODE_ENV=${nodeEnv}.`)
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set before running db:seed.')
  }

  if (!isLocalDatabaseUrl(databaseUrl)) {
    throw new Error('db:seed only supports local DATABASE_URL values.')
  }

  if (new URL(databaseUrl).protocol !== 'file:' && databaseAuthToken !== 'no-token') {
    throw new Error('db:seed only supports local network DATABASE_URL values when DATABASE_AUTH_TOKEN=no-token.')
  }
}

async function createSeedAssetGroups(db: RuntimeModules['db']) {
  if (!devSeed.assetGroups.length) {
    return
  }

  await db.insert(assetSchema.assetGroup).values(
    devSeed.assetGroups.map((assetGroup) => ({
      address: assetGroup.address,
      enabled: assetGroup.enabled,
      label: assetGroup.label,
      type: assetGroup.type,
    })),
  )
}

function createSeedMembershipValues(args: {
  organizationId: string
  organizationMembers: SeedOrganization['members']
  usersByEmail: Map<string, SeededUserRecord>
}) {
  const { organizationId, organizationMembers, usersByEmail } = args

  return organizationMembers.map((membership) => {
    const user = usersByEmail.get(membership.email)

    if (!user) {
      throw new Error(`Seed user ${membership.email} must exist before seeding organizations.`)
    }

    return {
      id: crypto.randomUUID(),
      organizationId,
      role: membership.role,
      userId: user.id,
    }
  })
}

function createSeedOrganizationSummary(organization: SeedOrganization) {
  const members = organization.members
    .map((membership) => {
      const user = devSeed.users.find((candidate) => candidate.email === membership.email)

      if (!user) {
        throw new Error(`Seed user ${membership.email} must exist before printing organization summaries.`)
      }

      return `@${user.username} ${membership.role}`
    })
    .join(', ')

  return `Organization: ${organization.name} (${organization.slug}) [${members}]`
}

function createSeedSiwsAccountValues(seedUsers: readonly SeedUser[], usersByEmail: Map<string, SeededUserRecord>) {
  return seedUsers
    .filter(hasSolanaFixture)
    .map((seedUser) => {
      const user = usersByEmail.get(seedUser.email)

      if (!user) {
        throw new Error(`Seed user ${seedUser.email} must exist before seeding SIWS accounts.`)
      }

      return {
        accountId: seedUser.solana.publicKey,
        createdAt: new Date(),
        id: crypto.randomUUID(),
        providerId: 'siws',
        updatedAt: new Date(),
        userId: user.id,
      }
    })
    .sort((left, right) => left.accountId.localeCompare(right.accountId))
}

async function createSeedOrganizations(db: RuntimeModules['db'], usersByEmail: Map<string, SeededUserRecord>) {
  const organizationIdsBySlug: Record<string, string> = {}

  for (const organization of devSeed.organizations) {
    const organizationId = crypto.randomUUID()
    const membershipValues = createSeedMembershipValues({
      organizationId,
      organizationMembers: organization.members,
      usersByEmail,
    })

    await db.insert(authSchema.organization).values({
      id: organizationId,
      logo: organization.logo,
      metadata: organization.metadata,
      name: organization.name,
      slug: organization.slug,
    })
    await db.insert(authSchema.member).values(membershipValues)

    organizationIdsBySlug[organization.slug] = organizationId
  }

  return organizationIdsBySlug
}

function createSeedSolanaWalletValues(seedUsers: readonly SeedUser[], usersByEmail: Map<string, SeededUserRecord>) {
  return seedUsers
    .filter(hasSolanaFixture)
    .map((seedUser) => {
      const user = usersByEmail.get(seedUser.email)

      if (!user) {
        throw new Error(`Seed user ${seedUser.email} must exist before seeding Solana wallets.`)
      }

      return {
        address: seedUser.solana.publicKey,
        isPrimary: true,
        userId: user.id,
      }
    })
    .sort((left, right) => left.address.localeCompare(right.address))
}

async function createSeedUsers(db: RuntimeModules['db']) {
  const usersByEmail = new Map<string, SeededUserRecord>()

  for (const seedUser of devSeed.users) {
    const userValues = {
      email: seedUser.email,
      emailVerified: true,
      id: crypto.randomUUID(),
      name: seedUser.name,
      role: seedUser.expectedRole,
      username: seedUser.username,
    } satisfies typeof authSchema.user.$inferInsert

    await db.insert(authSchema.user).values(userValues)
    usersByEmail.set(seedUser.email, {
      email: seedUser.email,
      id: userValues.id,
      name: seedUser.name,
      role: seedUser.expectedRole,
      username: seedUser.username,
    })
  }

  const seedSiwsAccountValues = createSeedSiwsAccountValues(devSeed.users, usersByEmail)
  const seedSolanaWalletValues = createSeedSolanaWalletValues(devSeed.users, usersByEmail)

  if (seedSiwsAccountValues.length) {
    await db.insert(authSchema.account).values(seedSiwsAccountValues)
  }

  if (seedSolanaWalletValues.length) {
    await db.insert(authSchema.solanaWallet).values(seedSolanaWalletValues)
  }

  return usersByEmail
}

async function hasExistingSeedManagedData(db: RuntimeModules['db']) {
  const [[organization], [user]] = await Promise.all([
    db
      .select({
        id: authSchema.organization.id,
      })
      .from(authSchema.organization)
      .limit(1),
    db
      .select({
        id: authSchema.user.id,
      })
      .from(authSchema.user)
      .limit(1),
  ])

  return organization !== undefined || user !== undefined
}

function getRequiredOrganizationId(organizationIdsBySlug: Record<string, string>, slug: string) {
  const organizationId = organizationIdsBySlug[slug]

  if (!organizationId) {
    throw new Error(`Missing organization id for seed organization ${slug}.`)
  }

  return organizationId
}

async function loadRuntime(): Promise<RuntimeModules> {
  const { db } = await import('./index')

  return {
    db,
  }
}

export async function seedDatabase(): Promise<SeedResult> {
  ensureSeedRuntimeEnv()
  assertLocalSeedRuntime()

  const runtime = await loadRuntime()

  if (await hasExistingSeedManagedData(runtime.db)) {
    return {
      skipped: true,
    }
  }

  const usersByEmail = await createSeedUsers(runtime.db)
  const organizationIdsBySlug = await createSeedOrganizations(runtime.db, usersByEmail)

  await createSeedAssetGroups(runtime.db)

  return {
    organizationCount: devSeed.organizations.length,
    organizationId: getRequiredOrganizationId(organizationIdsBySlug, DEV_PRIMARY_ORGANIZATION_SLUG),
    organizationIdsBySlug,
    skipped: false,
    userCount: devSeed.users.length,
  }
}

if (import.meta.main) {
  const summary = await seedDatabase()

  if (summary.skipped) {
    console.log(SEED_SKIPPED_MESSAGE)
    process.exit(0)
  }

  console.log(
    [
      'Seeded local development data.',
      `Users: ${devSeed.users.map((user) => `${user.name} (@${user.username})`).join(', ')}`,
      `Solana sign-in fixtures: ${devSeed.users
        .filter(hasSolanaFixture)
        .map((user) => `@${user.username}`)
        .join(', ')}`,
      ...devSeed.organizations.map((organization) => createSeedOrganizationSummary(organization)),
      `Seeded organizations: ${summary.organizationCount}`,
      `Seeded users: ${summary.userCount}`,
    ].join('\n'),
  )
}
