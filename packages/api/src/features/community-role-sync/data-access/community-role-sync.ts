import { and, asc, desc, eq, inArray, isNotNull, lte, or, sql } from 'drizzle-orm'
import { db, type Database } from '@tokengator/db'
import { asset, assetGroup } from '@tokengator/db/schema/asset'
import {
  account,
  identity,
  member,
  organization,
  session,
  solanaWallet,
  team,
  teamMember,
  user,
} from '@tokengator/db/schema/auth'
import {
  communityDiscordConnection,
  communityDiscordSyncRun,
  communityManagedMember,
  communityMembershipSyncRun,
  communityRole,
  communityRoleCondition,
} from '@tokengator/db/schema/community-role'
import {
  addDiscordGuildMemberRole,
  DiscordGuildMemberRoleMutationError,
  getDiscordGuildMember,
  inspectDiscordGuildRoles,
  removeDiscordGuildMemberRole,
} from '@tokengator/discord'
import { env } from '@tokengator/env/api'
import { normalizeAmountToBigInt } from '@tokengator/indexer'

import {
  AUTOMATION_LOCK_TIMEOUT_MS,
  getScheduledDiscordSyncIntervalMs,
  getScheduledIndexIntervalMs,
  getScheduledMembershipSyncIntervalMs,
  getStaleAfterMinutes,
  getStaleAfterMs,
} from '../../../lib/automation-config'
import {
  acquireAutomationLock,
  createAutomationLockLeaseController,
  getAutomationLockLeaseLostError,
  type AutomationLockLeaseController,
  type AutomationTransaction,
  AutomationLockConflictError,
  releaseAutomationLock,
} from '../../../lib/automation-lock'
import { getRunLookupChunkSize, splitIntoChunks } from '../../../lib/sqlite'
import { parseStoredJson, serializeJson } from '../../../lib/stored-json'
import { getAssetGroupIndexStatusSummaries, type AssetGroupIndexStatusSummary } from '../../asset-group-index'
import { publishCommunityDiscordAnnouncement } from '../../community-discord-announcement'

type CommunityRoleRecord = {
  conditions: CommunityRoleConditionRecord[]
  createdAt: Date
  discordRoleId?: string | null
  enabled: boolean
  id: string
  matchMode: 'all' | 'any'
  name: string
  organizationId: string
  slug: string
  teamId: string
  teamMemberCount: number
  teamName: string
  updatedAt: Date
}

type CommunityRoleConditionRecord = {
  assetGroupAddress: string
  assetGroupEnabled: boolean
  assetGroupId: string
  assetGroupLabel: string
  assetGroupType: 'collection' | 'mint'
  id: string
  maximumAmount: string | null
  minimumAmount: string
}

type CommunityRoleRef = {
  id: string
  name: string
  slug: string
  teamId: string
  teamName: string
}

type CurrentOrganizationMember = {
  id: string
  name: string
  role: string
  userId: string
  username: string | null
}

type QualifiedUserState = {
  name: string
  nextRoleIds: string[]
  nextTeamIds: string[]
  userId: string
  username: string | null
  wallets: string[]
}

type CurrentUserState = QualifiedUserState & {
  currentMemberId: string | null
  currentOrganizationRole: string | null
  currentRoleIds: string[]
  currentTeamIds: string[]
  managedMembership: boolean
}

type EvaluateCommunityRolesInput = {
  roles: CommunityRoleRecord[]
  users: Array<{
    id: string
    name: string
    username: string | null
    wallets: string[]
  }>
  walletAmountsByAssetGroupId: Map<string, Map<string, bigint>>
}

type EvaluateCommunityRolesResult = {
  matchedRoleIdsByUserId: Map<string, string[]>
  qualifiedUserIdsByRoleId: Map<string, Set<string>>
}

export type CommunityRoleSyncChangeRole = CommunityRoleRef

export type CommunityRoleSyncChangeUser = {
  addToOrganization: boolean
  addToTeams: CommunityRoleSyncChangeRole[]
  currentGatedRoles: CommunityRoleSyncChangeRole[]
  currentOrganizationRole: string | null
  managedMembership: boolean
  name: string
  nextGatedRoles: CommunityRoleSyncChangeRole[]
  removeFromOrganization: boolean
  removeFromTeams: CommunityRoleSyncChangeRole[]
  userId: string
  username: string | null
  wallets: string[]
}

export type CommunityRoleSyncRoleSummary = CommunityRoleRecord & {
  addCount: number
  qualifiedCount: number
  removeCount: number
}

export type CommunityRoleSyncPreview = {
  organizationId: string
  roles: CommunityRoleSyncRoleSummary[]
  summary: {
    addToOrganizationCount: number
    addToTeamCount: number
    qualifiedUserCount: number
    removeFromOrganizationCount: number
    removeFromTeamCount: number
    usersChangedCount: number
  }
  users: CommunityRoleSyncChangeUser[]
}

export type DiscordSyncOutcomeStatus =
  | 'already_correct'
  | 'discord_role_missing'
  | 'linked_but_not_in_guild'
  | 'mapping_missing'
  | 'mapping_not_assignable'
  | 'no_discord_account_linked'
  | 'will_grant'
  | 'will_revoke'

export type DiscordSyncApplyOutcomeStatus = DiscordSyncOutcomeStatus | 'discord_api_failure'

export type DiscordSyncCounts = Record<DiscordSyncOutcomeStatus, number>

export type CommunityRoleDiscordSyncOutcome = {
  checks: string[]
  communityRoleId: string
  communityRoleName: string
  current: boolean | null
  desired: boolean
  discordRoleId: string | null
  discordRoleName: string | null
  status: DiscordSyncOutcomeStatus
}

export type CommunityRoleDiscordSyncApplyOutcome = Omit<CommunityRoleDiscordSyncOutcome, 'status'> & {
  attemptedAction: 'grant' | 'revoke' | null
  errorMessage: string | null
  execution: 'applied' | 'failed' | 'noop' | 'skipped'
  status: DiscordSyncApplyOutcomeStatus
}

export type CommunityRoleDiscordSyncUser = {
  discordAccountId: string | null
  guildMemberPresent: boolean | null
  name: string
  outcomes: CommunityRoleDiscordSyncOutcome[]
  userId: string
  username: string | null
  wallets: string[]
}

export type CommunityRoleDiscordSyncApplyUser = Omit<CommunityRoleDiscordSyncUser, 'outcomes'> & {
  outcomes: CommunityRoleDiscordSyncApplyOutcome[]
}

export type CommunityRoleDiscordSyncRoleSummary = {
  communityRoleId: string
  communityRoleName: string
  counts: DiscordSyncCounts
  discordRoleId: string | null
  discordRoleName: string | null
  enabled: boolean
  mappingChecks: string[]
  mappingStatus: 'discord_role_missing' | 'mapping_missing' | 'mapping_not_assignable' | 'ready'
  qualifiedUserCount: number
}

export type CommunityRoleDiscordSyncPreview = {
  connection: {
    checks: string[]
    guildId: string
    guildName: string | null
    lastCheckedAt: Date
    status: 'connected' | 'needs_attention'
  }
  organizationId: string
  roles: CommunityRoleDiscordSyncRoleSummary[]
  summary: {
    counts: DiscordSyncCounts
    rolesBlockedCount: number
    rolesReadyCount: number
    usersChangedCount: number
  }
  users: CommunityRoleDiscordSyncUser[]
}

export type CommunityRoleDiscordSyncApply = Omit<CommunityRoleDiscordSyncPreview, 'summary' | 'users'> & {
  summary: CommunityRoleDiscordSyncPreview['summary'] & {
    appliedGrantCount: number
    appliedRevokeCount: number
    failedCount: number
  }
  users: CommunityRoleDiscordSyncApplyUser[]
}

export type CommunityRoleSyncFreshnessStatus = 'fresh' | 'stale' | 'unknown'
export type CommunityRoleSyncTriggerSource = 'manual' | 'scheduled'
export type CommunityMembershipSyncRunStatus = 'failed' | 'running' | 'skipped' | 'succeeded'
export type CommunityDiscordSyncRunStatus = 'failed' | 'partial' | 'running' | 'skipped' | 'succeeded'

export type CommunityMembershipSyncRunRecord = {
  addToOrganizationCount: number
  addToTeamCount: number
  blockedAssetGroupIds: string[]
  dependencyAssetGroupIds: string[]
  dependencyFreshAtStart: boolean
  errorMessage: string | null
  errorPayload: unknown | null
  finishedAt: Date | null
  id: string
  organizationId: string
  qualifiedUserCount: number
  removeFromOrganizationCount: number
  removeFromTeamCount: number
  startedAt: Date
  status: CommunityMembershipSyncRunStatus
  triggerSource: CommunityRoleSyncTriggerSource
  usersChangedCount: number
}

export type CommunityDiscordSyncRunRecord = {
  appliedGrantCount: number
  appliedRevokeCount: number
  blockedAssetGroupIds: string[]
  dependencyAssetGroupIds: string[]
  dependencyFreshAtStart: boolean
  errorMessage: string | null
  errorPayload: unknown | null
  failedCount: number
  finishedAt: Date | null
  id: string
  organizationId: string
  outcomeCounts: DiscordSyncCounts
  rolesBlockedCount: number
  rolesReadyCount: number
  startedAt: Date
  status: CommunityDiscordSyncRunStatus
  triggerSource: CommunityRoleSyncTriggerSource
  usersChangedCount: number
}

export type CommunitySyncStatusSummary<TRunRecord> = {
  freshnessStatus: CommunityRoleSyncFreshnessStatus
  isRunning: boolean
  lastRun: TRunRecord | null
  lastSuccessfulRun: TRunRecord | null
  staleAfterMinutes: number
}

export type OrganizationSyncDependencyAssetGroup = {
  address: string
  enabled: boolean
  id: string
  indexingStatus: AssetGroupIndexStatusSummary
  label: string
  type: 'collection' | 'mint'
}

export type CommunityRoleSyncStatus = {
  dependencyAssetGroups: OrganizationSyncDependencyAssetGroup[]
  discordStatus: CommunitySyncStatusSummary<CommunityDiscordSyncRunRecord> & {
    roleSyncEnabled: boolean
  }
  membershipStatus: CommunitySyncStatusSummary<CommunityMembershipSyncRunRecord>
  organizationId: string
}

export type ScheduledCommunityDiscordSyncStatus =
  | 'disabled'
  | 'failed'
  | 'locked'
  | 'missing'
  | 'partial'
  | 'skipped'
  | 'succeeded'
export type ScheduledCommunityMembershipSyncStatus = 'failed' | 'locked' | 'missing' | 'skipped' | 'succeeded'

type LoadedQualificationState = {
  organizationId: string
  roles: CommunityRoleRecord[]
  usersById: Map<string, QualifiedUserState>
}

type LoadedSyncState = {
  currentMembersByUserId: Map<string, CurrentOrganizationMember>
  currentTeamIdsByUserId: Map<string, Set<string>>
  managedUserIds: Set<string>
  organizationId: string
  organizationTeamIdsByUserId: Map<string, Set<string>>
  roles: CommunityRoleRecord[]
  usersById: Map<string, CurrentUserState>
}

type DiscordRoleMappingState = {
  checks: string[]
  discordRoleName: string | null
  status: 'discord_role_missing' | 'mapping_missing' | 'mapping_not_assignable' | 'ready'
}

type StoredCommunityDiscordConnectionRecord = {
  guildId: string
  guildName: string | null
  roleSyncEnabled: boolean
}

type CommunityRoleDiscordSyncExecutionProgress = {
  appliedGrantCount: number
  appliedRevokeCount: number
  failedCount: number
  users: CommunityRoleDiscordSyncApplyUser[]
}

const blockingDiscordGuildRoleInspectionChecks = new Set([
  'bot_identity_lookup_failed',
  'bot_not_in_guild',
  'bot_token_missing',
  'guild_fetch_failed',
  'guild_not_found',
  'guild_roles_fetch_failed',
])

function buildCommunitySyncErrorPayload(error: unknown) {
  if (getAutomationLockLeaseLostError(error)) {
    return {
      reason: 'lock_lost',
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    }
  }

  return {
    message: 'Community sync failed.',
  }
}

function buildCommunitySyncLockKey(organizationId: string) {
  return `community-sync:${organizationId}`
}

function normalizeWalletAddress(address: string) {
  return address.trim()
}

function createDiscordSyncCounts(): DiscordSyncCounts {
  return {
    already_correct: 0,
    discord_role_missing: 0,
    linked_but_not_in_guild: 0,
    mapping_missing: 0,
    mapping_not_assignable: 0,
    no_discord_account_linked: 0,
    will_grant: 0,
    will_revoke: 0,
  }
}

function createQualifiedUserState(input: {
  name: string
  userId: string
  username: string | null
}): QualifiedUserState {
  return {
    name: input.name,
    nextRoleIds: [],
    nextTeamIds: [],
    userId: input.userId,
    username: input.username,
    wallets: [],
  }
}

function toCommunityRoleRef(role: CommunityRoleRecord): CommunityRoleRef {
  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    teamId: role.teamId,
    teamName: role.teamName,
  }
}

function sortRoleIds(roleIds: string[], rolesById: Map<string, CommunityRoleRecord>) {
  roleIds.sort((left, right) => {
    const leftRole = rolesById.get(left)
    const rightRole = rolesById.get(right)

    if (!leftRole || !rightRole) {
      return left.localeCompare(right)
    }

    return (
      leftRole.name.localeCompare(rightRole.name) ||
      leftRole.slug.localeCompare(rightRole.slug) ||
      left.localeCompare(right)
    )
  })
}

