import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'

import { adminOrganizationEntityColumns, toAdminOrganizationEntity } from './admin-organization.entity'

export async function adminOrganizationRecordGet(organizationId: string) {
  const [record] = await db
    .select(adminOrganizationEntityColumns)
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  return record ? toAdminOrganizationEntity(record) : null
}
