import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/procedures'

import { communityGetCollectionAsset as communityGetCollectionAssetDataAccess } from '../data-access/community-get-collection-asset'
import { communityGetCollectionAssetInputSchema } from '../data-access/community-get-collection-asset-input-schema'

export const communityFeatureGetCollectionAsset = protectedProcedure
  .input(communityGetCollectionAssetInputSchema)
  .handler(async ({ input }) => {
    const asset = await communityGetCollectionAssetDataAccess(input)

    if (!asset) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Asset not found.',
      })
    }

    return asset
  })
