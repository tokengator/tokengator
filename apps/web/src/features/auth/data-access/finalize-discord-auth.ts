import type { QueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { hasLocalAuthProviderLink, reconcileLocalUserState, syncDiscordUsername } from '@tokengator/auth'

import { authMiddleware } from './auth-middleware'
import { populateAppAuthStateRelatedQueries, setAppAuthStateQueryData, type AppAuthState } from './get-app-auth-state'
import { loadAppAuthState } from './load-app-auth-state'

const finalizeDiscordAuth = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) {
      return await loadAppAuthState({
        session: null,
      })
    }

    const hasDiscordAccount = await hasLocalAuthProviderLink({
      providerId: 'discord',
      userId: context.session.user.id,
    })

    if (hasDiscordAccount) {
      const requestHeaders = new Headers(getRequestHeaders())

      await syncDiscordUsername({
        currentUsername: context.session.user.username ?? null,
        requestHeaders,
        userId: context.session.user.id,
      })
      await reconcileLocalUserState({
        requestHeaders,
        userId: context.session.user.id,
      })
    }

    return await loadAppAuthState({
      hasDiscordAccount,
      session: context.session,
    })
  })

export async function finalizeDiscordAuthState(queryClient: QueryClient) {
  const appAuthState = (await finalizeDiscordAuth()) as AppAuthState

  setAppAuthStateQueryData({
    appAuthState,
    queryClient,
  })
  populateAppAuthStateRelatedQueries({
    appAuthState,
    queryClient,
  })

  return appAuthState
}
