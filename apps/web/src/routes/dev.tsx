import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'
import { DevFeatureShell } from '@/features/dev/feature/dev-feature-shell'

export const Route = createFileRoute('/dev')({
  beforeLoad: async ({ context }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session || session.user.role !== 'admin') {
      throw redirect({ to: session ? '/profile' : '/login' })
    }

    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DevFeatureShell>
      <Outlet />
    </DevFeatureShell>
  )
}
