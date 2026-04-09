import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { team } from '@tokengator/db/schema/auth'
import { communityRole } from '@tokengator/db/schema/community-role'

import { upsertCommunityRoleConditions } from '../../../features/community-role-sync'

import type { AdminCommunityRoleUpdateInput } from './admin-community-role-update-input'
import { adminCommunityRoleConditionsValidate } from './admin-community-role-conditions-validate'
import { adminCommunityRoleEntityGet } from './admin-community-role-entity-get'
import { adminCommunityRoleRecordGet } from './admin-community-role-record-get'
import { adminCommunityRoleSlugAvailability } from './admin-community-role-slug-availability'

export async function adminCommunityRoleUpdate(input: AdminCommunityRoleUpdateInput) {
  const existingCommunityRole = await adminCommunityRoleRecordGet(input.communityRoleId)

  if (!existingCommunityRole) {
    return {
      status: 'community-role-not-found' as const,
    }
  }

  const [conditionsValidation, slugAvailable] = await Promise.all([
    adminCommunityRoleConditionsValidate(input.data.conditions),
    adminCommunityRoleSlugAvailability({
      communityRoleId: input.communityRoleId,
      organizationId: existingCommunityRole.organizationId,
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

  await db.transaction(async (transaction) => {
    await transaction
      .update(team)
      .set({
        name: input.data.name,
        updatedAt: new Date(),
      })
      .where(eq(team.id, existingCommunityRole.teamId))
    await transaction
      .update(communityRole)
      .set({
        enabled: input.data.enabled,
        matchMode: input.data.matchMode,
        name: input.data.name,
        slug: input.data.slug,
        updatedAt: new Date(),
      })
      .where(eq(communityRole.id, input.communityRoleId))
    await upsertCommunityRoleConditions({
      communityRoleId: input.communityRoleId,
      conditions: input.data.conditions,
      database: transaction,
    })
  })

  const updatedCommunityRole = await adminCommunityRoleEntityGet(input.communityRoleId)

  if (!updatedCommunityRole) {
    return {
      status: 'community-role-updated-but-not-loaded' as const,
    }
  }

  return {
    communityRole: updatedCommunityRole,
    status: 'success' as const,
  }
}
