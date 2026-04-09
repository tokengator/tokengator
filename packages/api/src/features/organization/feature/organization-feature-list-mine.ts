import { protectedProcedure } from '../../../lib/prodecures'

import { organizationListMine as organizationListMineDataAccess } from '../data-access/organization-list-mine'

export const organizationFeatureListMine = protectedProcedure.handler(async ({ context }) => {
  return await organizationListMineDataAccess(context.session.user.id)
})
