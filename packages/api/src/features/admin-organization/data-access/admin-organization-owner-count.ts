import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member } from '@tokengator/db/schema/auth'

import { adminOrganizationHasOwnerRole } from '../util/admin-organization-owner-role'

export async function adminOrganizationOwnerCount(organizationId: string) {
  const members = await db
    .select({
      role: member.role,
    })
    .from(member)
    .where(eq(member.organizationId, organizationId))

  return members.filter((entry) => adminOrganizationHasOwnerRole(entry.role)).length
}
