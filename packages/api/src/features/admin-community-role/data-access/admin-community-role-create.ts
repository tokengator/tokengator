import { db } from '@tokengator/db'
import { team } from '@tokengator/db/schema/auth'
import { communityRole } from '@tokengator/db/schema/community-role'

import { upsertCommunityRoleConditions } from '../../../features/community-role-sync'

import type { AdminCommunityRoleCreateInput } from './admin-community-role-create-input'
import { adminCommunityRoleConditionsValidate } from './admin-community-role-conditions-validate'
import { adminCommunityRoleEntityGet } from './admin-community-role-entity-get'
import { adminCommunityRoleOrganizationRecordGet } from './admin-community-role-organization-record-get'
import { adminCommunityRoleSlugAvailability } from './admin-community-role-slug-availability'

export async function adminCommunityRoleCreate(input: AdminCommunityRoleCreateInput) {
  const existingOrganization = await adminCommunityRoleOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  const [conditionsValidation, slugAvailable] = await Promise.all([
    adminCommunityRoleConditionsValidate(input.data.conditions),
    adminCommunityRoleSlugAvailability({
      organizationId: input.organizationId,
      slug: input.data.slug,
    }),
  ])

  if (!slugAvailable) {
    return {
      status: 'community-role-slug-taken' as const,
    }
  }

  if (conditionsValidation.status !== 'success') {
    return conditionsValidation
  }

  const now = new Date()
  const communityRoleId = crypto.randomUUID()
  const teamId = crypto.randomUUID()

  await db.transaction(async (transaction) => {
    await transaction.insert(team).values({
      createdAt: now,
      id: teamId,
      name: input.data.name,
      organizationId: input.organizationId,
      updatedAt: now,
    })
    await transaction.insert(communityRole).values({
      createdAt: now,
      enabled: input.data.enabled,
      id: communityRoleId,
      matchMode: input.data.matchMode,
      name: input.data.name,
      organizationId: input.organizationId,
      slug: input.data.slug,
      teamId,
      updatedAt: now,
    })
    await upsertCommunityRoleConditions({
      communityRoleId,
      conditions: input.data.conditions,
      database: transaction,
    })
  })

  const createdCommunityRole = await adminCommunityRoleEntityGet(communityRoleId)

  if (!createdCommunityRole) {
    return {
      status: 'community-role-created-but-not-loaded' as const,
    }
  }

  return {
    communityRole: createdCommunityRole,
    status: 'success' as const,
  }
}
