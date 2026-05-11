import { and, asc, eq, inArray, or } from 'drizzle-orm'
import { reconcileLocalUserState } from '@tokengator/auth'
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  isValidUsername,
  normalizeUsername,
} from '@tokengator/auth/lib/username'
import type { Database } from '@tokengator/db'
import { db } from '@tokengator/db'
import { account, identity, solanaWallet, user } from '@tokengator/db/schema/auth'
import { env } from '@tokengator/env/api'

import type { DevPubkeyLinkImportInput } from './dev-pubkey-link-import-input-schema'
import type {
  DevPubkeyLinkImportApplyResult,
  DevPubkeyLinkImportBackupEntity,
  DevPubkeyLinkImportMatchEntity,
  DevPubkeyLinkImportMatchKind,
  DevPubkeyLinkImportPreviewResult,
  DevPubkeyLinkImportSkipReason,
  DevPubkeyLinkImportSummaryEntity,
  DevPubkeyLinkImportUserEntity,
  DevPubkeyLinkImportUsernameRewriteEntity,
  DevPubkeyLinkImportUsernameRewriteReason,
} from './dev-pubkey-link-import.entity'

type BackupMeta = {
  backupName: string | null
  timestamp: string | null
}

type ExistingAccountRecord = {
  accountId: string
  createdAt: Date
  id: string
  userId: string
}

type ExistingIdentityRecord = {
  id: string
  provider: 'discord' | 'solana'
  providerId: string
  referenceId: string
  referenceType: 'account' | 'solana_wallet'
  userId: string
}

type ExistingUserRecord = {
  email: string
  id: string
  image: string | null
  name: string
  username: string | null
}

type ExistingWalletRecord = {
  address: string
  createdAt: Date
  id: string
  isPrimary: boolean
  userId: string
}

type NormalizedDiscordIdentity = {
  avatarUrl: string | null
  createdAt: Date | null
  displayName: string | null
  profile: string | null
  providerId: string
  updatedAt: Date | null
  username: string | null
}

type NormalizedPubkeyLinkUser = {
  avatarUrl: string | null
  backupUserId: string
  createdAt: Date | null
  discordIdentities: NormalizedDiscordIdentity[]
  name: string | null
  solanaAddresses: string[]
  updatedAt: Date | null
  username: string
}

type PlannedCreateDiscordAccount = {
  createdAt: Date
  providerId: string
  updatedAt: Date
}

type PlannedCreateIdentity = {
  avatarUrl: string | null
  createdAt: Date
  displayName: string | null
  email: string | null
  isPrimary: boolean
  lastSyncedAt: Date
  linkedAt: Date
  profile: string | null
  provider: 'discord' | 'solana'
  providerId: string
  referenceType: 'account' | 'solana_wallet'
  updatedAt: Date
  username: string | null
}

type PlannedCreateSolanaWallet = {
  address: string
  createdAt: Date
  isPrimary: boolean
}

type PlannedUserImport = {
  compatibilityEmail: string | null
  createDiscordAccounts: PlannedCreateDiscordAccount[]
  createIdentities: PlannedCreateIdentity[]
  createSolanaWallets: PlannedCreateSolanaWallet[]
  createUser: boolean
  existingUser: ExistingUserRecord | null
  matches: DevPubkeyLinkImportMatchEntity[]
  nextUsername: string | null
  skipReason: DevPubkeyLinkImportSkipReason | null
  source: NormalizedPubkeyLinkUser
  userEntity: DevPubkeyLinkImportUserEntity
  usernameRewrite: DevPubkeyLinkImportUsernameRewriteEntity | null
}

type PubkeyLinkImportFetch = (input: URL | string, init?: RequestInit) => Promise<Response>

type PubkeyLinkImportDependencies = {
  database?: Database
  fetch?: PubkeyLinkImportFetch
  now?: () => Date
}

type PubkeyLinkImportLookupState = {
  accountsByDiscordId: Map<string, ExistingAccountRecord[]>
  identitiesByProviderId: Map<string, ExistingIdentityRecord[]>
  usersByCompatibilityEmail: Map<string, ExistingUserRecord[]>
  usersById: Map<string, ExistingUserRecord>
  usersByUsername: Map<string, ExistingUserRecord[]>
  walletsByAddress: Map<string, ExistingWalletRecord[]>
}

type RawBackupIdentity = {
  createdAt: string | null
  profile: unknown
  provider: 'Discord' | 'Solana'
  providerId: string
  updatedAt: string | null
}

type RawBackupUser = {
  avatarUrl: string | null
  createdAt: string | null
  id: string
  identities: RawBackupIdentity[]
  name: string | null
  username: string
  updatedAt: string | null
}

const BACKUP_FETCH_TIMEOUT_MS = 30_000

const backupIdentitySchema = {
  parse(value: unknown): RawBackupIdentity {
    if (!value || typeof value !== 'object') {
      throw new DevPubkeyLinkImportError('Backup contains an invalid identity entry.')
    }

    const identityRecord = value as Record<string, unknown>
    const createdAt = getOptionalIsoString(identityRecord.createdAt)
    const provider = identityRecord.provider
    const providerId = getRequiredString(identityRecord.providerId, 'Backup identity is missing providerId.')
    const updatedAt = getOptionalIsoString(identityRecord.updatedAt)

    if (provider !== 'Discord' && provider !== 'Solana') {
      throw new DevPubkeyLinkImportError(`Backup identity ${providerId} has an unsupported provider.`)
    }

    return {
      createdAt,
      profile: identityRecord.profile ?? null,
      provider,
      providerId,
      updatedAt,
    }
  },
}

const backupUserSchema = {
  parse(value: unknown): RawBackupUser {
    if (!value || typeof value !== 'object') {
      throw new DevPubkeyLinkImportError('Backup contains an invalid user entry.')
    }

    const userRecord = value as Record<string, unknown>
    const identities = getRequiredArray(userRecord.identities, 'Backup user is missing identities.').map((entry) =>
      backupIdentitySchema.parse(entry),
    )

    return {
      avatarUrl: getOptionalString(userRecord.avatarUrl),
      createdAt: getOptionalIsoString(userRecord.createdAt),
      id: getRequiredString(userRecord.id, 'Backup user is missing id.'),
      identities,
      name: getOptionalString(userRecord.name),
      updatedAt: getOptionalIsoString(userRecord.updatedAt),
      username: getRequiredString(userRecord.username, 'Backup user is missing username.'),
    }
  },
}

export class DevPubkeyLinkImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DevPubkeyLinkImportError'
  }
}

