import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/procedures'

import { communityGetBySlug as communityGetBySlugDataAccess } from '../data-access/community-get-by-slug'
import { communitySlugInputSchema } from '../data-access/community-slug-input-schema'

export const communityFeatureGetBySlug = protectedProcedure
  .input(communitySlugInputSchema)
  .handler(async ({ input }) => {
    const community = await communityGetBySlugDataAccess(input.slug)

    if (!community) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Community not found.',
      })
    }

    return community
  })
