import { protectedProcedure } from '../../../lib/procedures'

import { communityList as communityListDataAccess } from '../data-access/community-list'

export const communityFeatureList = protectedProcedure.handler(async () => {
  return await communityListDataAccess()
})
