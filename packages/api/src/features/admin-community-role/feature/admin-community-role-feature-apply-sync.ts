import { ORPCError } from '@orpc/server'

import { AutomationLockConflictError } from '../../../lib/automation-lock'
import { adminProcedure } from '../../../lib/prodecures'
import { adminCommunityRoleApplySync as adminCommunityRoleApplySyncDataAccess } from '../data-access/admin-community-role-apply-sync'
import { adminCommunityRoleApplySyncInputSchema } from '../data-access/admin-community-role-apply-sync-input-schema'

export const adminCommunityRoleFeatureApplySync = adminProcedure
  .input(adminCommunityRoleApplySyncInputSchema)
  .handler(async ({ input }) => {
    try {
      const result = await adminCommunityRoleApplySyncDataAccess(input.organizationId)

      if (!result) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      return result
    } catch (error) {
      if (error instanceof AutomationLockConflictError) {
        throw new ORPCError('CONFLICT', {
          message: 'A community membership or Discord sync is already running for this organization.',
        })
      }

      throw error
    }
  })
