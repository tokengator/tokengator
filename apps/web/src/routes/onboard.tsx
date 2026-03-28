import { createFileRoute, redirect } from '@tanstack/react-router'

import { OnboardFeatureIndex } from '@/features/onboard/feature/onboard-feature-index'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'
import { getOnboardingStatus } from '@/functions/get-onboarding-status'
import { getUser } from '@/functions/get-user'

export const Route = createFileRoute('/onboard')({
  beforeLoad: async () => {
    let session = await getUser()

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    const onboardingStatus = await getOnboardingStatus()

    if (!session.user.username && onboardingStatus?.hasUsername) {
      session = await getUser()
    }

    if (hasCompletedOnboarding(onboardingStatus)) {
      throw redirect({
        to: '/profile',
      })
    }

    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { session } = Route.useRouteContext()

  return <OnboardFeatureIndex initialSession={session} />
}
