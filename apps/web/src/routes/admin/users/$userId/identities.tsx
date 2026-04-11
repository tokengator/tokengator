import { createFileRoute } from '@tanstack/react-router'

import { AdminUserFeatureIdentities } from '@/features/admin-user/feature/admin-user-feature-identities'
import { Route as UserRoute } from './route'

export const Route = createFileRoute('/admin/users/$userId/identities')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = UserRoute.useRouteContext()

  if (!user) {
    return null
  }

  return <AdminUserFeatureIdentities initialUser={user} />
}
