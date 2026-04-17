import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'

export const Route = createFileRoute('/communities')({
  beforeLoad: async ({ context }) => {
    const { isOnboardingComplete, session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    if (!isOnboardingComplete) {
      throw redirect({
        to: session.user.role === 'admin' ? '/admin' : '/onboard',
      })
    }

    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
