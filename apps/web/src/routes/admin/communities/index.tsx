import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureDirectory } from '@/features/admin-community/feature/admin-community-feature-directory'
import { Route as AdminRoute } from '@/routes/admin'

export const Route = createFileRoute('/admin/communities/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { session } = AdminRoute.useRouteContext()

  return <AdminCommunityFeatureDirectory session={session} />
}
