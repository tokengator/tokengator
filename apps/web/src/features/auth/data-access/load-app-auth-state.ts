import type { authClientServer } from '@/features/auth/data-access/auth-client-server'
import type { AppAuthState, AppSession } from '@/features/auth/data-access/get-app-auth-state'
import { serverOrpcClient } from '@/lib/orpc-server'

type AuthSession = Awaited<ReturnType<typeof authClientServer.getSession>>

function toAppSession(session: AuthSession): AppSession | null {
  if (!session) {
    return null
  }

  return {
    user: {
      id: session.user.id,
      image: session.user.image,
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

export async function loadAppAuthState(args: { hasDiscordAccount?: boolean; session: AuthSession }) {
  const session = toAppSession(args.session)

  if (!session) {
    return {
      authenticatedHomePath: '/onboard',
      identities: null,
      isOnboardingComplete: false,
      onboardingStatus: null,
      profileSettings: null,
      session: null,
      solanaWallets: null,
    } satisfies AppAuthState
  }

  const [identities, profileSettings, solanaWallets] = await Promise.all([
    serverOrpcClient.profile.listIdentities(),
    serverOrpcClient.profile.getSettings(),
    serverOrpcClient.profile.listSolanaWallets(),
  ])
  const hasDiscordAccount =
    args.hasDiscordAccount ?? identities.identities.some((identity) => identity.provider === 'discord')
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
    profileSettings,
    session: nextSession,
    solanaWallets,
  } satisfies AppAuthState
}