export async function devPubkeyLinkImportPreview(
  input: DevPubkeyLinkImportInput,
  dependencies: PubkeyLinkImportDependencies = {},
): Promise<DevPubkeyLinkImportPreviewResult> {
  const plan = await planPubkeyLinkImport(input, dependencies)

  return {
    backup: plan.backup,
    kind: 'preview',
    summary: plan.summary,
    usernameRewrites: plan.usernameRewrites,
    users: plan.users.map((plannedUser) => plannedUser.userEntity),
  }
}

export async function devPubkeyLinkImportApply(
  input: DevPubkeyLinkImportInput,
  dependencies: PubkeyLinkImportDependencies = {},
): Promise<DevPubkeyLinkImportApplyResult> {
  const database = dependencies.database ?? db
  const now = dependencies.now ?? (() => new Date())
  const plan = await planPubkeyLinkImport(input, dependencies)
  let appliedUserCount = 0
  let createDiscordAccountCount = 0
  let createIdentityCount = 0
  let createSolanaWalletCount = 0
  let createUserCount = 0

  for (const plannedUser of plan.users) {
    if (plannedUser.skipReason) {
      continue
    }

    const hasWrites =
      plannedUser.createUser ||
      plannedUser.createDiscordAccounts.length > 0 ||
      plannedUser.createIdentities.length > 0 ||
      plannedUser.createSolanaWallets.length > 0

    if (!hasWrites) {
      continue
    }

    const preservedUser =
      plannedUser.existingUser === null
        ? null
        : {
            image: plannedUser.existingUser.image,
            name: plannedUser.existingUser.name,
            username: plannedUser.existingUser.username,
          }
    const targetUserId = plannedUser.existingUser?.id ?? crypto.randomUUID()
    const createdUser = plannedUser.createUser
    const userEmail = plannedUser.compatibilityEmail

    await database.transaction(async (transaction) => {
      if (createdUser) {
        if (!userEmail || !plannedUser.nextUsername) {
          throw new DevPubkeyLinkImportError(`Unable to create a TokenGator user for ${plannedUser.source.username}.`)
        }

        await transaction.insert(user).values({
          createdAt: plannedUser.source.createdAt ?? now(),
          email: userEmail,
          emailVerified: true,
          id: targetUserId,
          image: plannedUser.source.avatarUrl,
          name: getUserName(plannedUser.source),
          role: 'user',
          updatedAt: plannedUser.source.updatedAt ?? plannedUser.source.createdAt ?? now(),
          username: plannedUser.nextUsername,
        })
      }

      const existingAccountRows = await transaction
        .select({
          accountId: account.accountId,
          id: account.id,
        })
        .from(account)
        .where(and(eq(account.providerId, 'discord'), eq(account.userId, targetUserId)))
        .orderBy(asc(account.accountId), asc(account.id))
      const existingIdentityRows = await transaction
        .select({
          id: identity.id,
          provider: identity.provider,
          providerId: identity.providerId,
          referenceId: identity.referenceId,
          referenceType: identity.referenceType,
        })
        .from(identity)
        .where(eq(identity.userId, targetUserId))
        .orderBy(asc(identity.provider), asc(identity.providerId), asc(identity.id))
      const existingWalletRows = await transaction
        .select({
          address: solanaWallet.address,
          id: solanaWallet.id,
          isPrimary: solanaWallet.isPrimary,
        })
        .from(solanaWallet)
        .where(eq(solanaWallet.userId, targetUserId))
        .orderBy(asc(solanaWallet.address), asc(solanaWallet.id))
      const accountIdByProviderId = new Map(existingAccountRows.map((record) => [record.accountId, record.id]))
      const identityKeySet = new Set(
        existingIdentityRows.map((record) => getIdentityLookupKey(record.provider, record.providerId, targetUserId)),
      )
      const walletIdByAddress = new Map(existingWalletRows.map((record) => [record.address, record.id]))
      let hasPrimaryWallet = existingWalletRows.some((record) => record.isPrimary)

      for (const plannedDiscordAccount of plannedUser.createDiscordAccounts) {
        if (accountIdByProviderId.has(plannedDiscordAccount.providerId)) {
          continue
        }

        const accountRowId = crypto.randomUUID()

        await transaction.insert(account).values({
          accountId: plannedDiscordAccount.providerId,
          createdAt: plannedDiscordAccount.createdAt,
          id: accountRowId,
          providerId: 'discord',
          updatedAt: plannedDiscordAccount.updatedAt,
          userId: targetUserId,
        })
        accountIdByProviderId.set(plannedDiscordAccount.providerId, accountRowId)
        createDiscordAccountCount += 1
      }

      for (const plannedWallet of plannedUser.createSolanaWallets) {
        if (walletIdByAddress.has(plannedWallet.address)) {
          continue
        }

        const walletRowId = crypto.randomUUID()

        await transaction.insert(solanaWallet).values({
          address: plannedWallet.address,
          createdAt: plannedWallet.createdAt,
          id: walletRowId,
          isPrimary: !hasPrimaryWallet && plannedWallet.isPrimary,
          name: null,
          userId: targetUserId,
        })
        hasPrimaryWallet ||= plannedWallet.isPrimary
        walletIdByAddress.set(plannedWallet.address, walletRowId)
        createSolanaWalletCount += 1
      }

      for (const plannedIdentity of plannedUser.createIdentities) {
        const identityKey = getIdentityLookupKey(plannedIdentity.provider, plannedIdentity.providerId, targetUserId)

        if (identityKeySet.has(identityKey)) {
          continue
        }

        const referenceId =
          plannedIdentity.referenceType === 'account'
            ? accountIdByProviderId.get(plannedIdentity.providerId)
            : walletIdByAddress.get(plannedIdentity.providerId)

        if (!referenceId) {
          throw new DevPubkeyLinkImportError(
            `Unable to resolve the ${plannedIdentity.referenceType} reference for ${plannedIdentity.providerId}.`,
          )
        }

        await transaction.insert(identity).values({
          avatarUrl: plannedIdentity.avatarUrl,
          createdAt: plannedIdentity.createdAt,
          displayName: plannedIdentity.displayName,
          email: plannedIdentity.email,
          id: crypto.randomUUID(),
          isPrimary: plannedIdentity.isPrimary,
          lastSyncedAt: plannedIdentity.lastSyncedAt,
          linkedAt: plannedIdentity.linkedAt,
          profile: plannedIdentity.profile,
          provider: plannedIdentity.provider,
          providerId: plannedIdentity.providerId,
          referenceId,
          referenceType: plannedIdentity.referenceType,
          updatedAt: plannedIdentity.updatedAt,
          userId: targetUserId,
          username: plannedIdentity.username,
        })
        identityKeySet.add(identityKey)
        createIdentityCount += 1
      }
    })

    await reconcileLocalUserState({
      userId: targetUserId,
    })

    if (preservedUser) {
      await database
        .update(user)
        .set({
          image: preservedUser.image,
          name: preservedUser.name,
          username: preservedUser.username,
        })
        .where(eq(user.id, targetUserId))
    }

    appliedUserCount += 1
    createUserCount += createdUser ? 1 : 0
  }

  return {
    appliedAt: now().toISOString(),
    appliedSummary: {
      appliedUserCount,
      createDiscordAccountCount,
      createIdentityCount,
      createSolanaWalletCount,
      createUserCount,
    },
    backup: plan.backup,
    kind: 'apply',
    summary: plan.summary,
    usernameRewrites: plan.usernameRewrites,
    users: plan.users.map((plannedUser) => plannedUser.userEntity),
  }
}

