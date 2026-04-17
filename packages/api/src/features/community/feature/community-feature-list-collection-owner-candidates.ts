import { protectedProcedure } from '../../../lib/procedures'

import { communityListCollectionOwnerCandidates as communityListCollectionOwnerCandidatesDataAccess } from '../data-access/community-list-collection-owner-candidates'
import { communityListCollectionOwnerCandidatesInputSchema } from '../data-access/community-list-collection-owner-candidates-input-schema'

export const communityFeatureListCollectionOwnerCandidates = protectedProcedure
  .input(communityListCollectionOwnerCandidatesInputSchema)
  .handler(async ({ input }) => {
    return await communityListCollectionOwnerCandidatesDataAccess(input)
  })
