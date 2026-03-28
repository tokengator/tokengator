import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member, organization } from '@tokengator/db/schema/auth'

import { protectedProcedure } from '../index'

type OrganizationMembershipRecord = {
  id: string
  logo: string | null
  name: string
  role: string
  slug: string
}

async function listOrganizationMembershipRecords(userId: string): Promise<OrganizationMembershipRecord[]> {
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

    return {
      organizations,
    }
  }),
}
