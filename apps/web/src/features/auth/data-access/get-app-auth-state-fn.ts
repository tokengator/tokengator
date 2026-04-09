import { createServerFn } from '@tanstack/react-start'

import type { AppAuthState, AppSession } from '@/features/auth/data-access/get-app-auth-state'
import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { serverOrpcClient } from '@/lib/orpc-server'

import { authMiddleware } from './auth-middleware'

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

export const getAppAuthState = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const session = toAppSession(context.session)

    if (!session) {
      return {
        authenticatedHomePath: '/onboard',
        identities: null,
        isOnboardingComplete: false,
        onboardingStatus: null,
        session: null,
        solanaWallets: null,
      } satisfies AppAuthState
    }

    let [identities, solanaWallets] = await Promise.all([
      serverOrpcClient.profile.listIdentities(),
      serverOrpcClient.profile.listSolanaWallets(),
    ])
    const hasDiscordAccount = identities.identities.some((identity) => identity.provider === 'discord')
    const hasSolanaWallet = solanaWallets.solanaWallets.length > 0
    let username = session.user.username

    if (!username && hasDiscordAccount) {
      const syncDiscordUsernameResult = await serverOrpcClient.profile.syncDiscordUsername()

      username = syncDiscordUsernameResult.username

      if (syncDiscordUsernameResult.updated) {
        identities = await serverOrpcClient.profile.listIdentities()
      }
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
    const onboardingStatus = buildOnboardingStatus({
      hasDiscordAccount,
      hasSolanaWallet,
      hasUsername,
    })
    const isOnboardingComplete = onboardingStatus.isComplete

    return {
      authenticatedHomePath: isOnboardingComplete ? '/profile' : '/onboard',
      identities,
      isOnboardingComplete,
      onboardingStatus,
      session: nextSession,
      solanaWallets,
    } satisfies AppAuthState
  })
