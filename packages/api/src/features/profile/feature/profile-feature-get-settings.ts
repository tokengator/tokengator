import { protectedProcedure } from '../../../lib/procedures'

import { profileSettingsGet as profileSettingsGetDataAccess } from '../data-access/profile-settings-get'

export const profileFeatureGetSettings = protectedProcedure.handler(async ({ context }) => {
  return await profileSettingsGetDataAccess(context.session.user.id)
})
