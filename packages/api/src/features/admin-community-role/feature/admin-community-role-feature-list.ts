import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'
import { adminCommunityRoleList as adminCommunityRoleListDataAccess } from '../data-access/admin-community-role-list'
import { adminCommunityRoleListInputSchema } from '../data-access/admin-community-role-list-input-schema'

export const adminCommunityRoleFeatureList = adminProcedure
  .input(adminCommunityRoleListInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRoleListDataAccess(input.organizationId)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result
  })