function incrementDiscordSyncCount(counts: DiscordSyncCounts, status: DiscordSyncOutcomeStatus) {
  counts[status] += 1
}

async function ensureOrganizationExists(organizationId: string, database?: Database) {
  const currentDatabase = database ?? db
  const [record] = await currentDatabase
    .select({
      id: organization.id,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  return record ?? null
}

export async function listCommunityRoleRecords(
  organizationId: string,
  database?: Database,
): Promise<CommunityRoleRecord[]> {
  const currentDatabase = database ?? db
  const roleRows = await currentDatabase
    .select({
      createdAt: communityRole.createdAt,
      discordRoleId: communityRole.discordRoleId,
      enabled: communityRole.enabled,
      id: communityRole.id,
      matchMode: communityRole.matchMode,
      name: communityRole.name,
      organizationId: communityRole.organizationId,
      slug: communityRole.slug,
      teamId: communityRole.teamId,
      teamName: team.name,
      updatedAt: communityRole.updatedAt,
    })
    .from(communityRole)
    .innerJoin(team, eq(communityRole.teamId, team.id))
    .where(eq(communityRole.organizationId, organizationId))
    .orderBy(asc(communityRole.name), asc(communityRole.slug), asc(communityRole.id))

  if (roleRows.length === 0) {
    return []
  }

  const roleIds = roleRows.map((roleRecord) => roleRecord.id)
  const teamIds = roleRows.map((roleRecord) => roleRecord.teamId)
  const [conditionRows, teamMembershipRows] = await Promise.all([
    currentDatabase
      .select({
        assetGroupAddress: assetGroup.address,
        assetGroupEnabled: assetGroup.enabled,
        assetGroupId: communityRoleCondition.assetGroupId,
        assetGroupLabel: assetGroup.label,
        assetGroupType: assetGroup.type,
        communityRoleId: communityRoleCondition.communityRoleId,
        id: communityRoleCondition.id,
        maximumAmount: communityRoleCondition.maximumAmount,
        minimumAmount: communityRoleCondition.minimumAmount,
      })
      .from(communityRoleCondition)
      .innerJoin(assetGroup, eq(communityRoleCondition.assetGroupId, assetGroup.id))
      .where(inArray(communityRoleCondition.communityRoleId, roleIds))
      .orderBy(
        asc(communityRoleCondition.communityRoleId),
        asc(assetGroup.label),
        asc(assetGroup.type),
        asc(assetGroup.address),
        asc(communityRoleCondition.id),
      ),
    currentDatabase
      .select({
        teamId: teamMember.teamId,
      })
      .from(teamMember)
      .where(inArray(teamMember.teamId, teamIds))
      .orderBy(asc(teamMember.teamId)),
  ])
  const conditionsByRoleId = new Map<string, CommunityRoleConditionRecord[]>()
  const teamMemberCounts = new Map<string, number>()

  for (const condition of conditionRows) {
    const existingConditions = conditionsByRoleId.get(condition.communityRoleId) ?? []
    conditionsByRoleId.set(condition.communityRoleId, [
      ...existingConditions,
      {
        assetGroupAddress: condition.assetGroupAddress,
        assetGroupEnabled: condition.assetGroupEnabled,
        assetGroupId: condition.assetGroupId,
        assetGroupLabel: condition.assetGroupLabel,
        assetGroupType: condition.assetGroupType,
        id: condition.id,
        maximumAmount: condition.maximumAmount,
        minimumAmount: condition.minimumAmount,
      },
    ])
  }

  for (const teamMembership of teamMembershipRows) {
    teamMemberCounts.set(teamMembership.teamId, (teamMemberCounts.get(teamMembership.teamId) ?? 0) + 1)
  }

  return roleRows.map((roleRecord) => ({
    conditions: conditionsByRoleId.get(roleRecord.id) ?? [],
    createdAt: roleRecord.createdAt,
    discordRoleId: roleRecord.discordRoleId,
    enabled: roleRecord.enabled,
    id: roleRecord.id,
    matchMode: roleRecord.matchMode,
    name: roleRecord.name,
    organizationId: roleRecord.organizationId,
    slug: roleRecord.slug,
    teamId: roleRecord.teamId,
    teamMemberCount: teamMemberCounts.get(roleRecord.teamId) ?? 0,
    teamName: roleRecord.teamName,
    updatedAt: roleRecord.updatedAt,
  }))
}

export function evaluateCommunityRoles(input: EvaluateCommunityRolesInput): EvaluateCommunityRolesResult {
  const matchedRoleIdsByUserId = new Map<string, string[]>()
  const qualifiedUserIdsByRoleId = new Map<string, Set<string>>()

  for (const role of input.roles) {
    qualifiedUserIdsByRoleId.set(role.id, new Set<string>())
  }

  for (const currentUser of input.users) {
    const nextRoleIds: string[] = []

    for (const role of input.roles) {
      if (!role.enabled || role.conditions.length === 0) {
        continue
      }

      const matchedConditions = role.conditions.map((condition) => {
        if (!condition.assetGroupEnabled) {
          return false
        }

        const amount = input.walletAmountsByAssetGroupId.get(condition.assetGroupId)?.get(currentUser.id) ?? 0n
        const minimumAmount = BigInt(condition.minimumAmount)
        const maximumAmount = condition.maximumAmount ? BigInt(condition.maximumAmount) : null

        return amount >= minimumAmount && (maximumAmount === null || amount <= maximumAmount)
      })
      const matches = role.matchMode === 'all' ? matchedConditions.every(Boolean) : matchedConditions.some(Boolean)

      if (!matches) {
        continue
      }

      nextRoleIds.push(role.id)
      qualifiedUserIdsByRoleId.get(role.id)?.add(currentUser.id)
    }

    matchedRoleIdsByUserId.set(currentUser.id, nextRoleIds)
  }

  return {
    matchedRoleIdsByUserId,
    qualifiedUserIdsByRoleId,
  }
}

async function loadCommunityRoleQualificationState(input: {
  database?: Database
  organizationId: string
  relevantUserIds?: string[]
  roles?: CommunityRoleRecord[]
}): Promise<LoadedQualificationState> {
  const currentDatabase = input.database ?? db
  const roles = input.roles ?? (await listCommunityRoleRecords(input.organizationId, currentDatabase))
  const enabledRoleAssetGroupIds = [
    ...new Set(
      roles
        .flatMap((roleRecord) => (roleRecord.enabled ? roleRecord.conditions : []))
        .map((condition) => condition.assetGroupId),
    ),
  ]
  const assetRows =
    enabledRoleAssetGroupIds.length === 0
      ? []
      : await currentDatabase
          .select({
            amount: asset.amount,
            assetGroupId: asset.assetGroupId,
            id: asset.id,
            owner: asset.owner,
          })
          .from(asset)
          .where(inArray(asset.assetGroupId, enabledRoleAssetGroupIds))
          .orderBy(asc(asset.assetGroupId), asc(asset.owner), asc(asset.id))
  const relevantAssetOwnerAddresses = [
    ...new Set(assetRows.map((assetRow) => normalizeWalletAddress(assetRow.owner))),
  ].sort((left, right) => left.localeCompare(right))
  const relevantUserIds = [...new Set(input.relevantUserIds ?? [])].sort((left, right) => left.localeCompare(right))
  const walletRows =
    relevantAssetOwnerAddresses.length === 0 && relevantUserIds.length === 0
      ? []
      : await currentDatabase
          .select({
            address: solanaWallet.address,
            name: user.name,
            userId: user.id,
            username: user.username,
          })
          .from(solanaWallet)
          .innerJoin(user, eq(solanaWallet.userId, user.id))
          .where(
            relevantAssetOwnerAddresses.length === 0
              ? inArray(solanaWallet.userId, relevantUserIds)
              : relevantUserIds.length === 0
                ? inArray(solanaWallet.address, relevantAssetOwnerAddresses)
                : or(
                    inArray(solanaWallet.address, relevantAssetOwnerAddresses),
                    inArray(solanaWallet.userId, relevantUserIds),
                  ),
          )
          .orderBy(asc(user.name), asc(user.username), asc(user.id), asc(solanaWallet.address))
  const conditionByAssetGroupId = new Map(
    roles
      .flatMap((roleRecord) => roleRecord.conditions)
      .map((condition) => [condition.assetGroupId, condition] as const),
  )
  const rolesById = new Map(roles.map((roleRecord) => [roleRecord.id, roleRecord] as const))
  const usersById = new Map<string, QualifiedUserState>()
  const walletOwnerByAddress = new Map<string, string>()
  const walletAmountsByAssetGroupId = new Map<string, Map<string, bigint>>()

  function getOrCreateUserState(inputUser: { name: string; userId: string; username: string | null }) {
    const existingUser = usersById.get(inputUser.userId)

    if (existingUser) {
      return existingUser
    }

    const createdUser = createQualifiedUserState(inputUser)
    usersById.set(inputUser.userId, createdUser)

    return createdUser
  }

  for (const walletRow of walletRows) {
    const normalizedAddress = normalizeWalletAddress(walletRow.address)

    walletOwnerByAddress.set(normalizedAddress, walletRow.userId)

    const userState = getOrCreateUserState({
      name: walletRow.name,
      userId: walletRow.userId,
      username: walletRow.username,
    })

    userState.wallets.push(walletRow.address)
  }

  for (const assetRow of assetRows) {
    const ownerUserId = walletOwnerByAddress.get(assetRow.owner)
    const amount = normalizeAmountToBigInt(assetRow.amount)

    if (!ownerUserId || amount === null || amount <= 0n) {
      continue
    }

    const currentRoleCondition = conditionByAssetGroupId.get(assetRow.assetGroupId)

    if (!currentRoleCondition) {
      continue
    }

    const amountByUserId = walletAmountsByAssetGroupId.get(assetRow.assetGroupId) ?? new Map<string, bigint>()
    const existingAmount = amountByUserId.get(ownerUserId) ?? 0n
    const nextAmount =
      currentRoleCondition.assetGroupType === 'collection' ? existingAmount + 1n : existingAmount + amount

    amountByUserId.set(ownerUserId, nextAmount)
    walletAmountsByAssetGroupId.set(assetRow.assetGroupId, amountByUserId)
  }

  const evaluation = evaluateCommunityRoles({
    roles,
    users: [...usersById.values()].map((currentUser) => ({
      id: currentUser.userId,
      name: currentUser.name,
      username: currentUser.username,
      wallets: currentUser.wallets,
    })),
    walletAmountsByAssetGroupId,
  })

  for (const currentUser of usersById.values()) {
    currentUser.nextRoleIds = evaluation.matchedRoleIdsByUserId.get(currentUser.userId) ?? []
    currentUser.nextTeamIds = currentUser.nextRoleIds
      .map((roleId) => rolesById.get(roleId)?.teamId)
      .filter((teamId): teamId is string => Boolean(teamId))
      .sort((left, right) => left.localeCompare(right))
  }

  return {
    organizationId: input.organizationId,
    roles,
    usersById,
  }
}

async function loadSyncState(organizationId: string, database?: Database): Promise<LoadedSyncState> {
  const currentDatabase = database ?? db
  const roles = await listCommunityRoleRecords(organizationId, currentDatabase)
  const roleTeamIds = new Set(roles.map((roleRecord) => roleRecord.teamId))
  const [managedRows, memberRows, organizationTeamMembershipRows] = await Promise.all([
    currentDatabase
      .select({
        userId: communityManagedMember.userId,
      })
      .from(communityManagedMember)
      .where(eq(communityManagedMember.organizationId, organizationId))
      .orderBy(asc(communityManagedMember.userId)),
    currentDatabase
      .select({
        id: member.id,
        name: user.name,
        role: member.role,
        userId: member.userId,
        username: user.username,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(user.name), asc(user.username), asc(user.id)),
    currentDatabase
      .select({
        name: user.name,
        teamId: teamMember.teamId,
        userId: teamMember.userId,
        username: user.username,
      })
      .from(teamMember)
      .innerJoin(team, eq(teamMember.teamId, team.id))
      .innerJoin(user, eq(teamMember.userId, user.id))
      .where(eq(team.organizationId, organizationId))
      .orderBy(asc(user.name), asc(user.username), asc(user.id), asc(team.id)),
  ])
  const relevantOrganizationUserIds = [
    ...new Set([...memberRows, ...organizationTeamMembershipRows].map((currentMembership) => currentMembership.userId)),
  ].sort((left, right) => left.localeCompare(right))
  const qualificationState = await loadCommunityRoleQualificationState({
    database: currentDatabase,
    organizationId,
    relevantUserIds: relevantOrganizationUserIds,
    roles,
  })
  const currentMembersByUserId = new Map<string, CurrentOrganizationMember>()
  const currentTeamIdsByUserId = new Map<string, Set<string>>()
  const managedUserIds = new Set(managedRows.map((managedRow) => managedRow.userId))
  const organizationTeamIdsByUserId = new Map<string, Set<string>>()
  const rolesById = new Map(roles.map((roleRecord) => [roleRecord.id, roleRecord] as const))
  const usersById = new Map<string, CurrentUserState>(
    [...qualificationState.usersById.entries()].map(([userId, currentUser]) => [
      userId,
      {
        ...currentUser,
        currentMemberId: null,
        currentOrganizationRole: null,
        currentRoleIds: [],
        currentTeamIds: [],
        managedMembership: false,
        nextRoleIds: [...currentUser.nextRoleIds],
        nextTeamIds: [...currentUser.nextTeamIds],
        wallets: [...currentUser.wallets],
      },
    ]),
  )

  function getOrCreateUserState(inputUser: { name: string; userId: string; username: string | null }) {
    const existingUser = usersById.get(inputUser.userId)

    if (existingUser) {
      return existingUser
    }

    const createdUser: CurrentUserState = {
      ...createQualifiedUserState(inputUser),
      currentMemberId: null,
      currentOrganizationRole: null,
      currentRoleIds: [],
      currentTeamIds: [],
      managedMembership: false,
    }

    usersById.set(inputUser.userId, createdUser)

    return createdUser
  }

  for (const currentMember of memberRows) {
    currentMembersByUserId.set(currentMember.userId, currentMember)

    const userState = getOrCreateUserState({
      name: currentMember.name,
      userId: currentMember.userId,
      username: currentMember.username,
    })

    userState.currentMemberId = currentMember.id
    userState.currentOrganizationRole = currentMember.role
  }

  for (const organizationTeamMembership of organizationTeamMembershipRows) {
    const organizationTeamIds = organizationTeamIdsByUserId.get(organizationTeamMembership.userId) ?? new Set<string>()

    organizationTeamIds.add(organizationTeamMembership.teamId)
    organizationTeamIdsByUserId.set(organizationTeamMembership.userId, organizationTeamIds)

    if (!roleTeamIds.has(organizationTeamMembership.teamId)) {
      getOrCreateUserState({
        name: organizationTeamMembership.name,
        userId: organizationTeamMembership.userId,
        username: organizationTeamMembership.username,
      })

      continue
    }

    const currentTeamIds = currentTeamIdsByUserId.get(organizationTeamMembership.userId) ?? new Set<string>()

    currentTeamIds.add(organizationTeamMembership.teamId)
    currentTeamIdsByUserId.set(organizationTeamMembership.userId, currentTeamIds)

    const userState = getOrCreateUserState({
      name: organizationTeamMembership.name,
      userId: organizationTeamMembership.userId,
      username: organizationTeamMembership.username,
    })
    const currentRole = roles.find((roleRecord) => roleRecord.teamId === organizationTeamMembership.teamId)

    if (!currentRole) {
      continue
    }

    userState.currentRoleIds.push(currentRole.id)
  }

  for (const managedUserId of managedUserIds) {
    const existingUser = usersById.get(managedUserId)

    if (!existingUser) {
      continue
    }

    existingUser.managedMembership = true
  }

  for (const currentUser of usersById.values()) {
    sortRoleIds(currentUser.currentRoleIds, rolesById)
    currentUser.currentTeamIds = [...(currentTeamIdsByUserId.get(currentUser.userId) ?? new Set<string>())].sort(
      (left, right) => left.localeCompare(right),
    )
    currentUser.managedMembership ||= managedUserIds.has(currentUser.userId)
  }

  return {
    currentMembersByUserId,
    currentTeamIdsByUserId,
    managedUserIds,
    organizationId,
    organizationTeamIdsByUserId,
    roles,
    usersById,
  }
}

function buildPreviewFromSyncState(syncState: LoadedSyncState): CommunityRoleSyncPreview {
  const roleRefsById = new Map(
    syncState.roles.map((roleRecord) => [roleRecord.id, toCommunityRoleRef(roleRecord)] as const),
  )
  const roleByTeamId = new Map(syncState.roles.map((roleRecord) => [roleRecord.teamId, roleRecord] as const))
  const roleSummaries = syncState.roles.map((roleRecord) => ({
    ...roleRecord,
    addCount: 0,
    qualifiedCount: 0,
    removeCount: 0,
  }))
  const roleSummaryById = new Map(roleSummaries.map((roleSummary) => [roleSummary.id, roleSummary] as const))
  const users: CommunityRoleSyncChangeUser[] = []
  let addToOrganizationCount = 0
  let addToTeamCount = 0
  let qualifiedUserCount = 0
  let removeFromOrganizationCount = 0
  let removeFromTeamCount = 0

  for (const currentUser of [...syncState.usersById.values()].sort((left, right) => {
    return (
      left.name.localeCompare(right.name) ||
      (left.username ?? '').localeCompare(right.username ?? '') ||
      left.userId.localeCompare(right.userId)
    )
  })) {
    const currentOrganizationTeamIds = new Set(syncState.organizationTeamIdsByUserId.get(currentUser.userId) ?? [])
    const nextTeamIds = new Set(currentUser.nextTeamIds)
    const addToTeams = currentUser.nextRoleIds
      .filter((roleId) => {
        const currentRole = syncState.roles.find((roleRecord) => roleRecord.id === roleId)

        return currentRole ? !currentOrganizationTeamIds.has(currentRole.teamId) : false
      })
      .map((roleId) => roleRefsById.get(roleId))
      .filter((roleRef): roleRef is CommunityRoleRef => Boolean(roleRef))
    const removeFromTeams = [...currentOrganizationTeamIds]
      .filter((teamId) => roleByTeamId.has(teamId) && !nextTeamIds.has(teamId))
      .map((teamId) => {
        const currentRole = roleByTeamId.get(teamId)

        return currentRole ? (roleRefsById.get(currentRole.id) ?? null) : null
      })
      .filter((roleRef): roleRef is CommunityRoleRef => Boolean(roleRef))
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug) || left.id.localeCompare(right.id),
      )
    const currentGatedRoles = currentUser.currentRoleIds
      .map((roleId) => roleRefsById.get(roleId))
      .filter((roleRef): roleRef is CommunityRoleRef => Boolean(roleRef))
    const nextGatedRoles = currentUser.nextRoleIds
      .map((roleId) => roleRefsById.get(roleId))
      .filter((roleRef): roleRef is CommunityRoleRef => Boolean(roleRef))
    const nextOrganizationTeamIds = new Set(
      [...currentOrganizationTeamIds].filter((teamId) => !removeFromTeams.some((roleRef) => roleRef.teamId === teamId)),
    )

    for (const roleRef of addToTeams) {
      nextOrganizationTeamIds.add(roleRef.teamId)
    }

    const addToOrganization = currentUser.currentOrganizationRole === null && nextGatedRoles.length > 0
    const removeFromOrganization =
      currentUser.currentOrganizationRole === 'member' &&
      currentUser.managedMembership &&
      nextGatedRoles.length === 0 &&
      nextOrganizationTeamIds.size === 0

    for (const currentRole of nextGatedRoles) {
      const currentRoleSummary = roleSummaryById.get(currentRole.id)

      if (currentRoleSummary) {
        currentRoleSummary.qualifiedCount += 1
      }
    }

    for (const currentRole of addToTeams) {
      const currentRoleSummary = roleSummaryById.get(currentRole.id)

      if (currentRoleSummary) {
        currentRoleSummary.addCount += 1
      }
    }

    for (const currentRole of removeFromTeams) {
      const currentRoleSummary = roleSummaryById.get(currentRole.id)

      if (currentRoleSummary) {
        currentRoleSummary.removeCount += 1
      }
    }

    if (nextGatedRoles.length > 0) {
      qualifiedUserCount += 1
    }

    if (addToOrganization) {
      addToOrganizationCount += 1
    }

    if (removeFromOrganization) {
      removeFromOrganizationCount += 1
    }

    addToTeamCount += addToTeams.length
    removeFromTeamCount += removeFromTeams.length

    if (
      !addToOrganization &&
      !removeFromOrganization &&
      addToTeams.length === 0 &&
      removeFromTeams.length === 0 &&
      currentGatedRoles.length === 0 &&
      nextGatedRoles.length === 0
    ) {
      continue
    }

    users.push({
      addToOrganization,
      addToTeams,
      currentGatedRoles,
      currentOrganizationRole: currentUser.currentOrganizationRole,
      managedMembership: currentUser.managedMembership,
      name: currentUser.name,
      nextGatedRoles,
      removeFromOrganization,
      removeFromTeams,
      userId: currentUser.userId,
      username: currentUser.username,
      wallets: [...currentUser.wallets],
    })
  }

  return {
    organizationId: syncState.organizationId,
    roles: roleSummaries,
    summary: {
      addToOrganizationCount,
      addToTeamCount,
      qualifiedUserCount,
      removeFromOrganizationCount,
      removeFromTeamCount,
      usersChangedCount: users.filter(
        (currentUser) =>
          currentUser.addToOrganization ||
          currentUser.removeFromOrganization ||
          currentUser.addToTeams.length > 0 ||
          currentUser.removeFromTeams.length > 0,
      ).length,
    },
    users,
  }
}

async function loadCommunityDiscordConnectionRecord(
  organizationId: string,
  database?: Database,
): Promise<StoredCommunityDiscordConnectionRecord | null> {
  const currentDatabase = database ?? db
  const [record] = await currentDatabase
    .select({
      guildId: communityDiscordConnection.guildId,
      guildName: communityDiscordConnection.guildName,
      roleSyncEnabled: communityDiscordConnection.roleSyncEnabled,
    })
    .from(communityDiscordConnection)
    .where(eq(communityDiscordConnection.organizationId, organizationId))
    .limit(1)

  return record ?? null
}

async function loadUserProfiles(userIds: string[], database?: Database) {
  if (userIds.length === 0) {
    return new Map<string, QualifiedUserState>()
  }

  const currentDatabase = database ?? db
  const [userRows, walletRows] = await Promise.all([
    currentDatabase
      .select({
        name: user.name,
        userId: user.id,
        username: user.username,
      })
      .from(user)
      .where(inArray(user.id, userIds))
      .orderBy(asc(user.name), asc(user.username), asc(user.id)),
    currentDatabase
      .select({
        address: solanaWallet.address,
        userId: solanaWallet.userId,
      })
      .from(solanaWallet)
      .where(inArray(solanaWallet.userId, userIds))
      .orderBy(asc(solanaWallet.userId), asc(solanaWallet.address)),
  ])
  const usersById = new Map(
    userRows.map((currentUser) => [currentUser.userId, createQualifiedUserState(currentUser)] as const),
  )

  for (const walletRow of walletRows) {
    const currentUser = usersById.get(walletRow.userId)

    if (!currentUser) {
      continue
    }

    currentUser.wallets.push(walletRow.address)
  }

  return usersById
}

async function loadPotentialCommunityRoleDiscordSyncUserIds(input: {
  database?: Database
  organizationId: string
  roles: CommunityRoleRecord[]
}) {
  const currentDatabase = input.database ?? db
  const roleTeamIds = [...new Set(input.roles.map((roleRecord) => roleRecord.teamId))].sort((left, right) =>
    left.localeCompare(right),
  )
  const [managedRows, memberRows, teamMemberRows] = await Promise.all([
    currentDatabase
      .select({
        userId: communityManagedMember.userId,
      })
      .from(communityManagedMember)
      .where(eq(communityManagedMember.organizationId, input.organizationId))
      .orderBy(asc(communityManagedMember.userId)),
    currentDatabase
      .select({
        userId: member.userId,
      })
      .from(member)
      .where(eq(member.organizationId, input.organizationId))
      .orderBy(asc(member.userId)),
    roleTeamIds.length === 0
      ? []
      : currentDatabase
          .select({
            userId: teamMember.userId,
          })
          .from(teamMember)
          .where(inArray(teamMember.teamId, roleTeamIds))
          .orderBy(asc(teamMember.userId)),
  ])

  return [...new Set([...managedRows, ...memberRows, ...teamMemberRows].map((currentUser) => currentUser.userId))].sort(
    (left, right) => left.localeCompare(right),
  )
}

async function loadCanonicalDiscordAccountIdsByUserId(userIds: string[], database?: Database) {
  const relevantUserIds = [...new Set(userIds)].sort((left, right) => left.localeCompare(right))

  if (relevantUserIds.length === 0) {
    return new Map<string, string>()
  }

  const currentDatabase = database ?? db
  const identityRows = await currentDatabase
    .select({
      providerId: identity.providerId,
      userId: identity.userId,
    })
    .from(identity)
    .where(and(eq(identity.provider, 'discord'), inArray(identity.userId, relevantUserIds)))
    .orderBy(desc(identity.isPrimary), asc(identity.linkedAt), asc(identity.id))
  const canonicalDiscordAccountIdByUserId = new Map<string, string>()

  for (const identityRow of identityRows) {
    if (!canonicalDiscordAccountIdByUserId.has(identityRow.userId)) {
      canonicalDiscordAccountIdByUserId.set(identityRow.userId, identityRow.providerId)
    }
  }

  const missingUserIds = relevantUserIds.filter((userId) => !canonicalDiscordAccountIdByUserId.has(userId))

  if (missingUserIds.length > 0) {
    const accountRows = await currentDatabase
      .select({
        accountId: account.accountId,
        userId: account.userId,
      })
      .from(account)
      .where(and(eq(account.providerId, 'discord'), inArray(account.userId, missingUserIds)))
      .orderBy(asc(account.userId), asc(account.createdAt), asc(account.id))

    for (const accountRow of accountRows) {
      if (!canonicalDiscordAccountIdByUserId.has(accountRow.userId)) {
        canonicalDiscordAccountIdByUserId.set(accountRow.userId, accountRow.accountId)
      }
    }
  }

  return canonicalDiscordAccountIdByUserId
}

async function loadDiscordGuildMembersByDiscordUserId(guildId: string, discordUserIds: string[]) {
  const guildMembersByDiscordUserId = new Map<string, { discordUserId: string; roleIds: string[] }>()

  for (const discordUserId of [...new Set(discordUserIds)].sort((left, right) => left.localeCompare(right))) {
    const guildMember = await getDiscordGuildMember(
      {
        env,
      },
      {
        guildId,
        userId: discordUserId,
      },
    )

    if (guildMember) {
      guildMembersByDiscordUserId.set(guildMember.discordUserId, guildMember)
    }
  }

  return guildMembersByDiscordUserId
}

function createDiscordRoleMappingState(input: {
  connectionChecks: string[]
  guildRole: {
    assignable: boolean
    checks: string[]
    name: string
  } | null
  hasGuildRoleCatalog: boolean
  role: CommunityRoleRecord
}): DiscordRoleMappingState {
  if (!input.role.discordRoleId) {
    return {
      checks: ['mapping_missing'],
      discordRoleName: null,
      status: 'mapping_missing',
    }
  }

  const checks = [
    ...new Set(
      [...(input.guildRole?.checks ?? []), ...input.connectionChecks].sort((left, right) => left.localeCompare(right)),
    ),
  ]

  if (!input.guildRole) {
    return {
      checks: [
        ...new Set([...(input.hasGuildRoleCatalog ? ['discord_role_missing'] : ['mapping_not_assignable']), ...checks]),
      ].sort((left, right) => left.localeCompare(right)),
      discordRoleName: null,
      status: input.hasGuildRoleCatalog ? 'discord_role_missing' : 'mapping_not_assignable',
    }
  }

  if (input.guildRole.assignable && checks.length === 0) {
    return {
      checks: [],
      discordRoleName: input.guildRole.name,
      status: 'ready',
    }
  }

  return {
    checks: [...new Set(['mapping_not_assignable', ...checks])].sort((left, right) => left.localeCompare(right)),
    discordRoleName: input.guildRole.name,
    status: 'mapping_not_assignable',
  }
}

function buildCommunityRoleDiscordSyncSummaries(input: {
  mappingStateByRoleId: Map<string, DiscordRoleMappingState>
  qualifiedUserCountByRoleId: Map<string, number>
  roles: Array<{
    discordRoleId?: string | null
    enabled: boolean
    id: string
    name: string
  }>
  users: Array<{
    outcomes: Array<{
      communityRoleId: string
      status: DiscordSyncApplyOutcomeStatus
    }>
  }>
}) {
  const roleSummaries = input.roles.map((roleRecord) => {
    const mappingState = input.mappingStateByRoleId.get(roleRecord.id)

    return {
      communityRoleId: roleRecord.id,
      communityRoleName: roleRecord.name,
      counts: createDiscordSyncCounts(),
      discordRoleId: roleRecord.discordRoleId ?? null,
      discordRoleName: mappingState?.discordRoleName ?? null,
      enabled: roleRecord.enabled,
      mappingChecks: [...(mappingState?.checks ?? [])],
      mappingStatus: mappingState?.status ?? 'mapping_missing',
      qualifiedUserCount: input.qualifiedUserCountByRoleId.get(roleRecord.id) ?? 0,
    } satisfies CommunityRoleDiscordSyncRoleSummary
  })
  const roleSummaryById = new Map(
    roleSummaries.map((roleSummary) => [roleSummary.communityRoleId, roleSummary] as const),
  )
  const summaryCounts = createDiscordSyncCounts()

  for (const currentUser of input.users) {
    for (const outcome of currentUser.outcomes) {
      if (outcome.status === 'discord_api_failure') {
        continue
      }

      incrementDiscordSyncCount(summaryCounts, outcome.status)
      const roleSummary = roleSummaryById.get(outcome.communityRoleId)

      if (roleSummary) {
        incrementDiscordSyncCount(roleSummary.counts, outcome.status)
      }
    }
  }

  return {
    roles: roleSummaries,
    summary: {
      counts: summaryCounts,
      rolesBlockedCount: roleSummaries.filter((roleSummary) => roleSummary.mappingStatus !== 'ready').length,
      rolesReadyCount: roleSummaries.filter((roleSummary) => roleSummary.mappingStatus === 'ready').length,
      usersChangedCount: input.users.filter((currentUser) =>
        currentUser.outcomes.some((outcome) => outcome.status === 'will_grant' || outcome.status === 'will_revoke'),
      ).length,
    },
  }
}

async function buildCommunityRoleDiscordSyncPreview(
  organizationId: string,
  database?: Database,
): Promise<CommunityRoleDiscordSyncPreview> {
  const currentDatabase = database ?? db
  const connectionRecord = await loadCommunityDiscordConnectionRecord(organizationId, currentDatabase)

  if (!connectionRecord) {
    throw new Error('Community Discord connection not found.')
  }

  const qualificationState = await loadCommunityRoleQualificationState({
    database: currentDatabase,
    organizationId,
  })
  const inspection = await inspectDiscordGuildRoles(
    {
      env,
    },
    {
      guildId: connectionRecord.guildId,
    },
  )
  const connection = {
    checks: inspection.diagnostics.checks,
    guildId: connectionRecord.guildId,
    guildName: inspection.guildName ?? connectionRecord.guildName,
    lastCheckedAt: inspection.lastCheckedAt,
    status: inspection.status,
  } satisfies CommunityRoleDiscordSyncPreview['connection']
  const guildRolesById = new Map(inspection.roles.map((guildRole) => [guildRole.id, guildRole] as const))
  const communityRoleIdByDiscordRoleId = new Map(
    qualificationState.roles
      .filter((roleRecord) => roleRecord.discordRoleId)
      .map((roleRecord) => [roleRecord.discordRoleId as string, roleRecord.id] as const),
  )
  const hasMappedDiscordRole = qualificationState.roles.some((roleRecord) => roleRecord.discordRoleId)
  const candidateUserIds = [
    ...new Set(
      hasMappedDiscordRole
        ? [
            ...qualificationState.usersById.keys(),
            ...(await loadPotentialCommunityRoleDiscordSyncUserIds({
              database: currentDatabase,
              organizationId,
              roles: qualificationState.roles,
            })),
          ]
        : [...qualificationState.usersById.keys()],
    ),
  ].sort((left, right) => left.localeCompare(right))
  const canonicalDiscordAccountIdByUserId = hasMappedDiscordRole
    ? await loadCanonicalDiscordAccountIdsByUserId(candidateUserIds, currentDatabase)
    : new Map<string, string>()
  const usersById = new Map<string, QualifiedUserState>(
    [...qualificationState.usersById.entries()].map(([userId, currentUser]) => [
      userId,
      {
        ...currentUser,
        nextRoleIds: [...currentUser.nextRoleIds],
        nextTeamIds: [...currentUser.nextTeamIds],
        wallets: [...currentUser.wallets],
      },
    ]),
  )
  const missingProfileUserIds = candidateUserIds.filter((userId) => !usersById.has(userId))
  const extraProfilesById = await loadUserProfiles(missingProfileUserIds, currentDatabase)

  for (const [userId, currentUser] of extraProfilesById.entries()) {
    usersById.set(userId, currentUser)
  }

  const guildMembersByDiscordUserId = connection.checks.some((check) =>
    blockingDiscordGuildRoleInspectionChecks.has(check),
  )
    ? new Map<string, { discordUserId: string; roleIds: string[] }>()
    : await loadDiscordGuildMembersByDiscordUserId(
        connectionRecord.guildId,
        candidateUserIds
          .map((userId) => canonicalDiscordAccountIdByUserId.get(userId) ?? null)
          .filter((discordAccountId): discordAccountId is string => Boolean(discordAccountId)),
      )

  const qualifiedUserCountByRoleId = new Map<string, number>()

  for (const currentUser of qualificationState.usersById.values()) {
    for (const roleId of currentUser.nextRoleIds) {
      qualifiedUserCountByRoleId.set(roleId, (qualifiedUserCountByRoleId.get(roleId) ?? 0) + 1)
    }
  }

  const mappingStateByRoleId = new Map(
    qualificationState.roles.map((roleRecord) => [
      roleRecord.id,
      createDiscordRoleMappingState({
        connectionChecks: connection.checks,
        guildRole: roleRecord.discordRoleId ? (guildRolesById.get(roleRecord.discordRoleId) ?? null) : null,
        hasGuildRoleCatalog: inspection.roles.length > 0,
        role: roleRecord,
      }),
    ]),
  )
  const rolesById = new Map(qualificationState.roles.map((roleRecord) => [roleRecord.id, roleRecord] as const))
  const users: CommunityRoleDiscordSyncUser[] = []

  for (const currentUser of [...usersById.values()]
    .filter((candidateUser) => candidateUserIds.includes(candidateUser.userId))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        (left.username ?? '').localeCompare(right.username ?? '') ||
        left.userId.localeCompare(right.userId),
    )) {
    const discordAccountId = canonicalDiscordAccountIdByUserId.get(currentUser.userId) ?? null
    const guildMember = discordAccountId ? (guildMembersByDiscordUserId.get(discordAccountId) ?? null) : null
    const currentRoleIds =
      guildMember === null
        ? []
        : guildMember.roleIds
            .map((roleId) => communityRoleIdByDiscordRoleId.get(roleId) ?? null)
            .filter((roleId): roleId is string => Boolean(roleId))
    const relevantRoleIds = [...new Set([...currentRoleIds, ...currentUser.nextRoleIds])]

    if (relevantRoleIds.length === 0) {
      continue
    }

    sortRoleIds(relevantRoleIds, rolesById)

    const outcomes = relevantRoleIds.map((roleId) => {
      const roleRecord = rolesById.get(roleId)

      if (!roleRecord) {
        return null
      }

      const mappingState = mappingStateByRoleId.get(roleId)
      const desired = currentUser.nextRoleIds.includes(roleId) && roleRecord.enabled
      const current =
        roleRecord.discordRoleId && guildMember ? guildMember.roleIds.includes(roleRecord.discordRoleId) : null
      const status: DiscordSyncOutcomeStatus =
        mappingState?.status === 'mapping_missing'
          ? 'mapping_missing'
          : mappingState?.status === 'discord_role_missing'
            ? 'discord_role_missing'
            : mappingState?.status === 'mapping_not_assignable'
              ? 'mapping_not_assignable'
              : discordAccountId === null
                ? 'no_discord_account_linked'
                : guildMember === null
                  ? 'linked_but_not_in_guild'
                  : current && !desired
                    ? 'will_revoke'
                    : !current && desired
                      ? 'will_grant'
                      : 'already_correct'

      return {
        checks:
          status === 'mapping_missing'
            ? ['mapping_missing']
            : status === 'discord_role_missing'
              ? [...(mappingState?.checks ?? ['discord_role_missing'])]
              : status === 'mapping_not_assignable'
                ? [...(mappingState?.checks ?? ['mapping_not_assignable'])]
                : status === 'no_discord_account_linked'
                  ? ['no_discord_account_linked']
                  : status === 'linked_but_not_in_guild'
                    ? ['linked_but_not_in_guild']
                    : [],
        communityRoleId: roleRecord.id,
        communityRoleName: roleRecord.name,
        current,
        desired,
        discordRoleId: roleRecord.discordRoleId ?? null,
        discordRoleName: mappingState?.discordRoleName ?? null,
        status,
      } satisfies CommunityRoleDiscordSyncOutcome
    })

    users.push({
      discordAccountId,
      guildMemberPresent: discordAccountId === null ? null : guildMember !== null,
      name: currentUser.name,
      outcomes: outcomes.filter((outcome): outcome is CommunityRoleDiscordSyncOutcome => Boolean(outcome)),
      userId: currentUser.userId,
      username: currentUser.username,
      wallets: [...currentUser.wallets],
    })
  }

  const { roles, summary } = buildCommunityRoleDiscordSyncSummaries({
    mappingStateByRoleId,
    qualifiedUserCountByRoleId,
    roles: qualificationState.roles,
    users,
  })

  return {
    connection,
    organizationId,
    roles,
    summary,
    users,
  }
}

