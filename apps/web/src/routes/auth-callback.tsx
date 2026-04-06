import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthFeatureCallbackPending } from '@/features/auth/feature/auth-feature-callback-pending'

export const Route = createFileRoute('/auth-callback')({
  beforeLoad: async ({ context }) => {
    const { onboardingStatus, session } = context.appAuthState

    throw redirect({
      to: !session ? '/login' : onboardingStatus?.isComplete ? '/profile' : '/onboard',
    })
  },
  component: RoutePendingComponent,
  pendingComponent: RoutePendingComponent,
  pendingMs: 0,
})

function RoutePendingComponent() {
  return <AuthFeatureCallbackPending />
}
