import { createFileRoute } from '@tanstack/react-router'

import { AdminUserFeatureSettings } from '@/features/admin-user/feature/admin-user-feature-settings'
import { Route as UserRoute } from './route'

export const Route = createFileRoute('/admin/users/$userId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = UserRoute.useRouteContext()

  if (!user) {
    return null
  }

  return <AdminUserFeatureSettings initialUser={user} />
}