function buildCommunitySyncStatusSummary<TRunRecord extends { finishedAt: Date | null; status: string }>(input: {
  dependencyAssetGroups: OrganizationSyncDependencyAssetGroup[]
  intervalMs: number
  lastRun: TRunRecord | null
  lastSuccessfulRun: TRunRecord | null
  now: Date
}): CommunitySyncStatusSummary<TRunRecord> {
  const lastSuccessfulRunIsStale =
    !input.lastSuccessfulRun?.finishedAt ||
    input.now.getTime() - input.lastSuccessfulRun.finishedAt.getTime() > getStaleAfterMs(input.intervalMs)
  const hasStaleDependency = input.dependencyAssetGroups.some(
    (assetGroupRecord) => assetGroupRecord.enabled && assetGroupRecord.indexingStatus.freshnessStatus !== 'fresh',
  )

  return {
    freshnessStatus: !input.lastSuccessfulRun?.finishedAt
      ? 'unknown'
      : lastSuccessfulRunIsStale || hasStaleDependency
        ? 'stale'
        : 'fresh',
    isRunning: input.lastRun?.status === 'running',
    lastRun: input.lastRun,
    lastSuccessfulRun: input.lastSuccessfulRun,
    staleAfterMinutes: getStaleAfterMinutes(input.intervalMs),
  }
}