async function fetchPubkeyLinkBackup(
  sourceUrl: string,
  fetchImplementation: PubkeyLinkImportFetch,
  now: Date,
): Promise<{ backup: DevPubkeyLinkImportBackupEntity; users: NormalizedPubkeyLinkUser[] }> {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), BACKUP_FETCH_TIMEOUT_MS)
  let response: Response

  try {
    response = await fetchImplementation(sourceUrl, {
      headers: {
        Accept: 'application/json',
      },
      signal: abortController.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new DevPubkeyLinkImportError(`Backup download timed out after ${BACKUP_FETCH_TIMEOUT_MS / 1000} seconds.`)
    }

    throw new DevPubkeyLinkImportError(
      error instanceof Error ? `Unable to fetch the backup URL: ${error.message}` : 'Unable to fetch the backup URL.',
    )
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new DevPubkeyLinkImportError(`Backup download failed with status ${response.status}.`)
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!payload || typeof payload !== 'object') {
    throw new DevPubkeyLinkImportError('Backup response was not valid JSON.')
  }

  const dataRecord = getRequiredRecord(payload.data, 'Backup payload is missing data.')
  const metaRecord = getOptionalRecord(payload.meta)
  const rawUsers = getRequiredArray(dataRecord.users, 'Backup payload is missing users.')
  const users = rawUsers
    .map((entry) => normalizePubkeyLinkUser(backupUserSchema.parse(entry)))
    .sort(compareNormalizedUsers)
  const meta = normalizeBackupMeta(metaRecord)

  return {
    backup: {
      backupName: meta.backupName,
      fetchedAt: now.toISOString(),
      sourceUrl,
      sourceUsersCount: users.length,
      timestamp: meta.timestamp,
    },
    users,
  }
}

