import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member, organization } from '@tokengator/db/schema/auth'

import { listCommunityRoleAssignmentsForUsers } from '../../../features/community-role-sync'

import type { OrganizationListMineResult, OrganizationMembershipEntity } from './organization.entity'

type OrganizationMembershipRecordBase = Omit<OrganizationMembershipEntity, 'gatedRoles'>

async function organizationMembershipRecordsList(userId: string): Promise<OrganizationMembershipRecordBase[]> {
  return await db
    .select({
      id: organization.id,
      logo: organization.logo,
      name: organization.name,
      role: member.role,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(organization.name), asc(organization.slug))
}

export async function organizationListMine(userId: string): Promise<OrganizationListMineResult> {
  const organizations = await organizationMembershipRecordsList(userId)
  const gatedRoles = await listCommunityRoleAssignmentsForUsers({
    organizationIds: organizations.map((organizationRecord) => organizationRecord.id),
    userIds: [userId],
  })
  const gatedRolesByOrganizationId = new Map<string, OrganizationMembershipEntity['gatedRoles']>()

  for (const gatedRole of gatedRoles) {
    const existingRoles = gatedRolesByOrganizationId.get(gatedRole.organizationId) ?? []

    gatedRolesByOrganizationId.set(gatedRole.organizationId, [
      ...existingRoles,
      {
        id: gatedRole.roleId,
        name: gatedRole.name,
        slug: gatedRole.slug,
      },
    ])
  }

  return {
    organizations: organizations.map((organizationRecord) => ({
      ...organizationRecord,
      gatedRoles: gatedRolesByOrganizationId.get(organizationRecord.id) ?? [],
    })),
  }
}
