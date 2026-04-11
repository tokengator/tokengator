import { Outlet, createFileRoute } from '@tanstack/react-router'

import { getAdminUserGetRouteQueryOptions } from '@/features/admin-user/data-access/use-admin-user-get-query'
import { AdminUserFeatureShell } from '@/features/admin-user/feature/admin-user-feature-shell'

export const Route = createFileRoute('/admin/users/$userId')({
  beforeLoad: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(getAdminUserGetRouteQueryOptions(params.userId))

    return { user }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = Route.useRouteContext()

  return (
    <AdminUserFeatureShell initialUser={user}>
      <Outlet />
    </AdminUserFeatureShell>
  )
}
