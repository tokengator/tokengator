import { createFileRoute } from '@tanstack/react-router'

import { AdminUserFeatureOverview } from '@/features/admin-user/feature/admin-user-feature-overview'
import { Route as UserRoute } from './route'

export const Route = createFileRoute('/admin/users/$userId/overview')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = UserRoute.useRouteContext()

  if (!user) {
    return null
  }

  return <AdminUserFeatureOverview initialUser={user} />
}
