import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminAssetDelete as adminAssetDeleteDataAccess } from '../data-access/admin-asset-delete'
import { adminAssetDeleteInputSchema } from '../data-access/admin-asset-delete-input-schema'

export const adminAssetFeatureDelete = adminProcedure.input(adminAssetDeleteInputSchema).handler(async ({ input }) => {
  const deletedAsset = await adminAssetDeleteDataAccess(input)

  if (!deletedAsset) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Asset not found.',
    })
  }

  return deletedAsset
})
