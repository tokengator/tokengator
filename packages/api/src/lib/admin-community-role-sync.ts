import { and, asc, eq, inArray, or } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset, assetGroup } from '@tokengator/db/schema/asset'
import { member, organization, session, solanaWallet, team, teamMember, user } from '@tokengator/db/schema/auth'
import { communityManagedMember, communityRole, communityRoleCondition } from '@tokengator/db/schema/community-role'
import { normalizeAmountToBigInt } from '@tokengator/indexer'

type CommunityRoleRecord = {
  conditions: CommunityRoleConditionRecord[]
  createdAt: Date
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

type CurrentUserState = {
  currentMemberId: string | null
  currentOrganizationRole: string | null
  currentRoleIds: string[]
  currentTeamIds: string[]
  managedMembership: boolean
  name: string
  nextRoleIds: string[]
  nextTeamIds: string[]
  userId: string
  username: string | null
  wallets: string[]
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

type LoadedSyncState = {
  currentMembersByUserId: Map<string, CurrentOrganizationMember>
  currentTeamIdsByUserId: Map<string, Set<string>>
  managedUserIds: Set<string>
  organizationId: string
  organizationTeamIdsByUserId: Map<string, Set<string>>
  roles: CommunityRoleRecord[]
  usersById: Map<string, CurrentUserState>
}

function normalizeWalletAddress(address: string) {
  return address.trim()
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

async function loadSyncState(organizationId: string): Promise<LoadedSyncState> {
  const roles = await listCommunityRoleRecords(organizationId)
  const roleTeamIds = new Set(roles.map((roleRecord) => roleRecord.teamId))
  const enabledRoleAssetGroupIds = [
    ...new Set(
      roles
        .flatMap((roleRecord) => (roleRecord.enabled ? roleRecord.conditions : []))
        .map((condition) => condition.assetGroupId),
    ),
  ]
  const [assetRows, managedRows, memberRows, organizationTeamMembershipRows] = await Promise.all([
    enabledRoleAssetGroupIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            amount: asset.amount,
            assetGroupId: asset.assetGroupId,
            id: asset.id,
            owner: asset.owner,
          })
          .from(asset)
          .where(inArray(asset.assetGroupId, enabledRoleAssetGroupIds))
          .orderBy(asc(asset.assetGroupId), asc(asset.owner), asc(asset.id)),
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
  const relevantAssetOwnerAddresses = [
    ...new Set(assetRows.map((assetRow) => normalizeWalletAddress(assetRow.owner))),
  ].sort((left, right) => left.localeCompare(right))
  const relevantOrganizationUserIds = [
    ...new Set([...memberRows, ...organizationTeamMembershipRows].map((currentMembership) => currentMembership.userId)),
  ].sort((left, right) => left.localeCompare(right))
  const walletRows =
    relevantAssetOwnerAddresses.length === 0 && relevantOrganizationUserIds.length === 0
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
              ? inArray(solanaWallet.userId, relevantOrganizationUserIds)
              : relevantOrganizationUserIds.length === 0
                ? inArray(solanaWallet.address, relevantAssetOwnerAddresses)
                : or(
                    inArray(solanaWallet.address, relevantAssetOwnerAddresses),
                    inArray(solanaWallet.userId, relevantOrganizationUserIds),
                  ),
          )
          .orderBy(asc(user.name), asc(user.username), asc(user.id), asc(solanaWallet.address))
  const currentMembersByUserId = new Map<string, CurrentOrganizationMember>()
  const currentTeamIdsByUserId = new Map<string, Set<string>>()
  const conditionByAssetGroupId = new Map(
    roles
      .flatMap((roleRecord) => roleRecord.conditions)
      .map((condition) => [condition.assetGroupId, condition] as const),
  )
  const managedUserIds = new Set(managedRows.map((managedRow) => managedRow.userId))
  const organizationTeamIdsByUserId = new Map<string, Set<string>>()
  const rolesById = new Map(roles.map((roleRecord) => [roleRecord.id, roleRecord] as const))
  const usersById = new Map<string, CurrentUserState>()
  const walletOwnerByAddress = new Map<string, string>()
  const walletAmountsByAssetGroupId = new Map<string, Map<string, bigint>>()

  function getOrCreateUserState(input: { name: string; userId: string; username: string | null }) {
    const existingUser = usersById.get(input.userId)

    if (existingUser) {
      return existingUser
    }

    const createdUser: CurrentUserState = {
      currentMemberId: null,
      currentOrganizationRole: null,
      currentRoleIds: [],
      currentTeamIds: [],
      managedMembership: false,
      name: input.name,
      nextRoleIds: [],
      nextTeamIds: [],
      userId: input.userId,
      username: input.username,
      wallets: [],
    }

    usersById.set(input.userId, createdUser)

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
    sortRoleIds(currentUser.currentRoleIds, rolesById)
    currentUser.nextRoleIds = evaluation.matchedRoleIdsByUserId.get(currentUser.userId) ?? []
    currentUser.nextTeamIds = currentUser.nextRoleIds
      .map((roleId) => rolesById.get(roleId)?.teamId)
      .filter((teamId): teamId is string => Boolean(teamId))
      .sort((left, right) => left.localeCompare(right))
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

export async function previewCommunityRoleSync(organizationId: string) {
  const existingOrganization = await ensureOrganizationExists(organizationId)

  if (!existingOrganization) {
    return null
  }

  return buildPreviewFromSyncState(await loadSyncState(organizationId))
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