async function loadLookupState(
  database: Database,
  normalizedUsers: NormalizedPubkeyLinkUser[],
): Promise<PubkeyLinkImportLookupState> {
  const compatibilityEmails = Array.from(
    new Set(
      normalizedUsers
        .filter((normalizedUser) => normalizedUser.discordIdentities.length > 0)
        .map((normalizedUser) => getCompatibilityEmail(normalizedUser.discordIdentities[0]!.providerId)),
    ),
  ).sort((left, right) => left.localeCompare(right))
  const discordProviderIds = Array.from(
    new Set(
      normalizedUsers.flatMap((normalizedUser) =>
        normalizedUser.discordIdentities.map((identityRecord) => identityRecord.providerId),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right))
  const solanaAddresses = Array.from(
    new Set(normalizedUsers.flatMap((normalizedUser) => normalizedUser.solanaAddresses)),
  ).sort((left, right) => left.localeCompare(right))
  const usernames = Array.from(
    new Set(normalizedUsers.map((normalizedUser) => normalizeUsername(normalizedUser.username))),
  ).sort((left, right) => left.localeCompare(right))
  const [accountRows, identityRows, walletRows] = await Promise.all([
    discordProviderIds.length === 0
      ? []
      : database
          .select({
            accountId: account.accountId,
            createdAt: account.createdAt,
            id: account.id,
            userId: account.userId,
          })
          .from(account)
          .where(and(eq(account.providerId, 'discord'), inArray(account.accountId, discordProviderIds)))
          .orderBy(asc(account.accountId), asc(account.userId), asc(account.id)),
    [...discordProviderIds, ...solanaAddresses].length === 0
      ? []
      : database
          .select({
            id: identity.id,
            provider: identity.provider,
            providerId: identity.providerId,
            referenceId: identity.referenceId,
            referenceType: identity.referenceType,
            userId: identity.userId,
          })
          .from(identity)
          .where(
            and(
              inArray(identity.provider, ['discord', 'solana']),
              inArray(
                identity.providerId,
                [...discordProviderIds, ...solanaAddresses].sort((left, right) => left.localeCompare(right)),
              ),
            ),
          )
          .orderBy(asc(identity.provider), asc(identity.providerId), asc(identity.userId), asc(identity.id)),
    solanaAddresses.length === 0
      ? []
      : database
          .select({
            address: solanaWallet.address,
            createdAt: solanaWallet.createdAt,
            id: solanaWallet.id,
            isPrimary: solanaWallet.isPrimary,
            userId: solanaWallet.userId,
          })
          .from(solanaWallet)
          .where(inArray(solanaWallet.address, solanaAddresses))
          .orderBy(asc(solanaWallet.address), asc(solanaWallet.userId), asc(solanaWallet.id)),
  ])
  const matchedUserIds = Array.from(
    new Set(
      [...accountRows, ...identityRows, ...walletRows]
        .map((record) => record.userId)
        .sort((left, right) => left.localeCompare(right)),
    ),
  )
  const userLookupFilter =
    compatibilityEmails.length > 0 && matchedUserIds.length > 0 && usernames.length > 0
      ? or(
          inArray(user.email, compatibilityEmails),
          inArray(user.id, matchedUserIds),
          inArray(user.username, usernames),
        )
      : compatibilityEmails.length > 0 && matchedUserIds.length > 0
        ? or(inArray(user.email, compatibilityEmails), inArray(user.id, matchedUserIds))
        : compatibilityEmails.length > 0 && usernames.length > 0
          ? or(inArray(user.email, compatibilityEmails), inArray(user.username, usernames))
          : matchedUserIds.length > 0 && usernames.length > 0
            ? or(inArray(user.id, matchedUserIds), inArray(user.username, usernames))
            : compatibilityEmails.length > 0
              ? inArray(user.email, compatibilityEmails)
              : matchedUserIds.length > 0
                ? inArray(user.id, matchedUserIds)
                : inArray(user.username, usernames)

  const selectedUsers =
    compatibilityEmails.length === 0 && matchedUserIds.length === 0 && usernames.length === 0
      ? []
      : await database
          .select({
            email: user.email,
            id: user.id,
            image: user.image,
            name: user.name,
            username: user.username,
          })
          .from(user)
          .where(userLookupFilter)
          .orderBy(asc(user.email), asc(user.username), asc(user.id))

  const usersById = new Map(selectedUsers.map((record) => [record.id, record]))
  const accountsByDiscordId = groupRecords(accountRows, (record) => record.accountId)
  const identitiesByProviderId = groupRecords(identityRows, (record) => record.providerId)
  const usersByCompatibilityEmail = groupRecords(
    selectedUsers.filter((record) => compatibilityEmails.includes(record.email)),
    (record) => record.email,
  )
  const usersByUsername = groupRecords(
    selectedUsers.filter((record) => record.username !== null),
    (record) => record.username ?? '',
  )
  const walletsByAddress = groupRecords(walletRows, (record) => record.address)

  return {
    accountsByDiscordId,
    identitiesByProviderId,
    usersByCompatibilityEmail,
    usersById,
    usersByUsername,
    walletsByAddress,
  }
}

async function planPubkeyLinkImport(
  input: DevPubkeyLinkImportInput,
  dependencies: PubkeyLinkImportDependencies,
): Promise<{
  backup: DevPubkeyLinkImportBackupEntity
  summary: DevPubkeyLinkImportSummaryEntity
  usernameRewrites: DevPubkeyLinkImportUsernameRewriteEntity[]
  users: PlannedUserImport[]
}> {
  const database = dependencies.database ?? db
  const fetchImplementation = dependencies.fetch ?? fetch
  const now = dependencies.now ?? (() => new Date())
  const fetchedAt = now()
  const { backup, users } = await fetchPubkeyLinkBackup(input.sourceUrl, fetchImplementation, fetchedAt)
  validateUniqueBackupIdentifiers(users)
  const lookupState = await loadLookupState(database, users)
  const reservedUsernames = new Set(
    Array.from(lookupState.usersByUsername.keys())
      .map((usernameValue) => normalizeUsername(usernameValue))
      .sort((left, right) => left.localeCompare(right)),
  )
  const usernameRewrites: DevPubkeyLinkImportUsernameRewriteEntity[] = []
  const plannedUsers = users.map((normalizedUser) => {
    const plannedUser = planUserImport(normalizedUser, lookupState, reservedUsernames)

    if (plannedUser.usernameRewrite) {
      usernameRewrites.push(plannedUser.usernameRewrite)
    }

    return plannedUser
  })
  const summary = summarizePlannedUsers(plannedUsers)

  return {
    backup,
    summary,
    usernameRewrites: usernameRewrites.sort(compareUsernameRewrites),
    users: plannedUsers.sort((left, right) => compareUserEntities(left.userEntity, right.userEntity)),
  }
}

function buildPlannedCreateIdentities(input: {
  compatibilityEmail: string | null
  createDiscordAccounts: PlannedCreateDiscordAccount[]
  createSolanaWallets: PlannedCreateSolanaWallet[]
  existingAccountRows: ExistingAccountRecord[]
  existingIdentityRows: ExistingIdentityRecord[]
  existingWalletRows: ExistingWalletRecord[]
  normalizedUser: NormalizedPubkeyLinkUser
}): PlannedCreateIdentity[] {
  const existingAccountIds = new Set(input.existingAccountRows.map((record) => record.accountId))
  const hasExistingDiscordIdentity =
    input.existingIdentityRows.some((record) => record.provider === 'discord') ||
    input.normalizedUser.discordIdentities.some((identityRecord) => existingAccountIds.has(identityRecord.providerId))
  const hasExistingPrimaryWallet =
    input.existingWalletRows.some((record) => record.isPrimary) ||
    input.createSolanaWallets.some((walletRecord) => walletRecord.isPrimary)

  const createDiscordIdentities = input.normalizedUser.discordIdentities
    .filter((identityRecord) => {
      const providerIdAlreadyExists = input.existingIdentityRows.some(
        (existingIdentity) =>
          existingIdentity.provider === 'discord' && existingIdentity.providerId === identityRecord.providerId,
      )

      return !providerIdAlreadyExists
    })
    .map((identityRecord, index) => {
      const createdAt = identityRecord.createdAt ?? input.normalizedUser.createdAt ?? new Date()
      const updatedAt =
        identityRecord.updatedAt ?? identityRecord.createdAt ?? input.normalizedUser.updatedAt ?? createdAt

      return {
        avatarUrl: identityRecord.avatarUrl,
        createdAt,
        displayName: identityRecord.displayName,
        email: index === 0 && !hasExistingDiscordIdentity ? input.compatibilityEmail : null,
        isPrimary: index === 0 && !hasExistingDiscordIdentity,
        lastSyncedAt: updatedAt,
        linkedAt: createdAt,
        profile: identityRecord.profile,
        provider: 'discord' as const,
        providerId: identityRecord.providerId,
        referenceType: 'account' as const,
        updatedAt,
        username: identityRecord.username,
      } satisfies PlannedCreateIdentity
    })
  const createSolanaIdentities = input.normalizedUser.solanaAddresses
    .filter((address) => {
      const providerIdAlreadyExists = input.existingIdentityRows.some(
        (existingIdentity) => existingIdentity.provider === 'solana' && existingIdentity.providerId === address,
      )

      return !providerIdAlreadyExists
    })
    .map((address, index) => {
      const walletRecord = input.createSolanaWallets.find((candidate) => candidate.address === address)
      const createdAt = walletRecord?.createdAt ?? input.normalizedUser.createdAt ?? new Date()

      return {
        avatarUrl: null,
        createdAt,
        displayName: null,
        email: null,
        isPrimary: !hasExistingPrimaryWallet && index === 0,
        lastSyncedAt: input.normalizedUser.updatedAt ?? createdAt,
        linkedAt: createdAt,
        profile: null,
        provider: 'solana' as const,
        providerId: address,
        referenceType: 'solana_wallet' as const,
        updatedAt: input.normalizedUser.updatedAt ?? createdAt,
        username: null,
      } satisfies PlannedCreateIdentity
    })

  return [...createDiscordIdentities, ...createSolanaIdentities].sort(comparePlannedCreateIdentity)
}

function compareMatches(left: DevPubkeyLinkImportMatchEntity, right: DevPubkeyLinkImportMatchEntity) {
  const usernameComparison = (left.username ?? '').localeCompare(right.username ?? '')

  if (usernameComparison !== 0) {
    return usernameComparison
  }

  return left.id.localeCompare(right.id)
}

function compareNormalizedUsers(left: NormalizedPubkeyLinkUser, right: NormalizedPubkeyLinkUser) {
  const usernameComparison = left.username.localeCompare(right.username)

  if (usernameComparison !== 0) {
    return usernameComparison
  }

  return left.backupUserId.localeCompare(right.backupUserId)
}

function comparePlannedCreateIdentity(left: PlannedCreateIdentity, right: PlannedCreateIdentity) {
  const providerComparison = left.provider.localeCompare(right.provider)

  if (providerComparison !== 0) {
    return providerComparison
  }

  return left.providerId.localeCompare(right.providerId)
}

function compareUserEntities(left: DevPubkeyLinkImportUserEntity, right: DevPubkeyLinkImportUserEntity) {
  return compareNormalizedUsers(
    {
      avatarUrl: left.source.avatarUrl,
      backupUserId: left.source.backupUserId,
      createdAt: left.source.createdAt ? new Date(left.source.createdAt) : null,
      discordIdentities: [],
      name: left.source.name,
      solanaAddresses: left.source.solanaAddresses,
      updatedAt: left.source.updatedAt ? new Date(left.source.updatedAt) : null,
      username: left.source.username,
    },
    {
      avatarUrl: right.source.avatarUrl,
      backupUserId: right.source.backupUserId,
      createdAt: right.source.createdAt ? new Date(right.source.createdAt) : null,
      discordIdentities: [],
      name: right.source.name,
      solanaAddresses: right.source.solanaAddresses,
      updatedAt: right.source.updatedAt ? new Date(right.source.updatedAt) : null,
      username: right.source.username,
    },
  )
}

function compareUsernameRewrites(
  left: DevPubkeyLinkImportUsernameRewriteEntity,
  right: DevPubkeyLinkImportUsernameRewriteEntity,
) {
  const originalComparison = left.originalUsername.localeCompare(right.originalUsername)

  if (originalComparison !== 0) {
    return originalComparison
  }

  return left.finalUsername.localeCompare(right.finalUsername)
}

function buildPlannedCreateSolanaWallets(input: {
  existingWalletRows: ExistingWalletRecord[]
  normalizedUser: NormalizedPubkeyLinkUser
}) {
  const hasExistingPrimaryWallet = input.existingWalletRows.some((record) => record.isPrimary)

  return input.normalizedUser.solanaAddresses
    .filter((address) => !input.existingWalletRows.some((record) => record.address === address))
    .map((address, index) => ({
      address,
      createdAt: input.normalizedUser.createdAt ?? new Date(),
      isPrimary: !hasExistingPrimaryWallet && index === 0,
    }))
    .sort((left, right) => left.address.localeCompare(right.address))
}

function deriveDiscordAvatarUrl(input: {
  identityProfile: Record<string, unknown> | null
  userAvatarUrl: string | null
}) {
  return (
    getOptionalString(input.identityProfile?.avatarUrl) ??
    getOptionalString(input.identityProfile?.avatarURL) ??
    getOptionalString(input.identityProfile?.displayAvatarURL) ??
    input.userAvatarUrl
  )
}

function deriveDiscordDisplayName(input: {
  identityProfile: Record<string, unknown> | null
  userName: string | null
  username: string
}) {
  return (
    getOptionalString(input.identityProfile?.name) ??
    getOptionalString(input.identityProfile?.globalName) ??
    getOptionalString(input.identityProfile?.username) ??
    input.userName ??
    input.username
  )
}

function deriveDiscordUsername(identityProfile: Record<string, unknown> | null, backupUsername: string) {
  const usernameCandidate =
    getOptionalString(identityProfile?.username) ??
    getOptionalString(identityProfile?.tag) ??
    getOptionalString(identityProfile?.externalId) ??
    backupUsername

  return getValidUsernameCandidate(usernameCandidate)
}

function getCompatibilityEmail(discordId: string) {
  return `${discordId}@discord.${new URL(env.API_URL).hostname}`
}

function getDuplicateBackupUserIds(
  seenIdentifiers: Map<string, string>,
  value: string,
  backupUserId: string,
): string[] | null {
  const existingBackupUserId = seenIdentifiers.get(value)

  if (!existingBackupUserId) {
    seenIdentifiers.set(value, backupUserId)
    return null
  }

  if (existingBackupUserId === backupUserId) {
    return null
  }

  return [existingBackupUserId, backupUserId].sort((left, right) => left.localeCompare(right))
}

function getIdentityLookupKey(provider: 'discord' | 'solana', providerId: string, userId: string) {
  return `${provider}:${providerId}:${userId}`
}

function getOptionalIsoString(value: unknown) {
  const stringValue = getOptionalString(value)

  if (!stringValue) {
    return null
  }

  const parsedDate = new Date(stringValue)

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
}

function getOptionalRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function getOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function getRequiredArray(value: unknown, message: string) {
  if (!Array.isArray(value)) {
    throw new DevPubkeyLinkImportError(message)
  }

  return value
}

function getRequiredRecord(value: unknown, message: string) {
  const record = getOptionalRecord(value)

  if (!record) {
    throw new DevPubkeyLinkImportError(message)
  }

  return record
}

function getRequiredString(value: unknown, message: string) {
  const stringValue = getOptionalString(value)

  if (!stringValue) {
    throw new DevPubkeyLinkImportError(message)
  }

  return stringValue
}

function getUserName(normalizedUser: NormalizedPubkeyLinkUser) {
  return (
    normalizedUser.name ??
    normalizedUser.discordIdentities[0]?.displayName ??
    normalizedUser.discordIdentities[0]?.username ??
    normalizedUser.username
  )
}

function getValidUsernameCandidate(value: string | null) {
  if (!value) {
    return null
  }

  const normalizedCandidate = normalizeUsername(value.trim())

  return isValidUsername(normalizedCandidate) ? normalizedCandidate : null
}

function groupRecords<T>(records: T[], getKey: (record: T) => string) {
  const groupedRecords = new Map<string, T[]>()

  for (const record of records) {
    const key = getKey(record)
    const currentRecords = groupedRecords.get(key) ?? []

    currentRecords.push(record)
    groupedRecords.set(
      key,
      currentRecords.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    )
  }

  return groupedRecords
}

function normalizeBackupMeta(metaRecord: Record<string, unknown> | null): BackupMeta {
  return {
    backupName: getOptionalString(metaRecord?.backupName),
    timestamp: getOptionalIsoString(metaRecord?.timestamp),
  }
}

function normalizeDate(value: string | null) {
  return value ? new Date(value) : null
}

function normalizePubkeyLinkUser(rawUser: RawBackupUser): NormalizedPubkeyLinkUser {
  const discordIdentityMap = new Map<string, NormalizedDiscordIdentity>()

  for (const identityRecord of rawUser.identities.filter((candidate) => candidate.provider === 'Discord')) {
    const identityProfile = getOptionalRecord(identityRecord.profile)
    const normalizedIdentity = {
      avatarUrl: deriveDiscordAvatarUrl({
        identityProfile,
        userAvatarUrl: rawUser.avatarUrl,
      }),
      createdAt: normalizeDate(identityRecord.createdAt),
      displayName: deriveDiscordDisplayName({
        identityProfile,
        userName: rawUser.name,
        username: rawUser.username,
      }),
      profile: serializeProfile(identityRecord.profile),
      providerId: identityRecord.providerId,
      updatedAt: normalizeDate(identityRecord.updatedAt),
      username: deriveDiscordUsername(identityProfile, rawUser.username),
    } satisfies NormalizedDiscordIdentity
    const existingIdentity = discordIdentityMap.get(identityRecord.providerId)

    if (
      !existingIdentity ||
      (normalizedIdentity.createdAt?.getTime() ?? 0) < (existingIdentity.createdAt?.getTime() ?? 0)
    ) {
      discordIdentityMap.set(identityRecord.providerId, normalizedIdentity)
    }
  }

  const discordIdentities = Array.from(discordIdentityMap.values()).sort((left, right) => {
    const createdAtComparison = (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0)

    if (createdAtComparison !== 0) {
      return createdAtComparison
    }

    return left.providerId.localeCompare(right.providerId)
  })
  const solanaAddresses = Array.from(
    new Set(
      rawUser.identities
        .filter((identityRecord) => identityRecord.provider === 'Solana')
        .map((identityRecord) => identityRecord.providerId)
        .sort((left, right) => left.localeCompare(right)),
    ),
  )

  return {
    avatarUrl: rawUser.avatarUrl,
    backupUserId: rawUser.id,
    createdAt: normalizeDate(rawUser.createdAt),
    discordIdentities,
    name: rawUser.name,
    solanaAddresses,
    updatedAt: normalizeDate(rawUser.updatedAt),
    username: rawUser.username,
  }
}

function validateUniqueBackupIdentifiers(users: NormalizedPubkeyLinkUser[]) {
  const duplicateBackupUserIds = new Set<string>()
  const seenCompatibilityEmails = new Map<string, string>()
  const seenDiscordIds = new Map<string, string>()
  const seenSolanaAddresses = new Map<string, string>()

  for (const normalizedUser of users) {
    const compatibilityEmail = normalizedUser.discordIdentities[0]
      ? getCompatibilityEmail(normalizedUser.discordIdentities[0].providerId)
      : null

    if (compatibilityEmail) {
      for (const backupUserId of getDuplicateBackupUserIds(
        seenCompatibilityEmails,
        compatibilityEmail,
        normalizedUser.backupUserId,
      ) ?? []) {
        duplicateBackupUserIds.add(backupUserId)
      }
    }

    for (const identityRecord of normalizedUser.discordIdentities) {
      for (const backupUserId of getDuplicateBackupUserIds(
        seenDiscordIds,
        identityRecord.providerId,
        normalizedUser.backupUserId,
      ) ?? []) {
        duplicateBackupUserIds.add(backupUserId)
      }
    }

    for (const address of normalizedUser.solanaAddresses) {
      for (const backupUserId of getDuplicateBackupUserIds(seenSolanaAddresses, address, normalizedUser.backupUserId) ??
        []) {
        duplicateBackupUserIds.add(backupUserId)
      }
    }
  }

  if (duplicateBackupUserIds.size === 0) {
    return
  }

  throw new DevPubkeyLinkImportError(
    `Backup contains duplicate identifiers across users: ${Array.from(duplicateBackupUserIds)
      .sort((left, right) => left.localeCompare(right))
      .join(', ')}.`,
  )
}

function planUserImport(
  normalizedUser: NormalizedPubkeyLinkUser,
  lookupState: PubkeyLinkImportLookupState,
  reservedUsernames: Set<string>,
): PlannedUserImport {
  if (normalizedUser.discordIdentities.length === 0) {
    return createSkippedUserImport({
      matches: [],
      normalizedUser,
      skipReason: 'missing_discord_identity',
    })
  }

  const matches = resolveMatches(normalizedUser, lookupState)

  if (matches.length > 1) {
    return createSkippedUserImport({
      matches,
      normalizedUser,
      skipReason: 'conflict',
    })
  }

  if (matches.length === 0) {
    const primaryDiscordIdentity = normalizedUser.discordIdentities[0]!
    const compatibilityEmail = getCompatibilityEmail(primaryDiscordIdentity.providerId)
    const emailMatches = (lookupState.usersByCompatibilityEmail.get(compatibilityEmail) ?? [])
      .map((matchedUser) => ({
        id: matchedUser.id,
        kinds: ['email'] as DevPubkeyLinkImportMatchKind[],
        username: matchedUser.username,
      }))
      .sort(compareMatches)

    if (emailMatches.length > 0) {
      return createSkippedUserImport({
        matches: emailMatches,
        normalizedUser,
        skipReason: 'email_conflict',
      })
    }

    const usernameDecision = reserveUsername({
      backupUserId: normalizedUser.backupUserId,
      discordId: primaryDiscordIdentity.providerId,
      reservedUsernames,
      sourceUsername: normalizedUser.username,
    })
    const createDiscordAccounts = normalizedUser.discordIdentities
      .map((identityRecord) => ({
        createdAt: identityRecord.createdAt ?? normalizedUser.createdAt ?? new Date(),
        providerId: identityRecord.providerId,
        updatedAt: identityRecord.updatedAt ?? identityRecord.createdAt ?? normalizedUser.updatedAt ?? new Date(),
      }))
      .sort((left, right) => left.providerId.localeCompare(right.providerId))
    const createSolanaWallets = normalizedUser.solanaAddresses.map((address, index) => ({
      address,
      createdAt: normalizedUser.createdAt ?? new Date(),
      isPrimary: index === 0,
    }))
    const createIdentities = buildPlannedCreateIdentities({
      compatibilityEmail,
      createDiscordAccounts,
      createSolanaWallets,
      existingAccountRows: [],
      existingIdentityRows: [],
      existingWalletRows: [],
      normalizedUser,
    })
    const userEntity = createUserEntity({
      action: 'create',
      existingUser: null,
      matches: [],
      normalizedUser,
      operations: {
        createDiscordAccountCount: createDiscordAccounts.length,
        createDiscordAccountIds: createDiscordAccounts
          .map((record) => record.providerId)
          .sort((left, right) => left.localeCompare(right)),
        createIdentityCount: createIdentities.length,
        createSolanaWalletAddresses: createSolanaWallets
          .map((record) => record.address)
          .sort((left, right) => left.localeCompare(right)),
        createSolanaWalletCount: createSolanaWallets.length,
        createUser: true,
      },
      skipReason: null,
      usernameRewrite: usernameDecision.rewrite,
    })

    return {
      compatibilityEmail,
      createDiscordAccounts,
      createIdentities,
      createSolanaWallets,
      createUser: true,
      existingUser: null,
      matches: [],
      nextUsername: usernameDecision.username,
      skipReason: null,
      source: normalizedUser,
      userEntity,
      usernameRewrite: usernameDecision.rewrite,
    }
  }

  const matchedUser = lookupState.usersById.get(matches[0]!.id)

  if (!matchedUser) {
    throw new DevPubkeyLinkImportError(`Unable to resolve the matched TokenGator user ${matches[0]!.id}.`)
  }

  const targetUserId = matchedUser.id
  const existingAccountRows = normalizedUser.discordIdentities.flatMap((identityRecord) =>
    (lookupState.accountsByDiscordId.get(identityRecord.providerId) ?? []).filter(
      (record) => record.userId === targetUserId,
    ),
  )
  const existingIdentityRows = [
    ...normalizedUser.discordIdentities.flatMap((identityRecord) =>
      (lookupState.identitiesByProviderId.get(identityRecord.providerId) ?? []).filter(
        (record) => record.userId === targetUserId,
      ),
    ),
    ...normalizedUser.solanaAddresses.flatMap((address) =>
      (lookupState.identitiesByProviderId.get(address) ?? []).filter((record) => record.userId === targetUserId),
    ),
  ].sort((left, right) => left.providerId.localeCompare(right.providerId))
  const existingWalletRows = normalizedUser.solanaAddresses.flatMap((address) =>
    (lookupState.walletsByAddress.get(address) ?? []).filter((record) => record.userId === targetUserId),
  )
  const createDiscordAccounts = normalizedUser.discordIdentities
    .filter(
      (identityRecord) =>
        !existingAccountRows.some((accountRecord) => accountRecord.accountId === identityRecord.providerId),
    )
    .map((identityRecord) => ({
      createdAt: identityRecord.createdAt ?? normalizedUser.createdAt ?? new Date(),
      providerId: identityRecord.providerId,
      updatedAt: identityRecord.updatedAt ?? identityRecord.createdAt ?? normalizedUser.updatedAt ?? new Date(),
    }))
    .sort((left, right) => left.providerId.localeCompare(right.providerId))
  const createSolanaWallets = buildPlannedCreateSolanaWallets({
    existingWalletRows,
    normalizedUser,
  })
  const createIdentities = buildPlannedCreateIdentities({
    compatibilityEmail: null,
    createDiscordAccounts,
    createSolanaWallets,
    existingAccountRows,
    existingIdentityRows,
    existingWalletRows,
    normalizedUser,
  })
  const hasWrites = createDiscordAccounts.length > 0 || createIdentities.length > 0 || createSolanaWallets.length > 0
  const userEntity = createUserEntity({
    action: hasWrites ? 'merge' : 'unchanged',
    existingUser: matchedUser,
    matches,
    normalizedUser,
    operations: {
      createDiscordAccountCount: createDiscordAccounts.length,
      createDiscordAccountIds: createDiscordAccounts
        .map((record) => record.providerId)
        .sort((left, right) => left.localeCompare(right)),
      createIdentityCount: createIdentities.length,
      createSolanaWalletAddresses: createSolanaWallets
        .map((record) => record.address)
        .sort((left, right) => left.localeCompare(right)),
      createSolanaWalletCount: createSolanaWallets.length,
      createUser: false,
    },
    skipReason: null,
    usernameRewrite: null,
  })

  return {
    compatibilityEmail: null,
    createDiscordAccounts,
    createIdentities,
    createSolanaWallets,
    createUser: false,
    existingUser: matchedUser,
    matches,
    nextUsername: matchedUser.username,
    skipReason: null,
    source: normalizedUser,
    userEntity,
    usernameRewrite: null,
  }
}

function reserveUsername(input: {
  backupUserId: string
  discordId: string
  reservedUsernames: Set<string>
  sourceUsername: string
}): {
  rewrite: DevPubkeyLinkImportUsernameRewriteEntity | null
  username: string
} {
  const baseUsername =
    getValidUsernameCandidate(input.sourceUsername) ?? `discord${input.discordId.slice(-6).toLowerCase()}`
  const rewriteReason: DevPubkeyLinkImportUsernameRewriteReason | null = getValidUsernameCandidate(input.sourceUsername)
    ? null
    : 'fallback'
  const directCandidate = trimUsername(baseUsername)

  if (!input.reservedUsernames.has(directCandidate)) {
    input.reservedUsernames.add(directCandidate)

    return {
      rewrite:
        rewriteReason === null
          ? null
          : {
              backupUserId: input.backupUserId,
              finalUsername: directCandidate,
              originalUsername: input.sourceUsername,
              reason: rewriteReason,
            },
      username: directCandidate,
    }
  }

  const suffixSeed = input.discordId.slice(-6).toLowerCase()

  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? `_${suffixSeed}` : `_${suffixSeed}_${index}`
    const candidate = `${trimUsername(baseUsername, suffix.length)}${suffix}`

    if (
      candidate.length < MIN_USERNAME_LENGTH ||
      !isValidUsername(candidate) ||
      input.reservedUsernames.has(candidate)
    ) {
      continue
    }

    input.reservedUsernames.add(candidate)

    return {
      rewrite: {
        backupUserId: input.backupUserId,
        finalUsername: candidate,
        originalUsername: input.sourceUsername,
        reason: 'collision',
      },
      username: candidate,
    }
  }

  throw new DevPubkeyLinkImportError(`Unable to reserve a username for ${input.sourceUsername}.`)
}

