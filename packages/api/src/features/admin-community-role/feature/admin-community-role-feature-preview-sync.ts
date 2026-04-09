import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'
import { adminCommunityRolePreviewSync as adminCommunityRolePreviewSyncDataAccess } from '../data-access/admin-community-role-preview-sync'
import { adminCommunityRolePreviewSyncInputSchema } from '../data-access/admin-community-role-preview-sync-input-schema'

export const adminCommunityRoleFeaturePreviewSync = adminProcedure
  .input(adminCommunityRolePreviewSyncInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRolePreviewSyncDataAccess(input.organizationId)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result
  })
