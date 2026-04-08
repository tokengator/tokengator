import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { OnboardFeatureIndex } from '@/features/onboard/feature/onboard-feature-index'

export const Route = createFileRoute('/onboard')({
  beforeLoad: async ({ context }) => {
    const { authenticatedHomePath, isOnboardingComplete, session } =
      await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({ to: '/login' })
    }

    if (isOnboardingComplete) {
      throw redirect({ to: authenticatedHomePath })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <OnboardFeatureIndex />
}
