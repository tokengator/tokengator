import { and, asc, eq, inArray, or } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset, assetGroup } from '@tokengator/db/schema/asset'
import {
  account,
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
  communityManagedMember,
  communityRole,
  communityRoleCondition,
} from '@tokengator/db/schema/community-role'
import {
  addDiscordGuildMemberRole,
  getDiscordGuildMember,
  DiscordGuildMemberRoleMutationError,
  inspectDiscordGuildRoles,
  removeDiscordGuildMemberRole,
} from '@tokengator/discord'
import { env } from '@tokengator/env/api'
import { normalizeAmountToBigInt } from '@tokengator/indexer'

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
}

const blockingDiscordGuildRoleInspectionChecks = new Set([
  'bot_identity_lookup_failed',
  'bot_not_in_guild',
  'bot_token_missing',
  'guild_fetch_failed',
  'guild_not_found',
  'guild_roles_fetch_failed',
])

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

async function ensureOrganizationExists(organizationId: string) {
  const [record] = await db
    .select({
      id: organization.id,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  return record ?? null
}

export async function listCommunityRoleRecords(organizationId: string): Promise<CommunityRoleRecord[]> {
  const roleRows = await db
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
    db
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
    db
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
  organizationId: string
  relevantUserIds?: string[]
  roles?: CommunityRoleRecord[]
}): Promise<LoadedQualificationState> {
  const roles = input.roles ?? (await listCommunityRoleRecords(input.organizationId))
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
      : await db
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
      : await db
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

async function loadSyncState(organizationId: string): Promise<LoadedSyncState> {
  const roles = await listCommunityRoleRecords(organizationId)
  const roleTeamIds = new Set(roles.map((roleRecord) => roleRecord.teamId))
  const [managedRows, memberRows, organizationTeamMembershipRows] = await Promise.all([
    db
      .select({
        userId: communityManagedMember.userId,
      })
      .from(communityManagedMember)
      .where(eq(communityManagedMember.organizationId, organizationId))
      .orderBy(asc(communityManagedMember.userId)),
    db
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
    db
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
): Promise<StoredCommunityDiscordConnectionRecord | null> {
  const [record] = await db
    .select({
      guildId: communityDiscordConnection.guildId,
      guildName: communityDiscordConnection.guildName,
    })
    .from(communityDiscordConnection)
    .where(eq(communityDiscordConnection.organizationId, organizationId))
    .limit(1)

  return record ?? null
}

async function loadUserProfiles(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, QualifiedUserState>()
  }

  const [userRows, walletRows] = await Promise.all([
    db
      .select({
        name: user.name,
        userId: user.id,
        username: user.username,
      })
      .from(user)
      .where(inArray(user.id, userIds))
      .orderBy(asc(user.name), asc(user.username), asc(user.id)),
    db
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
  organizationId: string
  roles: CommunityRoleRecord[]
}) {
  const roleTeamIds = [...new Set(input.roles.map((roleRecord) => roleRecord.teamId))].sort((left, right) =>
    left.localeCompare(right),
  )
  const [managedRows, memberRows, teamMemberRows] = await Promise.all([
    db
      .select({
        userId: communityManagedMember.userId,
      })
      .from(communityManagedMember)
      .where(eq(communityManagedMember.organizationId, input.organizationId))
      .orderBy(asc(communityManagedMember.userId)),
    db
      .select({
        userId: member.userId,
      })
      .from(member)
      .where(eq(member.organizationId, input.organizationId))
      .orderBy(asc(member.userId)),
    roleTeamIds.length === 0
      ? []
      : db
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

async function loadCanonicalDiscordAccountIdsByUserId(userIds: string[]) {
  const relevantUserIds = [...new Set(userIds)].sort((left, right) => left.localeCompare(right))

  if (relevantUserIds.length === 0) {
    return new Map<string, string>()
  }

  const accountRows = await db
    .select({
      accountId: account.accountId,
      userId: account.userId,
    })
    .from(account)
    .where(and(eq(account.providerId, 'discord'), inArray(account.userId, relevantUserIds)))
    .orderBy(asc(account.createdAt), asc(account.id))
  const canonicalDiscordAccountIdByUserId = new Map<string, string>()

  for (const accountRow of accountRows) {
    if (!canonicalDiscordAccountIdByUserId.has(accountRow.userId)) {
      canonicalDiscordAccountIdByUserId.set(accountRow.userId, accountRow.accountId)
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

async function buildCommunityRoleDiscordSyncPreview(organizationId: string): Promise<CommunityRoleDiscordSyncPreview> {
  const connectionRecord = await loadCommunityDiscordConnectionRecord(organizationId)

  if (!connectionRecord) {
    throw new Error('Community Discord connection not found.')
  }

  const qualificationState = await loadCommunityRoleQualificationState({
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
              organizationId,
              roles: qualificationState.roles,
            })),
          ]
        : [...qualificationState.usersById.keys()],
    ),
  ].sort((left, right) => left.localeCompare(right))
  const canonicalDiscordAccountIdByUserId = hasMappedDiscordRole
    ? await loadCanonicalDiscordAccountIdsByUserId(candidateUserIds)
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
  const extraProfilesById = await loadUserProfiles(missingProfileUserIds)

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
  database?: Pick<typeof db, 'update'>
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

async function clearActiveTeamSessions(input: {
  database?: Pick<typeof db, 'update'>
  teamId: string
  userId: string
}) {
  const database = input.database ?? db

  await database
    .update(session)
    .set({
      activeTeamId: null,
    })
    .where(and(eq(session.userId, input.userId), eq(session.activeTeamId, input.teamId)))
}

async function clearActiveTeamSessionsByIds(input: {
  database?: Pick<typeof db, 'update'>
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

export async function applyCommunityRoleSync(organizationId: string) {
  const preview = await previewCommunityRoleSync(organizationId)

  if (!preview) {
    return null
  }

  await db.transaction(async (transaction) => {
    for (const currentUser of preview.users) {
      if (currentUser.addToOrganization) {
        await transaction.insert(member).values({
          createdAt: new Date(),
          id: crypto.randomUUID(),
          organizationId,
          role: 'member',
          userId: currentUser.userId,
        })
        await transaction.insert(communityManagedMember).values({
          createdAt: new Date(),
          id: crypto.randomUUID(),
          organizationId,
          updatedAt: new Date(),
          userId: currentUser.userId,
        })
      }

      for (const addedTeam of currentUser.addToTeams) {
        await transaction.insert(teamMember).values({
          createdAt: new Date(),
          id: crypto.randomUUID(),
          teamId: addedTeam.teamId,
          userId: currentUser.userId,
        })
      }

      for (const removedTeam of currentUser.removeFromTeams) {
        await transaction
          .delete(teamMember)
          .where(and(eq(teamMember.teamId, removedTeam.teamId), eq(teamMember.userId, currentUser.userId)))
      }

      await clearActiveTeamSessionsByIds({
        database: transaction,
        teamIds: currentUser.removeFromTeams.map((removedTeam) => removedTeam.teamId),
        userId: currentUser.userId,
      })

      if (!currentUser.removeFromOrganization) {
        continue
      }

      await transaction
        .delete(member)
        .where(and(eq(member.organizationId, organizationId), eq(member.userId, currentUser.userId)))
      await transaction
        .delete(communityManagedMember)
        .where(
          and(
            eq(communityManagedMember.organizationId, organizationId),
            eq(communityManagedMember.userId, currentUser.userId),
          ),
        )
      await clearActiveOrganizationSessions({
        database: transaction,
        organizationId,
        userId: currentUser.userId,
      })
    }
  })

  return preview
}

export async function applyCommunityRoleDiscordSync(organizationId: string) {
  const preview = await previewCommunityRoleDiscordSync(organizationId)

  if (!preview) {
    return null
  }

  let appliedGrantCount = 0
  let appliedRevokeCount = 0
  let failedCount = 0
  const users: CommunityRoleDiscordSyncApplyUser[] = []

  for (const currentUser of preview.users) {
    const outcomes: CommunityRoleDiscordSyncApplyOutcome[] = []

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

      try {
        if (outcome.status === 'will_grant') {
          await addDiscordGuildMemberRole(
            {
              env,
            },
            {
              guildId: preview.connection.guildId,
              reason: `community-role:${outcome.communityRoleId}`,
              roleId: outcome.discordRoleId,
              userId: currentUser.discordAccountId,
            },
          )
          appliedGrantCount += 1
        } else {
          await removeDiscordGuildMemberRole(
            {
              env,
            },
            {
              guildId: preview.connection.guildId,
              reason: `community-role:${outcome.communityRoleId}`,
              roleId: outcome.discordRoleId,
              userId: currentUser.discordAccountId,
            },
          )
          appliedRevokeCount += 1
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

        failedCount += 1
        outcomes.push({
          ...outcome,
          attemptedAction: outcome.status === 'will_grant' ? 'grant' : 'revoke',
          errorMessage: error instanceof Error ? error.message : 'Discord request failed.',
          execution: 'failed',
          status: 'discord_api_failure',
        })
      }
    }

    users.push({
      ...currentUser,
      outcomes,
    })
  }

  const mappingStateByRoleId = new Map(
    preview.roles.map((role) => [
      role.communityRoleId,
      {
        checks: [...role.mappingChecks],
        discordRoleName: role.discordRoleName,
        status: role.mappingStatus,
      },
    ]),
  )
  const qualifiedUserCountByRoleId = new Map(
    preview.roles.map((role) => [role.communityRoleId, role.qualifiedUserCount]),
  )
  const summarizedRoles = preview.roles.map((role) => ({
    discordRoleId: role.discordRoleId,
    enabled: role.enabled,
    id: role.communityRoleId,
    name: role.communityRoleName,
  }))
  const { roles, summary } = buildCommunityRoleDiscordSyncSummaries({
    mappingStateByRoleId,
    qualifiedUserCountByRoleId,
    roles: summarizedRoles,
    users,
  })

  return {
    ...preview,
    roles,
    summary: {
      ...summary,
      appliedGrantCount,
      appliedRevokeCount,
      failedCount,
    },
    users,
  } satisfies CommunityRoleDiscordSyncApply
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
  database?: Pick<typeof db, 'delete' | 'insert'>
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
