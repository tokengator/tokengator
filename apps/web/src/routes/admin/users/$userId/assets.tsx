import { createFileRoute } from '@tanstack/react-router'

import { AdminUserFeatureAssets } from '@/features/admin-user/feature/admin-user-feature-assets'
import { Route as UserRoute } from './route'

export const Route = createFileRoute('/admin/users/$userId/assets')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = UserRoute.useRouteContext()

  if (!user) {
    return null
  }

  return <AdminUserFeatureAssets userId={user.id} />
}
