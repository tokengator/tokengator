import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminAssetGroupCreate as adminAssetGroupCreateDataAccess } from '../data-access/admin-asset-group-create'

import { adminAssetGroupCreateInputSchema } from '../data-access/admin-asset-group-create-input-schema'

export const adminAssetGroupFeatureCreate = adminProcedure
  .input(adminAssetGroupCreateInputSchema)
  .handler(async ({ input }) => {
    const createdAssetGroup = await adminAssetGroupCreateDataAccess(input)

    if (!createdAssetGroup) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Asset group was created but could not be loaded.',
      })
    }

    return createdAssetGroup
  })