function getDependencyAssetGroupRecords(roles: CommunityRoleRecord[]) {
  return [
    ...new Map(
      roles
        .filter((roleRecord) => roleRecord.enabled)
        .flatMap((roleRecord) => roleRecord.conditions)
        .map(
          (condition) =>
            [
              condition.assetGroupId,
              {
                address: condition.assetGroupAddress,
                enabled: condition.assetGroupEnabled,
                id: condition.assetGroupId,
                label: condition.assetGroupLabel,
                type: condition.assetGroupType,
              },
            ] as const,
        ),
    ).values(),
  ].sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.type.localeCompare(right.type) ||
      left.address.localeCompare(right.address) ||
      left.id.localeCompare(right.id),
  )
}

async function getOrganizationSyncDependencies(input: {
  database?: Database
  now?: () => Date
  organizationId: string
  roles?: CommunityRoleRecord[]
}) {
  const roles = input.roles ?? (await listCommunityRoleRecords(input.organizationId, input.database))
  const dependencyAssetGroups = getDependencyAssetGroupRecords(roles)
  const indexingStatusByAssetGroupId = await getAssetGroupIndexStatusSummaries({
    assetGroupIds: dependencyAssetGroups.map((assetGroupRecord) => assetGroupRecord.id),
    database: input.database,
    now: input.now,
  })
  const dependencyAssetGroupsWithStatus = dependencyAssetGroups.map((assetGroupRecord) => ({
    ...assetGroupRecord,
    indexingStatus: indexingStatusByAssetGroupId.get(assetGroupRecord.id) ?? {
      freshnessStatus: 'unknown',
      isRunning: false,
      lastRun: null,
      lastSuccessfulRun: null,
      staleAfterMinutes: getStaleAfterMinutes(getScheduledIndexIntervalMs()),
    },
  }))
  const blockedAssetGroupIds = dependencyAssetGroupsWithStatus
    .filter(
      (assetGroupRecord) => assetGroupRecord.enabled && assetGroupRecord.indexingStatus.freshnessStatus !== 'fresh',
    )
    .map((assetGroupRecord) => assetGroupRecord.id)

  return {
    blockedAssetGroupIds,
    dependencyAssetGroupIds: dependencyAssetGroupsWithStatus.map((assetGroupRecord) => assetGroupRecord.id),
    dependencyAssetGroups: dependencyAssetGroupsWithStatus,
    dependencyFreshAtStart: blockedAssetGroupIds.length === 0,
  }
}

