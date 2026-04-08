import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthFeatureCallbackPending } from '@/features/auth/feature/auth-feature-callback-pending'

export const Route = createFileRoute('/auth-callback')({
  beforeLoad: async ({ context }) => {
    const { authenticatedHomePath, session } = context.appAuthState

    throw redirect({ to: session ? authenticatedHomePath : '/login' })
  },
  component: RoutePendingComponent,
  pendingComponent: RoutePendingComponent,
  pendingMs: 0,
})

function RoutePendingComponent() {
  return <AuthFeatureCallbackPending />
}