function resolveMatches(
  normalizedUser: NormalizedPubkeyLinkUser,
  lookupState: PubkeyLinkImportLookupState,
): DevPubkeyLinkImportMatchEntity[] {
  const matchedKindsByUserId = new Map<string, Set<DevPubkeyLinkImportMatchKind>>()

  for (const identityRecord of normalizedUser.discordIdentities) {
    const accountMatches = lookupState.accountsByDiscordId.get(identityRecord.providerId) ?? []
    const identityMatches = (lookupState.identitiesByProviderId.get(identityRecord.providerId) ?? []).filter(
      (record) => record.provider === 'discord',
    )

    for (const matchedRecord of [...accountMatches, ...identityMatches].sort((left, right) =>
      left.userId.localeCompare(right.userId),
    )) {
      const currentKinds = matchedKindsByUserId.get(matchedRecord.userId) ?? new Set<DevPubkeyLinkImportMatchKind>()

      currentKinds.add('discord')
      matchedKindsByUserId.set(matchedRecord.userId, currentKinds)
    }
  }

  for (const address of normalizedUser.solanaAddresses) {
    const identityMatches = (lookupState.identitiesByProviderId.get(address) ?? []).filter(
      (record) => record.provider === 'solana',
    )
    const walletMatches = lookupState.walletsByAddress.get(address) ?? []

    for (const matchedRecord of [...identityMatches, ...walletMatches].sort((left, right) =>
      left.userId.localeCompare(right.userId),
    )) {
      const currentKinds = matchedKindsByUserId.get(matchedRecord.userId) ?? new Set<DevPubkeyLinkImportMatchKind>()

      currentKinds.add('solana')
      matchedKindsByUserId.set(matchedRecord.userId, currentKinds)
    }
  }

  return Array.from(matchedKindsByUserId.entries())
    .map(([userId, kinds]) => ({
      id: userId,
      kinds: Array.from(kinds).sort((left, right) => left.localeCompare(right)),
      username: lookupState.usersById.get(userId)?.username ?? null,
    }))
    .sort(compareMatches)
}

