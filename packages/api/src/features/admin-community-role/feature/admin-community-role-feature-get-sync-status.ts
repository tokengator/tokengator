import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'
import { adminCommunityRoleGetSyncStatus as adminCommunityRoleGetSyncStatusDataAccess } from '../data-access/admin-community-role-get-sync-status'
import { adminCommunityRoleGetSyncStatusInputSchema } from '../data-access/admin-community-role-get-sync-status-input-schema'

export const adminCommunityRoleFeatureGetSyncStatus = adminProcedure
  .input(adminCommunityRoleGetSyncStatusInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRoleGetSyncStatusDataAccess(input.organizationId)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result
  })
