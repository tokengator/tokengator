import { protectedProcedure } from '../../../lib/procedures'

import { profileIdentitiesList as profileIdentitiesListDataAccess } from '../data-access/profile-identities-list'

export const profileFeatureListIdentities = protectedProcedure.handler(async ({ context }) => {
  return await profileIdentitiesListDataAccess({
    userId: context.session.user.id,
  })
})
