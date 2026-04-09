import { ORPCError } from '@orpc/server'
import { db } from '@tokengator/db'

import { adminProcedure } from '../../../lib/procedures'
import { adminAssetList as adminAssetListDataAccess } from '../data-access/admin-asset-list'
import { adminAssetListInputSchema } from '../data-access/admin-asset-list-input-schema'

export const adminAssetFeatureList = adminProcedure.input(adminAssetListInputSchema).handler(async ({ input }) => {
  const assets = await adminAssetListDataAccess(db, input)

  if (!assets) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Asset group not found.',
    })
  }

  return assets
})