function toCommunityDiscordSyncRunRecord(row: {
  appliedGrantCount: number
  appliedRevokeCount: number
  blockedAssetGroupIds: string | null
  dependencyAssetGroupIds: string
  dependencyFreshAtStart: boolean
  errorMessage: string | null
  errorPayload: string | null
  failedCount: number
  finishedAt: Date | null
  id: string
  organizationId: string
  outcomeCounts: string
  rolesBlockedCount: number
  rolesReadyCount: number
  startedAt: Date
  status: CommunityDiscordSyncRunStatus
  triggerSource: CommunityRoleSyncTriggerSource
  usersChangedCount: number
}): CommunityDiscordSyncRunRecord {
  return {
    appliedGrantCount: row.appliedGrantCount,
    appliedRevokeCount: row.appliedRevokeCount,
    blockedAssetGroupIds: parseStoredJson<string[]>(row.blockedAssetGroupIds) ?? [],
    dependencyAssetGroupIds: parseStoredJson<string[]>(row.dependencyAssetGroupIds) ?? [],
    dependencyFreshAtStart: row.dependencyFreshAtStart,
    errorMessage: row.errorMessage,
    errorPayload: parseStoredJson(row.errorPayload),
    failedCount: row.failedCount,
    finishedAt: row.finishedAt,
    id: row.id,
    organizationId: row.organizationId,
    outcomeCounts: parseStoredJson<DiscordSyncCounts>(row.outcomeCounts) ?? createDiscordSyncCounts(),
    rolesBlockedCount: row.rolesBlockedCount,
    rolesReadyCount: row.rolesReadyCount,
    startedAt: row.startedAt,
    status: row.status,
    triggerSource: row.triggerSource,
    usersChangedCount: row.usersChangedCount,
  }
}

function toCommunityMembershipSyncRunRecord(row: {
  addToOrganizationCount: number
  addToTeamCount: number
  blockedAssetGroupIds: string | null
  dependencyAssetGroupIds: string
  dependencyFreshAtStart: boolean
  errorMessage: string | null
  errorPayload: string | null
  finishedAt: Date | null
  id: string
  organizationId: string
  qualifiedUserCount: number
  removeFromOrganizationCount: number
  removeFromTeamCount: number
  startedAt: Date
  status: CommunityMembershipSyncRunStatus
  triggerSource: CommunityRoleSyncTriggerSource
  usersChangedCount: number
}): CommunityMembershipSyncRunRecord {
  return {
    addToOrganizationCount: row.addToOrganizationCount,
    addToTeamCount: row.addToTeamCount,
    blockedAssetGroupIds: parseStoredJson<string[]>(row.blockedAssetGroupIds) ?? [],
    dependencyAssetGroupIds: parseStoredJson<string[]>(row.dependencyAssetGroupIds) ?? [],
    dependencyFreshAtStart: row.dependencyFreshAtStart,
    errorMessage: row.errorMessage,
    errorPayload: parseStoredJson(row.errorPayload),
    finishedAt: row.finishedAt,
    id: row.id,
    organizationId: row.organizationId,
    qualifiedUserCount: row.qualifiedUserCount,
    removeFromOrganizationCount: row.removeFromOrganizationCount,
    removeFromTeamCount: row.removeFromTeamCount,
    startedAt: row.startedAt,
    status: row.status,
    triggerSource: row.triggerSource,
    usersChangedCount: row.usersChangedCount,
  }
}

async function getCommunityDiscordSyncRunRows(input: {
  database?: Database
  limitPerOrganization: number
  organizationIds: string[]
  statuses?: CommunityDiscordSyncRunStatus[]
}) {
  if (input.organizationIds.length === 0 || input.limitPerOrganization < 1) {
    return []
  }

  const database = input.database ?? db
  const rows = []

  for (const organizationIdChunk of splitIntoChunks(
    input.organizationIds,
    getRunLookupChunkSize(input.statuses?.length ?? 0),
  )) {
    const filters = [inArray(communityDiscordSyncRun.organizationId, organizationIdChunk)]

    if (input.statuses?.length) {
      filters.push(inArray(communityDiscordSyncRun.status, input.statuses))
    }

    const rankedRuns = database
      .select({
        appliedGrantCount: communityDiscordSyncRun.appliedGrantCount,
        appliedRevokeCount: communityDiscordSyncRun.appliedRevokeCount,
        blockedAssetGroupIds: communityDiscordSyncRun.blockedAssetGroupIds,
        dependencyAssetGroupIds: communityDiscordSyncRun.dependencyAssetGroupIds,
        dependencyFreshAtStart: communityDiscordSyncRun.dependencyFreshAtStart,
        errorMessage: communityDiscordSyncRun.errorMessage,
        errorPayload: communityDiscordSyncRun.errorPayload,
        failedCount: communityDiscordSyncRun.failedCount,
        finishedAt: communityDiscordSyncRun.finishedAt,
        id: communityDiscordSyncRun.id,
        organizationId: communityDiscordSyncRun.organizationId,
        outcomeCounts: communityDiscordSyncRun.outcomeCounts,
        rolesBlockedCount: communityDiscordSyncRun.rolesBlockedCount,
        rolesReadyCount: communityDiscordSyncRun.rolesReadyCount,
        rowNumber:
          sql<number>`row_number() over (partition by ${communityDiscordSyncRun.organizationId} order by ${communityDiscordSyncRun.startedAt} desc, ${communityDiscordSyncRun.id} desc)`.as(
            'rowNumber',
          ),
        startedAt: communityDiscordSyncRun.startedAt,
        status: communityDiscordSyncRun.status,
        triggerSource: communityDiscordSyncRun.triggerSource,
        usersChangedCount: communityDiscordSyncRun.usersChangedCount,
      })
      .from(communityDiscordSyncRun)
      .where(and(...filters))
      .as('rankedCommunityDiscordSyncRun')

    rows.push(
      ...(await database
        .select({
          appliedGrantCount: rankedRuns.appliedGrantCount,
          appliedRevokeCount: rankedRuns.appliedRevokeCount,
          blockedAssetGroupIds: rankedRuns.blockedAssetGroupIds,
          dependencyAssetGroupIds: rankedRuns.dependencyAssetGroupIds,
          dependencyFreshAtStart: rankedRuns.dependencyFreshAtStart,
          errorMessage: rankedRuns.errorMessage,
          errorPayload: rankedRuns.errorPayload,
          failedCount: rankedRuns.failedCount,
          finishedAt: rankedRuns.finishedAt,
          id: rankedRuns.id,
          organizationId: rankedRuns.organizationId,
          outcomeCounts: rankedRuns.outcomeCounts,
          rolesBlockedCount: rankedRuns.rolesBlockedCount,
          rolesReadyCount: rankedRuns.rolesReadyCount,
          startedAt: rankedRuns.startedAt,
          status: rankedRuns.status,
          triggerSource: rankedRuns.triggerSource,
          usersChangedCount: rankedRuns.usersChangedCount,
        })
        .from(rankedRuns)
        .where(lte(rankedRuns.rowNumber, input.limitPerOrganization))
        .orderBy(asc(rankedRuns.organizationId), desc(rankedRuns.startedAt), desc(rankedRuns.id))),
    )
  }

  return rows
}

async function getCommunityMembershipSyncRunRows(input: {
  database?: Database
  limitPerOrganization: number
  organizationIds: string[]
  statuses?: CommunityMembershipSyncRunStatus[]
}) {
  if (input.organizationIds.length === 0 || input.limitPerOrganization < 1) {
    return []
  }

  const database = input.database ?? db
  const rows = []

  for (const organizationIdChunk of splitIntoChunks(
    input.organizationIds,
    getRunLookupChunkSize(input.statuses?.length ?? 0),
  )) {
    const filters = [inArray(communityMembershipSyncRun.organizationId, organizationIdChunk)]

    if (input.statuses?.length) {
      filters.push(inArray(communityMembershipSyncRun.status, input.statuses))
    }

    const rankedRuns = database
      .select({
        addToOrganizationCount: communityMembershipSyncRun.addToOrganizationCount,
        addToTeamCount: communityMembershipSyncRun.addToTeamCount,
        blockedAssetGroupIds: communityMembershipSyncRun.blockedAssetGroupIds,
        dependencyAssetGroupIds: communityMembershipSyncRun.dependencyAssetGroupIds,
        dependencyFreshAtStart: communityMembershipSyncRun.dependencyFreshAtStart,
        errorMessage: communityMembershipSyncRun.errorMessage,
        errorPayload: communityMembershipSyncRun.errorPayload,
        finishedAt: communityMembershipSyncRun.finishedAt,
        id: communityMembershipSyncRun.id,
        organizationId: communityMembershipSyncRun.organizationId,
        qualifiedUserCount: communityMembershipSyncRun.qualifiedUserCount,
        removeFromOrganizationCount: communityMembershipSyncRun.removeFromOrganizationCount,
        removeFromTeamCount: communityMembershipSyncRun.removeFromTeamCount,
        rowNumber:
          sql<number>`row_number() over (partition by ${communityMembershipSyncRun.organizationId} order by ${communityMembershipSyncRun.startedAt} desc, ${communityMembershipSyncRun.id} desc)`.as(
            'rowNumber',
          ),
        startedAt: communityMembershipSyncRun.startedAt,
        status: communityMembershipSyncRun.status,
        triggerSource: communityMembershipSyncRun.triggerSource,
        usersChangedCount: communityMembershipSyncRun.usersChangedCount,
      })
      .from(communityMembershipSyncRun)
      .where(and(...filters))
      .as('rankedCommunityMembershipSyncRun')

    rows.push(
      ...(await database
        .select({
          addToOrganizationCount: rankedRuns.addToOrganizationCount,
          addToTeamCount: rankedRuns.addToTeamCount,
          blockedAssetGroupIds: rankedRuns.blockedAssetGroupIds,
          dependencyAssetGroupIds: rankedRuns.dependencyAssetGroupIds,
          dependencyFreshAtStart: rankedRuns.dependencyFreshAtStart,
          errorMessage: rankedRuns.errorMessage,
          errorPayload: rankedRuns.errorPayload,
          finishedAt: rankedRuns.finishedAt,
          id: rankedRuns.id,
          organizationId: rankedRuns.organizationId,
          qualifiedUserCount: rankedRuns.qualifiedUserCount,
          removeFromOrganizationCount: rankedRuns.removeFromOrganizationCount,
          removeFromTeamCount: rankedRuns.removeFromTeamCount,
          startedAt: rankedRuns.startedAt,
          status: rankedRuns.status,
          triggerSource: rankedRuns.triggerSource,
          usersChangedCount: rankedRuns.usersChangedCount,
        })
        .from(rankedRuns)
        .where(lte(rankedRuns.rowNumber, input.limitPerOrganization))
        .orderBy(asc(rankedRuns.organizationId), desc(rankedRuns.startedAt), desc(rankedRuns.id))),
    )
  }

  return rows
}

async function finalizeCommunityDiscordSyncRun(input: {
  appliedGrantCount: number
  appliedRevokeCount: number
  blockedAssetGroupIds: string[]
  database?: Database
  errorMessage: string | null
  errorPayload: unknown | null
  failedCount: number
  finishedAt: Date
  outcomeCounts: DiscordSyncCounts
  rolesBlockedCount: number
  rolesReadyCount: number
  runId: string
  status: CommunityDiscordSyncRunStatus
  usersChangedCount: number
}) {
  const database = input.database ?? db

  await database
    .update(communityDiscordSyncRun)
    .set({
      appliedGrantCount: input.appliedGrantCount,
      appliedRevokeCount: input.appliedRevokeCount,
      blockedAssetGroupIds: serializeJson(input.blockedAssetGroupIds),
      errorMessage: input.errorMessage,
      errorPayload: serializeJson(input.errorPayload),
      failedCount: input.failedCount,
      finishedAt: input.finishedAt,
      outcomeCounts: JSON.stringify(input.outcomeCounts),
      rolesBlockedCount: input.rolesBlockedCount,
      rolesReadyCount: input.rolesReadyCount,
      status: input.status,
      usersChangedCount: input.usersChangedCount,
    })
    .where(and(eq(communityDiscordSyncRun.id, input.runId), eq(communityDiscordSyncRun.status, 'running')))
}

