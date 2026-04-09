import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminAssetGroupDelete as adminAssetGroupDeleteDataAccess } from '../data-access/admin-asset-group-delete'
import { adminAssetGroupDeleteInputSchema } from '../data-access/admin-asset-group-delete-input-schema'
import { adminAssetGroupGet as adminAssetGroupGetDataAccess } from '../data-access/admin-asset-group-get'

export const adminAssetGroupFeatureDelete = adminProcedure
  .input(adminAssetGroupDeleteInputSchema)
  .handler(async ({ input }) => {
    const existingAssetGroup = await adminAssetGroupGetDataAccess(input.assetGroupId)

    if (!existingAssetGroup) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Asset group not found.',
      })
    }

    await adminAssetGroupDeleteDataAccess(input.assetGroupId)

    return {
      assetGroupId: input.assetGroupId,
    }
  })
