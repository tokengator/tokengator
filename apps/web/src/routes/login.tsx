import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { AuthFeatureSignIn } from '@/features/auth/feature/auth-feature-sign-in'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const { authenticatedHomePath, session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      return
    }

    throw redirect({ to: authenticatedHomePath })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <AuthFeatureSignIn />
}
