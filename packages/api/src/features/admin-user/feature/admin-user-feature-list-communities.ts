import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserGetInputSchema } from '../data-access/admin-user-get-input-schema'
import { adminUserListCommunities } from '../data-access/admin-user-list-communities'

export const adminUserFeatureListCommunities = adminProcedure
  .input(adminUserGetInputSchema)
  .handler(async ({ input }) => {
    const communities = await adminUserListCommunities(input.userId)

    if (!communities) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found.',
      })
    }

    return communities
  })
