import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'

export async function adminCommunityRoleOrganizationRecordGet(organizationId: string) {
  const [record] = await db
    .select({
      id: organization.id,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  return record ?? null
}
