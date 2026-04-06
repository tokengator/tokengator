import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AdminFeatureShell } from '@/features/admin/feature/admin-feature-shell'
import { getAppAuthStateQueryOptions } from '@/features/auth/data-access/get-app-auth-state'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    const { session } = await context.queryClient.ensureQueryData(getAppAuthStateQueryOptions())

    if (!session || session.user.role !== 'admin') {
      throw redirect({
        to: session ? '/profile' : '/login',
      })
    }

    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AdminFeatureShell>
      <Outlet />
    </AdminFeatureShell>
  )
}
