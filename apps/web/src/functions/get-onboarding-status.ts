import { createServerFn } from '@tanstack/react-start'

import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { authMiddleware } from '@/middleware/auth'
import { serverOrpcClient } from '@/utils/orpc-server'

export const getOnboardingStatus = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) {
      return null
    }

    const [identities, solanaWallets] = await Promise.all([
      serverOrpcClient.profile.listIdentities(),
      serverOrpcClient.profile.listSolanaWallets(),
    ])
    const hasDiscordAccount = identities.identities.some((identity) => identity.providerId === 'discord')
    const hasSolanaWallet = solanaWallets.solanaWallets.length > 0
    let username = context.session.user.username

    if (!username && hasDiscordAccount) {
      const syncDiscordUsernameResult = await serverOrpcClient.profile.syncDiscordUsername()

      username = syncDiscordUsernameResult.username
    }

    const hasUsername = Boolean(username)

    const onboardingStatus: OnboardingStatus = {
      hasDiscordAccount,
      hasSolanaWallet,
      hasUsername,
      isComplete: hasDiscordAccount && hasSolanaWallet && hasUsername,
    }

    return onboardingStatus
  })