async function finalizeCommunityMembershipSyncRun(input: {
  addToOrganizationCount: number
  addToTeamCount: number
  blockedAssetGroupIds: string[]
  database?: Database
  errorMessage: string | null
  errorPayload: unknown | null
  finishedAt: Date
  qualifiedUserCount: number
  removeFromOrganizationCount: number
  removeFromTeamCount: number
  runId: string
  status: CommunityMembershipSyncRunStatus
  usersChangedCount: number
}) {
  const database = input.database ?? db

  await database
    .update(communityMembershipSyncRun)
    .set({
      addToOrganizationCount: input.addToOrganizationCount,
      addToTeamCount: input.addToTeamCount,
      blockedAssetGroupIds: serializeJson(input.blockedAssetGroupIds),
      errorMessage: input.errorMessage,
      errorPayload: serializeJson(input.errorPayload),
      finishedAt: input.finishedAt,
      qualifiedUserCount: input.qualifiedUserCount,
      removeFromOrganizationCount: input.removeFromOrganizationCount,
      removeFromTeamCount: input.removeFromTeamCount,
      status: input.status,
      usersChangedCount: input.usersChangedCount,
    })
    .where(and(eq(communityMembershipSyncRun.id, input.runId), eq(communityMembershipSyncRun.status, 'running')))
}

async function markCommunitySyncRunFailedForExpiredLock(input: {
  currentRunId: string
  previousRunId: string
  stolenAt: Date
  transaction: AutomationTransaction
}) {
  if (input.currentRunId === input.previousRunId) {
    return
  }

  const errorMessage = 'Community sync lock ownership was lost before the run completed.'
  const errorPayload = JSON.stringify({
    reason: 'lock_lost',
  })

  await input.transaction
    .update(communityMembershipSyncRun)
    .set({
      errorMessage,
      errorPayload,
      finishedAt: input.stolenAt,
      status: 'failed',
    })
    .where(
      and(eq(communityMembershipSyncRun.id, input.previousRunId), eq(communityMembershipSyncRun.status, 'running')),
    )
  await input.transaction
    .update(communityDiscordSyncRun)
    .set({
      errorMessage,
      errorPayload,
      finishedAt: input.stolenAt,
      status: 'failed',
    })
    .where(and(eq(communityDiscordSyncRun.id, input.previousRunId), eq(communityDiscordSyncRun.status, 'running')))
}

export async function previewCommunityRoleSync(organizationId: string) {
  const existingOrganization = await ensureOrganizationExists(organizationId)

  if (!existingOrganization) {
    return null
  }

  return buildPreviewFromSyncState(await loadSyncState(organizationId))
}

export async function previewCommunityRoleDiscordSync(organizationId: string) {
  const existingOrganization = await ensureOrganizationExists(organizationId)

  if (!existingOrganization) {
    return null
  }

  return await buildCommunityRoleDiscordSyncPreview(organizationId)
}

async function clearActiveOrganizationSessions(input: {
  database?: Pick<Database, 'update'>
  organizationId: string
  userId: string
}) {
  const database = input.database ?? db

  await database
    .update(session)
    .set({
      activeOrganizationId: null,
      activeTeamId: null,
    })
    .where(and(eq(session.userId, input.userId), eq(session.activeOrganizationId, input.organizationId)))
}

async function clearActiveTeamSessions(input: { database?: Pick<Database, 'update'>; teamId: string; userId: string }) {
  const database = input.database ?? db

  await database
    .update(session)
    .set({
      activeTeamId: null,
    })
    .where(and(eq(session.userId, input.userId), eq(session.activeTeamId, input.teamId)))
}

async function clearActiveTeamSessionsByIds(input: {
  database?: Pick<Database, 'update'>
  teamIds: string[]
  userId: string
}) {
  if (input.teamIds.length === 0) {
    return
  }

  const database = input.database ?? db

  await database
    .update(session)
    .set({
      activeTeamId: null,
    })
    .where(and(eq(session.userId, input.userId), inArray(session.activeTeamId, input.teamIds)))
}

function getCommunityDiscordSyncApplyStatus(
  apply: CommunityRoleDiscordSyncApply,
): Exclude<CommunityDiscordSyncRunStatus, 'failed' | 'running' | 'skipped'> {
  return apply.summary.failedCount > 0 || apply.summary.rolesBlockedCount > 0 ? 'partial' : 'succeeded'
}

function getEmptyCommunityDiscordSyncApplySummary(): CommunityRoleDiscordSyncApply['summary'] {
  return {
    appliedGrantCount: 0,
    appliedRevokeCount: 0,
    counts: createDiscordSyncCounts(),
    failedCount: 0,
    rolesBlockedCount: 0,
    rolesReadyCount: 0,
    usersChangedCount: 0,
  }
}

function getEmptyCommunityRoleSyncSummary(): CommunityRoleSyncPreview['summary'] {
  return {
    addToOrganizationCount: 0,
    addToTeamCount: 0,
    qualifiedUserCount: 0,
    removeFromOrganizationCount: 0,
    removeFromTeamCount: 0,
    usersChangedCount: 0,
  }
}

function createCommunityRoleDiscordSyncExecutionProgress(): CommunityRoleDiscordSyncExecutionProgress {
  return {
    appliedGrantCount: 0,
    appliedRevokeCount: 0,
    failedCount: 0,
    users: [],
  }
}

function hasCommunityRoleSyncUserChanges(currentUser: CommunityRoleSyncChangeUser) {
  return (
    currentUser.addToOrganization ||
    currentUser.removeFromOrganization ||
    currentUser.addToTeams.length > 0 ||
    currentUser.removeFromTeams.length > 0
  )
}

function recordCommunityRoleSyncUserProgress(
  summary: CommunityRoleSyncPreview['summary'],
  currentUser: CommunityRoleSyncChangeUser,
) {
  if (currentUser.nextGatedRoles.length > 0) {
    summary.qualifiedUserCount += 1
  }

  if (currentUser.addToOrganization) {
    summary.addToOrganizationCount += 1
  }

  if (currentUser.removeFromOrganization) {
    summary.removeFromOrganizationCount += 1
  }

  summary.addToTeamCount += currentUser.addToTeams.length
  summary.removeFromTeamCount += currentUser.removeFromTeams.length

  if (hasCommunityRoleSyncUserChanges(currentUser)) {
    summary.usersChangedCount += 1
  }
}

function buildCommunityRoleDiscordSyncApplyFromProgress(input: {
  preview: CommunityRoleDiscordSyncPreview
  progress: CommunityRoleDiscordSyncExecutionProgress
}): CommunityRoleDiscordSyncApply {
  const mappingStateByRoleId = new Map(
    input.preview.roles.map((role) => [
      role.communityRoleId,
      {
        checks: [...role.mappingChecks],
        discordRoleName: role.discordRoleName,
        status: role.mappingStatus,
      },
    ]),
  )
  const qualifiedUserCountByRoleId = new Map(
    input.preview.roles.map((role) => [role.communityRoleId, role.qualifiedUserCount]),
  )
  const summarizedRoles = input.preview.roles.map((role) => ({
    discordRoleId: role.discordRoleId,
    enabled: role.enabled,
    id: role.communityRoleId,
    name: role.communityRoleName,
  }))
  const { roles, summary } = buildCommunityRoleDiscordSyncSummaries({
    mappingStateByRoleId,
    qualifiedUserCountByRoleId,
    roles: summarizedRoles,
    users: input.progress.users,
  })

  return {
    ...input.preview,
    roles,
    summary: {
      ...summary,
      appliedGrantCount: input.progress.appliedGrantCount,
      appliedRevokeCount: input.progress.appliedRevokeCount,
      failedCount: input.progress.failedCount,
    },
    users: input.progress.users,
  }
}

async function executeCommunityRoleSyncUser(input: {
  currentUser: CommunityRoleSyncChangeUser
  database?: Database
  organizationId: string
}) {
  const database = input.database ?? db

  await database.transaction(async (transaction) => {
    const currentNow = new Date()

    if (input.currentUser.addToOrganization) {
      await transaction.insert(member).values({
        createdAt: currentNow,
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        role: 'member',
        userId: input.currentUser.userId,
      })
      await transaction.insert(communityManagedMember).values({
        createdAt: currentNow,
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        updatedAt: currentNow,
        userId: input.currentUser.userId,
      })
    }

    for (const addedTeam of input.currentUser.addToTeams) {
      await transaction.insert(teamMember).values({
        createdAt: currentNow,
        id: crypto.randomUUID(),
        teamId: addedTeam.teamId,
        userId: input.currentUser.userId,
      })
    }

    for (const removedTeam of input.currentUser.removeFromTeams) {
      await transaction
        .delete(teamMember)
        .where(and(eq(teamMember.teamId, removedTeam.teamId), eq(teamMember.userId, input.currentUser.userId)))
    }

    await clearActiveTeamSessionsByIds({
      database: transaction,
      teamIds: input.currentUser.removeFromTeams.map((removedTeam) => removedTeam.teamId),
      userId: input.currentUser.userId,
    })

    if (!input.currentUser.removeFromOrganization) {
      return
    }

    await transaction
      .delete(member)
      .where(and(eq(member.organizationId, input.organizationId), eq(member.userId, input.currentUser.userId)))
    await transaction
      .delete(communityManagedMember)
      .where(
        and(
          eq(communityManagedMember.organizationId, input.organizationId),
          eq(communityManagedMember.userId, input.currentUser.userId),
        ),
      )
    await clearActiveOrganizationSessions({
      database: transaction,
      organizationId: input.organizationId,
      userId: input.currentUser.userId,
    })
  })
}

async function executeCommunityRoleSyncPreview(input: {
  database?: Database
  leaseController: AutomationLockLeaseController
  organizationId: string
  preview: CommunityRoleSyncPreview
  summary: CommunityRoleSyncPreview['summary']
}) {
  const database = input.database ?? db

  for (const currentUser of input.preview.users) {
    await input.leaseController.ensureOwned()

    if (hasCommunityRoleSyncUserChanges(currentUser)) {
      await executeCommunityRoleSyncUser({
        currentUser,
        database,
        organizationId: input.organizationId,
      })
    }

    recordCommunityRoleSyncUserProgress(input.summary, currentUser)
  }

  return input.preview
}

function toCommunityDiscordRoleUpdatesAnnouncementPayload(input: {
  currentUser: CommunityRoleDiscordSyncPreview['users'][number]
  outcomes: CommunityRoleDiscordSyncApplyOutcome[]
}) {
  if (!input.currentUser.discordAccountId) {
    return null
  }

  const changes = input.outcomes
    .filter(
      (outcome): outcome is CommunityRoleDiscordSyncApplyOutcome & { attemptedAction: 'grant' | 'revoke' } =>
        outcome.execution === 'applied' && outcome.attemptedAction !== null,
    )
    .map((outcome) => ({
      action: outcome.attemptedAction,
      communityRoleName: outcome.communityRoleName,
      discordRoleName: outcome.discordRoleName,
    }))

  if (changes.length === 0) {
    return null
  }

  return {
    changes,
    discordAccountId: input.currentUser.discordAccountId,
    userName: input.currentUser.name,
    username: input.currentUser.username,
  }
}

async function executeCommunityRoleDiscordSyncPreview(input: {
  database?: Pick<Database, 'select'>
  leaseController: AutomationLockLeaseController
  organizationId: string
  progress: CommunityRoleDiscordSyncExecutionProgress
  preview: CommunityRoleDiscordSyncPreview
}): Promise<CommunityRoleDiscordSyncApply> {
  for (const currentUser of input.preview.users) {
    const outcomes: CommunityRoleDiscordSyncApplyOutcome[] = []

    try {
      for (const outcome of currentUser.outcomes) {
        if (
          (outcome.status !== 'will_grant' && outcome.status !== 'will_revoke') ||
          !currentUser.discordAccountId ||
          !outcome.discordRoleId
        ) {
          outcomes.push({
            ...outcome,
            attemptedAction: null,
            errorMessage: null,
            execution: 'noop',
            status: outcome.status,
          })

          continue
        }

        await input.leaseController.ensureOwned()

        try {
          if (outcome.status === 'will_grant') {
            await addDiscordGuildMemberRole(
              {
                env,
              },
              {
                guildId: input.preview.connection.guildId,
                reason: `community-role:${outcome.communityRoleId}`,
                roleId: outcome.discordRoleId,
                userId: currentUser.discordAccountId,
              },
            )
            input.progress.appliedGrantCount += 1
          } else {
            await removeDiscordGuildMemberRole(
              {
                env,
              },
              {
                guildId: input.preview.connection.guildId,
                reason: `community-role:${outcome.communityRoleId}`,
                roleId: outcome.discordRoleId,
                userId: currentUser.discordAccountId,
              },
            )
            input.progress.appliedRevokeCount += 1
          }

          outcomes.push({
            ...outcome,
            attemptedAction: outcome.status === 'will_grant' ? 'grant' : 'revoke',
            errorMessage: null,
            execution: 'applied',
            status: outcome.status,
          })
        } catch (error) {
          if (error instanceof DiscordGuildMemberRoleMutationError && error.code === 'guild_member_not_found') {
            outcomes.push({
              ...outcome,
              attemptedAction: outcome.status === 'will_grant' ? 'grant' : 'revoke',
              errorMessage: null,
              execution: 'skipped',
              status: 'linked_but_not_in_guild',
            })

            continue
          }

          input.progress.failedCount += 1
          outcomes.push({
            ...outcome,
            attemptedAction: outcome.status === 'will_grant' ? 'grant' : 'revoke',
            errorMessage: error instanceof Error ? error.message : 'Discord request failed.',
            execution: 'failed',
            status: 'discord_api_failure',
          })
        }
      }
    } catch (error) {
      input.progress.users.push({
        ...currentUser,
        outcomes,
      })

      throw error
    }

    input.progress.users.push({
      ...currentUser,
      outcomes,
    })

    const announcementPayload = toCommunityDiscordRoleUpdatesAnnouncementPayload({
      currentUser,
      outcomes,
    })

    if (announcementPayload) {
      await publishCommunityDiscordAnnouncement({
        database: input.database,
        organizationId: input.organizationId,
        payload: announcementPayload,
        type: 'role_updates',
      })
    }
  }

  return buildCommunityRoleDiscordSyncApplyFromProgress({
    preview: input.preview,
    progress: input.progress,
  })
}

