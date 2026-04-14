import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/procedures'

import { communityListCollectionAssets as communityListCollectionAssetsDataAccess } from '../data-access/community-list-collection-assets'
import { communityListCollectionAssetsInputSchema } from '../data-access/community-list-collection-assets-input-schema'

export const communityFeatureListCollectionAssets = protectedProcedure
  .input(communityListCollectionAssetsInputSchema)
  .handler(async ({ input }) => {
    const assets = await communityListCollectionAssetsDataAccess(input)

    if (!assets) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Collection not found.',
      })
    }

    return assets
  })
