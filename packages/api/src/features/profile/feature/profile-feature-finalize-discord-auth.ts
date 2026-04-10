import { hasLocalAuthProviderLink, reconcileLocalUserState, syncDiscordUsername } from '@tokengator/auth'
import { protectedProcedure } from '../../../lib/procedures'

export const profileFeatureFinalizeDiscordAuth = protectedProcedure.handler(async ({ context }) => {
  const hasDiscordAccount = await hasLocalAuthProviderLink({
    providerId: 'discord',
    userId: context.session.user.id,
  })

  if (!hasDiscordAccount) {
    return {
      hasDiscordAccount: false,
      updated: false,
      username: null,
    }
  }

  const result = await syncDiscordUsername({
    currentUsername: context.session.user.username ?? null,
    requestHeaders: context.requestHeaders,
    userId: context.session.user.id,
  })

  await reconcileLocalUserState({
    requestHeaders: context.requestHeaders,
    userId: context.session.user.id,
  })

  return {
    hasDiscordAccount,
    updated: result.updated,
    username: result.username,
  }
})
