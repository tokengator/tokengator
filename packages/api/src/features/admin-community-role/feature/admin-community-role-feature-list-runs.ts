import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'
import { adminCommunityRoleListRuns as adminCommunityRoleListRunsDataAccess } from '../data-access/admin-community-role-list-runs'
import { adminCommunityRoleListRunsInputSchema } from '../data-access/admin-community-role-list-runs-input-schema'

export const adminCommunityRoleFeatureListRuns = adminProcedure
  .input(adminCommunityRoleListRunsInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRoleListRunsDataAccess(input)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result
  })
