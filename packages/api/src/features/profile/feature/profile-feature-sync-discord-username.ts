import { protectedProcedure } from '../../../lib/prodecures'

import { profileDiscordUsernameSync as profileDiscordUsernameSyncDataAccess } from '../data-access/profile-discord-username-sync'

export const profileFeatureSyncDiscordUsername = protectedProcedure.handler(async ({ context }) => {
  return await profileDiscordUsernameSyncDataAccess({
    currentUsername: context.session.user.username ?? null,
    requestHeaders: context.requestHeaders,
    userId: context.session.user.id,
  })
})
