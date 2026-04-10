import type { AppAuthState, AppSession } from '@/features/auth/data-access/get-app-auth-state'
import { serverOrpcClient } from '@/lib/orpc-server'
import { hasLocalAuthProviderLink } from '@tokengator/auth'

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

function getPersistedDiscordUsername(args: { identities: NonNullable<AppAuthState['identities']> }) {
  return (
    args.identities.identities.find((identity) => identity.provider === 'discord' && identity.username)?.username ??
    null
  )
}

export async function loadAppAuthState(args: { hasDiscordAccount?: boolean; session: AppSession | null | undefined }) {
  const session = toAppSession(args.session)

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

  const [hasDiscordAccount, identities, solanaWallets] = await Promise.all([
    args.hasDiscordAccount ??
      hasLocalAuthProviderLink({
        providerId: 'discord',
        userId: session.user.id,
      }),
    serverOrpcClient.profile.listIdentities(),
    serverOrpcClient.profile.listSolanaWallets(),
  ])
  const hasSolanaWallet = solanaWallets.solanaWallets.length > 0
  const username = session.user.username ?? getPersistedDiscordUsername({ identities })
  const hasUsername = Boolean(username)
  const nextSession = username ? { user: { ...session.user, username } } : session
  const onboardingStatus = {
    hasDiscordAccount,
    hasSolanaWallet,
    hasUsername,
  }
  const isOnboardingComplete = hasDiscordAccount && hasSolanaWallet && hasUsername

  return {
    authenticatedHomePath: isOnboardingComplete ? '/profile' : '/onboard',
    identities,
    isOnboardingComplete,
    onboardingStatus,
    session: nextSession,
    solanaWallets,
  } satisfies AppAuthState
}
