import { adminProcedure } from '../../../lib/prodecures'

import { adminAssetGroupList as adminAssetGroupListDataAccess } from '../data-access/admin-asset-group-list'
import { adminAssetGroupListInputSchema } from '../data-access/admin-asset-group-list-input-schema'

export const adminAssetGroupFeatureList = adminProcedure
  .input(adminAssetGroupListInputSchema)
  .handler(async ({ input }) => {
    return await adminAssetGroupListDataAccess(input)
  })
