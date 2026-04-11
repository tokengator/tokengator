import { createFileRoute } from '@tanstack/react-router'

import { AdminUserFeatureCommunities } from '@/features/admin-user/feature/admin-user-feature-communities'
import { Route as UserRoute } from './route'

export const Route = createFileRoute('/admin/users/$userId/communities')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = UserRoute.useRouteContext()

  if (!user) {
    return null
  }

  return <AdminUserFeatureCommunities initialUser={user} />
}
