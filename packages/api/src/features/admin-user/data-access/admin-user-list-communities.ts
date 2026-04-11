import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member, organization } from '@tokengator/db/schema/auth'

import { listCommunityRoleAssignmentsForUsers } from '../../community-role-sync'

import { adminUserRecordGet } from './admin-user-record-get'
import { toAdminUserCommunityEntity } from './admin-user.entity'

export async function adminUserListCommunities(userId: string) {
  const existingUser = await adminUserRecordGet(userId)

  if (!existingUser) {
    return null
  }

  const memberships = await db
    .select({
      createdAt: member.createdAt,
      id: member.id,
      logo: organization.logo,
      name: organization.name,
      organizationId: organization.id,
      role: member.role,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(organization.name), asc(organization.slug), asc(member.id))
  const gatedRoles = await listCommunityRoleAssignmentsForUsers({
    organizationIds: memberships.map((membership) => membership.organizationId),
    userIds: [userId],
  })
  const gatedRolesByOrganizationId = new Map<string, Array<{ id: string; name: string; slug: string }>>()

  for (const gatedRole of gatedRoles) {
    const currentGatedRoles = gatedRolesByOrganizationId.get(gatedRole.organizationId) ?? []

    gatedRolesByOrganizationId.set(gatedRole.organizationId, [
      ...currentGatedRoles,
      {
        id: gatedRole.roleId,
        name: gatedRole.name,
        slug: gatedRole.slug,
      },
    ])
  }

  return {
    communities: memberships.map((membership) =>
      toAdminUserCommunityEntity({
        ...membership,
        gatedRoles: gatedRolesByOrganizationId.get(membership.organizationId) ?? [],
      }),
    ),
  }
}
