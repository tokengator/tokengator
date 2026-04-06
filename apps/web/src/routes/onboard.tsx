import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { OnboardFeatureIndex } from '@/features/onboard/feature/onboard-feature-index'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'

export const Route = createFileRoute('/onboard')({
  beforeLoad: async ({ context }) => {
    const { onboardingStatus, session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({ to: '/login' })
    }

    if (hasCompletedOnboarding(onboardingStatus)) {
      throw redirect({ to: '/profile' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <OnboardFeatureIndex />
}
