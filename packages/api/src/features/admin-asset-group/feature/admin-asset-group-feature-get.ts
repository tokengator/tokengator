import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'

import { adminAssetGroupGetInputSchema } from '../data-access/admin-asset-group-get-input-schema'
import { adminAssetGroupGetWithIndexingStatus as adminAssetGroupGetWithIndexingStatusDataAccess } from '../data-access/admin-asset-group-get-with-indexing-status'

export const adminAssetGroupFeatureGet = adminProcedure
  .input(adminAssetGroupGetInputSchema)
  .handler(async ({ input }) => {
    const existingAssetGroup = await adminAssetGroupGetWithIndexingStatusDataAccess(input.assetGroupId)

    if (!existingAssetGroup) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Asset group not found.',
      })
    }

    return existingAssetGroup
  })
