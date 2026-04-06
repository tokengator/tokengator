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
