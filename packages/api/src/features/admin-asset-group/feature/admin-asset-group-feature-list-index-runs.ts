import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'

import { adminAssetGroupGet as adminAssetGroupGetDataAccess } from '../data-access/admin-asset-group-get'
import { adminAssetGroupListIndexRuns as adminAssetGroupListIndexRunsDataAccess } from '../data-access/admin-asset-group-list-index-runs'
import { adminAssetGroupListIndexRunsInputSchema } from '../data-access/admin-asset-group-list-index-runs-input-schema'

export const adminAssetGroupFeatureListIndexRuns = adminProcedure
  .input(adminAssetGroupListIndexRunsInputSchema)
  .handler(async ({ input }) => {
    const existingAssetGroup = await adminAssetGroupGetDataAccess(input.assetGroupId)

    if (!existingAssetGroup) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Asset group not found.',
      })
    }

    return {
      indexRuns: await adminAssetGroupListIndexRunsDataAccess(input),
    }
  })
