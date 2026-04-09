import { ORPCError } from '@orpc/server'

import { AssetGroupIndexConfigError } from '../../../features/asset-group-index'
import { AutomationLockConflictError } from '../../../lib/automation-lock'
import { adminProcedure } from '../../../lib/procedures'

import { adminAssetGroupGet as adminAssetGroupGetDataAccess } from '../data-access/admin-asset-group-get'
import { adminAssetGroupIndex as adminAssetGroupIndexDataAccess } from '../data-access/admin-asset-group-index'
import { adminAssetGroupIndexInputSchema } from '../data-access/admin-asset-group-index-input-schema'

export const adminAssetGroupFeatureIndex = adminProcedure
  .input(adminAssetGroupIndexInputSchema)
  .handler(async ({ context, input }) => {
    const existingAssetGroup = await adminAssetGroupGetDataAccess(input.assetGroupId)

    if (!existingAssetGroup) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Asset group not found.',
      })
    }

    try {
      return await adminAssetGroupIndexDataAccess({
        assetGroup: existingAssetGroup,
        signal: context.requestSignal,
      })
    } catch (error) {
      if (error instanceof AssetGroupIndexConfigError) {
        throw new ORPCError('BAD_REQUEST', {
          message: error.message,
        })
      }

      if (error instanceof AutomationLockConflictError) {
        throw new ORPCError('CONFLICT', {
          message: 'Asset indexing is already running for this asset group.',
        })
      }

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: error instanceof Error ? error.message : 'Asset indexing failed.',
      })
    }
  })
