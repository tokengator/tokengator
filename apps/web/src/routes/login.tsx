import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { AuthFeatureSignIn } from '@/features/auth/feature/auth-feature-sign-in'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const { onboardingStatus, session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      return
    }

    throw redirect({
      to: hasCompletedOnboarding(onboardingStatus) ? '/profile' : '/onboard',
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <AuthFeatureSignIn />
}
