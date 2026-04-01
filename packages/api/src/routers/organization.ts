import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member, organization } from '@tokengator/db/schema/auth'

import { protectedProcedure } from '../index'
import { listCommunityRoleAssignmentsForUsers } from '../lib/admin-community-role-sync'

type OrganizationMembershipRecord = {
  gatedRoles: Array<{
    id: string
    name: string
    slug: string
  }>
  id: string
  logo: string | null
  name: string
  role: string
  slug: string
}

type OrganizationMembershipRecordBase = Omit<OrganizationMembershipRecord, 'gatedRoles'>

async function listOrganizationMembershipRecords(userId: string): Promise<OrganizationMembershipRecordBase[]> {
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

export const organizationRouter = {
  listMine: protectedProcedure.handler(async ({ context }) => {
    const organizations = await listOrganizationMembershipRecords(context.session.user.id)
    const gatedRoles = await listCommunityRoleAssignmentsForUsers({
      organizationIds: organizations.map((organizationRecord) => organizationRecord.id),
      userIds: [context.session.user.id],
    })
    const gatedRolesByOrganizationId = new Map<string, OrganizationMembershipRecord['gatedRoles']>()

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
  }),
}
