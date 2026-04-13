import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'

export const Route = createFileRoute('/communities')({
  beforeLoad: async ({ context }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session) {
      throw redirect({
        to: '/login',
      })
    }

    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
