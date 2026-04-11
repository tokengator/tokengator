import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserListAssets } from '../data-access/admin-user-list-assets'
import { adminUserListAssetsInputSchema } from '../data-access/admin-user-list-assets-input-schema'

export const adminUserFeatureListAssets = adminProcedure
  .input(adminUserListAssetsInputSchema)
  .handler(async ({ input }) => {
    const assets = await adminUserListAssets(input)

    if (!assets) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found.',
      })
    }

    return assets
  })
