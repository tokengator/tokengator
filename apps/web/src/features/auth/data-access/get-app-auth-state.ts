import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { getProfileListIdentitiesQueryKey } from '@/features/profile/data-access/use-profile-list-identities'
import { getProfileListSolanaWalletsQueryKey } from '@/features/profile/data-access/use-profile-list-solana-wallets'
import { authMiddleware } from '@/middleware/auth'
import { serverOrpcClient } from '@/utils/orpc-server'

export interface AppSessionUser {
  id: string
  name: string
  role?: string | null
  username?: string | null
}

export interface AppSession {
  user: AppSessionUser
}

export interface AppAuthState {
  identities: Awaited<ReturnType<typeof serverOrpcClient.profile.listIdentities>> | null
  onboardingStatus: OnboardingStatus | null
  session: AppSession | null
  solanaWallets: Awaited<ReturnType<typeof serverOrpcClient.profile.listSolanaWallets>> | null
}

const appAuthStateQueryKey = ['app-auth-state'] as const

function buildOnboardingStatus(args: {
  hasDiscordAccount: boolean
  hasSolanaWallet: boolean
  hasUsername: boolean
}): OnboardingStatus {
  const { hasDiscordAccount, hasSolanaWallet, hasUsername } = args

  return {
    hasDiscordAccount,
    hasSolanaWallet,
    hasUsername,
    isComplete: hasDiscordAccount && hasSolanaWallet && hasUsername,
  }
}

function toAppSession(session: AppSession | null | undefined): AppSession | null {
  if (!session) {
    return null
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      username: session.user.username,
    },
  }
}

export function populateAppAuthStateRelatedQueries(args: { appAuthState: AppAuthState; queryClient: QueryClient }) {
  const { appAuthState, queryClient } = args
  const userId = appAuthState.session?.user.id

  if (!userId) {
    return
  }

  if (appAuthState.identities) {
    queryClient.setQueryData(getProfileListIdentitiesQueryKey(userId), appAuthState.identities)
  }

  if (appAuthState.solanaWallets) {
    queryClient.setQueryData(getProfileListSolanaWalletsQueryKey(userId), appAuthState.solanaWallets)
  }
}

export const getAppAuthState = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const session = toAppSession(context.session)

    if (!session) {
      return {
        identities: null,
        onboardingStatus: null,
        session: null,
        solanaWallets: null,
      } satisfies AppAuthState
    }

    const [identities, solanaWallets] = await Promise.all([
      serverOrpcClient.profile.listIdentities(),
      serverOrpcClient.profile.listSolanaWallets(),
    ])
    const hasDiscordAccount = identities.identities.some((identity) => identity.providerId === 'discord')
    const hasSolanaWallet = solanaWallets.solanaWallets.length > 0
    let username = session.user.username

    if (!username && hasDiscordAccount) {
      const syncDiscordUsernameResult = await serverOrpcClient.profile.syncDiscordUsername()

      username = syncDiscordUsernameResult.username
    }

    const hasUsername = Boolean(username)
    const nextSession = username
      ? {
          user: {
            ...session.user,
            username,
          },
        }
      : session

    return {
      identities,
      onboardingStatus: buildOnboardingStatus({
        hasDiscordAccount,
        hasSolanaWallet,
        hasUsername,
      }),
      session: nextSession,
      solanaWallets,
    } satisfies AppAuthState
  })

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

  populateAppAuthStateRelatedQueries({
    appAuthState,
    queryClient,
  })

  return appAuthState
}
