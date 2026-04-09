import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member, user } from '@tokengator/db/schema/auth'

import { getCommunityDiscordConnectionByOrganizationId } from '../../../features/community-discord-connection'
import {
  listCommunityManagedMemberUserIds,
  listCommunityRoleAssignmentsForUsers,
} from '../../../features/community-role-sync'

import { adminOrganizationRecordGet } from './admin-organization-record-get'
import {
  adminOrganizationMemberEntityColumns,
  toAdminOrganizationDetailEntity,
  toAdminOrganizationGatedRoleEntity,
  toAdminOrganizationMemberEntity,
  type AdminOrganizationMemberRecord,
} from './admin-organization.entity'

async function adminOrganizationMembersDecorate(members: AdminOrganizationMemberRecord[], organizationId: string) {
  if (members.length === 0) {
    return []
  }

  const userIds = members.map((entry) => entry.userId)
  const [managedMembers, gatedRoleAssignments] = await Promise.all([
    listCommunityManagedMemberUserIds({
      organizationIds: [organizationId],
      userIds,
    }),
    listCommunityRoleAssignmentsForUsers({
      organizationIds: [organizationId],
      userIds,
    }),
  ])
  const gatedRolesByUserId = new Map<string, ReturnType<typeof toAdminOrganizationGatedRoleEntity>[]>()
  const managedUserIds = new Set(
    managedMembers.filter((entry) => entry.organizationId === organizationId).map((entry) => entry.userId),
  )

  for (const gatedRoleAssignment of gatedRoleAssignments) {
    const existingRoles = gatedRolesByUserId.get(gatedRoleAssignment.userId) ?? []

    gatedRolesByUserId.set(gatedRoleAssignment.userId, [
      ...existingRoles,
      toAdminOrganizationGatedRoleEntity({
        id: gatedRoleAssignment.roleId,
        name: gatedRoleAssignment.name,
        slug: gatedRoleAssignment.slug,
      }),
    ])
  }

  return members.map((entry) =>
    toAdminOrganizationMemberEntity({
      gatedRoles: gatedRolesByUserId.get(entry.userId) ?? [],
      isManaged: managedUserIds.has(entry.userId),
      member: entry,
    }),
  )
}

async function adminOrganizationMembersGet(organizationId: string) {
  return await db
    .select(adminOrganizationMemberEntityColumns)
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(user.name), asc(user.username), asc(user.id))
}

export async function adminOrganizationGet(organizationId: string) {
  const organization = await adminOrganizationRecordGet(organizationId)

  if (!organization) {
    return null
  }

  const members = await adminOrganizationMembersGet(organizationId)
  const [discordConnection, decoratedMembers] = await Promise.all([
    getCommunityDiscordConnectionByOrganizationId(organizationId),
    adminOrganizationMembersDecorate(members, organizationId),
  ])

  return toAdminOrganizationDetailEntity({
    discordConnection,
    members: decoratedMembers,
    organization,
  })
}