async function runCommunityMembershipSync(input: {
  database?: Database
  now?: () => Date
  organizationId: string
  skipIfDependenciesNotFresh: boolean
  skipIfLocked: boolean
  triggerSource: CommunityRoleSyncTriggerSource
}) {
  const database = input.database ?? db
  const now = input.now ?? (() => new Date())
  const existingOrganization = await ensureOrganizationExists(input.organizationId, database)

  if (!existingOrganization) {
    return {
      preview: null,
      status: 'missing' as const,
    }
  }

  const roles = await listCommunityRoleRecords(input.organizationId, database)
  const dependencies = await getOrganizationSyncDependencies({
    database,
    now: input.now,
    organizationId: input.organizationId,
    roles,
  })
  const runId = crypto.randomUUID()
  const startedAt = now()
  const lockKey = buildCommunitySyncLockKey(input.organizationId)
  const expiresAt = new Date(startedAt.getTime() + AUTOMATION_LOCK_TIMEOUT_MS)
  const lock = await acquireAutomationLock({
    database,
    expiresAt,
    key: lockKey,
    onStaleLockStolen: markCommunitySyncRunFailedForExpiredLock,
    runId,
    startedAt,
  })

  if (!lock.acquired) {
    if (input.skipIfLocked) {
      return {
        preview: null,
        status: 'locked' as const,
      }
    }

    throw new AutomationLockConflictError(lockKey)
  }

  let preview: CommunityRoleSyncPreview | null = null
  const appliedSummary = getEmptyCommunityRoleSyncSummary()
  const leaseController = createAutomationLockLeaseController({
    database,
    key: lockKey,
    now,
    runId,
  })
  let runInserted = false

  leaseController.start()

  try {
    await leaseController.ensureOwned()
    await database.insert(communityMembershipSyncRun).values({
      addToOrganizationCount: 0,
      addToTeamCount: 0,
      blockedAssetGroupIds: serializeJson(dependencies.blockedAssetGroupIds),
      dependencyAssetGroupIds: JSON.stringify(dependencies.dependencyAssetGroupIds),
      dependencyFreshAtStart: dependencies.dependencyFreshAtStart,
      errorMessage: null,
      errorPayload: null,
      finishedAt: null,
      id: runId,
      organizationId: input.organizationId,
      qualifiedUserCount: 0,
      removeFromOrganizationCount: 0,
      removeFromTeamCount: 0,
      startedAt,
      status: 'running',
      triggerSource: input.triggerSource,
      usersChangedCount: 0,
    })
    runInserted = true

    if (input.skipIfDependenciesNotFresh && !dependencies.dependencyFreshAtStart) {
      await leaseController.ensureOwned()
      await finalizeCommunityMembershipSyncRun({
        addToOrganizationCount: 0,
        addToTeamCount: 0,
        blockedAssetGroupIds: dependencies.blockedAssetGroupIds,
        database,
        errorMessage: 'Scheduled membership sync skipped because required asset groups are stale.',
        errorPayload: {
          reason: 'dependency_stale',
        },
        finishedAt: now(),
        qualifiedUserCount: 0,
        removeFromOrganizationCount: 0,
        removeFromTeamCount: 0,
        runId,
        status: 'skipped',
        usersChangedCount: 0,
      })

      return {
        preview: null,
        status: 'skipped' as const,
      }
    }

    preview = buildPreviewFromSyncState(await loadSyncState(input.organizationId, database))
    await executeCommunityRoleSyncPreview({
      database,
      leaseController,
      organizationId: input.organizationId,
      preview,
      summary: appliedSummary,
    })
    await leaseController.ensureOwned()
    await finalizeCommunityMembershipSyncRun({
      addToOrganizationCount: appliedSummary.addToOrganizationCount,
      addToTeamCount: appliedSummary.addToTeamCount,
      blockedAssetGroupIds: dependencies.blockedAssetGroupIds,
      database,
      errorMessage: null,
      errorPayload: null,
      finishedAt: now(),
      qualifiedUserCount: appliedSummary.qualifiedUserCount,
      removeFromOrganizationCount: appliedSummary.removeFromOrganizationCount,
      removeFromTeamCount: appliedSummary.removeFromTeamCount,
      runId,
      status: 'succeeded',
      usersChangedCount: appliedSummary.usersChangedCount,
    })

    return {
      preview,
      status: 'succeeded' as const,
    }
  } catch (error) {
    if (runInserted) {
      await finalizeCommunityMembershipSyncRun({
        addToOrganizationCount: appliedSummary.addToOrganizationCount,
        addToTeamCount: appliedSummary.addToTeamCount,
        blockedAssetGroupIds: dependencies.blockedAssetGroupIds,
        database,
        errorMessage: error instanceof Error ? error.message : 'Community membership sync failed.',
        errorPayload: buildCommunitySyncErrorPayload(error),
        finishedAt: now(),
        qualifiedUserCount: appliedSummary.qualifiedUserCount,
        removeFromOrganizationCount: appliedSummary.removeFromOrganizationCount,
        removeFromTeamCount: appliedSummary.removeFromTeamCount,
        runId,
        status: 'failed',
        usersChangedCount: appliedSummary.usersChangedCount,
      })
    }

    throw error
  } finally {
    await leaseController.stop()
    await releaseAutomationLock({
      database,
      key: lockKey,
      runId,
    })
  }
}

async function runCommunityDiscordSync(input: {
  database?: Database
  now?: () => Date
  organizationId: string
  skipIfDependenciesNotFresh: boolean
  skipIfLocked: boolean
  skipReason?: 'membership_run_failed'
  triggerSource: CommunityRoleSyncTriggerSource
}) {
  const database = input.database ?? db
  const now = input.now ?? (() => new Date())
  const existingOrganization = await ensureOrganizationExists(input.organizationId, database)

  if (!existingOrganization) {
    return {
      result: null,
      status: 'missing' as const,
    }
  }

  const [connectionRecord, roles] = await Promise.all([
    loadCommunityDiscordConnectionRecord(input.organizationId, database),
    listCommunityRoleRecords(input.organizationId, database),
  ])

  if (!connectionRecord) {
    return {
      result: null,
      status: 'missing' as const,
    }
  }

  if (!connectionRecord.roleSyncEnabled) {
    return {
      result: null,
      status: 'disabled' as const,
    }
  }

  const dependencies = await getOrganizationSyncDependencies({
    database,
    now: input.now,
    organizationId: input.organizationId,
    roles,
  })
  const runId = crypto.randomUUID()
  const startedAt = now()
  const lockKey = buildCommunitySyncLockKey(input.organizationId)
  const expiresAt = new Date(startedAt.getTime() + AUTOMATION_LOCK_TIMEOUT_MS)
  const lock = await acquireAutomationLock({
    database,
    expiresAt,
    key: lockKey,
    onStaleLockStolen: markCommunitySyncRunFailedForExpiredLock,
    runId,
    startedAt,
  })

  if (!lock.acquired) {
    if (input.skipIfLocked) {
      return {
        result: null,
        status: 'locked' as const,
      }
    }

    throw new AutomationLockConflictError(lockKey)
  }

  let preview: CommunityRoleDiscordSyncPreview | null = null
  const progress = createCommunityRoleDiscordSyncExecutionProgress()
  const leaseController = createAutomationLockLeaseController({
    database,
    key: lockKey,
    now,
    runId,
  })
  let result: CommunityRoleDiscordSyncApply | null = null
  let runInserted = false

  leaseController.start()

  try {
    await leaseController.ensureOwned()
    await database.insert(communityDiscordSyncRun).values({
      appliedGrantCount: 0,
      appliedRevokeCount: 0,
      blockedAssetGroupIds: serializeJson(dependencies.blockedAssetGroupIds),
      dependencyAssetGroupIds: JSON.stringify(dependencies.dependencyAssetGroupIds),
      dependencyFreshAtStart: dependencies.dependencyFreshAtStart,
      errorMessage: null,
      errorPayload: null,
      failedCount: 0,
      finishedAt: null,
      id: runId,
      organizationId: input.organizationId,
      outcomeCounts: JSON.stringify(createDiscordSyncCounts()),
      rolesBlockedCount: 0,
      rolesReadyCount: 0,
      startedAt,
      status: 'running',
      triggerSource: input.triggerSource,
      usersChangedCount: 0,
    })
    runInserted = true

    if (input.skipReason === 'membership_run_failed') {
      await leaseController.ensureOwned()
      await finalizeCommunityDiscordSyncRun({
        appliedGrantCount: 0,
        appliedRevokeCount: 0,
        blockedAssetGroupIds: dependencies.blockedAssetGroupIds,
        database,
        errorMessage: 'Scheduled Discord sync skipped because membership sync failed in the same pass.',
        errorPayload: {
          reason: 'membership_run_failed',
        },
        failedCount: 0,
        finishedAt: now(),
        outcomeCounts: createDiscordSyncCounts(),
        rolesBlockedCount: 0,
        rolesReadyCount: 0,
        runId,
        status: 'skipped',
        usersChangedCount: 0,
      })

      return {
        result: null,
        status: 'skipped' as const,
      }
    }

    if (input.skipIfDependenciesNotFresh && !dependencies.dependencyFreshAtStart) {
      await leaseController.ensureOwned()
      await finalizeCommunityDiscordSyncRun({
        appliedGrantCount: 0,
        appliedRevokeCount: 0,
        blockedAssetGroupIds: dependencies.blockedAssetGroupIds,
        database,
        errorMessage: 'Scheduled Discord sync skipped because required asset groups are stale.',
        errorPayload: {
          reason: 'dependency_stale',
        },
        failedCount: 0,
        finishedAt: now(),
        outcomeCounts: createDiscordSyncCounts(),
        rolesBlockedCount: 0,
        rolesReadyCount: 0,
        runId,
        status: 'skipped',
        usersChangedCount: 0,
      })

      return {
        result: null,
        status: 'skipped' as const,
      }
    }

    preview = await buildCommunityRoleDiscordSyncPreview(input.organizationId, database)
    result = await executeCommunityRoleDiscordSyncPreview({
      database,
      leaseController,
      organizationId: input.organizationId,
      preview,
      progress,
    })
    const status = getCommunityDiscordSyncApplyStatus(result)

    await leaseController.ensureOwned()
    await finalizeCommunityDiscordSyncRun({
      appliedGrantCount: result.summary.appliedGrantCount,
      appliedRevokeCount: result.summary.appliedRevokeCount,
      blockedAssetGroupIds: dependencies.blockedAssetGroupIds,
      database,
      errorMessage: null,
      errorPayload: null,
      failedCount: result.summary.failedCount,
      finishedAt: now(),
      outcomeCounts: result.summary.counts,
      rolesBlockedCount: result.summary.rolesBlockedCount,
      rolesReadyCount: result.summary.rolesReadyCount,
      runId,
      status,
      usersChangedCount: result.summary.usersChangedCount,
    })

    return {
      result,
      status,
    }
  } catch (error) {
    const summary =
      result?.summary ??
      (preview
        ? buildCommunityRoleDiscordSyncApplyFromProgress({
            preview,
            progress,
          }).summary
        : getEmptyCommunityDiscordSyncApplySummary())

    if (runInserted) {
      await finalizeCommunityDiscordSyncRun({
        appliedGrantCount: summary.appliedGrantCount,
        appliedRevokeCount: summary.appliedRevokeCount,
        blockedAssetGroupIds: dependencies.blockedAssetGroupIds,
        database,
        errorMessage: error instanceof Error ? error.message : 'Community Discord sync failed.',
        errorPayload: buildCommunitySyncErrorPayload(error),
        failedCount: summary.failedCount,
        finishedAt: now(),
        outcomeCounts: summary.counts,
        rolesBlockedCount: summary.rolesBlockedCount,
        rolesReadyCount: summary.rolesReadyCount,
        runId,
        status: 'failed',
        usersChangedCount: summary.usersChangedCount,
      })
    }

    throw error
  } finally {
    await leaseController.stop()
    await releaseAutomationLock({
      database,
      key: lockKey,
      runId,
    })
  }
}

export async function applyCommunityRoleSync(organizationId: string) {
  const result = await runCommunityMembershipSync({
    organizationId,
    skipIfDependenciesNotFresh: false,
    skipIfLocked: false,
    triggerSource: 'manual',
  })

  return result.preview
}

