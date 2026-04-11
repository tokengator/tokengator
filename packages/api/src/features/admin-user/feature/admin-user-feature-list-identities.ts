import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserGetInputSchema } from '../data-access/admin-user-get-input-schema'
import { adminUserListIdentities } from '../data-access/admin-user-list-identities'

export const adminUserFeatureListIdentities = adminProcedure
  .input(adminUserGetInputSchema)
  .handler(async ({ input }) => {
    const identities = await adminUserListIdentities(input.userId)

    if (!identities) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found.',
      })
    }

    return identities
  })