function serializeProfile(profile: unknown) {
  if (!profile) {
    return null
  }

  try {
    return JSON.stringify(profile)
  } catch {
    return null
  }
}

function summarizePlannedUsers(users: PlannedUserImport[]): DevPubkeyLinkImportSummaryEntity {
  return {
    createDiscordAccountCount: users.reduce((count, userRecord) => count + userRecord.createDiscordAccounts.length, 0),
    createIdentityCount: users.reduce((count, userRecord) => count + userRecord.createIdentities.length, 0),
    createSolanaWalletCount: users.reduce((count, userRecord) => count + userRecord.createSolanaWallets.length, 0),
    createUserCount: users.filter((userRecord) => userRecord.userEntity.action === 'create').length,
    mergeUserCount: users.filter((userRecord) => userRecord.userEntity.action === 'merge').length,
    skipConflictCount: users.filter((userRecord) => userRecord.skipReason === 'conflict').length,
    skipEmailConflictCount: users.filter((userRecord) => userRecord.skipReason === 'email_conflict').length,
    skipMissingDiscordCount: users.filter((userRecord) => userRecord.skipReason === 'missing_discord_identity').length,
    skipUserCount: users.filter((userRecord) => userRecord.userEntity.action === 'skip').length,
    totalUserCount: users.length,
    unchangedUserCount: users.filter((userRecord) => userRecord.userEntity.action === 'unchanged').length,
    usernameRewriteCount: users.filter((userRecord) => userRecord.usernameRewrite !== null).length,
  }
}