export async function applyCommunityRoleDiscordSync(organizationId: string) {
  const result = await runCommunityDiscordSync({
    organizationId,
    skipIfDependenciesNotFresh: false,
    skipIfLocked: false,
    triggerSource: 'manual',
  })

  if (result.status === 'disabled') {
    throw new Error('Discord role sync is disabled for this community.')
  }

  if (!result.result) {
    throw new Error('Community Discord sync could not be applied.')
  }

  return result.result
}

export async function getCommunityRoleSyncStatus(input: {
  database?: Database
  now?: () => Date
  organizationId: string
}) {
  const database = input.database ?? db
  const currentNow = input.now?.() ?? new Date()
  const existingOrganization = await ensureOrganizationExists(input.organizationId, database)

  if (!existingOrganization) {
    return null
  }

  const roles = await listCommunityRoleRecords(input.organizationId, database)
  const dependencies = await getOrganizationSyncDependencies({
    database,
    now: input.now,
    organizationId: input.organizationId,
    roles,
  })
  const [
    connectionRecord,
    communityDiscordSyncRuns,
    successfulCommunityDiscordSyncRuns,
    communityMembershipSyncRuns,
    successfulCommunityMembershipSyncRuns,
  ] = await Promise.all([
    loadCommunityDiscordConnectionRecord(input.organizationId, database),
    getCommunityDiscordSyncRunRows({
      database,
      limitPerOrganization: 1,
      organizationIds: [input.organizationId],
    }),
    getCommunityDiscordSyncRunRows({
      database,
      limitPerOrganization: 1,
      organizationIds: [input.organizationId],
      statuses: ['succeeded'],
    }),
    getCommunityMembershipSyncRunRows({
      database,
      limitPerOrganization: 1,
      organizationIds: [input.organizationId],
    }),
    getCommunityMembershipSyncRunRows({
      database,
      limitPerOrganization: 1,
      organizationIds: [input.organizationId],
      statuses: ['succeeded'],
    }),
  ])
  const discordStatus = buildCommunitySyncStatusSummary({
    dependencyAssetGroups: dependencies.dependencyAssetGroups,
    intervalMs: getScheduledDiscordSyncIntervalMs(),
    lastRun: communityDiscordSyncRuns[0] ? toCommunityDiscordSyncRunRecord(communityDiscordSyncRuns[0]) : null,
    lastSuccessfulRun: successfulCommunityDiscordSyncRuns[0]
      ? toCommunityDiscordSyncRunRecord(successfulCommunityDiscordSyncRuns[0])
      : null,
    now: currentNow,
  })
  const membershipStatus = buildCommunitySyncStatusSummary({
    dependencyAssetGroups: dependencies.dependencyAssetGroups,
    intervalMs: getScheduledMembershipSyncIntervalMs(),
    lastRun: communityMembershipSyncRuns[0] ? toCommunityMembershipSyncRunRecord(communityMembershipSyncRuns[0]) : null,
    lastSuccessfulRun: successfulCommunityMembershipSyncRuns[0]
      ? toCommunityMembershipSyncRunRecord(successfulCommunityMembershipSyncRuns[0])
      : null,
    now: currentNow,
  })

  return {
    dependencyAssetGroups: dependencies.dependencyAssetGroups,
    discordStatus: {
      ...discordStatus,
      roleSyncEnabled: connectionRecord?.roleSyncEnabled ?? false,
    },
    membershipStatus,
    organizationId: input.organizationId,
  } satisfies CommunityRoleSyncStatus
}

export async function listCommunityDiscordSyncRuns(input: {
  database?: Database
  limit: number
  organizationId: string
}) {
  return (
    await getCommunityDiscordSyncRunRows({
      database: input.database,
      limitPerOrganization: input.limit,
      organizationIds: [input.organizationId],
    })
  ).map(toCommunityDiscordSyncRunRecord)
}

export async function listCommunityMembershipSyncRuns(input: {
  database?: Database
  limit: number
  organizationId: string
}) {
  return (
    await getCommunityMembershipSyncRunRows({
      database: input.database,
      limitPerOrganization: input.limit,
      organizationIds: [input.organizationId],
    })
  ).map(toCommunityMembershipSyncRunRecord)
}

export async function listOrganizationsDueForScheduledCommunityDiscordSync(input?: {
  database?: Database
  now?: () => Date
}) {
  const database = input?.database ?? db
  const currentNow = input?.now?.() ?? new Date()
  const eligibleOrganizations = await database
    .select({
      name: organization.name,
      organizationId: communityRole.organizationId,
    })
    .from(communityRole)
    .innerJoin(communityDiscordConnection, eq(communityDiscordConnection.organizationId, communityRole.organizationId))
    .innerJoin(organization, eq(organization.id, communityRole.organizationId))
    .where(
      and(
        eq(communityDiscordConnection.roleSyncEnabled, true),
        eq(communityRole.enabled, true),
        isNotNull(communityRole.discordRoleId),
      ),
    )
    .groupBy(organization.name, communityRole.organizationId)
    .orderBy(asc(organization.name), asc(communityRole.organizationId))

  if (eligibleOrganizations.length === 0) {
    return []
  }

  const lastRunByOrganizationId = new Map<string, CommunityDiscordSyncRunRecord>()

  for (const row of await getCommunityDiscordSyncRunRows({
    database,
    limitPerOrganization: 1,
    organizationIds: eligibleOrganizations.map((record) => record.organizationId),
  })) {
    if (!lastRunByOrganizationId.has(row.organizationId)) {
      lastRunByOrganizationId.set(row.organizationId, toCommunityDiscordSyncRunRecord(row))
    }
  }

  return eligibleOrganizations
    .filter((record) => {
      const lastRun = lastRunByOrganizationId.get(record.organizationId)

      if (!lastRun) {
        return true
      }

      return currentNow.getTime() - lastRun.startedAt.getTime() >= getScheduledDiscordSyncIntervalMs()
    })
    .map((record) => record.organizationId)
}

export async function listOrganizationsDueForScheduledCommunityMembershipSync(input?: {
  database?: Database
  now?: () => Date
}) {
  const database = input?.database ?? db
  const currentNow = input?.now?.() ?? new Date()
  const eligibleOrganizations = await database
    .select({
      name: organization.name,
      organizationId: communityRole.organizationId,
    })
    .from(communityRole)
    .innerJoin(organization, eq(organization.id, communityRole.organizationId))
    .where(eq(communityRole.enabled, true))
    .groupBy(organization.name, communityRole.organizationId)
    .orderBy(asc(organization.name), asc(communityRole.organizationId))

  if (eligibleOrganizations.length === 0) {
    return []
  }

  const lastRunByOrganizationId = new Map<string, CommunityMembershipSyncRunRecord>()

  for (const row of await getCommunityMembershipSyncRunRows({
    database,
    limitPerOrganization: 1,
    organizationIds: eligibleOrganizations.map((record) => record.organizationId),
  })) {
    if (!lastRunByOrganizationId.has(row.organizationId)) {
      lastRunByOrganizationId.set(row.organizationId, toCommunityMembershipSyncRunRecord(row))
    }
  }

  return eligibleOrganizations
    .filter((record) => {
      const lastRun = lastRunByOrganizationId.get(record.organizationId)

      if (!lastRun) {
        return true
      }

      return currentNow.getTime() - lastRun.startedAt.getTime() >= getScheduledMembershipSyncIntervalMs()
    })
    .map((record) => record.organizationId)
}

export async function runScheduledCommunityRoleDiscordSync(input: {
  database?: Database
  now?: () => Date
  organizationId: string
  skipReason?: 'membership_run_failed'
}) {
  try {
    const database = input.database ?? db
    const existingOrganization = await ensureOrganizationExists(input.organizationId, database)

    if (!existingOrganization) {
      return {
        organizationId: input.organizationId,
        status: 'missing' as const,
      }
    }

    const [connectionRecord, roles] = await Promise.all([
      loadCommunityDiscordConnectionRecord(input.organizationId, database),
      listCommunityRoleRecords(input.organizationId, database),
    ])

    if (!connectionRecord || !roles.some((roleRecord) => roleRecord.enabled && roleRecord.discordRoleId)) {
      return {
        organizationId: input.organizationId,
        status: 'missing' as const,
      }
    }

    if (!connectionRecord.roleSyncEnabled) {
      return {
        organizationId: input.organizationId,
        status: 'disabled' as const,
      }
    }

    const result = await runCommunityDiscordSync({
      database: input.database,
      now: input.now,
      organizationId: input.organizationId,
      skipIfDependenciesNotFresh: true,
      skipIfLocked: true,
      skipReason: input.skipReason,
      triggerSource: 'scheduled',
    })

    return {
      organizationId: input.organizationId,
      status: result.status,
    }
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Community Discord sync failed.',
      organizationId: input.organizationId,
      status: 'failed' as const,
    }
  }
}

export async function runScheduledCommunityRoleSync(input: {
  database?: Database
  now?: () => Date
  organizationId: string
}) {
  try {
    const database = input.database ?? db
    const existingOrganization = await ensureOrganizationExists(input.organizationId, database)

    if (!existingOrganization) {
      return {
        organizationId: input.organizationId,
        status: 'missing' as const,
      }
    }

    const roles = await listCommunityRoleRecords(input.organizationId, database)

    if (!roles.some((roleRecord) => roleRecord.enabled)) {
      return {
        organizationId: input.organizationId,
        status: 'missing' as const,
      }
    }

    const result = await runCommunityMembershipSync({
      database: input.database,
      now: input.now,
      organizationId: input.organizationId,
      skipIfDependenciesNotFresh: true,
      skipIfLocked: true,
      triggerSource: 'scheduled',
    })

    return {
      organizationId: input.organizationId,
      status: result.status,
    }
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Community membership sync failed.',
      organizationId: input.organizationId,
      status: 'failed' as const,
    }
  }
}

export async function listCommunityManagedMemberUserIds(input: { organizationIds: string[]; userIds?: string[] }) {
  if (input.organizationIds.length === 0) {
    return []
  }

  const whereClause =
    input.userIds && input.userIds.length > 0
      ? and(
          inArray(communityManagedMember.organizationId, input.organizationIds),
          inArray(communityManagedMember.userId, input.userIds),
        )
      : inArray(communityManagedMember.organizationId, input.organizationIds)

  return await db
    .select({
      organizationId: communityManagedMember.organizationId,
      userId: communityManagedMember.userId,
    })
    .from(communityManagedMember)
    .where(whereClause)
    .orderBy(asc(communityManagedMember.organizationId), asc(communityManagedMember.userId))
}

export async function listCommunityRoleAssignmentsForUsers(input: { organizationIds: string[]; userIds?: string[] }) {
  if (input.organizationIds.length === 0) {
    return []
  }

  const baseWhereClause =
    input.userIds && input.userIds.length > 0
      ? and(inArray(communityRole.organizationId, input.organizationIds), inArray(teamMember.userId, input.userIds))
      : inArray(communityRole.organizationId, input.organizationIds)

  return await db
    .select({
      name: communityRole.name,
      organizationId: communityRole.organizationId,
      roleId: communityRole.id,
      slug: communityRole.slug,
      teamId: communityRole.teamId,
      userId: teamMember.userId,
    })
    .from(communityRole)
    .innerJoin(teamMember, eq(communityRole.teamId, teamMember.teamId))
    .where(baseWhereClause)
    .orderBy(
      asc(communityRole.organizationId),
      asc(teamMember.userId),
      asc(communityRole.name),
      asc(communityRole.slug),
      asc(communityRole.id),
    )
}

export async function removeCommunityRoleById(communityRoleId: string) {
  const [existingRole] = await db
    .select({
      id: communityRole.id,
      organizationId: communityRole.organizationId,
      teamId: communityRole.teamId,
    })
    .from(communityRole)
    .where(eq(communityRole.id, communityRoleId))
    .limit(1)

  if (!existingRole) {
    return null
  }

  const userTeamMemberships = await db
    .select({
      userId: teamMember.userId,
    })
    .from(teamMember)
    .where(eq(teamMember.teamId, existingRole.teamId))
    .orderBy(asc(teamMember.userId))

  await db.transaction(async (transaction) => {
    await transaction.delete(communityRole).where(eq(communityRole.id, existingRole.id))
    await transaction.delete(team).where(eq(team.id, existingRole.teamId))
  })

  for (const currentMembership of userTeamMemberships) {
    await clearActiveTeamSessions({
      teamId: existingRole.teamId,
      userId: currentMembership.userId,
    })
  }

  return existingRole
}

export async function upsertCommunityRoleConditions(input: {
  conditions: Array<{
    assetGroupId: string
    maximumAmount: string | null
    minimumAmount: string
  }>
  communityRoleId: string
  database?: Pick<Database, 'delete' | 'insert'>
}) {
  const database = input.database ?? db

  await database.delete(communityRoleCondition).where(eq(communityRoleCondition.communityRoleId, input.communityRoleId))

  if (input.conditions.length === 0) {
    return
  }

  const now = new Date()

  await database.insert(communityRoleCondition).values(
    input.conditions
      .map((condition) => ({
        assetGroupId: condition.assetGroupId,
        communityRoleId: input.communityRoleId,
        createdAt: now,
        id: crypto.randomUUID(),
        maximumAmount: condition.maximumAmount,
        minimumAmount: condition.minimumAmount,
        updatedAt: now,
      }))
      .sort((left, right) => left.assetGroupId.localeCompare(right.assetGroupId)),
  )
}
