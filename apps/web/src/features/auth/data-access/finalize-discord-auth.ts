import type { QueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

import { serverOrpcClient } from '@/lib/orpc-server'

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
    const { hasDiscordAccount } = await serverOrpcClient.profile.finalizeDiscordAuth()

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
