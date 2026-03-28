import { redirect } from '@tanstack/react-router'

export interface OnboardingStatus {
  hasDiscordAccount: boolean
  hasSolanaWallet: boolean
  hasUsername: boolean
  isComplete: boolean
}

export function hasCompletedOnboarding(onboardingStatus: OnboardingStatus | null | undefined) {
  return Boolean(
    onboardingStatus?.hasDiscordAccount && onboardingStatus?.hasSolanaWallet && onboardingStatus?.hasUsername,
  )
}

export function requireCompletedOnboarding(args: {
  onboardingStatus: OnboardingStatus | null | undefined
  session: unknown
}) {
  const { onboardingStatus, session } = args

  if (!session) {
    throw redirect({ to: '/login' })
  }

  if (!hasCompletedOnboarding(onboardingStatus)) {
    throw redirect({ to: '/onboard' })
  }

  return session
}
