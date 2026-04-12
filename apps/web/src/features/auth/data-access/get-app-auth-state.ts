import { queryOptions, type QueryClient } from '@tanstack/react-query'

import type { serverOrpcClient } from '@/lib/orpc-server'
import { getProfileSettingsQueryKey } from '@/features/profile/data-access/use-profile-get-settings'
import { getProfileListIdentitiesQueryKey } from '@/features/profile/data-access/use-profile-list-identities'
import { getProfileListSolanaWalletsQueryKey } from '@/features/profile/data-access/use-profile-list-solana-wallets'

import { getAppAuthState } from './get-app-auth-state-fn'

export interface AppSessionUser {
  id: string
  image?: string | null
  name: string
  role?: string | null
  username?: string | null
}

export interface AppSession {
  user: AppSessionUser
}

export type AuthenticatedHomePath = '/onboard' | '/profile'

export interface AppOnboardingStatus {
  hasDiscordAccount: boolean
  hasSolanaWallet: boolean
  hasUsername: boolean
}

export interface AppAuthState {
  authenticatedHomePath: AuthenticatedHomePath
  identities: Awaited<ReturnType<typeof serverOrpcClient.profile.listIdentities>> | null
  isOnboardingComplete: boolean
  onboardingStatus: AppOnboardingStatus | null
  profileSettings: Awaited<ReturnType<typeof serverOrpcClient.profile.getSettings>> | null
  session: AppSession | null
  solanaWallets: Awaited<ReturnType<typeof serverOrpcClient.profile.listSolanaWallets>> | null
}

const appAuthStateQueryKey = ['app-auth-state'] as const

export function populateAppAuthStateRelatedQueries(args: { appAuthState: AppAuthState; queryClient: QueryClient }) {
  const { appAuthState, queryClient } = args
  const userId = appAuthState.session?.user.id

  if (!userId) {
    return
  }

  if (appAuthState.identities) {
    queryClient.setQueryData(getProfileListIdentitiesQueryKey(userId), appAuthState.identities)
  }

  if (appAuthState.profileSettings) {
    queryClient.setQueryData(getProfileSettingsQueryKey(userId), appAuthState.profileSettings)
  }

  if (appAuthState.solanaWallets) {
    queryClient.setQueryData(getProfileListSolanaWalletsQueryKey(userId), appAuthState.solanaWallets)
  }
}

export function setAppAuthStateQueryData(args: { appAuthState: AppAuthState; queryClient: QueryClient }) {
  const { appAuthState, queryClient } = args

  queryClient.setQueryData<AppAuthState>(appAuthStateQueryKey, appAuthState)
}

export function getAppAuthStateQueryOptions() {
  return queryOptions({
    queryFn: () => getAppAuthState(),
    queryKey: appAuthStateQueryKey,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export async function refreshAppAuthState(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: appAuthStateQueryKey,
  })

  const appAuthState = await queryClient.fetchQuery({
    ...getAppAuthStateQueryOptions(),
    staleTime: 0,
  })

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