function trimUsername(username: string, reservedSuffixLength = 0) {
  const maxBaseLength = Math.max(MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH - reservedSuffixLength)

  return normalizeUsername(username).slice(0, maxBaseLength)
}

function createSkippedUserImport(input: {
  matches: DevPubkeyLinkImportMatchEntity[]
  normalizedUser: NormalizedPubkeyLinkUser
  skipReason: DevPubkeyLinkImportSkipReason
}): PlannedUserImport {
  const userEntity = createUserEntity({
    action: 'skip',
    existingUser: null,
    matches: input.matches,
    normalizedUser: input.normalizedUser,
    operations: {
      createDiscordAccountCount: 0,
      createDiscordAccountIds: [],
      createIdentityCount: 0,
      createSolanaWalletAddresses: [],
      createSolanaWalletCount: 0,
      createUser: false,
    },
    skipReason: input.skipReason,
    usernameRewrite: null,
  })

  return {
    compatibilityEmail: null,
    createDiscordAccounts: [],
    createIdentities: [],
    createSolanaWallets: [],
    createUser: false,
    existingUser: null,
    matches: input.matches,
    nextUsername: null,
    skipReason: input.skipReason,
    source: input.normalizedUser,
    userEntity,
    usernameRewrite: null,
  }
}

function createUserEntity(input: {
  action: 'create' | 'merge' | 'skip' | 'unchanged'
  existingUser: ExistingUserRecord | null
  matches: DevPubkeyLinkImportMatchEntity[]
  normalizedUser: NormalizedPubkeyLinkUser
  operations: DevPubkeyLinkImportUserEntity['operations']
  skipReason: DevPubkeyLinkImportSkipReason | null
  usernameRewrite: DevPubkeyLinkImportUserEntity['usernameRewrite']
}): DevPubkeyLinkImportUserEntity {
  return {
    action: input.action,
    existingUser:
      input.existingUser === null
        ? null
        : {
            id: input.existingUser.id,
            username: input.existingUser.username,
          },
    matches: input.matches,
    operations: input.operations,
    skipReason: input.skipReason,
    source: {
      avatarUrl: input.normalizedUser.avatarUrl,
      backupUserId: input.normalizedUser.backupUserId,
      createdAt: input.normalizedUser.createdAt?.toISOString() ?? null,
      discordAccountIds: input.normalizedUser.discordIdentities.map((identityRecord) => identityRecord.providerId),
      name: input.normalizedUser.name,
      solanaAddresses: input.normalizedUser.solanaAddresses,
      updatedAt: input.normalizedUser.updatedAt?.toISOString() ?? null,
      username: input.normalizedUser.username,
    },
    usernameRewrite: input.usernameRewrite,
  }
}
