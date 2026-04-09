import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'
import { adminCommunityRoleDelete as adminCommunityRoleDeleteDataAccess } from '../data-access/admin-community-role-delete'
import { adminCommunityRoleDeleteInputSchema } from '../data-access/admin-community-role-delete-input-schema'

export const adminCommunityRoleFeatureDelete = adminProcedure
  .input(adminCommunityRoleDeleteInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRoleDeleteDataAccess(input.communityRoleId)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Community role not found.',
      })
    }

    return result
  })
