import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'

import { adminAssetGroupGet as adminAssetGroupGetDataAccess } from '../data-access/admin-asset-group-get'
import { adminAssetGroupUpdate as adminAssetGroupUpdateDataAccess } from '../data-access/admin-asset-group-update'
import { adminAssetGroupUpdateInputSchema } from '../data-access/admin-asset-group-update-input-schema'

export const adminAssetGroupFeatureUpdate = adminProcedure
  .input(adminAssetGroupUpdateInputSchema)
  .handler(async ({ input }) => {
    const existingAssetGroup = await adminAssetGroupGetDataAccess(input.assetGroupId)

    if (!existingAssetGroup) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Asset group not found.',
      })
    }

    return await adminAssetGroupUpdateDataAccess({
      assetGroupId: input.assetGroupId,
      data: input.data,
      existingAssetGroup,
    })
  })
