import { protectedProcedure } from '../../../lib/procedures'

import { profileSettingsUpdate as profileSettingsUpdateDataAccess } from '../data-access/profile-settings-update'
import { profileSettingsUpdateInputSchema } from '../data-access/profile-settings-update-input-schema'

export const profileFeatureUpdateSettings = protectedProcedure
  .input(profileSettingsUpdateInputSchema)
  .handler(async ({ context, input }) => {
    return await profileSettingsUpdateDataAccess({
      settings: input,
      userId: context.session.user.id,
    })
  })
